// ================================================================
// --- FILE: public/authUI.js (Forms Only - Full Code) ---
// ================================================================
// このファイルは、フォームの入力イベントを送信するだけの、シンプルな役割になります。
// 表示の切り替えは全て、uiManager.jsに任せます。

import { eventBus } from './EventBus.js';

// ★ 関数名を役割に合わせて変更
export function initializeAuthForms() {
    const loginForm = document.getElementById('loginForm');
    const signUpForm = document.getElementById('signUpForm');
    const showSignUpFormButton = document.getElementById('showSignUpFormButton');
    const showLoginFormButton = document.getElementById('showLoginFormButton');
    const loginFormContainer = document.getElementById('loginFormContainer');
    const signUpFormContainer = document.getElementById('signUpFormContainer');

    if (loginForm) {
        loginForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = loginForm.loginEmail.value;
            const password = loginForm.loginPassword.value;
            eventBus.emit('auth:login-attempt', { email, password });
        });
    }

    if (signUpForm) {
        signUpForm.addEventListener('submit', (event) => {
            event.preventDefault();
            const email = signUpForm.signUpEmail.value;
            const password = signUpForm.signUpPassword.value;
            eventBus.emit('auth:signup-attempt', { email, password });
        });
    }

    if (showSignUpFormButton && loginFormContainer && signUpFormContainer) {
        showSignUpFormButton.addEventListener('click', () => {
            loginFormContainer.classList.add('hidden');
            signUpFormContainer.classList.remove('hidden');
        });
    }

    if (showLoginFormButton && loginFormContainer && signUpFormContainer) {
        showLoginFormButton.addEventListener('click', () => {
            signUpFormContainer.classList.add('hidden');
            loginFormContainer.classList.remove('hidden');
        });
    }
    
    // ★ 'auth:state-changed' のリスナーは、ここから完全に削除しました。
    console.log("✅ AuthForms (listeners only) initialized.");
}
