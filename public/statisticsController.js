import { eventBus } from './EventBus.js';
import { getJoinedRoasts } from './dataService.js';
import { timeToSeconds, formatTime, calculateDTR } from './roastUtils.js';
import { updateRoastRecord } from './services/firestoreService.js';
import { t } from './i18n.js';

// --- モジュールスコープの変数 ---
let monthlyChartInstance = null;
let scatterPlotInstance = null;
let beanRankingTableBody, scatterXAxisSelect, scatterYAxisSelect;
let updateNotificationBar, runUpdateButton, closeUpdateBarButton;
let flavorRadarChartInstance = null;
let flavorAnalysisBeanSelect, flavorAnalysisParamSelect, flavorRadarChartContainer;
let flavorRadarMessage;

// --- 表示期間を管理 ---
// type: 'relative'(過去Nヶ月) or 'absolute'(西暦年)
// value: 12 (ヶ月数) or 2025 (年)
let currentPeriod = { type: 'relative', value: 12 };

// --- ヘルパー関数 ---

/**
 * 焙煎データから存在する年をユニークに抽出し、降順で返す
 */
function getUniqueYears(roasts) {
    const years = new Set();
    roasts.forEach(roast => {
        if (roast.roastDate) {
            years.add(roast.roastDate.substring(0, 4));
        }
    });
    return Array.from(years).sort((a, b) => b.localeCompare(a));
}

/**
 * 年選択のプルダウンメニューを動的に生成する
 */
function populateYearSelector(years) {
    const yearSelector = document.getElementById('year-selector');
    if (!yearSelector) return;
    
    // すでにオプションが生成済みなら何もしない
    if (yearSelector.options.length > 1 && yearSelector.dataset.i18nLoaded) return;

    const selectedValue = yearSelector.value;
    yearSelector.innerHTML = `<option value="">${t('selectYear')}</option>`;
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = t('yearLabel', { year });
        yearSelector.appendChild(option);
    });
    yearSelector.value = selectedValue;
    yearSelector.dataset.i18nLoaded = true;
}


/**
 * 統計データを描画するメイン関数
 */
function renderAllStatistics() {
    const allRoasts = getJoinedRoasts();
    if (!allRoasts || allRoasts.length === 0) {
        if(beanRankingTableBody) beanRankingTableBody.innerHTML = '';
        return;
    }

    // 年選択プルダウンを一度だけ生成する
    populateYearSelector(getUniqueYears(allRoasts));
    
    let filteredRoasts = allRoasts;
    if (currentPeriod.type === 'relative') {
        const cutoffDate = new Date();
        cutoffDate.setMonth(cutoffDate.getMonth() - currentPeriod.value);
        cutoffDate.setDate(1);
        filteredRoasts = allRoasts.filter(r => r.roastDate && new Date(r.roastDate) >= cutoffDate);
    } else if (currentPeriod.type === 'absolute') {
        filteredRoasts = allRoasts.filter(r => r.roastDate && r.roastDate.startsWith(currentPeriod.value));
    }

    renderMonthlyCostChart(filteredRoasts);
    renderBeanRankingTable(filteredRoasts);
    populateScatterAxisSelects();
    renderScatterPlot(filteredRoasts);
}

/**
 * 月別投資額チャートを描画
 */
function renderMonthlyCostChart(roasts) {
    const monthlyCosts = roasts.reduce((acc, roast) => {
        if (roast.roastDate && (roast.cost !== undefined && roast.cost !== null)) {
            const costAsNumber = Number(roast.cost);
            if (!isNaN(costAsNumber)) {
                const month = roast.roastDate.substring(0, 7);
                acc[month] = (acc[month] || 0) + costAsNumber;
            }
        }
        return acc;
    }, {});
    
    const sortedMonths = Object.keys(monthlyCosts).sort();
    const labels = sortedMonths;
    const data = sortedMonths.map(month => monthlyCosts[month]);
    const ctx = document.getElementById('monthlyCostChart')?.getContext('2d');
    if (!ctx) return;
    if (monthlyChartInstance) monthlyChartInstance.destroy();

    monthlyChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: t('monthlyInvestmentYen'),
                data: data,
                backgroundColor: 'rgba(217, 119, 6, 0.5)',
                borderColor: 'rgba(217, 119, 6, 1)',
                borderWidth: 1,
                barPercentage: 0.6,
                categoryPercentage: 0.7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { beginAtZero: true } },
            plugins: { legend: { display: true, position: 'top' } }
        }
    });
}

