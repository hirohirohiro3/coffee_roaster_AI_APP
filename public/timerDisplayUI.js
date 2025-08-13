import { eventBus } from './EventBus.js';
import { formatTime } from './roastUtils.js';

// --- DOM要素 ---
let timerDisplayElement, firstCrackDevTimeElement, secondCrackDevTimeElement, predictionContainer, predictionDisplay;
let startPauseButton, resetTimerButton;
let enableVoiceCheckbox;
let eventLoggerContainer;


// --- UI更新関数 ---
function updateTimerDisplay(seconds) {
    if (timerDisplayElement) {
        timerDisplayElement.textContent = formatTime(seconds);
    }
}

function updateDevelopmentTimeDisplay({ firstCrackDevSeconds, secondCrackDevSeconds }) {
    if (firstCrackDevTimeElement) {
        firstCrackDevTimeElement.textContent = firstCrackDevSeconds !== null ? formatTime(firstCrackDevSeconds) : '--:--';
    }
    if (secondCrackDevTimeElement) {
        secondCrackDevTimeElement.textContent = secondCrackDevSeconds !== null ? formatTime(secondCrackDevSeconds) : '--:--';
    }
}

function updateStartPauseButton({ isRunning, buttonText }) {
    if (startPauseButton) {
        startPauseButton.textContent = buttonText;
        startPauseButton.classList.toggle('bg-red-500', isRunning);
        startPauseButton.classList.toggle('hover:bg-red-600', isRunning);
        startPauseButton.classList.toggle('bg-green-500', !isRunning);
        startPauseButton.classList.toggle('hover:bg-green-600', !isRunning);
    }
}

function togglePredictionDisplay(predictionText) {
    if (predictionContainer && predictionDisplay) {
        const show = predictionText !== null && predictionText !== '';
        predictionContainer.style.display = show ? 'block' : 'none';
        predictionDisplay.textContent = show ? predictionText : '-';
    }
}

function toggleEventLogger(show) {
    if (eventLoggerContainer) {
        eventLoggerContainer.style.display = show ? 'block' : 'none';
    }
}


// --- 初期化 ---
export function initializeTimerDisplayUI() {
    timerDisplayElement = document.getElementById('timerDisplay');
    firstCrackDevTimeElement = document.getElementById('firstCrackDevTime');
    secondCrackDevTimeElement = document.getElementById('secondCrackDevTime');
    predictionContainer = document.getElementById('predictionContainer');
    predictionDisplay = document.getElementById('predictionDisplay');
    startPauseButton = document.getElementById('startPauseTimerButton');
    resetTimerButton = document.getElementById('resetTimerButton');
    enableVoiceCheckbox = document.getElementById('enableVoiceNotification');
    eventLoggerContainer = document.getElementById('eventLoggerContainer');

    if (!timerDisplayElement || !startPauseButton || !resetTimerButton) {
        console.error("TimerDisplayUI: Essential timer elements not found.");
        return;
    }

    // --- UI操作イベントの発行 ---
    startPauseButton.addEventListener('click', () => eventBus.emit('ui:timer:start-pause-clicked'));
    resetTimerButton.addEventListener('click', () => eventBus.emit('ui:timer:reset-clicked'));
    enableVoiceCheckbox.addEventListener('change', (e) => eventBus.emit('ui:voice-notification-toggled', e.target.checked));
    
    if (eventLoggerContainer) {
        eventLoggerContainer.addEventListener('click', (e) => {
            const button = e.target.closest('.log-event-btn');
            if (button && button.dataset.eventType) {
                eventBus.emit('ui:log-event-time', button.dataset.eventType);
            }
        });
    }

    // --- Controllerからのイベントの購読 ---
    eventBus.on('timer:tick', (data) => updateTimerDisplay(data.elapsedSeconds));
    eventBus.on('timer:state-changed', (data) => updateStartPauseButton(data));
    eventBus.on('timer:development-time-updated', (data) => updateDevelopmentTimeDisplay(data));
    eventBus.on('prediction:update', ({ predictedTime }) => {
        if (predictedTime === null) {
            togglePredictionDisplay(null);
        } else {
            const formattedTime = formatTime(predictedTime);
            togglePredictionDisplay(formattedTime);
        }
    });
    eventBus.on('ui:toggle-event-logger', toggleEventLogger);
    eventBus.on('ui:update-event-button-state', ({ eventType, time }) => {
        const button = document.querySelector(`.log-event-btn[data-event-type="${eventType}"]`);
        if (button) {
            button.classList.add('activated');
            const baseText = button.textContent.split(' ')[0];
            button.innerHTML = `${baseText} <span class="text-xs font-mono">(${time})</span>`;
        }
    });

    eventBus.on('ui:reset-event-buttons', () => {
        const buttons = document.querySelectorAll('.log-event-btn');
        buttons.forEach(button => {
            button.classList.remove('activated');
            const eventType = button.dataset.eventType;

            // TPコンポーネントは特別な処理
            if (eventType === 'turningPointTime') {
                const tpInput = button.querySelector('#turningPointTempInput');
                if (tpInput) {
                    tpInput.value = '';
                }
            } else {
                // 他の単純なボタンはテキストを元に戻す
                const baseText = button.textContent.trim().split(' ')[0];
                button.innerHTML = baseText;
            }
        });
    });

    const tpTempInput = document.getElementById('turningPointTempInput');
    if (tpTempInput) {
        tpTempInput.addEventListener('click', (e) => {
            // 親要素へのクリックイベントの伝播を停止する
            e.stopPropagation();
        });
    }

    console.log("✅ TimerDisplayUI initialized.");
}