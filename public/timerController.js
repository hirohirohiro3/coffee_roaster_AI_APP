// timerController.js

// roastUtils.js から formatTime をインポート
// (タイマー表示更新コールバックにフォーマット済み文字列を渡すため)
import { formatTime } from './roastUtils.js';

// --- モジュールスコープの変数 (タイマーの状態) ---
let timerInterval = null;
let elapsedTimeInSeconds = 0;
let isTimerRunning = false;

// --- 外部から受け取るコールバック関数 ---
let updateTimerDisplayCallback;     // (formattedTime: string) => void
let speakIfEnabledCallback;         // (text: string) => void
let showEventLoggerCallback;        // (show: boolean) => void
let toggleRealtimeGraphAreaCallback; // (show: boolean) => void
let initializeRealtimeChartCallback; // () => void
let clearRealtimeTempInputsCallback; // () => void

// --- 内部ヘルパー関数 ---
function _callIfFunction(callback, ...args) {
    if (typeof callback === 'function') {
        callback(...args);
    } else if (callback !== undefined && callback !== null) { // null や undefined 以外で関数でない場合は警告
        console.warn(`timerController.js: Expected a function but got ${typeof callback} for a callback.`);
    }
}

// --- 内部タイマーロジック関数 ---
function doStartTimerInternal() {
    console.log("timerController.js: doStartTimerInternal called.");
    if (isTimerRunning) {
        console.log("timerController.js: Timer already running.");
        return;
    }
    isTimerRunning = true;

    _callIfFunction(speakIfEnabledCallback, "タイマーを開始しました");
    _callIfFunction(showEventLoggerCallback, true);
    _callIfFunction(toggleRealtimeGraphAreaCallback, true);
    _callIfFunction(initializeRealtimeChartCallback); // グラフの初期化

    if (timerInterval) {
        clearInterval(timerInterval);
    }

    timerInterval = setInterval(() => {
        elapsedTimeInSeconds++;
        _callIfFunction(updateTimerDisplayCallback, formatTime(elapsedTimeInSeconds));
        
        if (elapsedTimeInSeconds > 0 && elapsedTimeInSeconds % 60 === 0) {
            const minutes = elapsedTimeInSeconds / 60;
            _callIfFunction(speakIfEnabledCallback, `${minutes}分経過`);
        }
    }, 1000);
    console.log("timerController.js: Timer interval started.");
}

function doPauseTimerInternal() {
    console.log("timerController.js: doPauseTimerInternal called.");
    if (!isTimerRunning) {
        console.log("timerController.js: Timer not running.");
        return;
    }
    isTimerRunning = false;
    _callIfFunction(speakIfEnabledCallback, "タイマーを一時停止しました");
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        console.log("timerController.js: Timer interval cleared.");
    }
}

function doResetTimerInternal() {
    console.log("timerController.js: doResetTimerInternal called.");
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
    isTimerRunning = false;
    elapsedTimeInSeconds = 0;
    _callIfFunction(updateTimerDisplayCallback, formatTime(elapsedTimeInSeconds)); // "00:00" を表示
    _callIfFunction(speakIfEnabledCallback, "タイマーをリセットしました");
    _callIfFunction(showEventLoggerCallback, false);
    _callIfFunction(toggleRealtimeGraphAreaCallback, false);
    _callIfFunction(clearRealtimeTempInputsCallback);
    // main.js側のリアルタイムログ配列のクリアやグラフインスタンス破棄は、
    // main.jsの initializeRealtimeChart (これが呼ばれる) や、
    // main.js の handleResetTimerClick から呼び出される追加処理で行う想定。
    console.log("timerController.js: Timer state reset internally.");
}

// --- エクスポートする関数 ---

/**
 * タイマーコントローラーを初期化します。
 * 依存する外部関数をコールバックとして設定します。
 * @param {object} config - 設定オブジェクト
 * @param {function} config.updateTimerDisplayUI - (formattedTime: string) => void
 * @param {function} config.speakIfEnabled - (text: string) => void
 * @param {function} config.showEventLogger - (show: boolean) => void
 * @param {function} config.toggleRealtimeGraphArea - (show: boolean) => void
 * @param {function} config.initializeRealtimeChart - () => void
 * @param {function} config.clearRealtimeTempInputs - () => void
 */
export function initializeTimerController(config) {
    console.log("timerController.js: Initializing timer controller with config.");
    
    updateTimerDisplayCallback = config.updateTimerDisplayUI;
    speakIfEnabledCallback = config.speakIfEnabled;
    showEventLoggerCallback = config.showEventLogger;
    toggleRealtimeGraphAreaCallback = config.toggleRealtimeGraphArea;
    initializeRealtimeChartCallback = config.initializeRealtimeChart;
    clearRealtimeTempInputsCallback = config.clearRealtimeTempInputs;

    // 初期状態としてタイマーをリセット
    doResetTimerInternal(); 

    console.log("timerController.js: Timer controller initialized and timer reset.");
}

export function handleStartPauseTimerClick() {
    console.log("### timerController.js: handleStartPauseTimerClick EXECUTED! ###");
    // alert("タイマーの開始/一時停止ボタンがクリックされました！ (timerController.js)"); // デバッグが落ち着いたらコメントアウト
    if (isTimerRunning) {
        doPauseTimerInternal();
    } else {
        doStartTimerInternal();
    }
}

export function handleResetTimerClick() {
    console.log("### timerController.js: handleResetTimerClick EXECUTED! ###");
    // alert("タイマーのリセットボタンがクリックされました！ (timerController.js)"); // デバッグが落ち着いたらコメントアウト
    doResetTimerInternal();
    // main.js 側で、これに加えてグラフインスタンスの破棄やログ配列のクリアを行う場合は、
    // main.js の handleResetTimerClick (この関数を呼び出す側) で別途その処理を呼び出す。
}

export function getCurrentElapsedTimeInSeconds() {
    return elapsedTimeInSeconds;
}

export function getIsTimerRunning() {
    return isTimerRunning;
}