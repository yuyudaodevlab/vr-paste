use crate::auth::{create_auth_request, validate_code, create_session, validate_session, invalidate_code, check_device_limit};
use crate::network::is_private_ip;
use crate::state::AppState;
use crate::websocket::ws_handler;
use axum::{
    extract::{ConnectInfo, State},
    http::{header, HeaderMap, StatusCode},
    middleware::{self, Next},
    response::{Html, IntoResponse, Redirect, Response},
    routing::{get, post},
    Json, Router,
};
use axum_extra::extract::CookieJar;
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Emitter;
use tower_http::{cors::CorsLayer, services::ServeDir};

use tauri::Manager;

/// Resolve the `out/` directory containing Next.js exported static files.
/// Checks runtime resource directory first, then falls back to dev environment paths.
fn resolve_out_dir(app_handle: &tauri::AppHandle) -> PathBuf {
    // 1. Try to find the bundled `out` directory in the resource path (production)
    if let Ok(resource_dir) = app_handle.path().resource_dir() {
        let candidate = resource_dir.join("out");
        if candidate.exists() {
            return candidate;
        }
    }

    // 2. Try CARGO_MANIFEST_DIR (development)
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let candidate = manifest_dir.join("../out");
    if candidate.exists() {
        return candidate;
    }

    // 3. Fallback: try relative to current working directory
    let cwd_candidate = std::env::current_dir()
        .unwrap_or_default()
        .join("out");
    if cwd_candidate.exists() {
        return cwd_candidate;
    }

    // Last resort
    candidate
}

/// Serve a static HTML file from the out directory.
/// Next.js `output: 'export'` generates flat files like `quest.html`,
/// NOT `quest/index.html`, so ServeDir can't resolve directory URLs.
async fn serve_html(state: &AppState, file: &str) -> Response {
    if let Some(app_handle) = state.app_handle.read().await.as_ref() {
        let out_dir = resolve_out_dir(&app_handle);
        let path = out_dir.join(file);
        match tokio::fs::read_to_string(&path).await {
            Ok(content) => Html(content).into_response(),
            Err(_) => StatusCode::NOT_FOUND.into_response(),
        }
    } else {
        StatusCode::INTERNAL_SERVER_ERROR.into_response()
    }
}

pub async fn start_server(app_handle: tauri::AppHandle, state: Arc<AppState>, port: u16) {
    // Store app_handle in state so handlers can emit events
    *state.app_handle.write().await = Some(app_handle.clone());

    let out_dir = resolve_out_dir(&app_handle);

    let api_routes = Router::new()
        .route("/auth/request", post(handle_auth_request))
        .route("/auth/validate", post(handle_auth_validate))
        .layer(middleware::from_fn_with_state(
            state.clone(),
            private_ip_filter,
        ));

    // IMPORTANT: explicit routes MUST come before fallback_service,
    // otherwise ServeDir catches everything and API/WS routes are unreachable.
    //
    // Next.js `output: 'export'` generates flat HTML files (e.g. `quest.html`)
    // not directory-based `quest/index.html`, so we add explicit routes for
    // Quest pages that map directory-style URLs to the correct .html files.
    let app = Router::new()
        .route("/", get(|| async { Redirect::temporary("/quest") }))
        .route("/quest", get(|State(state): State<Arc<AppState>>| async move { serve_html(&state, "quest.html").await }))
        .route("/quest/", get(|State(state): State<Arc<AppState>>| async move { serve_html(&state, "quest.html").await }))
        .route("/quest/clipboard", get(serve_clipboard_with_auth))
        .route("/quest/clipboard/", get(serve_clipboard_with_auth))
        .nest("/api", api_routes)
        .route("/ws", get(ws_handler))
        .fallback_service(ServeDir::new(out_dir))
        .layer(CorsLayer::permissive())
        .with_state(state.clone());

    let addr = SocketAddr::from(([0, 0, 0, 0], port));
    *state.bound_port.write().await = port;
    *state.server_status.write().await = "running".to_string();

    app_handle.emit("server-status-changed", serde_json::json!({
        "port": port,
        "ip": *state.local_ip.read().await,
        "status": "running"
    })).unwrap();

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app.into_make_service_with_connect_info::<SocketAddr>())
        .await
        .unwrap();
}

