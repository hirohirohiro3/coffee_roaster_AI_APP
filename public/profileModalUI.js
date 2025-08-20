import { t } from './i18n.js';
import { eventBus } from './EventBus.js';
import { showToast } from './ui.js';
import * as FirebaseService from './firebaseService.js';
import {
    timeToSeconds,
    calculateDTR,
    calculateWeightLoss,
    parseLogStringToArray,
    convertTimeStringToMinutes,
    formatTime
} from './roastUtils.js';

// --- DOM要素 ---
let modalElement, titleElement, messageElement, chartCanvasElement, closeButtonElement, copyJsonButtonElement;
let getAiAnalysisButton, aiAnalysisSpinnerElement;
let weatherInfoDivElement, weatherTempSpanElement, weatherHumiditySpanElement;
let summaryDivElement, summaryRoastIdSpanElement, summaryTotalTimeSpanElement, summaryWeightLossSpanElement, summaryDTRSpanElement;
let transposedLogTableContainerElement, radarChartSectionElement, radarChartCanvasElement;
let profileAiNotesSectionElement, profileAiNotesElement;
let editTemperaturesButton, saveTemperaturesButton, cancelEditTemperaturesButton;

// --- 内部ステート ---
let currentRoastDataForCopy = null;
let detailedChartInstance = null;
let radarChartInstance = null;
let isLogEditMode = false;

let DATA_ROWS_CONFIG_PROFILE;
let RATING_DEFINITIONS;
let RATING_CATEGORIES;


// --- 内部ヘルパー関数 ---

function _enterLogEditMode() {
    isLogEditMode = true;
    _toggleLogEditButtons();
    _renderTransposedLogTable(currentRoastDataForCopy.logEntriesForDisplay, true);
}

function _exitLogEditMode(shouldRedraw = false) {
    isLogEditMode = false;
    _toggleLogEditButtons();
    if (shouldRedraw) {
        _renderTransposedLogTable(currentRoastDataForCopy.logEntriesForDisplay, false);
    }
}

function _toggleLogEditButtons() {
    if (!editTemperaturesButton || !saveTemperaturesButton || !cancelEditTemperaturesButton) return;
    if (isLogEditMode) {
        editTemperaturesButton.classList.add('hidden');
        saveTemperaturesButton.classList.remove('hidden');
        cancelEditTemperaturesButton.classList.remove('hidden');
    } else {
        editTemperaturesButton.classList.remove('hidden');
        saveTemperaturesButton.classList.add('hidden');
        cancelEditTemperaturesButton.classList.add('hidden');
    }
}

function _saveTemperatureChanges() {
    const newBeanTemps = [];
    const newChamberTemps = [];
    
    const inputs = transposedLogTableContainerElement.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        const type = input.dataset.type;
        const value = input.value === '' ? null : parseFloat(input.value);
        if (type === 'bean') {
            newBeanTemps.push(value);
        } else if (type === 'chamber') {
            newChamberTemps.push(value);
        }
    });

    eventBus.emit('profile:save-temperatures', {
        docId: currentRoastDataForCopy.id,
        newBeanTemps,
        newChamberTemps
    });
    
    _exitLogEditMode(false);
}

