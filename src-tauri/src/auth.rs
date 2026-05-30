use crate::state::{AppState, AuthRequest, SessionInfo};
use chrono::Utc;
use rand::{Rng, rngs::OsRng};
use std::sync::Arc;
use uuid::Uuid;

pub async fn create_auth_request(
    state: &Arc<AppState>,
    ip: String,
    user_agent: String,
) -> AuthRequest {
    let id = Uuid::new_v4().to_string();
    let request = AuthRequest {
        id: id.clone(),
        ip,
        user_agent,
        created_at: Utc::now().timestamp_millis(),
        status: "pending".to_string(),
    };

    let mut requests = state.pending_requests.write().await;
    requests.insert(id, request.clone());

    request
}

pub async fn approve_request(
    state: &Arc<AppState>,
    request_id: &str,
    expiry_minutes: u32,
) -> Option<String> {
    let mut requests = state.pending_requests.write().await;
    if let Some(request) = requests.get_mut(request_id) {
        request.status = "approved".to_string();
        let code = format!("{:06}", OsRng.gen_range(0..1000000u32));
        let expiry = Utc::now().timestamp_millis() + (expiry_minutes as i64 * 60 * 1000);

        let mut active_codes = state.active_codes.write().await;
        active_codes.insert(code.clone(), (request_id.to_string(), expiry));

        return Some(code);
    }
    None
}

pub async fn reject_request(state: &Arc<AppState>, request_id: &str) {
    let mut requests = state.pending_requests.write().await;
    if let Some(request) = requests.get_mut(request_id) {
        request.status = "rejected".to_string();
    }
    requests.remove(request_id);
}

pub async fn validate_code(
    state: &Arc<AppState>,
    code: &str,
    request_id: &str,
    ip: &str,
    lockout_minutes: u32,
) -> Result<String, (String, u32)> { // Returns Ok(Token) or Err((Reason, AttemptsRemaining))
    let mut attempts_lock = state.code_attempts.write().await;
    let now = Utc::now().timestamp_millis();
    
    let (attempts, locked_until) = attempts_lock.entry(ip.to_string()).or_insert((0, None));
    
    if let Some(locked) = locked_until {
        if now < *locked {
            return Err(("LOCKED".to_string(), 0));
        } else {
            *locked_until = None;
            *attempts = 0;
        }
    }

    let active_codes = state.active_codes.read().await;
    
    if let Some((stored_request_id, expiry)) = active_codes.get(code) {
        if stored_request_id == request_id {
            if now > *expiry {
                return Err(("EXPIRED".to_string(), 0));
            }
            
            // Valid code
            *attempts = 0;
            return Ok(Uuid::new_v4().to_string());
        }
    }
    
    // Invalid code
    *attempts += 1;
    let max_attempts = 5;
    let remaining = if *attempts >= max_attempts {
        *locked_until = Some(now + (lockout_minutes as i64 * 60 * 1000));
        0
    } else {
        max_attempts - *attempts
    };
    
    Err(("INVALID".to_string(), remaining))
}

pub async fn create_session(
    state: &Arc<AppState>,
    ip: String,
    user_agent: String,
    expiry_days: u32,
) -> SessionInfo {
    let token = Uuid::new_v4().to_string();
    let device_id = Uuid::new_v4().to_string();
    let now = Utc::now().timestamp_millis();
    let expires_at = now + (expiry_days as i64 * 24 * 60 * 60 * 1000);

    let session = SessionInfo {
        token: token.clone(),
        device_id: device_id.clone(),
        ip: ip.clone(),
        user_agent: user_agent.clone(),
        created_at: now,
        expires_at,
    };

    state.active_sessions.write().await.insert(token.clone(), session.clone());
    session
}

pub async fn validate_session(state: &Arc<AppState>, token: &str) -> Option<SessionInfo> {
    let sessions = state.active_sessions.read().await;
    if let Some(session) = sessions.get(token) {
        let now = Utc::now().timestamp_millis();
        if now < session.expires_at {
            return Some(session.clone());
        }
    }
    None
}

pub async fn revoke_session(state: &Arc<AppState>, token: &str) {
    state.active_sessions.write().await.remove(token);
}

pub async fn revoke_all_sessions_impl(state: &Arc<AppState>) {
    state.active_sessions.write().await.clear();
}

pub async fn invalidate_code(state: &Arc<AppState>, code: &str) {
    state.active_codes.write().await.remove(code);
}

pub async fn check_device_limit(state: &Arc<AppState>) -> bool {
    let settings = state.settings.read().await;
    let max = settings.max_devices;
    if max == 0 {
        return true; // unlimited
    }
    let sessions = state.active_sessions.read().await;
    let now = Utc::now().timestamp_millis();
    let active_count = sessions.values().filter(|s| s.expires_at > now).count() as u32;
    active_count < max
}
