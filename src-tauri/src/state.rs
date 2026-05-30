use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::AppHandle;
use tokio::sync::{broadcast, RwLock};

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct Settings {
    pub background_mode: bool,
    pub auto_start: bool,
    pub port_mode: String,
    pub manual_port: u16,
    pub port_range_start: u16,
    pub port_range_end: u16,
    pub max_devices: u32,
    pub allow_external_access: bool,
    pub session_expiry_days: u32,
    pub code_expiry_minutes: u32,
    pub code_lockout_minutes: u32,
    pub max_log_entries: u32,
    pub persist_logs: bool,
    pub debounce_ms: u32,
    pub debug_mode: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            background_mode: true,
            auto_start: false,
            port_mode: "random".to_string(),
            manual_port: 0,
            port_range_start: 8000,
            port_range_end: 9000,
            max_devices: 1,
            allow_external_access: false,
            session_expiry_days: 180,
            code_expiry_minutes: 5,
            code_lockout_minutes: 10,
            max_log_entries: 15,
            persist_logs: true,
            debounce_ms: 300,
            debug_mode: false,
        }
    }
}

#[derive(Clone, Serialize, Debug)]
pub struct DeviceInfo {
    pub id: String,
    pub ip: String,
    #[serde(rename = "userAgent")]
    pub user_agent: String,
    pub nickname: Option<String>,
    #[serde(rename = "connectedAt")]
    pub connected_at: i64,
}

#[derive(Clone, Serialize, Debug)]
pub struct ClipboardEntry {
    pub id: String,
    pub text: String,
    pub source: String,
    pub timestamp: i64,
}

#[derive(Clone, Serialize, Debug)]
pub struct AuthRequest {
    pub id: String,
    pub ip: String,
    #[serde(rename = "userAgent")]
    pub user_agent: String,
    #[serde(rename = "createdAt")]
    pub created_at: i64,
    pub status: String,
}

#[derive(Clone, Serialize, Debug)]
pub struct LogEntry {
    pub id: String,
    pub timestamp: i64,
    pub level: String,
    pub message: String,
    pub source: String,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
pub struct SessionInfo {
    pub token: String,
    pub device_id: String,
    pub ip: String,
    pub user_agent: String,
    pub created_at: i64,
    pub expires_at: i64,
}

pub struct AppState {
    pub server_status: RwLock<String>,
    pub bound_port: RwLock<u16>,
    pub local_ip: RwLock<String>,
    
    pub connected_devices: RwLock<HashMap<String, DeviceInfo>>,
    pub clipboard_log: RwLock<Vec<ClipboardEntry>>,
    
    pub pending_requests: RwLock<HashMap<String, AuthRequest>>,
    pub active_codes: RwLock<HashMap<String, (String, i64)>>, // code -> (requestId, expiry)
    
    // IP -> (attempts, locked_until)
    pub code_attempts: RwLock<HashMap<String, (u32, Option<i64>)>>,
    
    // IP -> count limit tracking
    pub rate_limit: RwLock<HashMap<String, (u32, i64)>>,
    
    pub settings: RwLock<Settings>,
    pub debug_logs: RwLock<Vec<LogEntry>>,
    
    pub ws_broadcast: broadcast::Sender<String>,

    pub active_sessions: RwLock<HashMap<String, SessionInfo>>,  // token -> SessionInfo

    /// Tauri AppHandle for emitting events from the Axum server context
    pub app_handle: RwLock<Option<AppHandle>>,
}

impl AppState {
    pub fn new() -> Arc<Self> {
        let (tx, _) = broadcast::channel(100);
        Arc::new(Self {
            server_status: RwLock::new("stopped".to_string()),
            bound_port: RwLock::new(0),
            local_ip: RwLock::new("0.0.0.0".to_string()),
            connected_devices: RwLock::new(HashMap::new()),
            clipboard_log: RwLock::new(Vec::new()),
            pending_requests: RwLock::new(HashMap::new()),
            active_codes: RwLock::new(HashMap::new()),
            code_attempts: RwLock::new(HashMap::new()),
            rate_limit: RwLock::new(HashMap::new()),
            settings: RwLock::new(Settings::default()),
            debug_logs: RwLock::new(Vec::new()),
            ws_broadcast: tx,
            active_sessions: RwLock::new(HashMap::new()),
            app_handle: RwLock::new(None),
        })
    }
}
