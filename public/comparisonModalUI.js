import { eventBus } from './EventBus.js';

let modal, closeButton, chartCanvas, statsContainer;
let comparisonChartInstance = null;

// This function will need access to the main roast data cache
// It will be populated by the main controller
let getRoastsByIds = () => [];

function renderComparisonChart(roasts) {
    if (comparisonChartInstance) {
        comparisonChartInstance.destroy();
    }
    if (!chartCanvas) return;

    const colors = ['#d97706', '#3b82f6', '#16a34a'];
    const datasets = roasts.map((roast, index) => {
        const profileData = roast.beanTempLog ?
            roast.beanTempLog.split(',').map((temp, i) => temp ? { x: i, y: parseFloat(temp) } : null).filter(p => p) :
            [];
        return {
            label: roast.beanName || `Roast ${index + 1}`,
            data: profileData,
            borderColor: colors[index % colors.length],
            backgroundColor: colors[index % colors.length],
            yAxisID: 'yTemp',
            tension: 0.1,
            pointRadius: 2,
            pointHoverRadius: 4,
        };
    });

    const ctx = chartCanvas.getContext('2d');
    comparisonChartInstance = new Chart(ctx, {
        type: 'line',
        data: { datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: { mode: 'index', intersect: false },
            scales: {
                x: { type: 'linear', position: 'bottom', title: { display: true, text: '時間 (分)' }, min: 0 },
                yTemp: { type: 'linear', position: 'left', title: { display: true, text: '温度 (°C)' } },
            },
            plugins: { legend: { position: 'top' } }
        }
    });
}

function renderComparisonStats(roasts) {
    if (!statsContainer) return;
    statsContainer.innerHTML = '';

    roasts.forEach(roast => {
        const dtr = roast.dtr !== undefined && roast.dtr !== null ? `${roast.dtr}%` : 'N/A';
        const totalTime = roast.totalRoastTime || 'N/A';
        const overallRating = roast.overallRating !== undefined && roast.overallRating !== null ? roast.overallRating.toFixed(1) : 'N/A';

        const statsCard = document.createElement('div');
        statsCard.className = 'p-4 bg-gray-50 rounded-lg border';
        statsCard.innerHTML = `
            <h3 class="font-bold text-lg truncate" title="${roast.beanName || 'N/A'}">${roast.beanName || 'N/A'}</h3>
            <p class="text-sm text-gray-500">${roast.roastDate}</p>
            <div class="mt-2 space-y-1 text-sm">
                <p><strong>総合評価:</strong> ${overallRating}</p>
                <p><strong>総時間:</strong> ${totalTime}</p>
                <p><strong>DTR:</strong> ${dtr}</p>
            </div>
        `;
        statsContainer.appendChild(statsCard);
    });
}

function showComparisonModal(roastIds) {
    const roastsToCompare = getRoastsByIds(roastIds);
    if (roastsToCompare.length !== roastIds.length) {
        console.error("Could not find all selected roasts for comparison.");
        // Maybe show a toast message here
        return;
    }

    renderComparisonChart(roastsToCompare);
    renderComparisonStats(roastsToCompare);

    if (modal) {
        modal.classList.remove('hidden');
        setTimeout(() => {
            modal.classList.add('is-visible');
        }, 10);
    }
}

function hideComparisonModal() {
    if (modal) {
        modal.classList.remove('is-visible');
        modal.addEventListener('transitionend', () => {
            modal.classList.add('hidden');
        }, { once: true });
    }
    if (comparisonChartInstance) {
        comparisonChartInstance.destroy();
        comparisonChartInstance = null;
    }
    if (statsContainer) {
        statsContainer.innerHTML = '';
    }
}

export function initializeComparisonModalUI(roastDataProvider) {
    modal = document.getElementById('comparisonModal');
    closeButton = document.getElementById('closeComparisonModalButton');
    chartCanvas = document.getElementById('comparisonChart');
    statsContainer = document.getElementById('comparisonStatsContainer');

    getRoastsByIds = roastDataProvider;

    if (!modal || !closeButton || !chartCanvas || !statsContainer) {
        return; // Modal not present on this page
    }

    closeButton.addEventListener('click', hideComparisonModal);
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            hideComparisonModal();
        }
    });

    eventBus.on('ui:show-comparison', showComparisonModal);

    console.log("✅ ComparisonModalUI initialized.");
}
