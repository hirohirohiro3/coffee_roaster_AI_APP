import { eventBus } from './EventBus.js';
import { calculateBeanROR, formatTime } from './roastUtils.js';
import { getCurrentElapsedTimeInSeconds, updatePrediction } from './timerController.js';

// --- モジュールスコープの変数 ---
let chartCanvasElement, chargingTempInputElement;
let realtimeChartInstance = null;
let realtimeBeanTemperaturesLog = [];
let realtimeChamberTemperaturesLog = [];
let realtimeRorValuesLog = [];
let lastLogEntry = { time: null, beanTemp: null, chamberTemp: null };

// --- 内部ヘルパー関数 ---
function _updateDatasetPoint(datasetIndex, xValue, yValue, replace = false) {
    if (!realtimeChartInstance || !realtimeChartInstance.data.datasets[datasetIndex]) return;
    const dataset = realtimeChartInstance.data.datasets[datasetIndex];
    
    // yValueがnullやundefinedの場合はプロットしない
    if (yValue === null || typeof yValue === 'undefined' || isNaN(yValue)) return;
    
    const existingPointIndex = dataset.data.findIndex(point => point.x === xValue);
    if (existingPointIndex !== -1 && replace) {
        dataset.data[existingPointIndex].y = yValue;
    } else {
        dataset.data.push({ x: xValue, y: yValue });
        dataset.data.sort((a, b) => a.x - b.x);
    }
}

function _removeDatasetPoint(datasetIndex, xValue) {
    if (!realtimeChartInstance || !realtimeChartInstance.data.datasets[datasetIndex]) return;
    const dataset = realtimeChartInstance.data.datasets[datasetIndex];
    const pointIndex = dataset.data.findIndex(point => point.x === xValue);
    if (pointIndex !== -1) {
        dataset.data.splice(pointIndex, 1);
    }
}

function _finalizeLogFromArrayForSaving(logArray) {
    if (!logArray || logArray.length === 0) return '';
    const maxTimeInMinutes = Math.ceil(Math.max(...logArray.map(p => p.time), 0));
    const tempByMinute = new Array(maxTimeInMinutes + 1).fill(null);
    logArray.forEach(p => {
        const minuteIndex = Math.floor(p.time);
        if (minuteIndex >= 0 && minuteIndex < tempByMinute.length) {
            const temp = p.temp ?? p.ror;
            if (temp !== null && !isNaN(temp)) {
                tempByMinute[minuteIndex] = temp.toFixed(1);
            }
        }
    });
    return tempByMinute.map(t => t === null ? '' : t).join(',');
}

function handleInitialTempChange(event) {
    if (!realtimeChartInstance) return;
    const newTemp = parseFloat(event.target.value);
    if (isNaN(newTemp)) return;

    _updateDatasetPoint(0, 0, newTemp, true);
    realtimeChartInstance.update('none');

    const beanLogIndex = realtimeBeanTemperaturesLog.findIndex(p => p.time === 0);
    if (beanLogIndex !== -1) realtimeBeanTemperaturesLog[beanLogIndex].temp = newTemp;
    else realtimeBeanTemperaturesLog.push({ time: 0, temp: newTemp, timeInSeconds: 0 });

    // ★★★ 初期温度が変更されるたびに、ログテーブルに反映させる ★★★
    eventBus.emit('log-table:add-entry', {
        time: "00:00",
        beanTemp: newTemp,
        chamberTemp: null,
        ror: null
    });
}

// --- 公開関数 ---
export function initializeGraphController() {
    chartCanvasElement = document.getElementById('realtimeRoastChart');
    chargingTempInputElement = document.getElementById('timerChargingTemperature');

    eventBus.on('graph:initialize-realtime-chart', initializeRealtimeChart);
    eventBus.on('graph:log-temp', logRealtimeTemperatures);
    eventBus.on('graph:remove-last-log', removeLastLog);
    eventBus.on('graph:clear-main-logs', resetGraphAndLogs);
    eventBus.on('graph:set-target-profile', (profileData) => {
        if (realtimeChartInstance) {
            realtimeChartInstance.data.datasets[3].data = profileData;
            realtimeChartInstance.update();
        }
    });
    console.log("✅ GraphController initialized.");
}