/**
 * 豆ごとの平均総合評価ランキングテーブルを描画
 */
function renderBeanRankingTable(roasts) {
    if (!beanRankingTableBody) return;
    const beanStats = roasts.reduce((acc, roast) => {
        if (roast.beanName && (roast.overallRating !== undefined && roast.overallRating !== null)) {
            if (!acc[roast.beanName]) {
                acc[roast.beanName] = { ratings: [], count: 0 };
            }
            acc[roast.beanName].ratings.push(Number(roast.overallRating));
            acc[roast.beanName].count++;
        }
        return acc;
    }, {});
    const rankedBeans = Object.entries(beanStats).map(([name, stats]) => {
        const avgRating = stats.ratings.reduce((a, b) => a + b, 0) / stats.count;
        return { name, avgRating: avgRating.toFixed(2), count: stats.count };
    }).sort((a, b) => b.avgRating - a.avgRating);

    beanRankingTableBody.innerHTML = rankedBeans.map((bean, index) => `
        <tr>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${index + 1}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${bean.name}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${bean.avgRating} ★</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${bean.count} ${t('countSuffix')}</td>
        </tr>
    `).join('');
}

// 相関分析で利用可能な指標の定義
const scatterAxesOptions = {
    // 焙煎プロセス
    dtr: { labelKey: 'axisDtrPct', getter: r => r.dtr },
    developmentTime: { labelKey: 'axisDevTimeSec', getter: r => {
        const totalSeconds = timeToSeconds(r.totalRoastTime);
        const crackSeconds = timeToSeconds(r.firstCrackTime);
        return (totalSeconds && crackSeconds) ? totalSeconds - crackSeconds : null;
    }},
    totalRoastTime: { labelKey: 'axisTotalTimeSec', getter: r => timeToSeconds(r.totalRoastTime) },
    chargeTemp: { labelKey: 'axisChargeTempC', getter: r => r.chargeTemp },
    turningPointTemp: { labelKey: 'axisTpTempC', getter: r => r.turningPointTemp },
    firstCrackTime: { labelKey: 'axisFcTimeSec', getter: r => timeToSeconds(r.firstCrackTime) },
    // 物理的な結果
    weightLoss: { labelKey: 'axisWeightLossPct', getter: r => r.weightLoss },
    greenBeanWeight: { labelKey: 'axisGreenWeightKg', getter: r => r.greenBeanWeight },
    // 感覚的な評価
    overallRating: { labelKey: 'axisOverallRating', getter: r => r.overallRating },
    acidityIntensity: { labelKey: 'axisAcidityIntensity', getter: r => r.acidityIntensity },
    bodyWeight: { labelKey: 'axisBodyWeight', getter: r => r.bodyWeight },
    aftertasteLength: { labelKey: 'axisAftertasteLength', getter: r => r.aftertasteLength },
    aftertasteQuality: { labelKey: 'axisAftertasteQuality', getter: r => r.aftertasteQuality },
    balance: { labelKey: 'axisBalance', getter: r => r.balance }
};

/**
 * 相関分析のX軸・Y軸の選択肢を生成
 */
function populateScatterAxisSelects() {
    if (!scatterXAxisSelect || !scatterYAxisSelect || scatterXAxisSelect.dataset.i18nLoaded) return;

    const axisGroups = {
        "axisGroupProcess": {
            dtr: { labelKey: 'axisDtrPct' },
            developmentTime: { labelKey: 'axisDevTimeSec' },
            totalRoastTime: { labelKey: 'axisTotalTimeSec' },
            chargeTemp: { labelKey: 'axisChargeTempC' },
            turningPointTemp: { labelKey: 'axisTpTempC' },
            firstCrackTime: { labelKey: 'axisFcTimeSec' }
        },
        "axisGroupPhysical": {
            weightLoss: { labelKey: 'axisWeightLossPct' },
            greenBeanWeight: { labelKey: 'axisGreenWeightKg' }
        },
        "axisGroupSensory": {
            overallRating: { labelKey: 'axisOverallRating' },
            acidityIntensity: { labelKey: 'axisAcidityIntensity' },
            bodyWeight: { labelKey: 'axisBodyWeight' },
            aftertasteLength: { labelKey: 'axisAftertasteLength' },
            aftertasteQuality: { labelKey: 'axisAftertasteQuality' },
            balance: { labelKey: 'axisBalance' }
        }
    };

    const buildOptions = (selectElement) => {
        const currentValue = selectElement.value;
        let optionsHtml = '';
        for (const groupKey in axisGroups) {
            optionsHtml += `<optgroup label="--- ${t(groupKey)} ---">`;
            for (const key in axisGroups[groupKey]) {
                optionsHtml += `<option value="${key}">${t(axisGroups[groupKey][key].labelKey)}</option>`;
            }
            optionsHtml += `</optgroup>`;
        }
        selectElement.innerHTML = optionsHtml;
        selectElement.value = currentValue;
    };

    buildOptions(scatterXAxisSelect);
    buildOptions(scatterYAxisSelect);

    scatterXAxisSelect.value = 'dtr';
    scatterYAxisSelect.value = 'overallRating';

    scatterXAxisSelect.dataset.i18nLoaded = true;
    scatterYAxisSelect.dataset.i18nLoaded = true;
}

