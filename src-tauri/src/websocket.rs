use crate::auth::validate_code;
use crate::state::{AppState, ClipboardEntry, DeviceInfo};
use axum::{
    extract::{ws::{Message, WebSocket}, State, WebSocketUpgrade},
    response::IntoResponse,
};
use chrono::Utc;
use futures_util::{sink::SinkExt, stream::StreamExt};
use serde_json::Value;
use std::sync::Arc;
use uuid::Uuid;

pub async fn ws_handler(
    ws: WebSocketUpgrade,
    State(state): State<Arc<AppState>>,
) -> impl IntoResponse {
    ws.on_upgrade(|socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: Arc<AppState>) {
    let (mut sender, mut receiver) = socket.split();
    let mut rx = state.ws_broadcast.subscribe();

    // Setup device connection state
    let connection_id = Uuid::new_v4().to_string();
    let conn_id_for_recv = connection_id.clone();

    let mut send_task = tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if sender.send(Message::Text(msg)).await.is_err() {
                break;
            }
        }
    });

    let state_clone = Arc::clone(&state);
    let mut recv_task = tokio::spawn(async move {
        while let Some(Ok(Message::Text(text))) = receiver.next().await {
            if let Ok(json) = serde_json::from_str::<Value>(&text) {
                let msg_type = json["type"].as_str().unwrap_or("");
                
                if msg_type == "PING" {
                    // Send PONG
                    let pong = serde_json::json!({ "type": "PONG" });
                    let _ = state_clone.ws_broadcast.send(pong.to_string());
                    continue;
                }

                if msg_type == "AUTH_CODE_SUBMIT" {
                    if let (Some(payload), Some(request_id)) = (json.get("payload"), json.get("requestId")) {
                        if let Some(code) = payload.get("code").and_then(|c| c.as_str()) {
                            let ip = "unknown"; // Extract IP properly in a real setup
                            let lockout = state_clone.settings.read().await.code_lockout_minutes;
                            
                            match validate_code(&state_clone, code, request_id.as_str().unwrap_or(""), ip, lockout).await {
                                Ok(token) => {
                                    let device = DeviceInfo {
                                        id: conn_id_for_recv.clone(),
                                        ip: ip.to_string(),
                                        user_agent: "Quest Browser".to_string(),
                                        nickname: None,
                                        connected_at: Utc::now().timestamp_millis(),
                                    };
                                    state_clone.connected_devices.write().await.insert(conn_id_for_recv.clone(), device);
                                    
                                    let expiry = Utc::now().timestamp_millis() + (state_clone.settings.read().await.session_expiry_days as i64 * 24 * 60 * 60 * 1000);
                                    let success_msg = serde_json::json!({
                                        "type": "AUTH_SUCCESS",
                                        "payload": {
                                            "token": token,
                                            "expiresAt": expiry
                                        }
                                    });
                                    let _ = state_clone.ws_broadcast.send(success_msg.to_string());
                                }
                                Err((reason, attempts)) => {
                                    let err_msg = if reason == "LOCKED" {
                                        serde_json::json!({
                                            "type": "AUTH_LOCKED",
                                            "payload": { "unlockAt": Utc::now().timestamp_millis() + (lockout as i64 * 60 * 1000) }
                                        })
                                    } else if reason == "EXPIRED" {
                                        serde_json::json!({ "type": "AUTH_CODE_EXPIRED" })
                                    } else {
                                        serde_json::json!({
                                            "type": "AUTH_CODE_INVALID",
                                            "payload": { "attemptsRemaining": attempts }
                                        })
                                    };
                                    let _ = state_clone.ws_broadcast.send(err_msg.to_string());
                                }
                            }
                        }
                    }
                    continue;
                }

                // Handle CLIPBOARD_PUSH
                if msg_type == "CLIPBOARD_PUSH" {
                    // Note: Needs token validation here in production
                    if let Some(text) = json["payload"]["text"].as_str() {
                        if !text.is_empty() {
                            let mut clipboard = arboard::Clipboard::new().unwrap();
                            let _ = clipboard.set_text(text);
                            
                            let entry = ClipboardEntry {
                                id: Uuid::new_v4().to_string(),
                                text: text.to_string(),
                                source: "quest".to_string(),
                                timestamp: Utc::now().timestamp_millis(),
                            };

                            let mut log = state_clone.clipboard_log.write().await;
                            log.insert(0, entry.clone());
                            
                            // Broadcast back
                            let update_msg = serde_json::json!({
                                "type": "CLIPBOARD_UPDATE",
                                "payload": {
                                    "text": entry.text,
                                    "source": entry.source,
                                    "timestamp": entry.timestamp
                                }
                            });
                            let _ = state_clone.ws_broadcast.send(update_msg.to_string());
                        }
                    }
                }
            }
        }
    });

    tokio::select! {
        _ = (&mut send_task) => recv_task.abort(),
        _ = (&mut recv_task) => send_task.abort(),
    };

    // Cleanup on disconnect
    state.connected_devices.write().await.remove(&connection_id);
}
