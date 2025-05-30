// ui.js (スタブ関数をNo.81の実装で復元し、デバッグログも含む完全版)

// roastUtils.js から必要な関数をインポート
import { calculateWeightLoss, timeToSeconds, formatTime } from './roastUtils.js';

// --- DOM要素を保持する変数 ---
let roastForm, formTitle, editRoastIdInput, logoutButton, userInfoDiv, userNameP, userEmailP, userPhotoImg, userIdDisplaySpan, roastLogDiv, profileModal, saveRecordButton, cancelEditButton, roastFormContainer, addNewRoastButton, greenBeanWeightInput, roastedBeanWeightInput, weightLossDisplayElement, confirmModal, confirmModalMessage, cancelConfirmButton, timerDisplay, startPauseTimerButton, resetTimerButton, eventLoggerContainer, eventToLogSelect, logEventTimeButton, searchInput, searchButton, exportCsvButton;

let realtimeGraphContainer, realtimeBeanTempInput, realtimeChamberTempInput, logRealtimeTempButton;

let emailAuthFormsContainer, loginFormContainer, signUpFormContainer;

// --- ヘルパー関数 (No.81のCanvasブロックからの完全版) ---
function parseLogString(logString) {
    if (!logString || typeof logString !== 'string' || logString.trim() === '') { return []; }
    try {
        return logString.split(',').map(s => {
            const num = parseFloat(s.trim());
            return isNaN(num) ? null : num; // 数値でないものはnullとして扱う
        }).filter(n => n !== null); // nullを除外 (NaNだったもの)
    } catch (e) {
        console.error("Error in parseLogString:", e, "Input:", logString);
        return [];
    }
}

function convertTimeStringToMinutes(timeStr, timeToSecondsConverter) {
    // timeToSecondsConverter は roastUtils.js の timeToSeconds を想定
    if (!timeStr || typeof timeToSecondsConverter !== 'function') { return null; }
    try {
        const seconds = timeToSecondsConverter(timeStr);
        if (seconds === null || isNaN(seconds) || seconds < 0) { return null; } // timeToSecondsが0を返す場合も考慮
        return seconds / 60;
    } catch (e) {
        console.error("Error in convertTimeStringToMinutes:", e, "Input:", timeStr);
        return null;
    }
}

function handleWeightChangeForLossCalculation() {
    if (!greenBeanWeightInput || !roastedBeanWeightInput || !weightLossDisplayElement) {
        // console.warn("ui.js: Weight calculation elements not all found.");
        if (weightLossDisplayElement) weightLossDisplayElement.textContent = '- %';
        return;
    }
    try {
        const greenWeight = parseFloat(greenBeanWeightInput.value);
        const roastedWeight = parseFloat(roastedBeanWeightInput.value);

        if (!isNaN(greenWeight) && !isNaN(roastedWeight) && greenWeight > 0 && roastedWeight >= 0) {
            const result = calculateWeightLoss(greenWeight, roastedWeight); // roastUtils.js の関数
            if (result.error) {
                weightLossDisplayElement.textContent = result.error;
                weightLossDisplayElement.classList.add('text-red-500');
                weightLossDisplayElement.classList.remove('text-gray-900');
            } else {
                // lossPercentage は数値なので toFixed を使用
                weightLossDisplayElement.textContent = `${parseFloat(result.lossPercentage).toFixed(1)}%`;
                weightLossDisplayElement.classList.remove('text-red-500');
                weightLossDisplayElement.classList.add('text-gray-900');
            }
        } else {
            weightLossDisplayElement.textContent = '- %';
            weightLossDisplayElement.classList.remove('text-red-500');
            weightLossDisplayElement.classList.add('text-gray-900');
        }
    } catch (e) {
        console.error("Error in handleWeightChangeForLossCalculation:", e);
        if (weightLossDisplayElement) {
            weightLossDisplayElement.textContent = '計算エラー';
            weightLossDisplayElement.classList.add('text-red-500');
            weightLossDisplayElement.classList.remove('text-gray-900');
        }
    }
}