function _renderTransposedLogTable(timeEntries, isEditMode = false) {
    if (!transposedLogTableContainerElement) return;
    transposedLogTableContainerElement.innerHTML = '';

    const integerTimeEntries = timeEntries.filter(entry => Math.abs(entry.time - Math.round(entry.time)) < 0.01);
    
    if (integerTimeEntries.length === 0 && !isEditMode) {
        transposedLogTableContainerElement.innerHTML = `<p class="text-xs text-gray-500 italic">${t('profile.logTable.noData')}</p>`;
        return;
    }
    
    const displayRows = isEditMode ? DATA_ROWS_CONFIG_PROFILE.filter(c => c.key !== 'ror') : DATA_ROWS_CONFIG_PROFILE;

    const table = document.createElement('table');
    table.className = 'min-w-full text-xs border-collapse border border-gray-300';
    const thead = table.createTHead();
    thead.className = 'bg-gray-100 sticky top-0 z-10';
    const headRow = thead.insertRow();
    const firstHeaderCell = document.createElement('th');
    firstHeaderCell.className = 'px-3 py-2 text-left font-semibold text-gray-600 border border-gray-300 sticky left-0 bg-gray-100 z-20';
    firstHeaderCell.textContent = t('profile.logTable.header');
    headRow.appendChild(firstHeaderCell);

    const tbody = table.createTBody();
    tbody.className = 'bg-white';
    const dataRows = {};
    displayRows.forEach(conf => {
        const row = tbody.insertRow();
        row.id = conf.id;
        const th = document.createElement('th');
        th.scope = 'row';
        th.className = 'px-3 py-2 text-left font-semibold text-gray-700 border border-gray-300 sticky left-0 bg-white z-10 whitespace-nowrap';
        th.textContent = conf.label;
        row.appendChild(th);
        dataRows[conf.id] = row;
    });
    table.appendChild(tbody);
    transposedLogTableContainerElement.appendChild(table);

    const formatCellValue = (value) => (value !== null && value !== undefined && !isNaN(parseFloat(value))) ? parseFloat(value).toFixed(1) : '-';

    integerTimeEntries.forEach((entry) => {
        const timeHeader = document.createElement('th');
        timeHeader.scope = 'col';
        timeHeader.className = 'px-3 py-2 text-center font-medium text-gray-500 border border-gray-300';
        timeHeader.textContent = entry.time.toFixed(0);
        headRow.appendChild(timeHeader);
        
        displayRows.forEach(conf => {
            const cell = dataRows[conf.id].insertCell(-1);
            cell.className = 'px-3 py-2 text-center border border-gray-300';
            if (isEditMode) {
                const input = document.createElement('input');
                input.type = 'number';
                input.step = '0.1';
                input.className = 'w-16 p-1 text-center bg-yellow-50 border border-yellow-300 rounded-md';
                if (entry.time === 0 && conf.key === 'bean') {
                    input.value = entry[conf.key] !== null ? entry[conf.key].toFixed(1) : '';
                    input.disabled = true;
                } else {
                    input.value = entry[conf.key] !== null ? entry[conf.key] : '';
                }
                input.dataset.time = entry.time.toFixed(0);
                input.dataset.type = conf.key;
                cell.appendChild(input);
            } else {
                cell.textContent = formatCellValue(entry[conf.key]);
            }
        });
    });
}

function _renderChartOnly(sortedTimeEntries, roastData) {
    if (!chartCanvasElement || typeof Chart === 'undefined') return;
    if (detailedChartInstance) { detailedChartInstance.destroy(); detailedChartInstance = null; }
    
    const eventPoints = [
        { time: convertTimeStringToMinutes(roastData.turningPointTime), temp: roastData.turningPointTemp, event: 'TP' },
        { time: convertTimeStringToMinutes(roastData.firstCrackTime), temp: null, event: '1C' },
        { time: convertTimeStringToMinutes(roastData.secondCrackTime), temp: null, event: '2C' },
        { time: convertTimeStringToMinutes(roastData.totalRoastTime), temp: roastData.endOfRoastTemp, event: 'Drop' }
    ].filter(p => p.time !== null);

    const style = getComputedStyle(document.body);
    const accentR = style.getPropertyValue('--accent-r').trim();
    const accentG = style.getPropertyValue('--accent-g').trim();
    const accentB = style.getPropertyValue('--accent-b').trim();
    const beanTempFillColor = `rgba(${accentR}, ${accentG}, ${accentB}, 0.1)`;
    const beanTempBorderColor = `rgb(${accentR}, ${accentG}, ${accentB})`;

    const finalChartData = {
        datasets: [
            {
                label: t('profile.logTable.beanTemp'),
                data: sortedTimeEntries.map(p => ({x:p.time, y:p.bean})),
                borderColor: beanTempBorderColor,
                yAxisID: 'yTemp',
                spanGaps: true,
                tension: 0.3,
                fill: {
                    target: 'origin',
                    above: beanTempFillColor,
                },
                backgroundColor: beanTempFillColor,
                pointRadius: 4,
                pointBackgroundColor: beanTempBorderColor,
            },
            {
                label: t('profile.logTable.chamberTemp'),
                data: sortedTimeEntries.map(p => ({x:p.time, y:p.chamber})),
                borderColor: '#3b82f6',
                yAxisID: 'yTemp',
                spanGaps: true,
                tension: 0.3,
                fill: false,
                pointRadius: 3,
                pointStyle: 'rect',
            },
            {
                label: t('profile.logTable.ror'),
                data: sortedTimeEntries.map(p => ({x:p.time, y:p.ror})),
                borderColor: '#16a34a',
                yAxisID: 'yROR',
                tension: 0.3,
                borderDash: [5, 5],
                fill: false,
                pointRadius: 2,
                pointBackgroundColor: '#16a34a',
            }
        ]
    };
    
    const totalRoastMinutes = convertTimeStringToMinutes(roastData.totalRoastTime);
    const chartMaxX = sortedTimeEntries.length > 0 ? Math.ceil(Math.max(...sortedTimeEntries.map(p => p.time), 0)) + 1 : (totalRoastMinutes !== null ? Math.ceil(totalRoastMinutes) + 1 : 10);
    
    const chartConfig = {
        type: 'line',
        data: finalChartData,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { type: 'linear', title: { display: true, text: t('comparison.chart.timeAxis') }, min: 0, max: chartMaxX },
                yTemp: { type: 'linear', display: true, position: 'left', title: { display: true, text: t('comparison.chart.tempAxis') } },
                yROR: { type: 'linear', display: true, position: 'right', title: { display: true, text: t('profile.logTable.ror') }, grid: { drawOnChartArea: false } }
            },
            plugins: {
                legend: { position: 'top' },
                tooltip: { mode: 'index', intersect: false },
                annotation: {
                    annotations: eventPoints.reduce((acc, p) => {
                        acc[p.event] = {
                            type: 'line',
                            xMin: p.time,
                            xMax: p.time,
                            borderColor: 'rgba(128, 128, 128, 0.5)',
                            borderWidth: 1,
                            borderDash: [6, 6],
                            label: {
                                content: `${p.event} ${formatTime(p.time * 60)}`,
                                display: true,
                                position: 'start',
                                font: { size: 10 }
                            }
                        };
                        return acc;
                    }, {})
                }
            }
        }
    };
    try {
        detailedChartInstance = new Chart(chartCanvasElement, chartConfig);
    } catch (e) {
        console.error("ProfileModalUI: Error creating detailed roast chart:", e);
        if (messageElement) messageElement.textContent = t('profile.chart.error');
    }
}