/**
 * 相関分析の散布図を描画
 */
function renderScatterPlot(roasts) {
    if (!scatterXAxisSelect || !scatterYAxisSelect) return;
    const xKey = scatterXAxisSelect.value;
    const yKey = scatterYAxisSelect.value;
    const data = roasts.map(r => {
        const x = scatterAxesOptions[xKey]?.getter(r);
        const y = scatterAxesOptions[yKey]?.getter(r);
        if (x === null || y === null || isNaN(x) || isNaN(y)) return null;
        return { x, y, beanName: r.beanName };
    }).filter(Boolean);
    const ctx = document.getElementById('scatterPlotChart')?.getContext('2d');
    if (!ctx) return;
    if (scatterPlotInstance) scatterPlotInstance.destroy();

    const xLabel = t(scatterAxesOptions[xKey].labelKey);
    const yLabel = t(scatterAxesOptions[yKey].labelKey);

    scatterPlotInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: `${xLabel} vs ${yLabel}`,
                data: data,
                backgroundColor: 'rgba(217, 119, 6, 0.7)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: xLabel } },
                y: { title: { display: true, text: yLabel } }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const point = context.raw;
                            const xVal = typeof point.x === 'number' ? point.x.toFixed(2) : point.x;
                            const yVal = typeof point.y === 'number' ? point.y.toFixed(2) : point.y;
                            return `${point.beanName}: (${xVal}, ${yVal})`;
                        }
                    }
                }
            }
        }
    });
}

// --- 一括更新用のロジック ---

function checkForOldDataAndShowPrompt() {
    const allRoasts = getJoinedRoasts();
    if (!allRoasts || allRoasts.length === 0 || !updateNotificationBar) return;
    const needsUpdate = allRoasts.some(roast => typeof roast.overallRating === 'undefined' || roast.overallRating === null || typeof roast.dtr === 'undefined');
    if (needsUpdate) {
        updateNotificationBar.classList.remove('hidden');
    }
}

// public/statisticsController.js 内の handleBatchUpdate 関数をこれに置き換える
async function handleBatchUpdate() {
    if (!runUpdateButton) return;
    runUpdateButton.disabled = true;
    runUpdateButton.textContent = t('updateInProgress');
    const allRoasts = getJoinedRoasts();
    let updatedCount = 0;
    const updatePromises = allRoasts.map(roast => {
        const dataToUpdate = {};
        let needsUpdate = false;

        // overallRatingの計算とチェック
        let averageRating = roast.overallRating;
        if (roast.ratings && typeof roast.ratings === 'object' && (roast.overallRating === undefined || roast.overallRating === null)) {
            const ratingValues = Object.values(roast.ratings).map(v => Number(v)).filter(v => !isNaN(v));
            if (ratingValues.length > 0) {
                averageRating = parseFloat((ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length).toFixed(2));
            }
        }
        if (averageRating === undefined) {
            averageRating = null;
        }
        if (roast.overallRating !== averageRating) {
            dataToUpdate.overallRating = averageRating;
            needsUpdate = true;
        }

        // dtrの計算とチェック
        let dtrValue = roast.dtr;
        if (typeof roast.dtr === 'undefined' || roast.dtr === null) {
            const dtr = calculateDTR(roast.firstCrackTime, roast.totalRoastTime);
            dtrValue = dtr ? parseFloat(dtr.toFixed(2)) : null;
        }
        if (roast.dtr !== dtrValue) {
            dataToUpdate.dtr = dtrValue;
            needsUpdate = true;
        }

        if (needsUpdate) {
            updatedCount++;
            return updateRoastRecord(roast.id, dataToUpdate);
        }
        return Promise.resolve();
    });
    try {
        await Promise.all(updatePromises);
        runUpdateButton.textContent = t('updateComplete');
        runUpdateButton.classList.remove('bg-teal-600', 'hover:bg-teal-700');
        runUpdateButton.classList.add('bg-green-600');
        eventBus.emit('ui:show-toast', { message: t('recordsUpdated', { count: updatedCount }), type: 'success' });
        setTimeout(() => { if (updateNotificationBar) updateNotificationBar.classList.add('hidden'); }, 2000);
    } catch (error) {
        console.error(t('batchUpdateError'), error);
        eventBus.emit('ui:show-toast', { message: t('anErrorOccurred'), type: 'error' });
        runUpdateButton.textContent = t('anErrorOccurred');
        runUpdateButton.classList.add('bg-red-600');
    }
}

