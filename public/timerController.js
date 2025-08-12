import { eventBus } from './EventBus.js';
import { predictTimeToTarget } from './roastUtils.js';

// --- モジュールスコープの変数 ---
let timerInterval = null;
let elapsedTimeInSeconds = 0;
let isTimerRunningInternal = false;
let oneMinuteInterval = null;
let firstCrackStartTime = null;
let secondCrackStartTime = null;

// --- 内部関数 ---

function startTimer() {
    if (isTimerRunningInternal) return;
    isTimerRunningInternal = true;
    
    eventBus.emit('ui:ensure-roast-form-open');

    eventBus.emit('timer:state-changed', { isRunning: true, buttonText: "一時停止" });
    eventBus.emit('audio:speak', "タイマー開始");
    eventBus.emit('ui:toggle-event-logger', true);
    eventBus.emit('ui:toggle-graph-area', true);
    eventBus.emit('ui:toggle-log-table', true);
    eventBus.emit('ui:toggle-temp-input', true);
    eventBus.emit('graph:initialize-realtime-chart');
    
    const startTime = Date.now() - elapsedTimeInSeconds * 1000;
    if (timerInterval) clearInterval(timerInterval);
    
    // oneMinuteIntervalは削除
    if (oneMinuteInterval) clearInterval(oneMinuteInterval);
    oneMinuteInterval = null;

    timerInterval = setInterval(() => {
        elapsedTimeInSeconds = Math.floor((Date.now() - startTime) / 1000);
        eventBus.emit('timer:tick', { elapsedSeconds: elapsedTimeInSeconds });
        
        let firstCrackDevSeconds = (firstCrackStartTime !== null) ? elapsedTimeInSeconds - firstCrackStartTime : null;
        let secondCrackDevSeconds = (secondCrackStartTime !== null) ? elapsedTimeInSeconds - secondCrackStartTime : null;
        eventBus.emit('timer:development-time-updated', { firstCrackDevSeconds, secondCrackDevSeconds });

        // 1分ごとの音声通知をここに統合
        if (elapsedTimeInSeconds > 0 && elapsedTimeInSeconds % 60 === 0) {
            const minutes = elapsedTimeInSeconds / 60;
            eventBus.emit('audio:speak', `${minutes}分経過`);
        }

    }, 1000);
}

function pauseTimer() {
    if (!isTimerRunningInternal) return;
    isTimerRunningInternal = false;
    
    if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
    if (oneMinuteInterval) { clearInterval(oneMinuteInterval); oneMinuteInterval = null; }
    
    eventBus.emit('timer:state-changed', { isRunning: false, buttonText: "開始" });
    eventBus.emit('audio:speak', "タイマー一時停止");
    eventBus.emit('ui:toggle-graph-area', false);
    eventBus.emit('ui:toggle-log-table', false);
    eventBus.emit('ui:toggle-temp-input', false);
}

function resetTimer() {
    pauseTimer();
    elapsedTimeInSeconds = 0;
    firstCrackStartTime = null;
    secondCrackStartTime = null;

    eventBus.emit('timer:state-changed', { isRunning: false, buttonText: "開始" });
    eventBus.emit('timer:tick', { elapsedSeconds: 0 });
    eventBus.emit('timer:development-time-updated', { firstCrackDevSeconds: null, secondCrackDevSeconds: null });
    eventBus.emit('prediction:update', { predictedTime: null });
    eventBus.emit('audio:speak', "タイマーリセット");
    eventBus.emit('ui:toggle-event-logger', false);
    eventBus.emit('graph:clear-inputs');
    eventBus.emit('log-table:clear');
    eventBus.emit('graph:clear-main-logs');
    eventBus.emit('graph:initialize-realtime-chart');
}

// --- 公開関数 ---

export function initializeTimerController() {
    eventBus.on('ui:timer:start-pause-clicked', handleStartPauseTimerClick);
    eventBus.on('ui:timer:reset-clicked', handleResetTimerClick);
    
    resetTimer();
    console.log("✅ TimerController initialized.");
}

export function handleStartPauseTimerClick() {
    if (isTimerRunningInternal) {
        pauseTimer();
    } else {
        startTimer();
    }
}

export function handleResetTimerClick() {
    resetTimer();
}

export function getCurrentElapsedTimeInSeconds() { 
    return elapsedTimeInSeconds; 
}

export function getIsTimerRunning() { 
    return isTimerRunningInternal; 
}

export function recordCrackTime(crackType) {
    const crackTimeInSeconds = getCurrentElapsedTimeInSeconds();
    if (crackTimeInSeconds < 0) return;

    if (crackType === 'firstCrackTime') {
        firstCrackStartTime = crackTimeInSeconds;
    } else if (crackType === 'secondCrackTime') {
        secondCrackStartTime = crackTimeInSeconds;
    }
}

export function updatePrediction(currentTemp, ror) {
    if (currentTemp === null || ror === null || ror <= 0 || currentTemp >= 200) {
        eventBus.emit('prediction:update', { predictedTime: null });
        return;
    }

    const remainingSeconds = predictTimeToTarget(currentTemp, 200, ror);

    if (remainingSeconds === null) {
        eventBus.emit('prediction:update', { predictedTime: null });
        return;
    }

    const elapsedSeconds = getCurrentElapsedTimeInSeconds();
    const predictedTotalSeconds = elapsedSeconds + remainingSeconds;

    eventBus.emit('prediction:update', { predictedTime: predictedTotalSeconds });
}