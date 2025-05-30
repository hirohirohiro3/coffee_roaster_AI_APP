// main.js (ほぼ完全版 - No.148の省略箇所を展開)

// firebaseService.js からのインポート
import {
    initializeFirebase,
    // firebaseSignOutService, // authController が担当
    addRoastRecord,
    updateRoastRecord,
    deleteRoastRecord,
    currentUserId as fbUserId
    // signUpWithEmailPassword, // authController が担当
    // signInUserWithEmailPassword, // authController が担当
    // sendPasswordReset // authController が担当
} from './firebaseService.js';

// ui.js からのインポート
import {
    initializeUIElements,
    showToast,
    displayRoasts,
    enterEditModeUI,
    exitEditModeUI,
    updateAuthUI,
    openConfirmModalUI,
    closeConfirmModalUI,
    openProfileModalUI,
    updateTimerDisplayOnUI,
    setFormFieldValue,
    speak,
    showEventLogger,
    toggleRealtimeGraphArea,
    clearRealtimeTempInputs
} from './ui.js';

// roastUtils.js からのインポート
import {
    formatTime,
    calculateWeightLoss,
    timeToSeconds,
    calculateBeanROR,
    calculateDTR // CSVエクスポート用
} from './roastUtils.js';

// authController.js をインポート
import { initializeAuth } from './authController.js';
// timerController.js をインポート
import { 
    initializeTimerController, 
    handleStartPauseTimerClick,
    handleResetTimerClick,
    getCurrentElapsedTimeInSeconds,
    getIsTimerRunning
} from './timerController.js';

