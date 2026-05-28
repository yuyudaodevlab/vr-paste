use crate::state::{AppState, AuthRequest};
use chrono::Utc;
use rand::Rng;
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

        let code;
        let expiry;
        {
            let mut rng = rand::thread_rng();
            code = format!("{:06}", rng.gen_range(0..1000000));
            expiry = Utc::now().timestamp_millis() + (expiry_minutes as i64 * 60 * 1000);
        }

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
