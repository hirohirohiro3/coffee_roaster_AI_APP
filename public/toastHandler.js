// toastHandler.js

// --- DOM要素を保持する変数 ---
let toastContainer = null;

// --- 初期化関数 ---
/**
 * トースト通知機能に必要なDOM要素を取得し、初期化します。
 * この関数は、アプリケーションの初期化時に一度だけ呼び出すことを想定しています。
 * (例: main.js の DOMContentLoaded 内)
 */
export function initializeToast() {
    toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error("toastHandler.js: Toast container (ID: 'toast-container') not found in HTML!");
        // フォールバックとして、コンテナがない場合は body に直接追加することも検討できるが、
        // HTML側に<div id="toast-container"></div>を配置することを推奨。
    } else {
        console.log("toastHandler.js: Toast functionality initialized. Container found:", toastContainer);
    }
}

// --- トースト表示関数 ---
/**
 * 画面に一時的なメッセージ（トースト）を表示します。
 * @param {string} message 表示するメッセージ。
 * @param {'info' | 'success' | 'warning' | 'error'} type トーストの種類（色やアイコンが変わる）。デフォルトは 'info'。
 * @param {number} duration 表示時間（ミリ秒）。デフォルトは 3000ms。
 */
export function showToast(message, type = 'info', duration = 3000) {
    if (!toastContainer) {
        console.warn(`toastHandler.js: Toast container not available. Toast not shown. Message: [${type}] ${message}`);
        // ここで alert(message) や console[type](message) のようなフォールバックも可能
        // console[type === 'error' ? 'error' : 'log'](`Toast Fallback: [${type}] ${message}`);
        alert(`[${type}] ${message}`); // 最低限のフォールバックとしてアラート
        return;
    }

    const toast = document.createElement('div');
    // Tailwind CSS を使ったスタイリング
    toast.className = `p-3 rounded-md shadow-lg text-sm font-medium mb-2`; // 初期クラス
    let bgColor, textColor, borderColor, iconSvg;

    // アニメーションクラスは style.css で定義されている想定
    // .animate-toast-in { animation: toast-in 0.3s ease-out forwards; }
    // .animate-toast-out { animation: toast-out 0.3s ease-in forwards; }
    // @keyframes toast-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
    // @keyframes toast-out { from { opacity: 1; transform: translateY(0); } to { opacity: 0; transform: translateY(20px); } }
    
    toast.classList.add('animate-toast-in'); // 表示アニメーション

    switch (type) {
        case 'success':
            bgColor = 'bg-green-100'; textColor = 'text-green-700'; borderColor = 'border-green-400';
            iconSvg = `<svg class="w-5 h-5 mr-2 text-green-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`;
            break;
        case 'error':
            bgColor = 'bg-red-100'; textColor = 'text-red-700'; borderColor = 'border-red-400';
            iconSvg = `<svg class="w-5 h-5 mr-2 text-red-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 101.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
            break;
        case 'warning':
            bgColor = 'bg-yellow-100'; textColor = 'text-yellow-700'; borderColor = 'border-yellow-400';
            iconSvg = `<svg class="w-5 h-5 mr-2 text-yellow-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.636-1.178 2.85-1.178 3.486 0l5.58 10.283c.636 1.178-.474 2.618-1.743 2.618H4.42c-1.269 0-2.379-1.44-1.743-2.618l5.58-10.283zM10 12a1 1 0 110-2 1 1 0 010 2zm0-5a1 1 0 011 1v2a1 1 0 11-2 0V8a1 1 0 011-1z" clip-rule="evenodd"></path></svg>`;
            break;
        default: // info
            bgColor = 'bg-blue-100'; textColor = 'text-blue-700'; borderColor = 'border-blue-400';
            iconSvg = `<svg class="w-5 h-5 mr-2 text-blue-500 shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>`;
            break;
    }
    toast.classList.add(bgColor, textColor, borderColor, 'border');
    toast.innerHTML = `<div class="flex items-center">${iconSvg}<span class="flex-1">${message}</span></div>`; // メッセージ部分がflex-1で伸びるように
    
    toastContainer.appendChild(toast);

    // 古いブラウザやアニメーションがない場合も考慮して、一定時間後に確実に消す
    const removalTimeout = setTimeout(() => {
        if (toast.parentNode === toastContainer) { // まだ親要素に存在する場合のみ削除
            toastContainer.removeChild(toast);
        }
    }, duration + 500); // アニメーション時間より少し長く待つ

    // アニメーションで消す処理
    setTimeout(() => {
        toast.classList.remove('animate-toast-in');
        toast.classList.add('animate-toast-out');
        toast.addEventListener('animationend', () => {
            clearTimeout(removalTimeout); // アニメーションが完了したら確実な削除は不要
            if (toast.parentNode === toastContainer) {
                toastContainer.removeChild(toast);
            }
        }, { once: true }); // イベントリスナーを一度だけ実行
    }, duration);
}