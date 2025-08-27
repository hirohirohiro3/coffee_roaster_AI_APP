// ================================================================
// --- FILE: public/authController.js (修正版) ---
// ================================================================

import { eventBus } from './modules/core/EventBus.js';
import * as AuthService from './services/authService.js';

let auth;

/**
 * ログイン処理を試みます。UIから'auth:login-attempt'イベントで呼び出されます。
 * @param {object} credentials - { email, password }
 */
async function handleLoginAttempt({ email, password }) {
    if (!email || !password) {
        console.error("Login attempt with empty email or password.");
        return;
    }
    await AuthService.signInUserWithEmailPassword(auth, email, password);
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
    await AuthService.signUpWithEmailAndPassword(auth, email, password);
}

/**
 * ログアウト処理を実行します。'auth:request-logout'イベントで呼び出されます。
 */
function handleLogoutRequest() {
    AuthService.firebaseSignOut(auth)
        .catch(error => {
            console.error("authController.js: Logout failed:", error);
        });
}

/**
 * 認証関連のロジックを初期化し、UIからのイベントを待ち受けます。
 */
export function initializeAuthController(authInstance) {
    auth = authInstance;
    eventBus.on('auth:login-attempt', handleLoginAttempt);
    eventBus.on('auth:signup-attempt', handleSignUpAttempt);
    // ログアウトボタンからのイベント名を'auth:request-logout'に統一
    eventBus.on('auth:request-logout', handleLogoutRequest);

    console.log("✅ AuthController initialized.");
}