// --- UI操作関連の主要関数 ---
export function initializeUIElements(
    onCancelEditCallback,
    onStartPauseTimerCallback,
    onResetTimerCallback,
    onLogEventTimeCallback,
    onLogRealtimeTempCallback,
    onSearchCallback,
    onExportCsvCallback
) {
    console.log("ui.js: Initializing UI elements (callback logging enhanced)...");
    try {
        roastForm = document.getElementById('roastForm');
        formTitle = document.getElementById('formTitle');
        editRoastIdInput = document.getElementById('editRoastId');
        logoutButton = document.getElementById('logoutButton');
        userInfoDiv = document.getElementById('userInfo');
        userNameP = document.getElementById('userName');
        userEmailP = document.getElementById('userEmail');
        userPhotoImg = document.getElementById('userPhoto');
        userIdDisplaySpan = document.getElementById('userIdDisplay');
        roastLogDiv = document.getElementById('roastLog');
        profileModal = document.getElementById('profileModal');
        saveRecordButton = document.getElementById('saveRecordButton');
        cancelEditButton = document.getElementById('cancelEditButton');
        roastFormContainer = document.getElementById('roastFormSection');
        addNewRoastButton = document.getElementById('addNewRoastButton');
        confirmModal = document.getElementById('confirmModal');
        confirmModalMessage = document.getElementById('confirmModalMessage');
        cancelConfirmButton = document.getElementById('cancelConfirmButton');
        greenBeanWeightInput = document.getElementById('greenBeanWeight');
        roastedBeanWeightInput = document.getElementById('roastedBeanWeight');
        weightLossDisplayElement = document.getElementById('weightLossDisplay');
        timerDisplay = document.getElementById('timerDisplay');
        startPauseTimerButton = document.getElementById('startPauseTimerButton');
        resetTimerButton = document.getElementById('resetTimerButton');
        eventLoggerContainer = document.getElementById('eventLoggerContainer');
        eventToLogSelect = document.getElementById('eventToLogSelect');
        logEventTimeButton = document.getElementById('logEventTimeButton');
        searchInput = document.getElementById('searchInput');
        searchButton = document.getElementById('searchButton');
        exportCsvButton = document.getElementById('exportCsvButton');

        realtimeGraphContainer = document.getElementById('realtimeGraphContainer');
        realtimeBeanTempInput = document.getElementById('realtimeBeanTemp');
        realtimeChamberTempInput = document.getElementById('realtimeChamberTemp');
        logRealtimeTempButton = document.getElementById('logRealtimeTempButton');

        emailAuthFormsContainer = document.getElementById('emailAuthFormsContainer');
        loginFormContainer = document.getElementById('loginFormContainer');
        signUpFormContainer = document.getElementById('signUpFormContainer');

        if (roastFormContainer) roastFormContainer.style.display = 'none';
        if (eventLoggerContainer) eventLoggerContainer.style.display = 'none';
        if (realtimeGraphContainer) realtimeGraphContainer.style.display = 'none';

        if (addNewRoastButton) {
             addNewRoastButton.addEventListener('click', () => {
                if (typeof exitEditModeUI === 'function') exitEditModeUI();
                if (roastFormContainer) roastFormContainer.style.display = 'block';
                if (formTitle) formTitle.textContent = '新しい焙煎を記録';
                if (roastForm) roastForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        }
        if (cancelEditButton && typeof onCancelEditCallback === 'function') {
            cancelEditButton.addEventListener('click', onCancelEditCallback);
        }
        if (cancelConfirmButton && typeof closeConfirmModalUI === 'function') {
            cancelConfirmButton.addEventListener('click', closeConfirmModalUI);
        }
        if (greenBeanWeightInput) greenBeanWeightInput.addEventListener('input', handleWeightChangeForLossCalculation);
        if (roastedBeanWeightInput) roastedBeanWeightInput.addEventListener('input', handleWeightChangeForLossCalculation);
        if (typeof handleWeightChangeForLossCalculation === 'function') handleWeightChangeForLossCalculation();
        
        console.log("ui.js: In initializeUIElements - Attempting to get timer buttons.");
        console.log("ui.js: startPauseTimerButton element:", startPauseTimerButton);
        console.log("ui.js: resetTimerButton element:", resetTimerButton);

        console.log("ui.js: typeof onStartPauseTimerCallback:", typeof onStartPauseTimerCallback);
        console.log("ui.js: onStartPauseTimerCallback IS:", onStartPauseTimerCallback);
            
        if (startPauseTimerButton && typeof onStartPauseTimerCallback === 'function') {
            console.log("ui.js: Attempting to add click listener to startPauseTimerButton with the above callback.");
            startPauseTimerButton.addEventListener('click', onStartPauseTimerCallback);
            console.log("ui.js: Click listener ADDED to startPauseTimerButton.");
        } else {
            if (!startPauseTimerButton) console.error("ui.js: startPauseTimerButton (ID: 'startPauseTimerButton') NOT FOUND!");
            if (typeof onStartPauseTimerCallback !== 'function') console.error("ui.js: onStartPauseTimerCallback IS NOT a function! Type:", typeof onStartPauseTimerCallback);
        }

        console.log("ui.js: typeof onResetTimerCallback:", typeof onResetTimerCallback);
        console.log("ui.js: onResetTimerCallback IS:", onResetTimerCallback);

        if (resetTimerButton && typeof onResetTimerCallback === 'function') {
            console.log("ui.js: Attempting to add click listener to resetTimerButton with the above callback.");
            resetTimerButton.addEventListener('click', onResetTimerCallback);
            console.log("ui.js: Click listener ADDED to resetTimerButton.");
        } else {
            if (!resetTimerButton) console.error("ui.js: resetTimerButton (ID: 'resetTimerButton') NOT FOUND!");
            if (typeof onResetTimerCallback !== 'function') console.error("ui.js: onResetTimerCallback IS NOT a function! Type:", typeof onResetTimerCallback);
        }
        
        if (logEventTimeButton && typeof onLogEventTimeCallback === 'function') {
            logEventTimeButton.addEventListener('click', () => {
                if (eventToLogSelect) onLogEventTimeCallback(eventToLogSelect.value);
            });
        }
        if (logRealtimeTempButton && typeof onLogRealtimeTempCallback === 'function') {
            logRealtimeTempButton.addEventListener('click', () => {
                onLogRealtimeTempCallback(
                    realtimeBeanTempInput ? realtimeBeanTempInput.value : '',
                    realtimeChamberTempInput ? realtimeChamberTempInput.value : ''
                );
            });
        }
        if (searchButton && searchInput && typeof onSearchCallback === 'function') {
            searchButton.addEventListener('click', () => onSearchCallback(searchInput.value));
            searchInput.addEventListener('keypress', (event) => {
                if (event.key === 'Enter') { event.preventDefault(); onSearchCallback(searchInput.value); }
            });
        }
        if (exportCsvButton && typeof onExportCsvCallback === 'function') {
            exportCsvButton.addEventListener('click', onExportCsvCallback);
        }

        // 認証フォーム関連のリスナーは authController.js で設定
        console.log("ui.js: Initializing UI elements finished (callback logging enhanced).");
    } catch (e) {
        console.error("ui.js: CRITICAL error during initializeUIElements:", e);
    }
}

export function updateAuthUI(user) {
    console.log('ui.js: updateAuthUI CALLED. User UID:', user ? user.uid : null);
    const roastLogSection = document.getElementById('roastLogSection');

    if (emailAuthFormsContainer) {
        emailAuthFormsContainer.classList.toggle('hidden', !!user);
    }

    if (user) {
        if(userNameP) userNameP.textContent = user.displayName || (user.email ? user.email.split('@')[0] : 'ユーザー');
        if(userEmailP && user.email) userEmailP.textContent = user.email; else if (userEmailP) userEmailP.textContent = '';
        if(userPhotoImg && user.photoURL) {
            userPhotoImg.src = user.photoURL;
            userPhotoImg.classList.remove('hidden');
        } else if(userPhotoImg) {
            userPhotoImg.src = '';
            userPhotoImg.classList.add('hidden');
        }
        if(userIdDisplaySpan && user.uid) userIdDisplaySpan.textContent = user.uid;

        if(userInfoDiv) userInfoDiv.classList.remove('hidden');
        if(logoutButton) logoutButton.classList.remove('hidden');
        if(addNewRoastButton) addNewRoastButton.classList.remove('hidden');
        if(roastLogSection) roastLogSection.style.display = 'block';
        
        if (typeof exitEditModeUI === 'function') exitEditModeUI();
        if (roastFormContainer) roastFormContainer.style.display = 'none';
    } else {
        if(userNameP) userNameP.textContent = '';
        if(userEmailP) userEmailP.textContent = '';
        if(userPhotoImg) { userPhotoImg.src = ''; userPhotoImg.classList.add('hidden'); }
        if(userIdDisplaySpan) userIdDisplaySpan.textContent = '未認証';

        if(userInfoDiv) userInfoDiv.classList.add('hidden');
        if(logoutButton) logoutButton.classList.add('hidden');
        if(addNewRoastButton) addNewRoastButton.classList.add('hidden');
        if(roastFormContainer) roastFormContainer.style.display = 'none';
        if(roastLogSection) roastLogSection.style.display = 'none';
        if(roastLogDiv) roastLogDiv.innerHTML = '<p class="text-gray-500 italic">ログインまたは新規登録してください。</p>';
        
        const loginFormContainer = document.getElementById('loginFormContainer');
        const signUpFormContainer = document.getElementById('signUpFormContainer');
        if (loginFormContainer) loginFormContainer.classList.remove('hidden');
        if (signUpFormContainer) signUpFormContainer.classList.add('hidden');

        if (typeof exitEditModeUI === 'function') exitEditModeUI();
    }
    console.log('ui.js: updateAuthUI finished.');
}

export function showEventLogger(show) {
    if (eventLoggerContainer) {
        eventLoggerContainer.style.display = show ? 'block' : 'none';
    } else {
        console.warn("ui.js: eventLoggerContainer element NOT FOUND in showEventLogger.");
    }
}
export function toggleRealtimeGraphArea(show) {
    if (realtimeGraphContainer) {
        realtimeGraphContainer.style.display = show ? 'block' : 'none';
    } else {
        console.warn("ui.js: realtimeGraphContainer element NOT FOUND in toggleRealtimeGraphArea.");
    }
}
export function clearRealtimeTempInputs() {
    if (realtimeBeanTempInput) realtimeBeanTempInput.value = '';
    else console.warn("ui.js: realtimeBeanTempInput element NOT FOUND in clearRealtimeTempInputs.");
    if (realtimeChamberTempInput) realtimeChamberTempInput.value = '';
    else console.warn("ui.js: realtimeChamberTempInput element NOT FOUND in clearRealtimeTempInputs.");
}

// ★★★ 以下、No.81のCanvasブロックからの実装で置き換え ★★★

export function showToast(message, type = 'info', duration = 3000) {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        console.error("Toast container (toast-container) not found!");
        return;
    }

    const toast = document.createElement('div');
    toast.className = `p-3 rounded-md shadow-lg text-sm font-medium mb-2 animate-toast-in`;
    let bgColor, textColor, borderColor, iconSvg;

    switch (type) {
        case 'success':
            bgColor = 'bg-green-100'; textColor = 'text-green-700'; borderColor = 'border-green-400';
            iconSvg = `<svg class="w-5 h-5 mr-2 text-green-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path></svg>`;
            break;
        case 'error':
            bgColor = 'bg-red-100'; textColor = 'text-red-700'; borderColor = 'border-red-400';
            iconSvg = `<svg class="w-5 h-5 mr-2 text-red-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 101.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"></path></svg>`;
            break;
        case 'warning':
            bgColor = 'bg-yellow-100'; textColor = 'text-yellow-700'; borderColor = 'border-yellow-400';
            iconSvg = `<svg class="w-5 h-5 mr-2 text-yellow-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M8.257 3.099c.636-1.178 2.85-1.178 3.486 0l5.58 10.283c.636 1.178-.474 2.618-1.743 2.618H4.42c-1.269 0-2.379-1.44-1.743-2.618l5.58-10.283zM10 12a1 1 0 110-2 1 1 0 010 2zm0-5a1 1 0 011 1v2a1 1 0 11-2 0V8a1 1 0 011-1z" clip-rule="evenodd"></path></svg>`;
            break;
        default: // info
            bgColor = 'bg-blue-100'; textColor = 'text-blue-700'; borderColor = 'border-blue-400';
            iconSvg = `<svg class="w-5 h-5 mr-2 text-blue-500" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg>`;
            break;
    }
    toast.classList.add(bgColor, textColor, borderColor, 'border');
    toast.innerHTML = `<div class="flex items-center">${iconSvg}<span>${message}</span></div>`;
    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.classList.remove('animate-toast-in');
        toast.classList.add('animate-toast-out');
        toast.addEventListener('animationend', () => {
            toast.remove();
        });
    }, duration);
}

