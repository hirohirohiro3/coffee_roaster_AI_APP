import { eventBus } from '../core/EventBus.js';

// ▼▼▼ tempInputForm を追加 ▼▼▼
let container, beanTempInput, chamberTempInput, logButton, fixLastTempButton, tempInputForm;

function clearGraphTempInputs() {
    if (beanTempInput) beanTempInput.value = '';
    if (chamberTempInput) chamberTempInput.value = '';
    if (beanTempInput) beanTempInput.focus();
}

function toggleFixLastButton(show) {
    if (fixLastTempButton) fixLastTempButton.classList.toggle('hidden', !show);
}

function setLastLoggedTemperatures(beanTemp, chamberTemp) {
    if (beanTempInput) beanTempInput.value = beanTemp ?? '';
    if (chamberTempInput) chamberTempInput.value = chamberTemp ?? '';
}

function toggleGraphArea(show) {
    if (container) container.style.display = show ? 'block' : 'none';
}

// ▼▼▼ この関数を追加 ▼▼▼
function toggleTempInputForm(show) {
    if (tempInputForm) {
        // HTMLのクラス定義に合わせて 'flex' を使う
        tempInputForm.style.display = show ? 'flex' : 'none';
    }
}


export function initializeRealtimeGraphUI() {
    container = document.getElementById('realtimeGraphContainer');
    beanTempInput = document.getElementById('realtimeBeanTemp');
    chamberTempInput = document.getElementById('realtimeChamberTemp');
    logButton = document.getElementById('logRealtimeTempButton');
    fixLastTempButton = document.getElementById('fixLastTempButton');
    tempInputForm = document.getElementById('tempInputForm'); // ▼▼▼ 追加 ▼▼▼

    if (!container || !logButton) {
        console.error("RealtimeGraphUI: Essential elements not found.");
        return;
    }

    // --- UI操作イベントの発行 ---
    logButton.addEventListener('click', () => {
        eventBus.emit('graph:log-temp', {
            beanTempStr: beanTempInput.value,
            chamberTempStr: chamberTempInput.value,
        });
    });

    fixLastTempButton.addEventListener('click', () => {
        eventBus.emit('graph:remove-last-log');
    });

    // --- Controllerからのイベントの購読 ---
    eventBus.on('graph:clear-inputs', clearGraphTempInputs);
    eventBus.on('ui:toggle-graph-area', toggleGraphArea);
    eventBus.on('ui:toggle-fix-last-button', toggleFixLastButton);
    eventBus.on('ui:set-last-logged-temps', ({ beanTemp, chamberTemp }) => {
        setLastLoggedTemperatures(beanTemp, chamberTemp);
    });
    
    // ▼▼▼ このイベントリスナーを追加 ▼▼▼
    eventBus.on('ui:toggle-temp-input', toggleTempInputForm);


    console.log("✅ RealtimeGraphUI initialized.");
}