// --- 初期化 ---

export function initializeStatisticsController() {
    beanRankingTableBody = document.getElementById('beanRankingTableBody');
    scatterXAxisSelect = document.getElementById('scatterXAxisSelect');
    scatterYAxisSelect = document.getElementById('scatterYAxisSelect');
    updateNotificationBar = document.getElementById('update-notification-bar');
    runUpdateButton = document.getElementById('run-update-button');
    closeUpdateBarButton = document.getElementById('close-update-bar-button');
    const periodSelector = document.getElementById('period-selector');
    const yearSelector = document.getElementById('year-selector');

    // 新機能「フレーバー分析」のUI要素を取得
    flavorAnalysisBeanSelect = document.getElementById('flavorAnalysisBeanSelect');
    flavorAnalysisParamSelect = document.getElementById('flavorAnalysisParamSelect');
    flavorRadarChartContainer = document.getElementById('flavorRadarChartContainer');
    flavorRadarMessage = document.getElementById('flavorRadarMessage');

    // プルダウンが変更されたらチャートを再描画するイベントリスナーを設定
    if (flavorAnalysisBeanSelect && flavorAnalysisParamSelect) {
        flavorAnalysisBeanSelect.addEventListener('change', renderFlavorRadarChart);
        flavorAnalysisParamSelect.addEventListener('change', renderFlavorRadarChart);
    }

    if (runUpdateButton) runUpdateButton.addEventListener('click', handleBatchUpdate);
    if (closeUpdateBarButton) closeUpdateBarButton.addEventListener('click', () => updateNotificationBar.classList.add('hidden'));

    if (periodSelector) {
        periodSelector.addEventListener('click', (e) => {
            if (e.target.tagName === 'BUTTON') {
                const newPeriodValue = Number(e.target.dataset.period);
                currentPeriod = { type: 'relative', value: newPeriodValue };
                periodSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('bg-white', 'shadow'));
                e.target.classList.add('bg-white', 'shadow');
                if (yearSelector) yearSelector.value = "";
                renderAllStatistics();
            }
        });
    }

    if (yearSelector) {
        yearSelector.addEventListener('change', (e) => {
            const newYear = e.target.value;
            if (newYear) {
                currentPeriod = { type: 'absolute', value: newYear };
                if (periodSelector) periodSelector.querySelectorAll('button').forEach(btn => btn.classList.remove('bg-white', 'shadow'));
                renderAllStatistics();
            }
        });
    }

    eventBus.on('nav:page-shown', ({ pageName }) => {
        if (pageName === 'stats') {
            renderAllStatistics();
            populateFlavorAnalysisSelects();
        }
    });
    
    eventBus.on('data:joined-data-ready', () => {
        checkForOldDataAndShowPrompt(); 
        if (document.getElementById('statistics-page')?.style.display !== 'none') {
           renderAllStatistics();
        }
    });

    document.addEventListener('language-changed', () => {
        if (document.getElementById('statistics-page')?.style.display !== 'none') {
            renderAllStatistics();
            populateFlavorAnalysisSelects();
        }
    });

    if (scatterXAxisSelect && scatterYAxisSelect) {
        scatterXAxisSelect.addEventListener('change', () => renderScatterPlot(getJoinedRoasts()));
        scatterYAxisSelect.addEventListener('change', () => renderScatterPlot(getJoinedRoasts()));
    }

    console.log("✅ Statistics Controller Initialized!");
}