export function updateTimerDisplayOnUI(formattedTimeString) {
    if (timerDisplay) {
        timerDisplay.textContent = formattedTimeString;
    } else {
        console.error("ui.js: Timer display element (ID: 'timerDisplay') NOT FOUND in updateTimerDisplayOnUI!");
    }
}

export function setFormFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field) {
        if (typeof field.value !== 'undefined') { // input, textarea, select
            field.value = value;
        } else { // span, div など
            field.textContent = value;
        }
    } else {
        console.error(`ui.js: Field with ID '${fieldId}' NOT FOUND in setFormFieldValue.`);
    }
}

export function displayRoasts(roasts, currentKeyword, currentUserId, onEdit, onDelete, onViewProfile) {
    if (!roastLogDiv) {
        console.error("ui.js: roastLogDiv not found in displayRoasts");
        return;
    }
    roastLogDiv.innerHTML = ''; // Clear previous entries

    if (!roasts || roasts.length === 0) {
        roastLogDiv.innerHTML = '<p class="text-gray-500 italic">記録がありません。</p>';
        return;
    }

    const filteredRoasts = roasts.filter(roast => 
        roast.beanName && roast.beanName.toLowerCase().includes(currentKeyword ? currentKeyword.toLowerCase() : "")
    );

    if (filteredRoasts.length === 0) {
        roastLogDiv.innerHTML = `<p class="text-gray-500 italic">${currentKeyword ? '検索条件に一致する記録がありません。' : '記録がありません。'}</p>`;
        return;
    }

    const ul = document.createElement('ul');
    ul.className = 'space-y-4';

    filteredRoasts.forEach(roast => {
        const li = document.createElement('li');
        li.className = 'p-4 bg-gray-50 rounded-lg shadow hover:shadow-md transition-shadow';
        
        let roastDateDisplay = '日付不明';
        if (roast.roastDate) {
            try {
                if (roast.roastDate.toDate) { // Firestore Timestamp
                    roastDateDisplay = roast.roastDate.toDate().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
                } else if (roast.roastDate instanceof Date) { // JavaScript Date
                    roastDateDisplay = roast.roastDate.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
                } else if (typeof roast.roastDate === 'string') { // YYYY-MM-DD形式の文字列
                     const dateParts = roast.roastDate.split('-');
                     if (dateParts.length === 3) {
                        const year = parseInt(dateParts[0]);
                        const month = parseInt(dateParts[1]) - 1; // Month is 0-indexed
                        const day = parseInt(dateParts[2]);
                        if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
                           roastDateDisplay = new Date(year, month, day).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
                        } else {
                           roastDateDisplay = roast.roastDate; // Invalid date string
                        }
                     } else {
                        roastDateDisplay = roast.roastDate;
                     }
                }
            } catch (e) {
                console.warn("Error formatting roastDate:", roast.roastDate, e);
                roastDateDisplay = typeof roast.roastDate === 'string' ? roast.roastDate : '日付形式エラー';
            }
        }

        li.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <h3 class="text-lg font-semibold text-amber-700">${roast.beanName || '名称未設定'}</h3>
                    <p class="text-sm text-gray-600">焙煎日: ${roastDateDisplay}</p>
                    <p class="text-sm text-gray-500">焙煎度: ${roast.roastLevel || '未設定'} | 総時間: ${roast.totalRoastTime || '未設定'}</p>
                </div>
                <div class="flex-shrink-0 space-x-2 mt-1">
                    <button data-id="${roast.id}" class="view-profile-button px-2 py-1 text-xs bg-sky-500 hover:bg-sky-600 text-white rounded shadow">詳細</button>
                    <button data-id="${roast.id}" class="edit-button px-2 py-1 text-xs bg-yellow-500 hover:bg-yellow-600 text-white rounded shadow">編集</button>
                    <button data-id="${roast.id}" data-name="${roast.beanName || 'この記録'}" class="delete-button px-2 py-1 text-xs bg-red-500 hover:bg-red-600 text-white rounded shadow">削除</button>
                </div>
            </div>
        `;
        ul.appendChild(li);
    });
    roastLogDiv.appendChild(ul);

    ul.querySelectorAll('.edit-button').forEach(button => {
        button.addEventListener('click', (e) => { if(typeof onEdit === 'function') onEdit(e.target.dataset.id); });
    });
    ul.querySelectorAll('.delete-button').forEach(button => {
        button.addEventListener('click', (e) => { if(typeof onDelete === 'function') onDelete(e.target.dataset.id, e.target.dataset.name); });
    });
    ul.querySelectorAll('.view-profile-button').forEach(button => {
        button.addEventListener('click', (e) => { if(typeof onViewProfile === 'function') onViewProfile(e.target.dataset.id); });
    });
}

export function enterEditModeUI(roastData) {
    console.log("ui.js: enterEditModeUI CALLED with data:", roastData);
    if (!roastForm || !formTitle || !editRoastIdInput || !saveRecordButton || !cancelEditButton || !roastFormContainer) {
        console.error("ui.js: One or more form elements not found in enterEditModeUI");
        return;
    }
    roastForm.reset();
    handleWeightChangeForLossCalculation();

    formTitle.textContent = '焙煎記録を編集';
    editRoastIdInput.value = roastData.id;

    for (const key in roastData) {
        if (roastData.hasOwnProperty(key)) {
            const field = roastForm.elements[key];
            if (field) {
                if (key === 'roastDate' && roastData[key]) {
                    try {
                        let dateValue = '';
                        if (roastData[key].toDate) {
                            dateValue = roastData[key].toDate().toISOString().split('T')[0];
                        } else if (roastData[key] instanceof Date) {
                            dateValue = roastData[key].toISOString().split('T')[0];
                        } else if (typeof roastData[key] === 'string' && roastData[key].match(/^\d{4}-\d{2}-\d{2}$/)) {
                            dateValue = roastData[key];
                        }
                        field.value = dateValue;
                    } catch (e) { console.warn(`Could not format date for ${key}:`, roastData[key], e); field.value = ''; }
                } else {
                    field.value = roastData[key];
                }
            }
        }
    }
    
    handleWeightChangeForLossCalculation();

    roastFormContainer.style.display = 'block';
    saveRecordButton.textContent = '更新';
    cancelEditButton.classList.remove('hidden');
    roastForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export function exitEditModeUI() {
    console.log("ui.js: exitEditModeUI CALLED.");
    if (roastForm && typeof roastForm.reset === 'function') roastForm.reset();
    if (formTitle) formTitle.textContent = '新しい焙煎を記録';
    if (editRoastIdInput) editRoastIdInput.value = '';
    if (saveRecordButton) saveRecordButton.textContent = '保存';
    if (cancelEditButton && !cancelEditButton.classList.contains('hidden')) {
        cancelEditButton.classList.add('hidden');
    }
    if (roastFormContainer) roastFormContainer.style.display = 'none';
    if (typeof handleWeightChangeForLossCalculation === 'function') handleWeightChangeForLossCalculation();
}

export function openConfirmModalUI(message, onConfirm) {
    console.log("ui.js: openConfirmModalUI CALLED with message:", message);
    if (confirmModalMessage) confirmModalMessage.textContent = message;
    if (confirmModal) {
        confirmModal.style.display = 'flex';
    }
}

export function closeConfirmModalUI() {
    console.log("ui.js: closeConfirmModalUI CALLED.");
    if (confirmModal && confirmModal.style.display !== 'none') {
        confirmModal.style.display = 'none';
    }
}

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

export function openProfileModalUI(roastData, chartInstance) {
    console.log("ui.js: openProfileModalUI CALLED with data:", roastData);
    const profileModalTitle = document.getElementById('profileModalTitle');
    const profileDataTableBody = document.querySelector('#profileDataTable tbody');
    const profileMessage = document.getElementById('profileMessage');
    const profileTableMessage = document.getElementById('profileTableMessage');

    if (!profileModal || !profileModalTitle || !profileDataTableBody || !profileMessage || !profileTableMessage) {
        console.error("ui.js: Profile modal elements not found.");
        return;
    }

    profileModalTitle.textContent = `${roastData.beanName || '詳細不明'} の焙煎プロファイル`;
    profileMessage.textContent = 'グラフを生成中...';
    profileDataTableBody.innerHTML = '';
    profileTableMessage.textContent = '';
    
    const canvas = document.getElementById('roastProfileChart');
    if (!canvas) {
        console.error("ui.js: roastProfileChart canvas not found.");
        profileMessage.textContent = 'グラフ描画エリアが見つかりません。';
        return;
    }
    
    if (window.detailedRoastChart instanceof Chart) {
        window.detailedRoastChart.destroy();
    }

    const beanTemps = parseLogString(roastData.beanTempLog || '');
    const chamberTemps = parseLogString(roastData.chamberTempLog || '');
    const rorValues = parseLogString(roastData.rorLog || '');

    const labels = []; 
    const beanTempData = [];
    const chamberTempData = [];
    const rorData = [];
    
    const maxLength = Math.max(beanTemps.length, chamberTemps.length, rorValues.length);

    if (maxLength === 0 && (roastData.chargingTemperature === undefined || roastData.totalRoastTime === undefined)) {
        profileMessage.textContent = '表示できる温度ログデータがありません。';
        if (profileModal) profileModal.style.display = 'block';
        return;
    }

    if (roastData.chargingTemperature !== undefined && roastData.chargingTemperature !== null) {
        labels.push(0);
        beanTempData.push(roastData.chargingTemperature);
        chamberTempData.push(roastData.chargingTemperature); 
    }

    for (let i = 0; i < maxLength; i++) {
        if (labels.length === 0 && i === 0) {
             labels.push(0);
        } else if (i >= labels.length) {
             labels.push(labels.length > 0 ? labels[labels.length-1] + 1 : 0 );
        }
        beanTempData.push(beanTemps[i] !== undefined ? beanTemps[i] : null);
        chamberTempData.push(chamberTemps[i] !== undefined ? chamberTemps[i] : null);
        rorData.push(rorValues[i] !== undefined ? rorValues[i] : null);
    }
    
    const totalSeconds = typeof timeToSeconds === 'function' ? timeToSeconds(roastData.totalRoastTime) : null;
    if (totalSeconds !== null && roastData.endOfRoastTemp !== undefined && roastData.endOfRoastTemp !== null) {
        const finishTimeMinutes = totalSeconds / 60;
        const lastLabel = labels.length > 0 ? labels[labels.length - 1] : -1;

        if (labels.length === 0 || lastLabel < finishTimeMinutes) {
            labels.push(finishTimeMinutes);
            beanTempData.push(roastData.endOfRoastTemp);
            chamberTempData.push(null);
            rorData.push(null);    
        } else { 
            const existingIndex = labels.findIndex(l => Math.abs(l - finishTimeMinutes) < 0.01);
            if (existingIndex !== -1) {
                 beanTempData[existingIndex] = roastData.endOfRoastTemp;
            } else { 
                 if (finishTimeMinutes > lastLabel){
                    labels.push(finishTimeMinutes);
                    beanTempData.push(roastData.endOfRoastTemp);
                    chamberTempData.push(null); 
                    rorData.push(null);    
                 }
            }
        }
    }
    const combined = labels.map((label, index) => ({
        x: label,
        bean: beanTempData[index],
        chamber: chamberTempData[index],
        ror: rorData[index]
    })).sort((a, b) => a.x - b.x);

    const sortedLabels = combined.map(p => p.x);
    const sortedBeanTempData = combined.map(p => p.bean);
    const sortedChamberTempData = combined.map(p => p.chamber);
    const sortedRorValues = combined.map(p => p.ror); // 変数名を rorData から変更

    if (sortedLabels.length > 0) {
        sortedLabels.forEach((label, index) => {
            const row = profileDataTableBody.insertRow();
            row.insertCell().textContent = label.toFixed(1);
            row.insertCell().textContent = sortedChamberTempData[index] !== null && sortedChamberTempData[index] !== undefined ? sortedChamberTempData[index].toFixed(1) : '-';
            row.insertCell().textContent = sortedBeanTempData[index] !== null && sortedBeanTempData[index] !== undefined ? sortedBeanTempData[index].toFixed(1) : '-';
            row.insertCell().textContent = sortedRorValues[index] !== null && sortedRorValues[index] !== undefined ? sortedRorValues[index].toFixed(1) : '-'; // sortedRorValues を使用
        });
        profileTableMessage.textContent = `${sortedLabels.length}点のデータログがあります。`;
    } else {
        profileTableMessage.textContent = '表示できるデータログがありません。';
    }

    const finalChartData = {
        datasets: [
            { label: '豆温度 (°C)', data: sortedBeanTempData.map((val, idx) => ({x: sortedLabels[idx], y: val})), borderColor: 'rgb(205, 92, 92)', backgroundColor: 'rgba(205, 92, 92, 0.1)', yAxisID: 'yTemp', tension: 0.1, spanGaps: true },
            { label: '庫内温度 (°C)', data: sortedChamberTempData.map((val, idx) => ({x: sortedLabels[idx], y: val})), borderColor: 'rgb(70, 130, 180)', backgroundColor: 'rgba(70, 130, 180, 0.1)', yAxisID: 'yTemp', tension: 0.1, spanGaps: true },
            { label: 'ROR (°C/分)', data: sortedRorValues.map((val, idx) => ({x: sortedLabels[idx], y: val})), borderColor: 'rgb(60, 179, 113)', backgroundColor: 'rgba(60, 179, 113, 0.1)', yAxisID: 'yROR', tension: 0.1, spanGaps: true }
        ]
    };

    const chartConfig = {
        type: 'line',
        data: finalChartData,
        options: {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
            scales: {
                x: { type: 'linear', title: { display: true, text: '時間 (分)' }, min: 0 },
                yTemp: { type: 'linear', display: true, position: 'left', title: { display: true, text: '温度 (°C)' } },
                yROR: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'ROR (°C/分)' }, grid: { drawOnChartArea: false } }
            },
            plugins: {
                legend: { position: 'top' }, tooltip: { mode: 'index', intersect: false },
                annotation: {
                    annotations: {
                        chargeLine: { type: 'line', xMin: 0, xMax: 0, borderColor: 'rgba(0,0,0,0.3)', borderWidth: 1, label: { content: '投入', display: true, position: 'start', font: {size: 10}} },
                        tpLine: roastData.turningPointTime && roastData.turningPointTemp !== undefined && roastData.turningPointTemp !== null && typeof convertTimeStringToMinutes === 'function' && typeof timeToSeconds === 'function' ? { type: 'point', xValue: convertTimeStringToMinutes(roastData.turningPointTime, timeToSeconds), yValue: roastData.turningPointTemp, backgroundColor: 'orange', radius: 5, label: { content: `TP ${roastData.turningPointTime} ${roastData.turningPointTemp}°C`, display: true, font: {size:10}, position: 'start'} } : {},
                        fcLine: roastData.firstCrackTime && typeof convertTimeStringToMinutes === 'function' && typeof timeToSeconds === 'function' ? { type: 'line', xMin: convertTimeStringToMinutes(roastData.firstCrackTime, timeToSeconds), xMax: convertTimeStringToMinutes(roastData.firstCrackTime, timeToSeconds), borderColor: 'rgba(255, 165, 0, 0.5)', borderWidth: 2, borderDash: [5,5], label: { content: `1C ${roastData.firstCrackTime}`, display: true, position: 'start', font: {size: 10}} } : {},
                        scLine: roastData.secondCrackTime && typeof convertTimeStringToMinutes === 'function' && typeof timeToSeconds === 'function' ? { type: 'line', xMin: convertTimeStringToMinutes(roastData.secondCrackTime, timeToSeconds), xMax: convertTimeStringToMinutes(roastData.secondCrackTime, timeToSeconds), borderColor: 'rgba(255, 0, 0, 0.5)', borderWidth: 2, borderDash: [5,5], label: { content: `2C ${roastData.secondCrackTime}`, display: true, position: 'start', font: {size: 10}} } : {},
                        dropLine: roastData.totalRoastTime && typeof convertTimeStringToMinutes === 'function' && typeof timeToSeconds === 'function' ? { type: 'line', xMin: convertTimeStringToMinutes(roastData.totalRoastTime, timeToSeconds), xMax: convertTimeStringToMinutes(roastData.totalRoastTime, timeToSeconds), borderColor: 'rgba(0,128,0,0.7)', borderWidth: 2, label: { content: `煎り止め ${roastData.totalRoastTime}`, display: true, position: 'start', font: {size: 10}} } : {},
                    }
                }
            }
        }
    };
    
    if (totalSeconds !== null) {
        chartConfig.options.scales.x.max = Math.ceil(totalSeconds / 60) + 1;
    } else if (sortedLabels.length > 0) {
        chartConfig.options.scales.x.max = Math.max(...sortedLabels, 1) + 1;
    } else {
        chartConfig.options.scales.x.max = 10;
    }

    try {
        window.detailedRoastChart = new Chart(canvas, chartConfig);
        profileMessage.textContent = 'プロファイルグラフが生成されました。';
    } catch (e) {
        console.error("Error creating detailed roast chart:", e);
        profileMessage.textContent = 'グラフの生成中にエラーが発生しました。';
    }
    
    if (profileModal) profileModal.style.display = 'block';
}