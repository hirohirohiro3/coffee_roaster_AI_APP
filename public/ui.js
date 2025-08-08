// ================================================================
// --- FILE: public/ui.js ---
// ================================================================
// このブロックの内容を、お手元の「ui.js」に全てコピーしてください。
// initializeUIElementsはapp.jsが役割を引き継いだため不要になりました。

/**
 * 画面の右下にトーストメッセージを表示します。
 * @param {string} message - 表示するメッセージ
 * @param {'info' | 'success' | 'warning' | 'error'} [type='info'] - トーストの種類
 * @param {number} [duration=3000] - 表示時間 (ミリ秒)
 */
export function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error("Toast container (toast-container) not found!");
        // フォールバックとしてalertを使用
        alert(`[${type}] ${message}`);
        return;
    }

    const toast = document.createElement('div');
    toast.className = `p-3 rounded-md shadow-lg text-sm font-medium mb-2 animate-toast-in`;
    
    let bgColor, textColor, borderColor, iconSvg;
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
    toast.innerHTML = `<div class="flex items-center">${iconSvg}<span class="flex-1">${message}</span></div>`;
    toastContainer.appendChild(toast);

    const removalTimeout = setTimeout(() => {
        if (toast.parentNode === toastContainer) {
            toastContainer.removeChild(toast);
        }
    }, duration + 500);

    setTimeout(() => {
        toast.classList.remove('animate-toast-in');
        toast.classList.add('animate-toast-out');
        toast.addEventListener('animationend', () => {
            clearTimeout(removalTimeout);
            if (toast.parentNode === toastContainer) {
                toastContainer.removeChild(toast);
            }
        }, { once: true });
    }, duration);
}

/**
 * フォームの特定のフィールドに値を設定します。
 * @param {string} fieldId - 値を設定するDOM要素のID
 * @param {string} value - 設定する値
 */
export function setFormFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.value = value;
    } else {
        console.warn(`ui.js: Field with ID '${fieldId}' not found.`);
    }
}

/**
 * 指定されたテキストをWeb Speech APIで読み上げます。
 * @param {string} text - 読み上げるテキスト
 * @param {string} [lang='ja-JP'] - 言語コード
 */
export function speak(text, lang = 'ja-JP') {
    if ('speechSynthesis' in window) {
        try {
            if (window.speechSynthesis.speaking) {
                window.speechSynthesis.cancel();
            }
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = lang;
            window.speechSynthesis.speak(utterance);
        } catch (e) {
            console.error("Speech synthesis error in ui.js:", e);
        }
    } else {
        console.warn("Speech synthesis not supported in this browser.");
    }
}