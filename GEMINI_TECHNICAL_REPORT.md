### **プロジェクト技術レポート**

#### **1. プロジェクト概要 (Project Overview)**
- **名称:** コーヒー焙煎記録 (Coffee Roast Log)
- **目的:** コーヒーの焙煎プロセスを記録、追跡、分析するためのWebアプリケーション。ユーザーは豆の情報、焙煎プロファイル（時間、温度など）を記録し、過去の焙煎データとの比較や統計分析を行うことができる。
- **主要技術:** Vanilla JS (フレームワークなし), Vite, Firebase (Auth, Firestore, Functions, App Check), Tailwind CSS

#### **2. 技術スタック (Technology Stack)**
- **ビルドツール:** Vite (`vite.config.js`)
- **フロントエンド:**
    - 言語: JavaScript (ES Modules)
    - フレームワーク: なし (Vanilla JSによるモジュラーなコンポーネント指向アーキテクチャ)
    - スタイリング: Tailwind CSS (`tailwind.config.js`, `postcss.config.js`, `src/style.css`)
- **バックエンド (BaaS):** Firebase
    - データベース: Firestore (NoSQL, リアルタイム同期)
    - 認証: Firebase Authentication (Email/Password)
    - サーバーレス: Firebase Functions (詳細は`functions/`ディレクトリ参照)
    - セキュリティ: Firebase App Check (reCAPTCHA v3)
- **テスト:**
    - ユニットテスト: Vitest (`vitest.config.js`)
    - E2Eテスト: Playwright (`playwright.config.js`)
- **国際化 (i18n):**
    - カスタム実装 (`src/modules/core/i18n.js`, `uiTranslator.js`)
    - 対応言語: 日本語 (ja), 英語 (en)
    - 辞書ファイル: `public/locales/*.json`

#### **3. アプリケーションアーキテクチャと実行フロー (Architecture & Execution Flow)**
1.  **エントリーポイント:** `index.html` がブラウザにロードされる。
2.  **スクリプト起動:** `index.html` 内の `<script type="module">` が `src/app.js` をインポートして実行する。
3.  **Appクラス初期化:** `new App()` がインスタンス化され、`app.start()` が呼び出される。
4.  **HTMLコンポーネントの動的ロード:**
    - `app.js` 内の `_loadComponents()` が `src/modules/core/htmlLoader.js` を呼び出す。
    - `htmlLoader.js` は `src/components/` 内のHTML部品（`_header.html`, `_auth_forms.html` 等）を非同期に`fetch`し、`index.html`内の指定されたコンテナ（`#header-container`等）の`innerHTML`に挿入する。
    - 全コンポーネントのロード完了後、`html:loaded` イベントが `EventBus` を介して発行される。
5.  **Firebase初期化:**
    - `app.js` は `html:loaded` イベントを購読しており、イベント受信後に `src/services/authService.js` の `initializeFirebase()` を実行する。
    - `initializeFirebase()` は `src/services/firebaseConfig.js` から設定を読み込む。
    - `firebaseConfig.js` はViteの標準機能 `import.meta.env` を通じて `.env` ファイルからFirebaseのAPIキー等の設定値を取得する。
    - ローカル環境（localhost）の場合、Firebase Emulator（Auth:9099, Firestore:8081）に接続する。本番環境ではApp Checkを初期化する。
6.  **モジュール初期化と認証監視:**
    - Firebase初期化後、コアモジュール (`initializeCoreModules`) が初期化される。
    - `onAuthStateChanged` リスナーが設定され、ユーザーのログイン状態を監視する。
7.  **UI状態管理:**
    - `src/ui/uiManager.js` が `auth:state-changed` イベントを購読。
    - ログイン状態に応じて、認証フォーム（`#authSection`）とメインコンテンツ（`#main-content`）の表示/非表示を切り替える。
8.  **データ同期:**
    - ユーザーがログインすると、`authService.js` の `listenToAllData` が実行される。
    - この関数は、ユーザーの `beans` と `roasts` コレクションに対するFirestoreのリアルタイムリスナー（`onSnapshot`）を設定する。
    - データが更新されると、`data:beans-updated` や `data:roasts-updated` といったイベントが `EventBus` を通じて発行され、関連するUIモジュールがビューを更新する。