function _renderRadarChart(ratingsData) {
    if (!radarChartCanvasElement || !radarChartSectionElement) return;
    if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
    
    if (!ratingsData || Object.keys(ratingsData).length === 0) {
        radarChartSectionElement.style.display = 'none';
        return;
    }
    radarChartSectionElement.style.display = 'block';
    
    const labels = RATING_CATEGORIES.map(key => RATING_DEFINITIONS[key]);
    const data = RATING_CATEGORIES.map(key => ratingsData[key] || 0);
    
    const chartConfig = {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: '評価', data: data, fill: true,
                backgroundColor: 'rgba(217, 119, 6, 0.2)',
                borderColor: 'rgb(217, 119, 6)',
                pointBackgroundColor: 'rgb(217, 119, 6)',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: 'rgb(217, 119, 6)'
            }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            elements: { line: { borderWidth: 3 } },
            scales: { r: { angleLines: { display: false }, suggestedMin: 0, suggestedMax: 5, ticks: { stepSize: 1 } } },
            plugins: { legend: { display: false } }
        }
    };
    try {
        radarChartInstance = new Chart(radarChartCanvasElement, chartConfig);
    } catch(e) {
        console.error("ProfileModalUI: Error creating radar chart:", e);
        radarChartSectionElement.innerHTML = `<p class="text-red-500">${t('profile.radar.error')}</p>`;
    }
}