console.log("main.js loaded. (Full version with all implementations from previous messages)");

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOMContentLoaded fired. (Full version with all implementations from previous messages)");

    // --- DOM要素の取得 ---
    const roastForm = document.getElementById('roastForm');
    const editRoastIdInput = document.getElementById('editRoastId');
    const confirmActionButton = document.getElementById('confirmActionButton');
    const logoutButton = document.getElementById('logoutButton');
    const profileModal = document.getElementById('profileModal');
    const closeProfileModalButton = document.getElementById('closeProfileModalButton');
    const copyProfileJsonButton = document.getElementById('copyProfileJsonButton');
    const enableVoiceCheckbox = document.getElementById('enableVoiceNotification');
    const roastFormContainer = document.getElementById('roastFormSection');
    const timerChargingTemperatureInput = document.getElementById('timerChargingTemperature');

    const loginForm = document.getElementById('loginForm');
    const signUpForm = document.getElementById('signUpForm');
    const loginEmailInput = document.getElementById('loginEmail');
    const loginPasswordInput = document.getElementById('loginPassword');
    const signUpEmailInput = document.getElementById('signUpEmail');
    const signUpPasswordInput = document.getElementById('signUpPassword');
    const showSignUpFormButton = document.getElementById('showSignUpFormButton');
    const showLoginFormButton = document.getElementById('showLoginFormButton');
    const loginFormContainer = document.getElementById('loginFormContainer');
    const signUpFormContainer = document.getElementById('signUpFormContainer');

    // --- アプリケーションの状態変数 ---
    let localRoastsCache = [];
    let currentRoastIdToDeleteForConfirmation = null;
    let realtimeChartInstance = null;
    let realtimeBeanTemperaturesLog = [];
    let realtimeChamberTemperaturesLog = [];
    let realtimeRorValuesLog = [];
    let voiceNotificationEnabled = true;
    let currentSearchKeyword = '';
    let currentProfileDataForCopy = { data: null };

    // --- ヘルパー関数 ---
    function finalizeLogFromArray(logArray) {
        if (!logArray || logArray.length === 0) return '';
        const maxTime = Math.max(...logArray.map(p => p.time), -1);
        if (maxTime < 0) return '';
        const tempByMinute = new Array(Math.floor(maxTime) + 1).fill('');
        logArray.forEach(p => {
            const minuteIndex = Math.floor(p.time);
            if (minuteIndex >= 0 && minuteIndex < tempByMinute.length) {
                tempByMinute[minuteIndex] = p.temp !== null && p.temp !== undefined ? p.temp.toString() : '';
            }
        });
        return tempByMinute.join(',');
    }
    function escapeCsvCell(cellData) {
        if (cellData === null || typeof cellData === 'undefined') return '';
        let cellString = String(cellData);
        if (cellString.includes('"') || cellString.includes(',') || cellString.includes('\n')) {
            cellString = '"' + cellString.replace(/"/g, '""') + '"';
        }
        return cellString;
    }
    function updateDatasetPoint(datasetIndex, xValue, yValue, chart) {
        if (!chart || !chart.data.datasets[datasetIndex]) {
            // console.warn(`updateDatasetPoint: Chart or dataset index ${datasetIndex} not found.`);
            return;
        }
        const dataset = chart.data.datasets[datasetIndex];
        const existingPointIndex = dataset.data.findIndex(point => point.x === xValue);
        if (existingPointIndex !== -1) {
            dataset.data[existingPointIndex].y = yValue;
        } else {
            dataset.data.push({ x: xValue, y: yValue });
            dataset.data.sort((a, b) => a.x - b.x);
        }
    }

    // --- タイマー関連の処理 (グラフ初期化など) ---
    function initializeRealtimeChart() {
        console.log("main.js: initializeRealtimeChart called.");
        if (realtimeChartInstance) {
            console.log("main.js: Destroying existing realtimeChartInstance.");
            realtimeChartInstance.destroy();
            realtimeChartInstance = null;
        }
        realtimeBeanTemperaturesLog = [];
        realtimeChamberTemperaturesLog = [];
        realtimeRorValuesLog = [];
        let initialBeanTemp = null;
        let initialChamberTemp = null; 

        if (timerChargingTemperatureInput) {
            console.log("main.js: timerChargingTemperatureInput.value:", timerChargingTemperatureInput.value);
            if (timerChargingTemperatureInput.value !== '') {
                const tempValue = parseFloat(timerChargingTemperatureInput.value);
                console.log("main.js: Parsed tempValue from input:", tempValue);
                if (!isNaN(tempValue)) {
                    initialBeanTemp = tempValue;
                    initialChamberTemp = tempValue; 
                    console.log(`main.js: Initial charging temperature for chart set to: ${tempValue}°C`);
                } else {
                    console.warn("main.js: timerChargingTemperatureInput value is not a valid number.");
                }
            } else {
                console.log("main.js: timerChargingTemperatureInput is empty, no initial temp for chart.");
            }
        } else {
            console.warn("main.js: timerChargingTemperatureInput element not found for chart init.");
        }

        if (initialBeanTemp !== null) realtimeBeanTemperaturesLog.push({ time: 0, temp: initialBeanTemp });
        if (initialChamberTemp !== null) realtimeChamberTemperaturesLog.push({ time: 0, temp: initialChamberTemp });

        const canvas = document.getElementById('realtimeRoastChart');
        if (!canvas) {
            console.error("main.js: Canvas element 'realtimeRoastChart' NOT FOUND!");
            return;
        }
        const ctx = canvas.getContext('2d');

        const chartData = {
            datasets: [
                { label: '豆温度 (°C)', data: initialBeanTemp !== null ? [{ x: 0, y: initialBeanTemp }] : [], borderColor: 'rgb(205, 92, 92)', backgroundColor: 'rgba(205, 92, 92, 0.5)', yAxisID: 'yTemp', tension: 0.1 },
                { label: '庫内温度 (°C)', data: initialChamberTemp !== null ? [{ x: 0, y: initialChamberTemp }] : [], borderColor: 'rgb(70, 130, 180)', backgroundColor: 'rgba(70, 130, 180, 0.5)', yAxisID: 'yTemp', tension: 0.1 },
                { label: 'ROR (°C/分)', data: [], borderColor: 'rgb(60, 179, 113)', backgroundColor: 'rgba(60, 179, 113, 0.5)', yAxisID: 'yROR', tension: 0.1 }
            ]
        };
        const chartOptions = {
            responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false, },
            scales: {
                x: { type: 'linear', title: { display: true, text: '時間 (分)' }, min: 0, ticks: { stepSize: 1 } },
                yTemp: { type: 'linear', display: true, position: 'left', title: { display: true, text: '温度 (°C)' } },
                yROR: { type: 'linear', display: true, position: 'right', title: { display: true, text: 'ROR (°C/分)' }, grid: { drawOnChartArea: false, }, }
            },
            plugins: { legend: { position: 'top', }, tooltip: { mode: 'index', intersect: false, } }
        };

        console.log("main.js: Initializing Chart with data:", JSON.parse(JSON.stringify(chartData)));
        console.log("main.js: Initializing Chart with options:", JSON.parse(JSON.stringify(chartOptions)));

        try {
            realtimeChartInstance = new Chart(ctx, {
                type: 'line',
                data: chartData,
                options: chartOptions
            });
            console.log("main.js: Realtime chart instance CREATED SUCCESSFULLY.");
        } catch (error) {
            console.error("main.js: Error creating Chart instance:", error);
        }
    }

    function speakIfEnabled(text) { 
        if (voiceNotificationEnabled && typeof speak === 'function') { 
            speak(text); 
        } 
    }
    
    async function saveCurrentRoastData() {
        if (!roastForm) { console.error("main.js: roastForm not found."); if (typeof showToast === 'function') showToast("フォームエラー", "error"); return; }
        const currentUserIdValue = fbUserId ? fbUserId() : null;
        if (!currentUserIdValue) { if (typeof showToast === 'function') showToast("ログインしていません。", "error"); return; }
        
        const formData = new FormData(roastForm);
        const roastData = {};
        for (const [key, value] of formData.entries()) { if (value || typeof value === 'number') roastData[key] = value; }

        if (!roastData.beanName || !roastData.roastDate || !roastData.roastLevel || !roastData.totalRoastTime) {
            if (typeof showToast === 'function') showToast("必須項目（豆の名前, 焙煎日, 焙煎度, 総焙煎時間）を入力してください。", "error");
            return;
        }
        
        const numericFields = ['greenBeanWeight', 'roastedBeanWeight', 'chargingTemperature', 'turningPointTemp', 'endOfRoastTemp'];
        numericFields.forEach(field => { 
            if (roastData[field] && roastData[field] !== '') { 
                const numVal = parseFloat(roastData[field]); 
                if (!isNaN(numVal)) roastData[field] = numVal; else delete roastData[field]; 
            } else if (roastData[field] === '') {
                delete roastData[field]; 
            }
        });
        
        const currentEditRoastId = editRoastIdInput ? editRoastIdInput.value : null;
        if (roastData.hasOwnProperty('editRoastId')) delete roastData.editRoastId;

        if (realtimeBeanTemperaturesLog.length > 0) {
            roastData.beanTempLog = finalizeLogFromArray(realtimeBeanTemperaturesLog);
        }
        if (realtimeChamberTemperaturesLog.length > 0) {
            roastData.chamberTempLog = finalizeLogFromArray(realtimeChamberTemperaturesLog);
        }
        
        if (roastData.beanTempLog && typeof calculateBeanROR === 'function') {
            const beanTempsArray = roastData.beanTempLog.split(',')
                                    .map(s => s.trim()==='' ? null : parseFloat(s))
                                    .filter(n => n !== null && !isNaN(n));
            
            const rorLogArray = calculateBeanROR(beanTempsArray);
            if (rorLogArray && Array.isArray(rorLogArray) && rorLogArray.length > 0) {
                 roastData.rorLog = rorLogArray.map(r => r === null || r === undefined ? '' : r.toFixed(1)).join(',');
            } else if (typeof rorLogArray === 'string') { 
                 roastData.rorLog = rorLogArray;
            }
        } else if (roastData.beanTempLog) { 
            console.warn("main.js: calculateBeanROR function not found or not callable, ROR log not saved from final beanTempLog.");
        }

        console.log("main.js: Saving roast data (with temp logs):", JSON.parse(JSON.stringify(roastData)), "Edit ID:", currentEditRoastId);

        try {
            let success = false; let msg = "";
            if (currentEditRoastId) { 
                if (typeof updateRoastRecord === 'function') { 
                    success = await updateRoastRecord(currentEditRoastId, roastData, showToast); 
                    if (success) msg = "焙煎記録を更新しました！"; 
                } else { if (typeof showToast === 'function') showToast("更新機能エラー", "error");} 
            } else { 
                if (typeof addRoastRecord === 'function') { 
                    const docId = await addRoastRecord(roastData, showToast); 
                    if (docId) { success = true; msg = "焙煎記録を保存しました！"; } 
                } else { if (typeof showToast === 'function') showToast("追加機能エラー", "error");} 
            }
            if (success) { 
                if (typeof showToast === 'function') showToast(msg, "success"); 
                if (roastForm && typeof roastForm.reset === 'function') roastForm.reset(); 
                if (editRoastIdInput) editRoastIdInput.value = ''; 
                if (roastFormContainer) roastFormContainer.style.display = 'none'; 
                if (typeof handleResetTimerClick === 'function') handleResetTimerClick(); // timerControllerのハンドラを呼ぶ
            }
        } catch (e) { 
            console.error("main.js: Error saving data:", e); 
            if (typeof showToast === 'function') showToast(`記録保存中にエラー: ${e.message || '不明なエラー'}`, "error"); 
        }
    }

    // --- UIイベントハンドラ ---
    // handleStartPauseTimerClick, handleResetTimerClick は timerController.js からインポートして initializeUIElements に渡す
    
    function handleLogEventTime(targetFieldId) {
        const currentElapsedTime = getCurrentElapsedTimeInSeconds(); // timerControllerから取得
        const currentTimeFormatted = formatTime(currentElapsedTime);
        console.log(`main.js: handleLogEventTime for '${targetFieldId}' at ${currentTimeFormatted}`);
        if (targetFieldId && typeof targetFieldId === 'string' && targetFieldId.trim() !== '') {
            if (currentElapsedTime >= 0) { 
                if (typeof setFormFieldValue === 'function') setFormFieldValue(targetFieldId, currentTimeFormatted);
                const eventNameForSpeech = targetFieldId.replace("Time", "").replace("roast", "");
                speakIfEnabled(`${eventNameForSpeech} の時間を ${currentTimeFormatted} で記録しました。`);
                if (targetFieldId === 'totalRoastTime') {
                    console.log("main.js: End of Roast logged. Stopping timer and saving.");
                    if (typeof getIsTimerRunning === 'function' && getIsTimerRunning() && typeof handleStartPauseTimerClick === 'function') {
                        handleStartPauseTimerClick(); // これで pause になるはず
                    }
                    setTimeout(() => { saveCurrentRoastData(); }, 100);
                }
            }
        } else { console.warn("main.js: handleLogEventTime with invalid targetFieldId."); if (typeof showToast === 'function') showToast("記録対象イベント未選択", "warning"); }
    }

    function handleLogRealtimeTemp(beanTempString, chamberTempString) {
        const currentElapsedTime = getCurrentElapsedTimeInSeconds(); // timerControllerから取得
        const isRunning = typeof getIsTimerRunning === 'function' ? getIsTimerRunning() : false;

        if (!isRunning || !realtimeChartInstance) { 
            if (typeof showToast === 'function') showToast("タイマー作動中のみ記録可", "warning"); return; 
        }
        
        const currentTimeExactMinutes = currentElapsedTime / 60.0;
        const currentMinuteBucket = Math.floor(currentTimeExactMinutes);
        const beanTemp = parseFloat(beanTempString);
        const chamberTemp = parseFloat(chamberTempString);
        console.log(`main.js: handleLogRealtimeTemp at ${formatTime(currentElapsedTime)} (MinBucket: ${currentMinuteBucket}) - B:${beanTemp}, C:${chamberTemp}`);
        
        if (!isNaN(beanTemp)) { updateDatasetPoint(0, currentMinuteBucket, beanTemp, realtimeChartInstance); const idxB = realtimeBeanTemperaturesLog.findIndex(p=>p.time===currentMinuteBucket); if(idxB!==-1)realtimeBeanTemperaturesLog[idxB].temp=beanTemp; else realtimeBeanTemperaturesLog.push({time:currentMinuteBucket,temp:beanTemp}); realtimeBeanTemperaturesLog.sort((a,b)=>a.time-b.time); }
        if (!isNaN(chamberTemp)) { updateDatasetPoint(1, currentMinuteBucket, chamberTemp, realtimeChartInstance); const idxC = realtimeChamberTemperaturesLog.findIndex(p=>p.time===currentMinuteBucket); if(idxC!==-1)realtimeChamberTemperaturesLog[idxC].temp=chamberTemp; else realtimeChamberTemperaturesLog.push({time:currentMinuteBucket,temp:chamberTemp}); realtimeChamberTemperaturesLog.sort((a,b)=>a.time-b.time); }
        
        if (!isNaN(beanTemp)) {
            let rorValue = null; const getTempAtMinute = (log, minute) => { const entry = log.find(p=>p.time===minute); return entry ? entry.temp : undefined; };
            if (currentMinuteBucket >= 2) { const curB=getTempAtMinute(realtimeBeanTemperaturesLog,currentMinuteBucket); const prevB2=getTempAtMinute(realtimeBeanTemperaturesLog,currentMinuteBucket-2); if(curB!==undefined && prevB2!==undefined) rorValue=(curB-prevB2)/2; }
            else if (currentMinuteBucket === 1) { const curB1=getTempAtMinute(realtimeBeanTemperaturesLog,1); const prevB0=getTempAtMinute(realtimeBeanTemperaturesLog,0); if(curB1!==undefined && prevB0!==undefined) rorValue=curB1-prevB0; }
            if (rorValue !== null) { console.log(`main.js: ROR for min ${currentMinuteBucket}: ${rorValue.toFixed(2)}`); updateDatasetPoint(2, currentMinuteBucket, parseFloat(rorValue.toFixed(2)), realtimeChartInstance); const idxR=realtimeRorValuesLog.findIndex(p=>p.time===currentMinuteBucket); if(idxR!==-1)realtimeRorValuesLog[idxR].temp=parseFloat(rorValue.toFixed(2)); else realtimeRorValuesLog.push({time:currentMinuteBucket,temp:parseFloat(rorValue.toFixed(2))}); realtimeRorValuesLog.sort((a,b)=>a.time-b.time); }
        }
        if (realtimeChartInstance.options.scales.x.max <= currentMinuteBucket) realtimeChartInstance.options.scales.x.max = currentMinuteBucket + 2;
        realtimeChartInstance.update('none');
        if (typeof clearRealtimeTempInputs === 'function') clearRealtimeTempInputs();
    }
    function handleSearch(keyword) { console.log(`main.js: handleSearch with keyword: ${keyword}`); currentSearchKeyword = keyword; applyFiltersAndDisplay(); }
    function handleExportCsv() {
        console.log("main.js: handleExportCsv function initiated.");
        if (!localRoastsCache || localRoastsCache.length === 0) { if (typeof showToast === 'function') showToast("エクスポートする記録がありません。", "warning"); return; }
        const headers = [ "ID", "豆の名前", "焙煎日", "焙煎度", "産地", "生豆重量(g)", "焙煎豆重量(g)", "投入温度(°C)", "TP時間(分:秒)", "TP温度(°C)", "1ハゼ時間(分:秒)", "2ハゼ時間(分:秒)", "煎り止め温度(°C)", "総焙煎時間(分:秒)", "DTR(%)", "重量減少率(%)", "メモ", "豆温度ログ", "庫内温度ログ", "RORログ" ];
        const rows = localRoastsCache.map(roast => {
            const greenBeanWeight = roast.greenBeanWeight !== undefined && roast.greenBeanWeight !== null ? roast.greenBeanWeight : '';
            const roastedBeanWeight = roast.roastedBeanWeight !== undefined && roast.roastedBeanWeight !== null ? roast.roastedBeanWeight : '';
            let dtrDisplay = ''; if (roast.firstCrackTime && roast.totalRoastTime && typeof calculateDTR === 'function') { const dtrVal = calculateDTR(roast.firstCrackTime, roast.totalRoastTime); if (dtrVal !== null) dtrDisplay = dtrVal + '%'; }
            let weightLossDisplay = ''; if (greenBeanWeight !== '' && roastedBeanWeight !== '') { const lossData = calculateWeightLoss(greenBeanWeight, roastedBeanWeight); if (!lossData.error) weightLossDisplay = lossData.lossPercentage + '%'; }
            return [ roast.id || '', roast.beanName || '', roast.roastDate || '', roast.roastLevel || '', roast.origin || '', greenBeanWeight, roastedBeanWeight, roast.chargingTemperature !== undefined && roast.chargingTemperature !== null ? roast.chargingTemperature : '', roast.turningPointTime || '', roast.turningPointTemp !== undefined && roast.turningPointTemp !== null ? roast.turningPointTemp : '', roast.firstCrackTime || '', roast.secondCrackTime || '', roast.endOfRoastTemp !== undefined && roast.endOfRoastTemp !== null ? roast.endOfRoastTemp : '', roast.totalRoastTime || '', dtrDisplay, weightLossDisplay, roast.notes || '', roast.beanTempLog || '', roast.chamberTempLog || '', roast.rorLog || '' ].map(cell => escapeCsvCell(cell));
        });
        let csvContent = "\uFEFF"; csvContent += headers.join(',') + '\n'; rows.forEach(rowArray => { csvContent += rowArray.join(',') + '\n'; });
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        if (link.download !== undefined) { const url = URL.createObjectURL(blob); link.setAttribute("href", url); link.setAttribute("download", "roast_log_export.csv"); link.style.visibility = 'hidden'; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); if (typeof showToast === 'function') showToast("CSVファイルをエクスポートしました。", "success");
        } else { if (typeof showToast === 'function') showToast("お使いのブラウザでは直接ダウンロードがサポートされていません。", "error"); console.error("CSV export: Download attribute not supported.");}
    }
    function applyFiltersAndDisplay() { const uid = fbUserId ? fbUserId() : null; if (localRoastsCache && typeof displayRoasts === 'function') displayRoasts(localRoastsCache, currentSearchKeyword, uid, handleEditButtonClick, handleDeleteButtonClick, handleViewProfileButtonClick); }
        
    // initializeUIElements 呼び出し前の型チェック
    console.log("main.js: Before calling initializeUIElements. Type of handleStartPauseTimerClick (from timerController):", typeof handleStartPauseTimerClick);
    console.log("main.js: Before calling initializeUIElements. Type of handleResetTimerClick (from timerController):", typeof handleResetTimerClick);
    console.log("main.js: Before calling initializeUIElements. Type of exitEditModeUI (from ui.js):", typeof exitEditModeUI);

    initializeUIElements(
        exitEditModeUI, 
        handleStartPauseTimerClick, 
        handleResetTimerClick,
        handleLogEventTime,
        handleLogRealtimeTemp,
        handleSearch,
        handleExportCsv
    );
    
    // --- Firebase との連携 ---
    function handleAuthStateChange(user) {
        console.log("main.js: handleAuthStateChange CALLED. User UID from Auth System:", user ? user.uid : 'null');
        if (typeof updateAuthUI === 'function') {
            console.log("main.js: Attempting to call updateAuthUI from handleAuthStateChange.");
            try {
                updateAuthUI(user);
                console.log("main.js: Successfully called updateAuthUI from handleAuthStateChange.");
            } catch (e) {
                console.error("main.js: Error DURING updateAuthUI call from handleAuthStateChange:", e);
                if(typeof showToast === 'function') showToast("UI更新中にエラーが発生しました。", "error");
            }
        } else {
            console.error("main.js: updateAuthUI is NOT a function or not imported properly!");
            if(typeof showToast === 'function') showToast("UI更新機能の呼び出しに失敗しました。", "error");
        }
        if (!user) {
            console.log("main.js: User logged out, clearing localRoastsCache and re-displaying.");
            localRoastsCache = [];
            applyFiltersAndDisplay();
        }
    }

    function handleDataUpdate(updatedRoasts) { 
        console.log("main.js: handleDataUpdate. Roasts count:", updatedRoasts ? updatedRoasts.length : 0); 
        localRoastsCache = updatedRoasts || []; 
        applyFiltersAndDisplay(); 
    }
    
    // authController の初期化
    if (typeof initializeAuth === 'function') {
        console.log("main.js: Attempting to call initializeAuth from authController.js");
        initializeAuth({
            loginForm, signUpForm, loginEmailInput, loginPasswordInput, signUpEmailInput, signUpPasswordInput,
            showSignUpFormButton, showLoginFormButton, logoutButton,
            loginFormContainer, signUpFormContainer,
            onAuthUpdate: handleAuthStateChange 
        });
        console.log("main.js: Called initializeAuth from authController.js");
    } else { console.error("main.js: initializeAuth function not found."); }

    // timerController の初期化
    if (typeof initializeTimerController === 'function') {
        console.log("main.js: Attempting to call initializeTimerController.");
        initializeTimerController({
            updateTimerDisplayUI: updateTimerDisplayOnUI,
            speakIfEnabled: speakIfEnabled,
            showEventLogger: showEventLogger,
            toggleRealtimeGraphArea: toggleRealtimeGraphArea,
            initializeRealtimeChart: initializeRealtimeChart, 
            clearRealtimeTempInputs: clearRealtimeTempInputs
        });
        console.log("main.js: Called initializeTimerController.");
    } else { console.error("main.js: initializeTimerController function not found."); }

    // Firebase自体の初期化
    console.log("main.js: Checking types before Firebase init. typeof initializeFirebase:", typeof initializeFirebase);
    console.log("main.js: Checking types before Firebase init. typeof showToast:", typeof showToast);
    console.log("main.js: Checking types before Firebase init. typeof handleAuthStateChange (for Firebase):", typeof handleAuthStateChange);
    console.log("main.js: Checking types before Firebase init. typeof handleDataUpdate (for Firebase):", typeof handleDataUpdate);

    if (typeof initializeFirebase === 'function' && 
        typeof showToast === 'function' &&
        typeof handleAuthStateChange === 'function' &&
        typeof handleDataUpdate === 'function') {
        console.log("main.js: All necessary functions for Firebase init appear defined. Calling initializeFirebase...");
        initializeFirebase(handleAuthStateChange, handleDataUpdate, showToast);
    } else {
        console.error("main.js: CRITICAL - Firebase NOT initialized. One or more required functions are not defined correctly.");
        if (typeof initializeFirebase !== 'function') { console.error("main.js: initializeFirebase IS NOT a function."); }
        if (typeof showToast !== 'function') { console.error("main.js: showToast IS NOT a function."); }
        if (typeof handleAuthStateChange !== 'function') { console.error("main.js: handleAuthStateChange (for Firebase) IS NOT a function."); }
        if (typeof handleDataUpdate !== 'function') { console.error("main.js: handleDataUpdate (for Firebase) IS NOT a function."); }
    }

    // --- データ操作ハンドラ ---
    function handleEditButtonClick(roastId) { console.log(`main.js: handleEditButtonClick for ${roastId} (stub)`); }
    function handleDeleteButtonClick(roastId, beanName) { console.log(`main.js: handleDeleteButtonClick for ${roastId} - ${beanName} (stub)`); currentRoastIdToDeleteForConfirmation = roastId; if(typeof openConfirmModalUI === 'function') openConfirmModalUI(`「${beanName}」の記録を本当に削除しますか？`); }
    function handleViewProfileButtonClick(roastId) { console.log(`main.js: handleViewProfileButtonClick for ${roastId} (stub)`); }

    // --- イベントリスナー設定 ---
    if(confirmActionButton) { confirmActionButton.addEventListener('click', () => { console.log("main.js: Confirm action button clicked"); if (currentRoastIdToDeleteForConfirmation && typeof deleteRoastRecord === 'function' && typeof showToast === 'function') { deleteRoastRecord(currentRoastIdToDeleteForConfirmation, showToast); currentRoastIdToDeleteForConfirmation = null; } if(typeof closeConfirmModalUI === 'function') closeConfirmModalUI(); }); }
    // logoutButton のリスナーは authController が担当
    if (roastForm) { roastForm.addEventListener('submit', (event) => { event.preventDefault(); console.log("main.js: Roast form submitted. Calling saveCurrentRoastData."); saveCurrentRoastData(); }); }
    if(closeProfileModalButton && profileModal) { closeProfileModalButton.addEventListener('click', () => { if (profileModal) profileModal.style.display = "none"; }); }
    if (copyProfileJsonButton) { copyProfileJsonButton.addEventListener('click', () => { console.log("main.js: Copy profile JSON (stub)"); /* TODO: 実装 */ }); }
    
    const confirmModalElement = document.getElementById('confirmModal'); // DOMContentLoaded スコープで取得
    window.onclick = (event) => { 
        if (profileModal && event.target == profileModal) profileModal.style.display = "none";
        if (confirmModalElement && event.target == confirmModalElement && typeof closeConfirmModalUI === 'function') closeConfirmModalUI();
    };
    if (enableVoiceCheckbox) { enableVoiceCheckbox.addEventListener('change', (event) => { voiceNotificationEnabled = event.target.checked; console.log(`main.js: Voice notification: ${voiceNotificationEnabled}`); speakIfEnabled(voiceNotificationEnabled ? "音声通知オン" : "音声通知オフ"); }); enableVoiceCheckbox.checked = voiceNotificationEnabled; }

    // DOMContentLoaded 末尾の doResetTimer() 呼び出しは削除 (timerControllerが初期化時に行うため)
    console.log("main.js: Event listeners and initial setup complete. (Full version, timer reset by controller)");
});