#### **4. 主要な機能と関連モジュール (Key Features & Modules)**
- **認証 (Authentication):**
    - `src/services/authService.js`: Firebase Authのラッパー。ログイン、ログアウト、新規登録、認証状態の監視。
    - `src/ui/authUI.js`: 認証フォームのUIロジックとイベントハンドリング。
    - `src/components/_auth_forms.html`: 認証フォームのHTML構造。
- **焙煎記録 (Roast Logging):**
    - `src/modules/roast/roastWorkflowController.js`: 新規焙煎追加のワークフローを管理。
    - `src/modules/roast/roastFormUI.js`: 焙煎記録フォームのUI。
    - `src/modules/roast/roastListUI.js`: 焙煎記録一覧のUI。
    - `src/components/_roast_form.html`, `_roast_list.html`: 対応するHTML。
- **リアルタイム焙煎タイマー＆グラフ:**
    - `src/modules/roast/timerController.js`: 焙煎中のタイマーロジック。
    - `src/modules/roast/graphController.js`, `realtimeGraphUI.js`: Chart.jsを利用したリアルタイム温度グラフの描画。
- **豆在庫管理 (Bean Stock):**
    - `src/modules/beans/beanStockController.js`: 在庫の追加・編集ロジック。
    - `src/modules/beans/beanStockModalUI.js`: 在庫管理モーダルのUI。
- **統計・分析 (Statistics):**
    - `src/statisticsController.js`: 統計データを計算・処理。
    - `src/components/_statistics.html`: 統計ページのコンテナ。
- **コアユーティリティ (Core Utilities):**
    - `src/modules/core/EventBus.js`: モジュール間の疎結合な通信を実現するPub/Subパターン。
    - `src/utils/roastUtils.js`: 焙煎関連の計算やデータフォーマットを行うヘルパー関数。

#### **5. ディレクトリ構造 (File Tree)**
```
.
├── .env
├── index.html
├── package.json
├── vite.config.js
├── public/
│   └── locales/
│       ├── en.json
│       └── ja.json
├── src/
│   ├── app.js
│   ├── style.css
│   ├── components/
│   │   ├── _auth_forms.html
│   │   ├── _roast_form.html
│   │   └── ... (他多数のHTML部品)
│   ├── modules/
│   │   ├── core/
│   │   │   ├── EventBus.js
│   │   │   ├── htmlLoader.js
│   │   │   └── i18n.js
│   │   ├── beans/
│   │   ├── roast/
│   │   └── app/
│   ├── services/
│   │   ├── authService.js
│   │   ├── dataService.js
│   │   └── firebaseConfig.js
│   ├── ui/
│   │   ├── authUI.js
│   │   ├── uiManager.js
│   │   └── ... (他のUI管理モジュール)
│   └── utils/
│       └── roastUtils.js
├── tests-e2e/
│   └── verify_initialization.spec.js
└── functions/
    └── index.js
```

#### **6. 直近で解決した主要バグ (Recently Resolved Bug)**
- **問題:** アプリケーション起動時に `Uncaught ReferenceError: __DEFINES__ is not defined` というエラーが継続的に発生していた。
- **根本原因:**
    1.  （初期段階）`src/public` というViteの規約に反するディレクトリ構造。
    2.  （中間段階）コンポーネントを動的に読み込む`htmlLoader.js`の`fetch`パスが誤っており、常に`index.html`を読み込んでしまいDOM構造が破壊されていた。
    3.  （最終原因）`vite.config.js`に`define: { '__DEFINES__': ... }`という非標準的な設定が残存しており、これがViteの内部的な環境変数処理（`env.mjs`の生成）と衝突していた。
- **最終的な解決策:**
    1.  Firebaseの設定情報を`.env`ファイルに分離。
    2.  `firebaseConfig.js`を、ハードコードされた値ではなくVite標準の`import.meta.env`から値を読み込むように修正。
    3.  `vite.config.js`から問題の原因となっていた`define`ブロックを完全に削除。

この修正により、Viteの標準的な方法で環境変数が扱われるようになり、エラーは解消された。