async fn handle_auth_request(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
) -> impl IntoResponse {
    let ip = addr.ip().to_string();
    
    // Rate limit check
    let mut rate_limit = state.rate_limit.write().await;
    let now = chrono::Utc::now().timestamp_millis();
    let (count, timestamp) = rate_limit.entry(ip.clone()).or_insert((0, now));
    
    if now - *timestamp > 60000 {
        *count = 1;
        *timestamp = now;
    } else {
        *count += 1;
        if *count > 10 {
            return (StatusCode::TOO_MANY_REQUESTS, Json(serde_json::json!({ "error": "Rate limit exceeded" })));
        }
    }

    // Device limit check
    if !check_device_limit(&state).await {
        return (StatusCode::FORBIDDEN, Json(serde_json::json!({
            "error": "CONNECTION_LIMIT",
            "message": "別のデバイスが接続中です。PCの設定から同時接続数を変更できます。"
        })));
    }

    let ua = headers
        .get("user-agent")
        .and_then(|h| h.to_str().ok())
        .unwrap_or("Unknown")
        .to_string();

    let request = create_auth_request(&state, ip.clone(), ua.clone()).await;
    
    // Emit auth-request event to Tauri frontend so the ApprovalModal appears
    if let Some(app_handle) = state.app_handle.read().await.as_ref() {
        let _ = app_handle.emit("auth-request", serde_json::json!({
            "id": request.id,
            "ip": request.ip,
            "userAgent": request.user_agent,
            "createdAt": request.created_at,
            "status": request.status
        }));
    }
    
    // Log connection attempt
    {
        let mut history = state.connection_history.write().await;
        history.insert(0, crate::state::ConnectionAttempt {
            id: request.id.clone(),
            timestamp: chrono::Utc::now().timestamp_millis(),
            ip: request.ip.clone(),
            user_agent: request.user_agent.clone(),
            result: "保留".to_string(), // Pending
        });
        if history.len() > 100 { history.truncate(100); }
    }
    
    (StatusCode::OK, Json(serde_json::json!({ "requestId": request.id })))
}