export function initializeRealtimeChart() {
    // --- チャートが既に存在する場合 ---
    if (realtimeChartInstance) {
        // destroy()を呼ばずにデータをクリアし、更新する
        resetGraphAndLogs();

        realtimeChartInstance.data.datasets.forEach(dataset => {
            dataset.data = [];
        });

        const initialTemp = chargingTempInputElement ? parseFloat(chargingTempInputElement.value) : NaN;
        if (!isNaN(initialTemp)) {
            realtimeChartInstance.data.datasets[0].data.push({ x: 0, y: initialTemp });
            realtimeBeanTemperaturesLog.push({ time: 0, temp: initialTemp, timeInSeconds: 0 });

            // ★★★ リセット後、初期温度をログテーブルに再送信 ★★★
            eventBus.emit('log-table:add-entry', {
                time: "00:00",
                beanTemp: initialTemp,
                chamberTemp: null,
                ror: null
            });
        }

        realtimeChartInstance.update();
        console.log("Chart data reset.");

    // --- チャートが存在しない場合（初回読み込み時）---
    } else {
        resetGraphAndLogs();

        const initialTemp = chargingTempInputElement ? parseFloat(chargingTempInputElement.value) : NaN;

        const initialBeanData = [];
        if (!isNaN(initialTemp)) {
            initialBeanData.push({ x: 0, y: initialTemp });
            realtimeBeanTemperaturesLog.push({ time: 0, temp: initialTemp, timeInSeconds: 0 });

            // ★★★ 初期温度をログテーブルに送信 ★★★
            eventBus.emit('log-table:add-entry', {
                time: "00:00",
                beanTemp: initialTemp,
                chamberTemp: null,
                ror: null
            });
        }

        if (chargingTempInputElement) {
            chargingTempInputElement.removeEventListener('input', handleInitialTempChange);
            chargingTempInputElement.addEventListener('input', handleInitialTempChange);
        }

        const ctx = chartCanvasElement.getContext('2d');
        realtimeChartInstance = new Chart(ctx, {
            type: 'line',
            data: {
                datasets: [
                    { label: '豆温度 (°C)', data: initialBeanData, borderColor: '#d97706', backgroundColor: '#d97706', yAxisID: 'yTemp', tension: 0.1, pointRadius: 4, pointHoverRadius: 6 },
                    { label: '庫内温度 (°C)', data: [], borderColor: '#3b82f6', backgroundColor: '#3b82f6', yAxisID: 'yTemp', tension: 0.1, pointRadius: 4, pointHoverRadius: 6 },
                    { label: 'ROR (°C/分)', data: [], borderColor: '#16a34a', backgroundColor: '#16a34a', yAxisID: 'yROR', tension: 0.1, borderDash: [5, 5], pointRadius: 2, pointHoverRadius: 4 },
                    {
                        label: 'AI目標プロファイル',
                        data: [],
                        borderColor: 'rgba(150, 150, 150, 0.7)',
                        borderDash: [5, 5],
                        yAxisID: 'yTemp',
                        pointRadius: 2,
                        backgroundColor: 'rgba(150, 150, 150, 0.3)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                interaction: { mode: 'index', intersect: false },
                scales: {
                    x: { type: 'linear', position: 'bottom', title: { display: true, text: '時間 (分)' }, min: 0 },
                    yTemp: { type: 'linear', position: 'left', title: { display: true, text: '温度 (°C)' } },
                    yROR: { type: 'linear', position: 'right', title: { display: true, text: 'ROR (°C/分)' }, grid: { drawOnChartArea: false } }
                },
                plugins: { legend: { position: 'top' } }
            }
        });
        console.log("Chart initialized for the first time.");
    }
}

export function logRealtimeTemperatures({ beanTempStr, chamberTempStr }) {
    if (!realtimeChartInstance) return;
    const elapsedTimeSeconds = getCurrentElapsedTimeInSeconds();
    const plotIntegerMinute = Math.floor(elapsedTimeSeconds / 60);
    const plotMinute = parseFloat((elapsedTimeSeconds / 60).toFixed(2));

    const beanTemp = beanTempStr ? parseFloat(beanTempStr) : null;
    const chamberTemp = chamberTempStr ? parseFloat(chamberTempStr) : null;
    if (beanTemp === null && chamberTemp === null) return;

    // --- Bean Temp and ROR ---
    if (beanTemp !== null) {
        let calculatedROR = null;
        if (realtimeBeanTemperaturesLog.length > 0) {
            const prevPoint = realtimeBeanTemperaturesLog[realtimeBeanTemperaturesLog.length - 1];
            const timeDiffSeconds = elapsedTimeSeconds - prevPoint.timeInSeconds;

            if (timeDiffSeconds > 0) {
                calculatedROR = calculateBeanROR(prevPoint.temp, beanTemp, timeDiffSeconds);
            }
        }

        realtimeBeanTemperaturesLog.push({ time: plotMinute, temp: beanTemp, timeInSeconds: elapsedTimeSeconds });
        _updateDatasetPoint(0, plotIntegerMinute, beanTemp, true);

        if (calculatedROR !== null) {
            realtimeRorValuesLog.push({ time: plotMinute, ror: calculatedROR });
            _updateDatasetPoint(2, plotIntegerMinute, calculatedROR, true);
        }

        updatePrediction(beanTemp, calculatedROR);

        eventBus.emit('log-table:add-entry', {
            time: formatTime(elapsedTimeSeconds),
            beanTemp: beanTemp,
            chamberTemp: chamberTemp,
            ror: calculatedROR
        });
    }

    // --- Chamber Temp ---
    if (chamberTemp !== null) {
        realtimeChamberTemperaturesLog.push({ time: plotMinute, temp: chamberTemp });
        _updateDatasetPoint(1, plotIntegerMinute, chamberTemp, true);
    }

    realtimeChartInstance.update('none');

    // テーブルUIに新しいログエントリを通知
    eventBus.emit('log-table:add-entry', {
        time: formatTime(elapsedTimeSeconds),
        beanTemp: beanTemp,
        chamberTemp: chamberTemp,
        ror: realtimeRorValuesLog.length > 0 ? realtimeRorValuesLog[realtimeRorValuesLog.length - 1].ror : null
    });

    lastLogEntry = { time: plotIntegerMinute, beanTemp, chamberTemp };
    eventBus.emit('graph:clear-inputs');
}

export function removeLastLog() {
    if (!realtimeChartInstance || lastLogEntry.time === null) return;
    
    if (lastLogEntry.beanTemp !== null) {
        realtimeBeanTemperaturesLog.pop();
        realtimeRorValuesLog.pop(); // ROR is tied to bean temp log
        _removeDatasetPoint(0, lastLogEntry.time);
        _removeDatasetPoint(2, lastLogEntry.time);
    }
    if (lastLogEntry.chamberTemp !== null) {
        realtimeChamberTemperaturesLog.pop();
        _removeDatasetPoint(1, lastLogEntry.time);
    }
    
    eventBus.emit('log-table:remove-last-entry');
    realtimeChartInstance.update('none');
    lastLogEntry = { time: null, beanTemp: null, chamberTemp: null };
}

export function resetGraphAndLogs() {
    if (realtimeChartInstance) {
        realtimeChartInstance.data.datasets.forEach(dataset => {
            dataset.data = [];
        });
        realtimeChartInstance.update();
    }
    realtimeBeanTemperaturesLog = [];
    realtimeChamberTemperaturesLog = [];
    realtimeRorValuesLog = [];
    lastLogEntry = { time: null, beanTemp: null, chamberTemp: null };
}

export function getGraphLogsForSaving() {
    return {
        beanTempLog: _finalizeLogFromArrayForSaving(realtimeBeanTemperaturesLog),
        chamberTempLog: _finalizeLogFromArrayForSaving(realtimeChamberTemperaturesLog),
        rorLog: _finalizeLogFromArrayForSaving(realtimeRorValuesLog)
    };
}