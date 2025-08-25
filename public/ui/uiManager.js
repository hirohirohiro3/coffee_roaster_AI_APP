import { eventBus } from '../modules/core/EventBus.js';

/**
 * ユーザーの認証状態をUIに反映します。
 * @param {object|null} user - Firebase Authのユーザーオブジェクト
 */
function updateAuthViewState(user) {
    // --- 操作するHTML要素を取得 ---
    const emailAuthFormsContainer = document.getElementById('emailAuthFormsContainer');
    const mainContent = document.getElementById('main-content');
    const userInfoDiv = document.getElementById('userInfo');

    // 必須要素の存在チェック
    if (!emailAuthFormsContainer || !mainContent || !userInfoDiv) {
        console.error("[UIManager] 必須UI要素の一部が見つかりませんでした。");
        return;
    }

    if (user) {
        // --- ▼▼▼ ログイン時の処理 ▼▼▼ ---
        window.updateDebugStatus("OK. Main UI display process started.");
        // ログインフォーム全体を隠し、メインコンテンツを表示
        emailAuthFormsContainer.style.display = 'none';
        mainContent.style.display = 'block';

        // ユーザー情報をヘッダーに表示
        userInfoDiv.classList.remove('hidden');
        userInfoDiv.innerHTML = `
            <p class="font-semibold text-gray-700">${user.email}</p>
            <button id="logoutButton" class="ml-4 text-sm font-medium text-red-600 hover:text-red-800 transition-colors">ログアウト</button>
        `;
        document.getElementById('logoutButton')?.addEventListener('click', () => {
            eventBus.emit('auth:request-logout');
        });

        setTimeout(() => {
            window.updateDebugStatus("Dispatching 'ui:main-view-ready' event (after timeout).");
            eventBus.emit('ui:main-view-ready');
        }, 0);

    } else {
        // --- ▼▼▼ ログアウト時の処理 ▼▼▼ ---
        // ログインフォーム全体を表示し、メインコンテンツを隠す
        emailAuthFormsContainer.style.display = 'block';
        mainContent.style.display = 'none';

        // ユーザー情報を隠す
        userInfoDiv.classList.add('hidden');
        userInfoDiv.innerHTML = '';
    }
}

/**
 * UIマネージャーを初期化する
 */
export function initializeUIManager() {
    eventBus.on('auth:state-changed', updateAuthViewState);
    console.log("✅ UIManagerが初期化され、認証状態の変更を待機しています。");
}