export function showProfileModal(roastData) {
    if (!modalElement) return;

    currentRoastDataForCopy = roastData;
    titleElement.textContent = t('profile.titleWithBean', { beanName: roastData.beanName || t('text.unknown') });
    
    const timeDataMap = new Map();
    const addDataPoint = (time, bean, chamber, ror) => {
        if (time === null || time === undefined) return;
        const timeKey = parseFloat(time.toFixed(2));
        if (!timeDataMap.has(timeKey)) {
            timeDataMap.set(timeKey, { time: timeKey, bean: null, chamber: null, ror: null });
        }
        const point = timeDataMap.get(timeKey);
        if (bean !== null && bean !== undefined) point.bean = parseFloat(bean);
        if (chamber !== null && chamber !== undefined) point.chamber = parseFloat(chamber);
        if (ror !== null && ror !== undefined) point.ror = parseFloat(ror);
    };

    const beanTempsRaw = parseLogStringToArray(roastData.beanTempLog || '');
    const chamberTempsRaw = parseLogStringToArray(roastData.chamberTempLog || '');
    const rorValuesRaw = parseLogStringToArray(roastData.rorLog || '');

    if (roastData.chargingTemperature !== undefined && roastData.chargingTemperature !== null) {
        addDataPoint(0, roastData.chargingTemperature, roastData.chargingTemperature, null);
    }
    
    const maxLogLength = Math.max(beanTempsRaw.length, chamberTempsRaw.length, rorValuesRaw.length);
    for (let i = 0; i < maxLogLength; i++) {
        const minute = i + 1;
        addDataPoint(minute, beanTempsRaw[i], chamberTempsRaw[i], rorValuesRaw[i]);
    }
    
    const totalRoastMinutes = convertTimeStringToMinutes(roastData.totalRoastTime);
    if (totalRoastMinutes !== null && roastData.endOfRoastTemp !== undefined && roastData.endOfRoastTemp !== null) {
        addDataPoint(totalRoastMinutes, roastData.endOfRoastTemp, null, null);
    }
    
    const sortedTimeEntries = Array.from(timeDataMap.values()).sort((a, b) => a.time - b.time);
    currentRoastDataForCopy.logEntriesForDisplay = sortedTimeEntries;

    if (summaryDivElement) {
        summaryRoastIdSpanElement.textContent = roastData.customRoastId || roastData.id.substring(0, 8) || '-';
        summaryTotalTimeSpanElement.textContent = roastData.totalRoastTime || '-';
        let weightLossText = '-';
        if (roastData.greenBeanWeight && roastData.roastedBeanWeight) {
            const wl = calculateWeightLoss(roastData.greenBeanWeight, roastData.roastedBeanWeight);
            if (wl && !wl.error) weightLossText = wl.lossPercentage;
        }
        summaryWeightLossSpanElement.textContent = weightLossText;
        let dtrText = '-';
        if (roastData.firstCrackTime && roastData.totalRoastTime) {
            const dtr = calculateDTR(roastData.firstCrackTime, roastData.totalRoastTime);
            if (dtr !== null) dtrText = dtr.toFixed(1);
        }
        summaryDTRSpanElement.textContent = dtrText;
    }

    if (weatherInfoDivElement) {
        if (roastData.roastWeatherTemp !== undefined && roastData.roastWeatherHumidity !== undefined && roastData.roastWeatherTemp !== null) {
            weatherTempSpanElement.textContent = parseFloat(roastData.roastWeatherTemp).toFixed(1);
            weatherHumiditySpanElement.textContent = parseFloat(roastData.roastWeatherHumidity).toFixed(0);
            weatherInfoDivElement.style.display = 'block';
        } else {
            weatherInfoDivElement.style.display = 'none';
        }
    }
    
    if (profileAiNotesSectionElement) {
        if (roastData.aiNotes && roastData.aiNotes.trim() !== '') {
            profileAiNotesElement.textContent = roastData.aiNotes;
            profileAiNotesSectionElement.style.display = 'block';
        } else {
            profileAiNotesSectionElement.style.display = 'none';
            profileAiNotesElement.textContent = '';
        }
    }

    _renderChartOnly(sortedTimeEntries, roastData);
    _renderTransposedLogTable(sortedTimeEntries, false);
    _renderRadarChart(roastData.ratings);

    _exitLogEditMode(false);

    modalElement.classList.remove('hidden');
    setTimeout(() => {
        modalElement.classList.add('is-visible');
    }, 10);
}

export function hideProfileModal() {
    if (!modalElement) return;

    const onTransitionEnd = () => {
        modalElement.classList.add('hidden');
        modalElement.removeEventListener('transitionend', onTransitionEnd);

        if (detailedChartInstance) { detailedChartInstance.destroy(); detailedChartInstance = null; }
        if (radarChartInstance) { radarChartInstance.destroy(); radarChartInstance = null; }
        currentRoastDataForCopy = null;
        if (transposedLogTableContainerElement) transposedLogTableContainerElement.innerHTML = '';
        isLogEditMode = false;
    };

    modalElement.classList.remove('is-visible');
    modalElement.addEventListener('transitionend', onTransitionEnd);
}

