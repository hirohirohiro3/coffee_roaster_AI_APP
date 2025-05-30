// authController.js (onAuthUpdateCallback呼び出し確認ログ追加版)

import { 
    signInUserWithEmailPassword, 
    signUpWithEmailPassword, 
    firebaseSignOut as firebaseSignOutService 
} from './firebaseService.js';
import { showToast } from './ui.js'; // ui.js から showToast をインポート

let loginForm, signUpForm, loginEmailInput, loginPasswordInput, signUpEmailInput, signUpPasswordInput;
let showSignUpFormButton, showLoginFormButton, logoutButton;
let loginFormContainer, signUpFormContainer;
let onAuthUpdateCallback; // main.js の handleAuthStateChange を想定

export function initializeAuth(config) {
    console.log("authController.js: Initializing authentication controller...");

    loginForm = config.loginForm;
    signUpForm = config.signUpForm;
    loginEmailInput = config.loginEmailInput;
    loginPasswordInput = config.loginPasswordInput;
    signUpEmailInput = config.signUpEmailInput;
    signUpPasswordInput = config.signUpPasswordInput;
    showSignUpFormButton = config.showSignUpFormButton;
    showLoginFormButton = config.showLoginFormButton;
    logoutButton = config.logoutButton;
    loginFormContainer = config.loginFormContainer;
    signUpFormContainer = config.signUpFormContainer;
    onAuthUpdateCallback = config.onAuthUpdate;

    // DOM要素が取得できているか確認ログ (No.107で追加済み)
    console.log("authController.js: loginForm found?", !!loginForm);
    console.log("authController.js: signUpForm found?", !!signUpForm);
    console.log("authController.js: logoutButton found?", !!logoutButton);
    // ... 他の要素の found? ログも同様 ...

    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
        console.log("authController.js: Login form submit listener ADDED.");
    } else {
        console.error("authController.js: loginForm NOT FOUND, submit listener not added.");
    }

    if (signUpForm) {
        signUpForm.addEventListener('submit', handleSignUpSubmit);
        console.log("authController.js: SignUp form submit listener ADDED.");
    } else {
        console.error("authController.js: signUpForm NOT FOUND, submit listener not added.");
    }

    if (logoutButton) {
        logoutButton.addEventListener('click', handleLogout);
        console.log("authController.js: Logout button click listener ADDED.");
    } else {
        console.error("authController.js: logoutButton NOT FOUND, click listener not added.");
    }

    if (showSignUpFormButton && loginFormContainer && signUpFormContainer) {
        showSignUpFormButton.addEventListener('click', () => {
            console.log("authController.js: showSignUpFormButton CLICKED");
            loginFormContainer.classList.add('hidden');
            signUpFormContainer.classList.remove('hidden');
        });
        console.log("authController.js: showSignUpFormButton listener ADDED.");
    } else {
        console.warn("authController.js: Not all elements for showSignUpFormButton listener found.");
    }

    if (showLoginFormButton && loginFormContainer && signUpFormContainer) {
        showLoginFormButton.addEventListener('click', () => {
            console.log("authController.js: showLoginFormButton CLICKED");
            signUpFormContainer.classList.add('hidden');
            loginFormContainer.classList.remove('hidden');
        });
        console.log("authController.js: showLoginFormButton listener ADDED.");
    } else {
        console.warn("authController.js: Not all elements for showLoginFormButton listener found.");
    }
    console.log("authController.js: Authentication controller initialized.");
}

async function handleLoginSubmit(event) {
    event.preventDefault();
    console.log("### authController.js: handleLoginSubmit EXECUTED! ###");
    // alert("ログインフォームが送信されました！ (authController.js)"); // 必要に応じて有効化

    if (!loginEmailInput || !loginPasswordInput) {
        console.error("authController.js: Login email or password input not found in handleLoginSubmit.");
        return;
    }
    const email = loginEmailInput.value;
    const password = loginPasswordInput.value;
    console.log(`authController.js: Attempting login for ${email}`);

    try {
        const result = await signInUserWithEmailPassword(email, password);
        if (result.user && !result.error) {
            if (typeof showToast === 'function') showToast('ログインしました！', 'success');
            
            // ★★★ onAuthUpdateCallback 呼び出し前の確認ログを追加 ★★★
            if (typeof onAuthUpdateCallback === 'function') {
                console.log("authController.js: Login successful, CALLING onAuthUpdateCallback with user UID:", result.user.uid);
                onAuthUpdateCallback(result.user); // main.jsのコールバックを呼び出し
            } else {
                console.error("authController.js: onAuthUpdateCallback IS NOT a function! Cannot update UI from login.");
            }
            // ★★★ ここまで確認ログ ★★★

        } else if (result.error) {
            if (typeof showToast === 'function') showToast(`ログイン失敗: ${result.error.message}`, 'error');
        }
    } catch (e) {
        console.error("authController.js: Error during signInUserWithEmailPassword call or its promise chain:", e);
        if (typeof showToast === 'function') showToast(`ログイン処理中に予期せぬエラー: ${e.message}`, 'error');
    }
}

async function handleSignUpSubmit(event) {
    event.preventDefault();
    console.log("### authController.js: handleSignUpSubmit EXECUTED! ###");
    // alert("新規登録フォームが送信されました！ (authController.js)"); // 必要に応じて有効化

    if (!signUpEmailInput || !signUpPasswordInput) {
        console.error("authController.js: SignUp email or password input not found in handleSignUpSubmit.");
        return;
    }
    const email = signUpEmailInput.value;
    const password = signUpPasswordInput.value;
    console.log(`authController.js: Attempting sign up for ${email}`);

    try {
        const result = await signUpWithEmailPassword(email, password);
        if (result.user && !result.error) {
            if (typeof showToast === 'function') showToast('アカウントを登録しました！', 'success');

            // ★★★ onAuthUpdateCallback 呼び出し前の確認ログを追加 ★★★
            if (typeof onAuthUpdateCallback === 'function') {
                console.log("authController.js: Sign up successful, CALLING onAuthUpdateCallback with user UID:", result.user.uid);
                onAuthUpdateCallback(result.user); // main.jsのコールバックを呼び出し
            } else {
                console.error("authController.js: onAuthUpdateCallback IS NOT a function! Cannot update UI from sign up.");
            }
            // ★★★ ここまで確認ログ ★★★

        } else if (result.error) {
            if (typeof showToast === 'function') showToast(`登録失敗: ${result.error.message}`, 'error');
        }
    } catch (e) {
        console.error("authController.js: Error during signUpWithEmailPassword call or its promise chain:", e);
        if (typeof showToast === 'function') showToast(`登録処理中に予期せぬエラー: ${e.message}`, 'error');
    }
}

async function handleLogout() {
    console.log("### authController.js: handleLogout EXECUTED! ###");
    // alert("ログアウトが試みられました！ (authController.js)"); // 必要に応じて有効化

    console.log("authController.js: Attempting logout.");
    try {
        firebaseSignOutService(
            () => { 
                console.log("authController.js: Sign out success callback from firebaseSignOutService.");
                // onAuthStateChanged が null で onAuthUpdateCallback を呼ぶはずなので、ここでは直接 onAuthUpdateCallback(null) を呼ばない
            },
            (error) => { 
                console.error("authController.js: Sign out error callback from firebaseSignOutService.", error); 
                if (typeof showToast === 'function') showToast(`ログアウトエラー: ${error.message}`, "error"); 
            }
        );
    } catch (error) {
        console.error("authController.js: Synchronous error during logout attempt:", error);
        if (typeof showToast === 'function') showToast("ログアウト処理中にエラーが発生しました。", "error");
    }
}