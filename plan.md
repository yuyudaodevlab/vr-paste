# Build Prompt: CrossClip — Cross-Device Clipboard Sharing App (Quest ↔ PC)

## Project Overview

Build a desktop application called **CrossClip** using **Tauri v2 + Next.js (App Router)**. The app enables real-time clipboard sharing between a Meta Quest headset (via its built-in browser) and a Windows/macOS/Linux PC.

**Architecture**:
- The PC acts as an HTTP/WebSocket server.
- The Quest accesses it via the Quest's built-in browser.
- The PC GUI is built with Next.js (App Router) and wrapped by Tauri v2.
- The web UI served to the Quest browser is also part of the Next.js build (separate route group or static export).
- All UI text and messages must be in **Japanese**.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Desktop shell | Tauri v2 (Rust backend) |
| PC GUI + Quest Web UI | Next.js 14+ (App Router), React, TypeScript |
| Styling | Tailwind CSS v3 + CSS variables, dark theme only |
| Real-time comms | WebSocket via axum (Rust) |
| State management | Zustand |
| Persistence | tauri-plugin-store (settings, auth tokens, clipboard log) |
| Clipboard access | tauri-plugin-clipboard-manager |
| System tray | Tauri built-in tray API |

---

## Core Features

### 1. Dynamic Port Assignment

- On startup, if no port is manually configured, **randomly select an unused registered port** in the range **1024–49151**.
- Before binding, verify the selected port is not in use (check via a TCP socket bind attempt).
- Retry up to 10 times with a new random port if the selected one is occupied.
- Display the active port prominently in the PC GUI at all times.
- Persist the last-used port in app settings.
- Manual override is available in Settings (see Settings section).

### 2. Background Operation (System Tray)

- When the user closes the main window, minimize to the **system tray** instead of quitting (if background mode is enabled in Settings).
- Tray icon context menu items:
  - 「ウィンドウを開く」
  - 「サーバーを停止 / 起動」
  - 「CrossClipを終了」
- The WebSocket server continues running while in the tray.
- If background mode is disabled in Settings, closing the window quits the app and stops the server.

### 3. Clipboard Synchronization System

#### PC-side (Tauri window — Japanese UI):

- **接続状況パネル**: Server running/stopped status, current `IP:PORT`, QR code button (generates QR for `http://<LOCAL_IP>:<PORT>` to simplify Quest URL entry).
- **接続デバイス一覧**: List of currently connected devices (IP, nickname if set, disconnect / revoke auth buttons).
- **クリップボードパネル**: Current PC clipboard content preview (truncated at 300 chars with 「全文表示」 expand button). Buttons: 「コピー」「クリア」.
- **クリップボードログ**: Scrollable reverse-chronological history table. Each entry shows: timestamp, content preview (truncated), source badge (「PC」 or 「Quest」), 「再コピー」 button. 「ログをクリア」 button at the top.

#### Quest browser-side (web page served by PC — Japanese UI):

- Large **テキスト入力エリア** labeled 「送信するテキスト」.
- As the user types, sync content to the PC clipboard via WebSocket with a configurable debounce (default **300ms**).
- Read-only display panel: 「現在のPCクリップボード」 — updated in real-time via WebSocket push from PC.
- 「クリップボードにコピー」 button: copies the PC clipboard value to the Quest's local clipboard using the browser Clipboard API (`navigator.clipboard.writeText`).
- Connection status badge: 「● 接続中」(cyan) / 「○ 切断」(red).
- 「クリア」 button to clear the input area without pushing to PC.

---

## Authentication System (First Connection)

### Quest — Step 1: Connection Request Page

- If no valid `crossclip_token` cookie exists, load the **接続リクエストページ** at `http://<PC_IP>:<PORT>/`.
- Display the PC's IP and port for confirmation.
- Single large button: 「PCに接続リクエストを送る」
- On click: POST to `/api/auth/request` with the browser's User-Agent. Transition to a waiting screen: 「PC側で承認をお待ちください...」 with a spinner.
- Poll or use a SSE/WebSocket channel to receive the PC's decision.

### PC — Step 2: Approval Modal Dialog