async fn private_ip_filter(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: axum::extract::Request,
    next: Next,
) -> Result<Response, Response> {
    let allow_external = state.settings.read().await.allow_external_access;
    if !allow_external {
        let ip = addr.ip().to_string();
        if !is_private_ip(&ip) {
            return Err((
                StatusCode::FORBIDDEN,
                Html(r#"<!DOCTYPE html><html lang="ja"><head><meta charset="utf-8"><title>アクセス拒否</title><style>body{background:#090909;color:#e8e8ea;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0}div{text-align:center;padding:40px;border:1px solid #2a2a30;border-radius:12px;background:#111114}h1{color:#ef4444;margin-bottom:16px}p{color:#8888a0}</style></head><body><div><h1>403</h1><p>このサービスはプライベートネットワーク内からのみアクセス可能です。</p></div></body></html>"#.to_string()),
            ).into_response());
        }
    }
    Ok(next.run(req).await)
}

async fn serve_clipboard_with_auth(
    State(state): State<Arc<AppState>>,
    jar: CookieJar,
) -> Response {
    if let Some(cookie) = jar.get("crossclip_token") {
        if validate_session(&state, cookie.value()).await.is_some() {
            return serve_html(&state, "quest/clipboard.html").await;
        }
    }
    Redirect::temporary("/quest").into_response()
}

#[derive(serde::Deserialize)]
struct ValidateRequest {
    code: String,
    #[serde(rename = "requestId")]
    request_id: String,
}

async fn handle_auth_validate(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    headers: HeaderMap,
    Json(body): Json<ValidateRequest>,
) -> Response {
    let ip = addr.ip().to_string();

    // Rate limit check
    {
        let mut rate_limit = state.rate_limit.write().await;
        let now = chrono::Utc::now().timestamp_millis();
        let (count, timestamp) = rate_limit.entry(ip.clone()).or_insert((0, now));
        if now - *timestamp > 60000 {
            *count = 1;
            *timestamp = now;
        } else {
            *count += 1;
            if *count > 10 {
                return (StatusCode::TOO_MANY_REQUESTS, Json(serde_json::json!({ "error": "Rate limit exceeded" }))).into_response();
            }
        }
    }

    let lockout = state.settings.read().await.code_lockout_minutes;
    
    match validate_code(&state, &body.code, &body.request_id, &ip, lockout).await {
        Ok(_token) => {
            let ua = headers
                .get("user-agent")
                .and_then(|h| h.to_str().ok())
                .unwrap_or("Unknown")
                .to_string();

            let expiry_days = state.settings.read().await.session_expiry_days;
            let session = create_session(&state, ip.clone(), ua.clone(), expiry_days).await;
            
            // Clean up the used approval code
            invalidate_code(&state, &body.code).await;

            // Remove the pending request
            state.pending_requests.write().await.remove(&body.request_id);

            // Register as connected device
            let device = crate::state::DeviceInfo {
                id: session.device_id.clone(),
                ip: ip.clone(),
                user_agent: ua.clone(),
                nickname: None,
                connected_at: chrono::Utc::now().timestamp_millis(),
            };
            state.connected_devices.write().await.insert(session.device_id.clone(), device.clone());

            // Emit events to PC frontend
            if let Some(app_handle) = state.app_handle.read().await.as_ref() {
                let _ = app_handle.emit("device-connected", serde_json::json!({
                    "id": device.id,
                    "ip": device.ip,
                    "userAgent": device.user_agent,
                    "connectedAt": device.connected_at
                }));
                let _ = app_handle.emit("auth-completed", serde_json::json!({
                    "requestId": body.request_id,
                    "deviceId": session.device_id
                }));
            }

            // Update connection history to success
            {
                let mut history = state.connection_history.write().await;
                if let Some(entry) = history.iter_mut().find(|e| e.id == body.request_id) {
                    entry.result = "承認".to_string();
                } else {
                    history.insert(0, crate::state::ConnectionAttempt {
                        id: body.request_id.clone(),
                        timestamp: chrono::Utc::now().timestamp_millis(),
                        ip: ip.clone(),
                        user_agent: ua.clone(),
                        result: "承認".to_string(),
                    });
                    if history.len() > 100 { history.truncate(100); }
                }
            }

            // Build response with Set-Cookie header
            let max_age_seconds = expiry_days as i64 * 24 * 60 * 60;
            let cookie_value = format!(
                "crossclip_token={}; SameSite=Strict; Max-Age={}; Path=/",
                session.token, max_age_seconds
            );

            (
                StatusCode::OK,
                [(header::SET_COOKIE, cookie_value)],
                Json(serde_json::json!({
                    "success": true,
                    "deviceId": session.device_id
                }))
            ).into_response()
        }
        Err((reason, attempts)) => {
            // Update connection history to denied/locked
            {
                let mut history = state.connection_history.write().await;
                if let Some(entry) = history.iter_mut().find(|e| e.id == body.request_id) {
                    entry.result = if reason == "LOCKED" { "拒否 (LOCKED)".to_string() } else { "拒否".to_string() };
                }
            }

            let status = if reason == "LOCKED" {
                StatusCode::TOO_MANY_REQUESTS
            } else {
                StatusCode::UNAUTHORIZED
            };
            (
                status,
                Json(serde_json::json!({
                    "error": reason,
                    "attemptsRemaining": attempts
                }))
            ).into_response()
        }
    }
}
