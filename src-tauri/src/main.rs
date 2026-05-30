#![cfg_attr(
    all(not(debug_assertions), target_os = "windows"),
    windows_subsystem = "windows"
)]

mod auth;
mod clipboard;
mod network;
mod port;
mod server;
mod state;
mod tray;
mod websocket;

use state::{AppState, DeviceInfo, ClipboardEntry, Settings, LogEntry, WsLogEntry, ConnectionAttempt};
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use serde_json::Value;

#[tauri::command]
async fn get_server_info(state: tauri::State<'_, Arc<AppState>>) -> Result<Value, String> {
    let port = *state.bound_port.read().await;
    let ip = state.local_ip.read().await.clone();
    let status = state.server_status.read().await.clone();
    
    Ok(serde_json::json!({
        "port": port,
        "ip": ip,
        "status": status
    }))
}

#[tauri::command]
async fn get_connected_devices(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<DeviceInfo>, String> {
    let devices = state.connected_devices.read().await;
    Ok(devices.values().cloned().collect())
}

#[tauri::command]
async fn get_clipboard_log(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<ClipboardEntry>, String> {
    let log = state.clipboard_log.read().await;
    Ok(log.clone())
}

#[tauri::command]
async fn clear_clipboard_log(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    let mut log = state.clipboard_log.write().await;
    log.clear();
    Ok(())
}

#[tauri::command]
async fn get_settings(state: tauri::State<'_, Arc<AppState>>) -> Result<Settings, String> {
    let settings = state.settings.read().await;
    Ok(settings.clone())
}

#[tauri::command]
async fn save_settings(settings: Settings, state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    *state.settings.write().await = settings;
    // In a real app, save to tauri-plugin-store
    Ok(())
}

#[tauri::command]
async fn get_debug_logs(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<LogEntry>, String> {
    let logs = state.debug_logs.read().await;
    Ok(logs.clone())
}

#[tauri::command]
async fn get_ws_logs(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<WsLogEntry>, String> {
    let logs = state.ws_logs.read().await;
    Ok(logs.clone())
}

#[tauri::command]
async fn get_connection_history(state: tauri::State<'_, Arc<AppState>>) -> Result<Vec<ConnectionAttempt>, String> {
    let history = state.connection_history.read().await;
    Ok(history.clone())
}

#[tauri::command]
async fn get_server_stats(state: tauri::State<'_, Arc<AppState>>) -> Result<serde_json::Value, String> {
    let uptime = chrono::Utc::now().timestamp_millis() - state.start_time;
    let connections = state.connected_devices.read().await.len();
    let sent = *state.messages_sent.read().await;
    let recv = *state.messages_received.read().await;
    let port = *state.bound_port.read().await;
    let status = state.server_status.read().await.clone();
    
    Ok(serde_json::json!({
        "uptime": uptime,
        "activeConnections": connections,
        "messagesSent": sent,
        "messagesReceived": recv,
        "port": port,
        "status": status
    }))
}

#[tauri::command]
async fn clear_all_logs(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    state.debug_logs.write().await.clear();
    state.ws_logs.write().await.clear();
    state.connection_history.write().await.clear();
    Ok(())
}

#[tauri::command]
async fn export_logs_to_file(app: AppHandle, state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    use tauri_plugin_dialog::DialogExt;
    
    // Generate text dump
    let mut dump = String::new();
    dump.push_str("--- CrossClip Logs Export ---\n\n");
    
    dump.push_str("=== App Logs ===\n");
    for log in state.debug_logs.read().await.iter() {
        dump.push_str(&format!("[{}] [{}] [{}] {}\n", log.timestamp, log.level, log.source, log.message));
    }
    
    dump.push_str("\n=== WebSocket Logs ===\n");
    for log in state.ws_logs.read().await.iter() {
        dump.push_str(&format!("[{}] [{}] [{}] {}\n", log.timestamp, log.direction, log.msg_type, log.payload));
    }
    
    dump.push_str("\n=== Connection History ===\n");
    for log in state.connection_history.read().await.iter() {
        dump.push_str(&format!("[{}] {} ({}) -> {}\n", log.timestamp, log.ip, log.user_agent, log.result));
    }
    
    let default_name = format!("crossclip_logs_{}.txt", chrono::Utc::now().format("%Y%m%d_%H%M%S"));
    
    app.dialog()
        .file()
        .set_title("ログを保存")
        .set_file_name(&default_name)
        .add_filter("Text Document", &["txt"])
        .save_file(move |file_path| {
            if let Some(path) = file_path {
                if let Ok(p) = path.into_path() {
                    let _ = std::fs::write(p, dump);
                }
            }
        });
    
    Ok(())
}

#[tauri::command]
async fn approve_auth_request(request_id: String, state: tauri::State<'_, Arc<AppState>>, app: AppHandle) -> Result<(), String> {
    let expiry = state.settings.read().await.code_expiry_minutes;
    if let Some(code) = auth::approve_request(&state, &request_id, expiry).await {
        let expiry_ms = chrono::Utc::now().timestamp_millis() + (expiry as i64 * 60 * 1000);

        // Emit approval-code-generated to Tauri frontend (PC UI shows the code)
        app.emit("approval-code-generated", serde_json::json!({
            "code": code,
            "expiry": expiry_ms,
            "requestId": request_id
        })).unwrap();

        // Broadcast AUTH_CODE_READY over WebSocket so the Quest client
        // transitions from "waiting for approval" to "enter code" screen
        let ws_msg = serde_json::json!({
            "type": "AUTH_CODE_READY",
            "payload": {
                "requestId": request_id
            }
        });
        let _ = state.ws_broadcast.send(ws_msg.to_string());
    }
    Ok(())
}

#[tauri::command]
async fn reject_auth_request(request_id: String, state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    auth::reject_request(&state, &request_id).await;

    // Broadcast AUTH_REJECTED over WebSocket so the Quest client shows rejection
    let ws_msg = serde_json::json!({
        "type": "AUTH_REJECTED",
        "payload": {
            "reason": "rejected_by_user",
            "requestId": request_id
        }
    });
    let _ = state.ws_broadcast.send(ws_msg.to_string());

    Ok(())
}

#[tauri::command]
async fn is_first_launch() -> Result<bool, String> {
    // Stub
    Ok(false)
}

#[tauri::command]
async fn disconnect_device(device_id: String, state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    state.connected_devices.write().await.remove(&device_id);
    Ok(())
}

#[tauri::command]
async fn revoke_all_sessions(state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    auth::revoke_all_sessions_impl(&state).await;
    state.connected_devices.write().await.clear();
    Ok(())
}

#[tauri::command]
async fn revoke_device_session(device_id: String, state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    // Find and revoke the session for this device
    let token_to_revoke = {
        let sessions = state.active_sessions.read().await;
        sessions.iter()
            .find(|(_, s)| s.device_id == device_id)
            .map(|(token, _)| token.clone())
    };
    if let Some(token) = token_to_revoke {
        auth::revoke_session(&state, &token).await;
    }
    state.connected_devices.write().await.remove(&device_id);
    Ok(())
}

#[tauri::command]
async fn invalidate_approval_code(code: String, state: tauri::State<'_, Arc<AppState>>) -> Result<(), String> {
    auth::invalidate_code(&state, &code).await;
    Ok(())
}

fn main() {
    let app_state = AppState::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(app_state.clone())
        .invoke_handler(tauri::generate_handler![
            get_server_info,
            get_connected_devices,
            get_clipboard_log,
            clear_clipboard_log,
            get_settings,
            save_settings,
            get_debug_logs,
            get_ws_logs,
            get_connection_history,
            get_server_stats,
            clear_all_logs,
            export_logs_to_file,
            approve_auth_request,
            reject_auth_request,
            is_first_launch,
            disconnect_device,
            revoke_all_sessions,
            revoke_device_session,
            invalidate_approval_code
        ])
        .setup(move |app| {
            let app_handle = app.handle().clone();
            
            // Setup tray
            let _ = tray::setup_tray(&app_handle);

            // Store AppHandle in state so the Axum server can emit events
            let state_for_handle = app_state.clone();
            let handle_clone = app_handle.clone();
            tauri::async_runtime::block_on(async {
                *state_for_handle.app_handle.write().await = Some(handle_clone);
            });

            // Set local IP
            let ip = network::get_local_ip();
            tauri::async_runtime::block_on(async {
                *app_state.local_ip.write().await = ip;
            });

            // Find port (Try 15483 first, then fallback)
            let port = port::find_specific_or_available_port(15483).unwrap_or(8080);

            // Spawn axum server
            let state_for_server = app_state.clone();
            let app_for_server = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                server::start_server(app_for_server, state_for_server, port).await;
            });

            // Spawn clipboard monitor
            let state_for_clipboard = app_state.clone();
            tauri::async_runtime::spawn(async move {
                clipboard::start_clipboard_monitor(state_for_clipboard).await;
            });

            Ok(())
        })
        .on_window_event(|window, event| match event {
            tauri::WindowEvent::CloseRequested { api, .. } => {
                // Determine if we should minimize to tray or quit
                // For this example, we always prevent close and hide unless handled via tray menu
                api.prevent_close();
                window.hide().unwrap();
            }
            _ => {}
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