- When a connection request arrives, display a **modal overlay** in the PC GUI (cannot be dismissed by clicking outside):
  - Title: 「新しい接続リクエスト」
  - 接続元IPアドレス: `<IP>`
  - ユーザーエージェント: `<UA string>`
  - Countdown timer: 「残り XX 秒」 (60-second auto-deny countdown with a visual progress ring)
  - Button 「承認する」 (cyan/green)
  - Button 「拒否する」 (red)
- **If rejected or timed out**:
  - Server responds to Quest with rejection.
  - Quest shows: 「接続が拒否されました」 with a 「再試行」 button.
- **If approved**:
  - Server generates a **6-digit numeric approval code** using a CSPRNG.
  - Modal transitions to show: 「承認コード」 with the 6 digits displayed in large, spaced digit boxes.
  - Code expires after **5 minutes** (configurable in Settings). Show a countdown.
  - Button 「コードを無効にする」 to manually expire it.

### Quest — Step 3: Code Entry

- Quest page transitions to the code entry screen: 「PCに表示された6桁のコードを入力してください」
- UI: 6 individual digit input boxes (auto-focus next on input).
- 「確認」 submit button (disabled until all 6 digits filled).
- **On correct code**:
  - Server generates a session token (UUID v4), stores it server-side in `tauri-plugin-store` with metadata (IP, UA, creation time, expiry).
  - Returns the token as a cookie: name `crossclip_token`, `HttpOnly`, `SameSite=Strict`, **180-day expiry** (configurable in Settings).
  - Quest redirects to the main clipboard page.
- **On incorrect code**: show 「コードが正しくありません」 error. Allow retry up to **5 attempts**. After 5 failures, lock for 10 minutes and show: 「試行回数が上限に達しました。10分後に再試行してください。」
- **Subsequent connections**: If `crossclip_token` cookie exists and matches a stored valid session → skip auth entirely and load the main clipboard page directly.

---

## Multi-Device Connection Limit

- **Default**: maximum **1 device** connected at a time.
- When a second device attempts to connect while one is already connected, show an error on the Quest: 「別のデバイスが接続中です。PCの設定から同時接続数を変更できます。」
- **Configurable in Settings**: 1 / 2 / 5 / 無制限 (unlimited).
- When a new device connects and the limit is reached, the PC GUI shows a notification asking whether to disconnect the oldest device or reject the new one.

---

## PC GUI Design — Dark Industrial-Minimal

**Color palette** (use as CSS variables):
```css
--bg-base:      #090909;
--bg-surface:   #111114;
--bg-elevated:  #1a1a1e;
--border:       #2a2a30;
--accent-cyan:  #00d4ff;
--accent-amber: #f59e0b;
--accent-red:   #ef4444;
--text-primary: #e8e8ea;
--text-secondary: #8888a0;
--text-muted:   #444458;
```

**Typography**:
- `JetBrains Mono` — IP addresses, port numbers, codes, log entries, timestamps.
- `Noto Sans JP` — All Japanese body text, labels, buttons.

**Layout**: Fixed left sidebar (64px icon-only collapsed / 220px expanded) for navigation. Main content area with 24px padding. Cards with `--bg-surface` background and 1px `--border` borders, 8px border-radius.

**Animations**:
- Page transitions: 150ms fade + 8px slide-up.
- Modal: 200ms scale from 0.95 + fade.
- Connection status pulse: CSS keyframe animation on the status dot.
- Clipboard log new-entry: flash highlight for 500ms on insertion.

**Navigation items** (sidebar):
- 🖥 メイン
- ⚙ 設定
- 🐛 デバッグ (hidden unless debug mode enabled in Settings)

---

## Quest Browser UI Design — Dark Modern, VR-Optimized

