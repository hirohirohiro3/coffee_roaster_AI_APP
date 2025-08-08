import { eventBus } from './EventBus.js';
import { getJoinedRoasts } from './dataService.js';
import { timeToSeconds, formatTime, calculateDTR } from './roastUtils.js';
import { updateRoastRecord } from './firebaseService.js';

// --- モジュールスコープの変数 ---
let monthlyChartInstance = null;
let scatterPlotInstance = null;
let beanRankingTableBody, scatterXAxisSelect, scatterYAxisSelect;
let updateNotificationBar, runUpdateButton, closeUpdateBarButton;

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
    if (yearSelector.options.length > 1) return;

    yearSelector.innerHTML = '<option value="">年を選択...</option>';
    years.forEach(year => {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = `${year}年`;
        yearSelector.appendChild(option);
    });
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
                label: '月別投資額 (円)',
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
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${bean.count} 回</td>
        </tr>
    `).join('');
}

// 相関分析で利用可能な指標の定義
const scatterAxesOptions = {
    dtr: { label: 'DTR (%)', getter: r => r.dtr },
    developmentTime: { label: '現像時間 (秒)', getter: r => timeToSeconds(r.totalRoastTime) - timeToSeconds(r.firstCrackTime) },
    totalRoastTime: { label: '合計時間 (秒)', getter: r => timeToSeconds(r.totalRoastTime) },
    chargeTemp: { label: '投入温度 (°C)', getter: r => r.chargeTemp },
    turningPointTemp: { label: 'TP温度 (°C)', getter: r => r.turningPointTemp },
    firstCrackTime: { label: '1ハゼ時間 (秒)', getter: r => timeToSeconds(r.firstCrackTime) },
    overallRating: { label: '総合評価 (点)', getter: r => r.overallRating }
};

/**
 * 相関分析のX軸・Y軸の選択肢を生成
 */
function populateScatterAxisSelects() {
    if (!scatterXAxisSelect || !scatterYAxisSelect || scatterXAxisSelect.options.length > 0) return;
    const optionsHtml = Object.entries(scatterAxesOptions)
        .map(([key, { label }]) => `<option value="${key}">${label}</option>`)
        .join('');
    scatterXAxisSelect.innerHTML = optionsHtml;
    scatterYAxisSelect.innerHTML = optionsHtml;
    scatterXAxisSelect.value = 'dtr';
    scatterYAxisSelect.value = 'overallRating';
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
    scatterPlotInstance = new Chart(ctx, {
        type: 'scatter',
        data: {
            datasets: [{
                label: `${scatterAxesOptions[xKey].label} vs ${scatterAxesOptions[yKey].label}`,
                data: data,
                backgroundColor: 'rgba(217, 119, 6, 0.7)'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { title: { display: true, text: scatterAxesOptions[xKey].label } },
                y: { title: { display: true, text: scatterAxesOptions[yKey].label } }
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

async function handleBatchUpdate() {
    if (!runUpdateButton) return;
    runUpdateButton.disabled = true;
    runUpdateButton.textContent = '更新処理を実行中...';
    const allRoasts = getJoinedRoasts();
    let updatedCount = 0;
    const updatePromises = allRoasts.map(roast => {
        let averageRating = roast.overallRating;
        if (roast.ratings && typeof roast.ratings === 'object' && (roast.overallRating === undefined || roast.overallRating === null)) {
            const ratingValues = Object.values(roast.ratings).map(v => Number(v)).filter(v => !isNaN(v));
            if (ratingValues.length > 0) {
                averageRating = parseFloat((ratingValues.reduce((s, v) => s + v, 0) / ratingValues.length).toFixed(2));
            }
        }
        let dtrValue = roast.dtr;
        if (typeof roast.dtr === 'undefined' || roast.dtr === null) {
            const dtr = calculateDTR(roast.firstCrackTime, roast.totalRoastTime);
            dtrValue = dtr ? parseFloat(dtr.toFixed(2)) : null;
        }
        const needsUpdate = roast.overallRating !== averageRating || roast.dtr !== dtrValue;
        if (needsUpdate) {
            updatedCount++;
            return updateRoastRecord(roast.id, { overallRating: averageRating, dtr: dtrValue });
        }
        return Promise.resolve();
    });
    try {
        await Promise.all(updatePromises);
        runUpdateButton.textContent = '更新が完了しました！';
        runUpdateButton.classList.remove('bg-teal-600', 'hover:bg-teal-700');
        runUpdateButton.classList.add('bg-green-600');
        eventBus.emit('ui:show-toast', { message: `${updatedCount}件の記録を更新しました。`, type: 'success' });
        setTimeout(() => { if (updateNotificationBar) updateNotificationBar.classList.add('hidden'); }, 2000);
    } catch (error) {
        console.error("一括更新中にエラーが発生しました:", error);
        eventBus.emit('ui:show-toast', { message: 'エラーが発生しました。', type: 'error' });
        runUpdateButton.textContent = 'エラーが発生しました';
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
        }
    });
    
    eventBus.on('data:joined-data-ready', () => {
        checkForOldDataAndShowPrompt(); 
        if (document.getElementById('statistics-page')?.style.display !== 'none') {
           renderAllStatistics();
        }
    });

    if (scatterXAxisSelect && scatterYAxisSelect) {
        scatterXAxisSelect.addEventListener('change', () => renderScatterPlot(getJoinedRoasts()));
        scatterYAxisSelect.addEventListener('change', () => renderScatterPlot(getJoinedRoasts()));
    }

    console.log("✅ Statistics Controller Initialized!");
}