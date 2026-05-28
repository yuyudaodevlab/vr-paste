use crate::state::{AppState, ClipboardEntry};
use arboard::Clipboard;
use chrono::Utc;
use std::sync::Arc;
use tokio::time::{sleep, Duration};
use uuid::Uuid;

pub async fn start_clipboard_monitor(state: Arc<AppState>) {
    let mut clipboard = match Clipboard::new() {
        Ok(c) => c,
        Err(_) => return,
    };

    let mut last_text = match clipboard.get_text() {
        Ok(t) => t,
        Err(_) => String::new(),
    };

    loop {
        if let Ok(text) = clipboard.get_text() {
            if text != last_text && !text.is_empty() {
                last_text = text.clone();

                let entry = ClipboardEntry {
                    id: Uuid::new_v4().to_string(),
                    text: text.clone(),
                    source: "pc".to_string(),
                    timestamp: Utc::now().timestamp_millis(),
                };

                let mut log = state.clipboard_log.write().await;
                log.insert(0, entry.clone());
                
                let max_entries = state.settings.read().await.max_log_entries as usize;
                if log.len() > max_entries {
                    log.truncate(max_entries);
                }

                // Broadcast
                let msg = serde_json::json!({
                    "type": "CLIPBOARD_UPDATE",
                    "payload": {
                        "text": entry.text,
                        "source": entry.source,
                        "timestamp": entry.timestamp
                    }
                });
                let _ = state.ws_broadcast.send(msg.to_string());
            }
        }
        sleep(Duration::from_millis(500)).await;
    }
}
