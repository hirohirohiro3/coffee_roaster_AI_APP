// ================================================================
// --- FILE: public/authController.js (修正版) ---
// ================================================================

import { eventBus } from './EventBus.js';
// firebaseService.jsからエクスポートされた全ての関数を、
// FirebaseServiceという名前のオブジェクトとしてインポートします。
import * as FirebaseService from './firebaseService.js';

/**
 * ログイン処理を試みます。UIから'auth:login-attempt'イベントで呼び出されます。
 * @param {object} credentials - { email, password }
 */
async function handleLoginAttempt({ email, password }) {
    if (!email || !password) {
        console.error("Login attempt with empty email or password.");
        return;
    }
    // ▼▼▼ 修正点1: "And"を削除 ▼▼▼
    await FirebaseService.signInUserWithEmailPassword(email, password);
}

/**
 * 新規登録処理を試みます。UIから'auth:signup-attempt'イベントで呼び出されます。
 * @param {object} credentials - { email, password }
 */
async function handleSignUpAttempt({ email, password }) {
    if (!email || !password) {
        console.error("Sign up attempt with empty email or password.");
        return;
    }
    // ▼▼▼ 修正点2: "And"を追加 ▼▼▼
    await FirebaseService.signUpWithEmailAndPassword(email, password);
}

/**
 * ログアウト処理を実行します。'auth:request-logout'イベントで呼び出されます。
 */
function handleLogoutRequest() {
    FirebaseService.firebaseSignOut()
        .catch(error => {
            console.error("authController.js: Logout failed:", error);
        });
}

/**
 * 認証関連のロジックを初期化し、UIからのイベントを待ち受けます。
 */
export function initializeAuthController() {
    eventBus.on('auth:login-attempt', handleLoginAttempt);
    eventBus.on('auth:signup-attempt', handleSignUpAttempt);
    // ログアウトボタンからのイベント名を'auth:request-logout'に統一
    eventBus.on('auth:request-logout', handleLogoutRequest);

    console.log("✅ AuthController initialized.");
}