/**
 * 生豆別フレーバー分析のプルダウンを初期化・生成する関数
 */
function populateFlavorAnalysisSelects() {
    if (flavorAnalysisBeanSelect && flavorAnalysisBeanSelect.dataset.i18nLoaded) return;
    if (!flavorAnalysisBeanSelect || !flavorAnalysisParamSelect) return;

    const allRoasts = getJoinedRoasts();

    const uniqueBeanNames = [...new Set(allRoasts.map(r => r.beanName).filter(name => name && name !== t('deletedBean')))];
    uniqueBeanNames.sort((a, b) => a.localeCompare(b, 'ja'));
    flavorAnalysisBeanSelect.innerHTML = `<option value="">${t('selectBeanFirst')}</option>` +
        uniqueBeanNames.map(name => `<option value="${name}">${name}</option>`).join('');

    const params = {
        dtr: { labelKey: 'axisDtrPct' },
        developmentTime: { labelKey: 'axisDevTimeSec' },
        totalRoastTime: { labelKey: 'axisTotalTimeSec' },
        weightLoss: { labelKey: 'axisWeightLossPct' },
        chargeTemp: { labelKey: 'axisChargeTempC' }
    };
    flavorAnalysisParamSelect.innerHTML = Object.entries(params)
        .map(([key, { labelKey }]) => `<option value="${key}">${t(labelKey)}</option>`)
        .join('');

    flavorAnalysisBeanSelect.dataset.i18nLoaded = true;
}

function renderFlavorRadarChart() {
    if (!flavorAnalysisBeanSelect || !flavorAnalysisParamSelect || !flavorRadarChartContainer || !flavorRadarMessage) return;

    const selectedBeanName = flavorAnalysisBeanSelect.value;
    const selectedParamKey = flavorAnalysisParamSelect.value;
    const allRoasts = getJoinedRoasts();
    const chartCanvas = document.getElementById('flavorRadarChart');

    if (!selectedBeanName) {
        flavorRadarChartContainer.style.display = 'none';
        return;
    }

    const targetRoasts = allRoasts.filter(r => r.beanName === selectedBeanName && r.flavorProfile);
    const flavorStats = {};
    targetRoasts.forEach(roast => {
        const paramValue = scatterAxesOptions[selectedParamKey]?.getter(roast);
        if (paramValue === null || typeof paramValue === 'undefined' || isNaN(paramValue)) return;
        const flavors = roast.flavorProfile.split(',');
        flavors.forEach(flavor => {
            const trimmedFlavor = flavor.trim();
            if (trimmedFlavor) {
                if (!flavorStats[trimmedFlavor]) {
                    flavorStats[trimmedFlavor] = { total: 0, count: 0 };
                }
                flavorStats[trimmedFlavor].total += paramValue;
                flavorStats[trimmedFlavor].count++;
            }
        });
    });

    const labels = Object.keys(flavorStats);
    flavorRadarChartContainer.style.display = 'flex';

    if (labels.length < 3) {
        if (chartCanvas) chartCanvas.style.display = 'none';
        flavorRadarMessage.style.display = 'block';
        flavorRadarMessage.textContent = t('notEnoughFlavorData', { beanName: selectedBeanName });
        if (flavorRadarChartInstance) {
            flavorRadarChartInstance.destroy();
            flavorRadarChartInstance = null;
        }
        return;
    }

    if (chartCanvas) chartCanvas.style.display = 'block';
    flavorRadarMessage.style.display = 'none';

    const data = labels.map(label => (flavorStats[label].total / flavorStats[label].count));
    const ctx = chartCanvas?.getContext('2d');
    if (!ctx) return;

    if (flavorRadarChartInstance) {
        flavorRadarChartInstance.destroy();
    }

    const paramLabel = t(scatterAxesOptions[selectedParamKey].labelKey);

    flavorRadarChartInstance = new Chart(ctx, {
        type: 'radar',
        data: {
            labels: labels,
            datasets: [{
                label: t('flavorRadarLabel', { beanName: selectedBeanName, param: paramLabel }),
                data: data,
                fill: true,
                backgroundColor: 'rgba(217, 119, 6, 0.2)',
                borderColor: 'rgb(217, 119, 6)',
                pointBackgroundColor: 'rgb(217, 119, 6)',
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { r: { pointLabels: { font: { size: 14 } } } },
            plugins: { legend: { labels: { font: { size: 14 } } } }
        }
    });
}