- Same CSS color variables as PC GUI.
- Single-page app, full viewport.
- Optimized for **Meta Quest browser** (treat as ~1280×720 Chromium).
- Minimum font size: **18px** (readability at arm's length in VR).
- Minimum tap target size: **56px height**.
- No hover-dependent interactions (VR pointer may not reliably trigger hover).
- Animated background: slow-moving dark grid pattern (`background-size: 40px 40px`, grid lines at 5% white opacity, animated subtle pan).
- Auth flow pages use centered card layout (max-width 480px).
- Main clipboard page uses two-column layout on wide viewports: left = input, right = PC clipboard display.

---

## Settings Page (設定) — PC GUI

### サーバー設定

| 設定項目 | 型 | デフォルト | 備考 |
|---|---|---|---|
| バックグラウンド処理 | トグル | ON | ウィンドウを閉じてもサーバーを継続 |
| システム起動時に自動起動 | トグル | OFF | OS startup entry |
| ポート指定モード | セレクト | ランダム | ランダム / 直接指定 / 範囲指定 |
| ポート番号 | 数値入力 | — | 直接指定時のみ表示 (1024–49151) |
| ポート範囲 (開始〜終了) | 数値入力×2 | — | 範囲指定時のみ表示 |
| 同時接続デバイス数上限 | セレクト | 1台 | 1 / 2 / 5 / 無制限 |
| プライベートネットワーク外アクセスを許可 | トグル | **OFF** | ONにするとき赤い警告バナーを表示（下記参照） |

**外部アクセス警告バナー**（トグルをONにした瞬間に表示、確認が必要）:
> ⚠️ **セキュリティ警告**
> プライベートネットワーク外からの接続を許可しようとしています。
> 信頼できないネットワーク（公共Wi-Fiなど）での使用は、第三者があなたのクリップボード内容にアクセスできる可能性があります。
> この設定を有効にしますか？
> 「はい、リスクを理解した上で有効にする」 / 「キャンセル」

### セキュリティ設定

| 設定項目 | 型 | デフォルト | 備考 |
|---|---|---|---|
| セッション有効期限 | セレクト | 180日 | 30日 / 90日 / 180日 / 永続 |
| 承認コード有効期限 | 数値スライダー | 5分 | 1〜30分 |
| 承認コード誤入力ロック時間 | 数値入力 | 10分 | — |
| 接続デバイス一覧と認証取り消し | リスト+ボタン | — | デバイスごとにセッション失効ボタン |
| すべての認証情報を削除 | 危険ボタン（赤） | — | 確認ダイアログ必須 |

### クリップボード設定

| 設定項目 | 型 | デフォルト | 備考 |
|---|---|---|---|
| ログの最大保持件数 | スライダー | **15件** | 5〜500件 |
| アプリ終了時にログを保持 | トグル | ON | — |
| クリップボード同期デバウンス時間 | スライダー | 300ms | 100〜2000ms |

### デバッグ設定

| 設定項目 | 型 | デフォルト |
|---|---|---|
| デバッグメニューを表示 | トグル | OFF |

---

## Debug Screen (デバッグ) — Separate Page

Accessible from the sidebar only when debug mode is enabled. Use a terminal/console aesthetic (monospace font, very dark background `#060608`).

**Tabs**:

1. **通信ログ** — Real-time scrollable WebSocket message log.
   - Columns: タイムスタンプ, 方向(IN↓/OUT↑), メッセージタイプ, ペイロード（省略表示）
   - Color-coded rows: cyan for outbound, white for inbound, red for errors.
   - Auto-scroll toggle.

2. **アプリログ** — Combined Rust + JS log stream.
   - Filterable by level: DEBUG / INFO / WARN / ERROR (toggle chips).
   - Free-text search box.
   - Log level badge colors: gray / cyan / amber / red.

3. **接続履歴** — Table of all past connection attempts.
   - Columns: 日時, IPアドレス, ユーザーエージェント, 結果（承認/拒否/タイムアウト）

4. **サーバー状態** — Live stats panel:
   - アップタイム, アクティブ接続数, 送信メッセージ数, 受信メッセージ数, 現在のポート

**Controls** (top bar):
- 「ログをクリア」
- 「ログをファイルに保存」 → exports as `.txt` with timestamp filename via Tauri's file save dialog.

---

## WebSocket Protocol (JSON Messages)

```typescript
// Quest → PC
{ type: "CLIPBOARD_PUSH",    token: string, payload: { text: string } }
{ type: "AUTH_CODE_SUBMIT",  payload: { code: string }, requestId: string }

// PC → Quest (broadcast / targeted)
{ type: "CLIPBOARD_UPDATE",  payload: { text: string, source: "pc" | "quest", timestamp: number } }
{ type: "AUTH_REJECTED",     payload: { reason: "denied" | "timeout" } }
{ type: "AUTH_CODE_READY" }   // Approval given, code shown on PC — Quest should show code entry UI
{ type: "AUTH_SUCCESS",      payload: { token: string, expiresAt: number } }
{ type: "AUTH_CODE_INVALID", payload: { attemptsRemaining: number } }
{ type: "AUTH_CODE_EXPIRED" }
{ type: "AUTH_LOCKED",       payload: { unlockAt: number } }
{ type: "CONNECTION_LIMIT",  payload: { maxDevices: number } }
{ type: "PING" } / { type: "PONG" }  // keep-alive every 30s
```

Validate the `token` field on every non-auth WebSocket message server-side. Drop the message and send an `AUTH_REJECTED` response if invalid.

---

## Security Requirements

- All tokens generated with a CSPRNG (Rust `rand::rngs::OsRng`).
- Tokens stored **server-side** in `tauri-plugin-store`. Cookie value alone is not trusted — must match a stored record.
- If "外部アクセス許可" is **OFF** (default): reject WebSocket upgrades and HTTP requests from IPs outside RFC 1918 ranges:
  - `10.0.0.0/8`
  - `172.16.0.0/12`
  - `192.168.0.0/16`
  - `127.0.0.0/8`
  - `::1`
  - Return HTTP 403 with Japanese error page: 「このサービスはプライベートネットワーク内からのみアクセス可能です。」
- Rate-limit auth endpoints: max 10 requests/minute per IP.
- All approval codes expire after the configured time (default 5 min); server-side expiry check.

---

## Suggested File Structure

```
crossclip/
├── src-tauri/
│   ├── src/
│   │   ├── main.rs            # Tauri entry point, plugin registration
│   │   ├── server.rs          # axum HTTP + WebSocket server
│   │   ├── clipboard.rs       # Read/write PC clipboard via arboard
│   │   ├── auth.rs            # Token store, code generation, session management
│   │   ├── port.rs            # Random port selection & availability check
│   │   ├── network.rs         # Private IP validation, network interface detection
│   │   └── tray.rs            # System tray icon and menu
│   └── Cargo.toml
├── src/
│   ├── app/                   # Next.js App Router (PC GUI)
│   │   ├── layout.tsx         # Root layout with sidebar
│   │   ├── page.tsx           # メイン画面
│   │   ├── settings/
│   │   │   └── page.tsx       # 設定画面
│   │   └── debug/
│   │       └── page.tsx       # デバッグ画面
│   ├── web/                   # Quest browser UI (route group or static)
│   │   ├── app/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx       # Auth flow entry
│   │   │   └── clipboard/
│   │   │       └── page.tsx   # Main clipboard page
│   ├── components/
│   │   ├── pc/                # PC GUI components
│   │   │   ├── Sidebar.tsx
│   │   │   ├── ClipboardPanel.tsx
│   │   │   ├── ClipboardLog.tsx
│   │   │   ├── ConnectionList.tsx
│   │   │   ├── ApprovalModal.tsx
│   │   │   └── QRCodeModal.tsx
│   │   └── quest/             # Quest browser components
│   │       ├── ClipboardInput.tsx
│   │       ├── PCClipboardDisplay.tsx
│   │       ├── AuthRequest.tsx
│   │       ├── CodeEntry.tsx
│   │       └── StatusBadge.tsx
│   ├── hooks/
│   │   ├── useWebSocket.ts
│   │   ├── useClipboard.ts
│   │   └── useSettings.ts
│   └── store/
│       ├── clipboardStore.ts
│       ├── connectionStore.ts
│       └── settingsStore.ts
└── package.json
```

---

## Additional Requirements

- All user-facing strings (labels, buttons, toasts, error messages, dialogs) must be in **Japanese**.
- Use `react-hot-toast` (or `sonner`) for non-blocking toast notifications.
- QR code generation: use the `qrcode` npm package; render inline as SVG.
- Target platforms: Windows 10+, macOS 12+, Linux x86_64.
- Minimum Tauri version: **2.0**.
- Node.js ≥ 20 required.
- Rust edition: 2021.
- The Tauri window title: `CrossClip`.
- App window minimum size: 900×600px.
- On first launch (no settings file), show a brief onboarding screen: display the server URL and QR code, and explain how to connect with Quest.

---

*End of prompt — CrossClip v1.0 specification*