export function initializeProfileModalUI() {
    modalElement = document.getElementById('profileModal');
    titleElement = document.getElementById('profileModalTitle');
    messageElement = document.getElementById('profileMessage');
    chartCanvasElement = document.getElementById('roastProfileChart');
    closeButtonElement = document.getElementById('closeProfileModalButton');
    copyJsonButtonElement = document.getElementById('copyProfileJsonButton');
    weatherInfoDivElement = document.getElementById('profileWeatherInfo');
    weatherTempSpanElement = document.getElementById('profileWeatherTemp');
    weatherHumiditySpanElement = document.getElementById('profileWeatherHumidity');
    summaryDivElement = document.getElementById('profileRoastSummary');
    summaryRoastIdSpanElement = document.getElementById('profileRoastId');
    summaryTotalTimeSpanElement = document.getElementById('profileSummaryTotalTime');
    summaryWeightLossSpanElement = document.getElementById('profileSummaryWeightLoss');
    summaryDTRSpanElement = document.getElementById('profileSummaryDTR');
    transposedLogTableContainerElement = document.getElementById('profileTransposedLogTableContainer');
    radarChartSectionElement = document.getElementById('radarChartSection');
    radarChartCanvasElement = document.getElementById('profileRadarChart');
    profileAiNotesSectionElement = document.getElementById('profileAiNotesSection');
    profileAiNotesElement = document.getElementById('profileAiNotes');
    getAiAnalysisButton = document.getElementById('getAiAnalysisButton');
    aiAnalysisSpinnerElement = document.getElementById('aiAnalysisSpinner');
    editTemperaturesButton = document.getElementById('editTemperaturesButton');
    saveTemperaturesButton = document.getElementById('saveTemperaturesButton');
    cancelEditTemperaturesButton = document.getElementById('cancelEditTemperaturesButton');

    if (!modalElement) return;
    
    if (closeButtonElement) closeButtonElement.addEventListener('click', hideProfileModal);
    if (editTemperaturesButton) editTemperaturesButton.addEventListener('click', _enterLogEditMode);
    if (saveTemperaturesButton) saveTemperaturesButton.addEventListener('click', _saveTemperatureChanges);
    if (cancelEditTemperaturesButton) cancelEditTemperaturesButton.addEventListener('click', () => _exitLogEditMode(true));
    
    if (getAiAnalysisButton) {
        getAiAnalysisButton.addEventListener('click', async () => {
            if (!currentRoastDataForCopy) {
                showToast(t('profile.ai.noData'), "error");
                return;
            }

            getAiAnalysisButton.disabled = true;
            getAiAnalysisButton.textContent = t('profile.ai.analyzing');
            if (profileAiNotesSectionElement) profileAiNotesSectionElement.style.display = 'block';
            if (profileAiNotesElement) profileAiNotesElement.style.display = 'none';
            if (aiAnalysisSpinnerElement) aiAnalysisSpinnerElement.style.display = 'block';

            try {
                const result = await FirebaseService.getRoastAnalysisFromAI(currentRoastDataForCopy);
                if (result && result.analysis) {
                    if (profileAiNotesElement) {
                        profileAiNotesElement.textContent = result.analysis;
                        profileAiNotesElement.style.display = 'block';
                    }
                    showToast(t('profile.ai.success'), "success");
                }
            } catch(error) {
                showToast(t('profile.ai.error', { message: error.message }), "error", 5000);
                if (profileAiNotesSectionElement) profileAiNotesSectionElement.style.display = 'none';
            } finally {
                getAiAnalysisButton.disabled = false;
                getAiAnalysisButton.textContent = t('profile.ai.requestButton');
                if (aiAnalysisSpinnerElement) aiAnalysisSpinnerElement.style.display = 'none';
            }
        });
    }
    
    if (copyJsonButtonElement) {
        copyJsonButtonElement.addEventListener('click', () => {
            if (currentRoastDataForCopy) {
                navigator.clipboard.writeText(JSON.stringify(currentRoastDataForCopy, null, 2))
                    .then(() => showToast(t('profile.copy.success'), "success"))
                    .catch(err => showToast(t('profile.copy.fail', { message: err.message }), "error"));
            }
        });
    }

    eventBus.on('ui:show-profile-modal', showProfileModal);
    
    // --- 初期化時に翻訳が必要な定数を設定 ---
    RATING_DEFINITIONS = {
        flavor: t('profile.ratingDefinitions.flavor'),
        bitterness: t('profile.ratingDefinitions.bitterness'),
        acidity: t('profile.ratingDefinitions.acidity'),
        sweetness: t('profile.ratingDefinitions.sweetness'),
        body: t('profile.ratingDefinitions.body')
    };
    RATING_CATEGORIES = Object.keys(RATING_DEFINITIONS);

    DATA_ROWS_CONFIG_PROFILE = [
        { id: 'profile-log-row-bean', key: 'bean', label: t('profile.logTable.beanTemp') },
        { id: 'profile-log-row-chamber', key: 'chamber', label: t('profile.logTable.chamberTemp') },
        { id: 'profile-log-row-ror', key: 'ror', label: t('profile.logTable.ror') }
    ];

    console.log("✅ ProfileModalUI initialized.");
}