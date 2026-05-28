# CrossClip セットアップガイド

## 前提条件

以下のツールをインストールしてください。

### 1. Node.js (v18 以上)

公式サイトからインストール: https://nodejs.org/

```powershell
# バージョン確認
node --version
npm --version
```

### 2. Rust ツールチェーン

公式サイトからインストール: https://rustup.rs/

```powershell
# インストール後、バージョン確認
rustc --version
cargo --version
```

### 3. Visual Studio Build Tools (Windows)

Rust のコンパイルに必要です。

1. https://visualstudio.microsoft.com/visual-cpp-build-tools/ からダウンロード
2. インストーラーで **「C++ によるデスクトップ開発」** ワークロードを選択
3. インストール完了後、PCを再起動

### 4. WebView2 Runtime (Windows 10)

Windows 11 にはプリインストール済みです。Windows 10 の場合:
https://developer.microsoft.com/en-us/microsoft-edge/webview2/

---

## 開発環境セットアップ

### 依存パッケージのインストール

```powershell
# プロジェクトのルートディレクトリで実行
cd c:\project\vr-paste

# Node.js 依存パッケージをインストール
npm install
```

### 開発サーバーの起動

```powershell
npm run tauri dev
```

初回実行時は Rust の依存クレートのコンパイルに **5〜10分** かかります。
2回目以降はキャッシュにより高速に起動します。

起動すると:
- Next.js 開発サーバーが `http://localhost:3000` で起動
- Tauri のネイティブウィンドウが開く
- 内蔵 Axum サーバーがランダムポートで起動（Quest 接続用）

---

## インストーラー EXE のビルド

### ビルドコマンド

```powershell
# プロジェクトのルートディレクトリで実行
npm run tauri build
```

### ビルド出力

ビルドが完了すると、以下のディレクトリにインストーラーが生成されます:

```
src-tauri/target/release/bundle/
├── msi/
│   └── CrossClip_1.0.0_x64_en-US.msi    ← MSI インストーラー
└── nsis/
    └── CrossClip_1.0.0_x64-setup.exe     ← NSIS セットアップ EXE
```

| ファイル | 形式 | 用途 |
|---------|------|------|
| `CrossClip_1.0.0_x64-setup.exe` | NSIS | **推奨**。ダブルクリックでインストール |
| `CrossClip_1.0.0_x64_en-US.msi` | MSI | 企業環境でのサイレントインストール向け |

### ポータブル実行ファイル

インストーラー不要の単体 EXE も生成されます:

```
src-tauri/target/release/crossclip.exe
```

> **注意**: ポータブル版は自動更新やスタートメニュー登録は行いません。

---

## トラブルシューティング

### `npm run tauri dev` で何も起きない

1. **npm install を実行したか確認**:
   ```powershell
   npm install
   ```

2. **Rust がインストールされているか確認**:
   ```powershell
   rustc --version
   ```
   エラーが出る場合は https://rustup.rs/ からインストール

3. **Visual Studio Build Tools がインストールされているか確認**:
   Rust のコンパイルには C++ ビルドツールが必要です

4. **詳細なエラーログを確認**:
   ```powershell
   npx tauri dev 2>&1
   ```

### ビルドエラー: `linker 'link.exe' not found`

Visual Studio Build Tools がインストールされていません。
上記「前提条件 3」を参照してください。

### Quest ブラウザから接続できない

1. PC と Quest が**同じ Wi-Fi ネットワーク**に接続されていることを確認
2. PC の CrossClip ウィンドウに表示される **IP アドレスとポート番号** を Quest のブラウザに入力
   - 例: `http://192.168.1.100:8234`
3. Windows ファイアウォールでポートが許可されているか確認:
   ```powershell
   # 管理者権限で実行
   netsh advfirewall firewall add rule name="CrossClip" dir=in action=allow protocol=tcp localport=1024-49151
   ```

---

## プロジェクト構成

```
vr-paste/
├── src/                  # Next.js フロントエンド (React)
│   ├── app/              # ページコンポーネント
│   │   ├── page.tsx      # PC メイン画面
│   │   ├── quest/        # Quest ブラウザ用画面
│   │   ├── settings/     # 設定画面
│   │   └── debug/        # デバッグ画面
│   ├── components/       # UI コンポーネント
│   ├── hooks/            # カスタムフック
│   ├── lib/              # ユーティリティ・定数
│   └── store/            # Zustand ストア
├── src-tauri/            # Tauri バックエンド (Rust)
│   ├── src/
│   │   ├── main.rs       # エントリーポイント
│   │   ├── server.rs     # Axum HTTP/WS サーバー
│   │   ├── websocket.rs  # WebSocket ハンドラー
│   │   ├── auth.rs       # 認証ロジック
│   │   ├── clipboard.rs  # クリップボード監視
│   │   ├── state.rs      # アプリ状態管理
│   │   ├── network.rs    # ネットワークユーティリティ
│   │   ├── port.rs       # ポート検索
│   │   └── tray.rs       # システムトレイ
│   ├── tauri.conf.json   # Tauri 設定
│   └── Cargo.toml        # Rust 依存パッケージ
├── package.json          # Node.js 依存パッケージ
└── setup.md              # ← このファイル
```
