use crate::auth::create_auth_request;
use crate::network::is_private_ip;
use crate::state::AppState;
use crate::websocket::ws_handler;
use axum::{
    extract::{ConnectInfo, State},
    http::{HeaderMap, StatusCode},
    middleware::{self, Next},
    response::{Html, IntoResponse, Redirect, Response},
    routing::{get, post},
    Json, Router,
};
use std::net::SocketAddr;
use std::path::PathBuf;
use std::sync::Arc;
use tauri::Emitter;
use tower_http::{cors::CorsLayer, services::ServeDir};

/// Resolve the `out/` directory containing Next.js exported static files.
/// Uses CARGO_MANIFEST_DIR (compile-time) for reliability, with runtime fallback.
fn resolve_out_dir() -> PathBuf {
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let candidate = manifest_dir.join("../out");
    if candidate.exists() {
        return candidate;
    }
    // Fallback: try relative to current working directory
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
async fn serve_html(file: &str) -> Response {
    let out_dir = resolve_out_dir();
    let path = out_dir.join(file);
    match tokio::fs::read_to_string(&path).await {
        Ok(content) => Html(content).into_response(),
        Err(_) => StatusCode::NOT_FOUND.into_response(),
    }
}

pub async fn start_server(app_handle: tauri::AppHandle, state: Arc<AppState>, port: u16) {
    // Store app_handle in state so handlers can emit events
    *state.app_handle.write().await = Some(app_handle.clone());

    let out_dir = resolve_out_dir();

    let api_routes = Router::new()
        .route("/auth/request", post(handle_auth_request))
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
        .route("/quest", get(|| async { serve_html("quest.html").await }))
        .route("/quest/", get(|| async { serve_html("quest.html").await }))
        .route("/quest/clipboard", get(|| async { serve_html("quest/clipboard.html").await }))
        .route("/quest/clipboard/", get(|| async { serve_html("quest/clipboard.html").await }))
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
    
    (StatusCode::OK, Json(serde_json::json!({ "requestId": request.id })))
}

async fn private_ip_filter(
    State(state): State<Arc<AppState>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    req: axum::extract::Request,
    next: Next,
) -> Result<Response, StatusCode> {
    let allow_external = state.settings.read().await.allow_external_access;
    if !allow_external {
        let ip = addr.ip().to_string();
        if !is_private_ip(&ip) {
            return Err(StatusCode::FORBIDDEN);
        }
    }
    Ok(next.run(req).await)
}
