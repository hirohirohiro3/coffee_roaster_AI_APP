import { initializeFirebase } from '../../services/authService.js';
import { initializeDataService } from '../../services/dataService.js';
import { initializeBeanService } from '../beans/beanService.js';
import { initializeUIManager } from '../../ui/uiManager.js';
import { initializeUITranslator } from '../../modules/core/uiTranslator.js';
import { initializeAuthController } from '../../authController.js';
import { initializeRoastWorkflowController, getRoastDetailsByIds } from '../roast/roastWorkflowController.js';
import { initializeBeanStockController } from '../beans/beanStockController.js';
import { initializeTimerController } from '../roast/timerController.js';
import { initializeGraphController } from '../roast/graphController.js';
import { initializeStatisticsController } from '../../statisticsController.js';
import { initializeAuthForms } from '../../ui/authUI.js';
import { initializeRoastFormUI } from '../roast/roastFormUI.js';
import { initializeRoastListUI } from '../roast/roastListUI.js';
import { initializeTimerDisplayUI } from '../roast/timerDisplayUI.js';
import { initializeConfirmModal } from '../../ui/confirmModalUI.js';
import { initializeProfileModalUI } from '../../ui/profileModalUI.js';
import { initializeBeanStockModalUI } from '../beans/beanStockModalUI.js';
import { initializeComparisonModalUI } from '../../ui/comparisonModalUI.js';
import { initializeRealtimeGraphUI } from '../roast/realtimeGraphUI.js';
import { initializeRealtimeLogTableUI } from '../roast/RealtimeLogTableUI.js';
import { registerPage, initializePageNavigation } from '../../ui/pageViewManager.js';

function initializeThemeManager() {
    const themeToggle = document.getElementById('theme-toggle');
    const moonIcon = document.getElementById('moon-icon');
    const sunIcon = document.getElementById('sun-icon');

    if (!themeToggle || !moonIcon || !sunIcon) {
        console.warn("Theme toggle elements not found, skipping theme manager initialization.");
        return;
    }

    const applyTheme = (theme) => {
        if (theme === 'dark') {
            document.body.classList.add('dark');
            moonIcon.classList.add('hidden');
            sunIcon.classList.remove('hidden');
        } else {
            document.body.classList.remove('dark');
            moonIcon.classList.remove('hidden');
            sunIcon.classList.add('hidden');
        }
    };

    const savedTheme = localStorage.getItem('theme') || 'light';
    applyTheme(savedTheme);

    themeToggle.addEventListener('click', () => {
        const isDark = document.body.classList.contains('dark');
        const newTheme = isDark ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        applyTheme(newTheme);
    });
}

function registerPages() {
    registerPage('list', document.getElementById('roast-list-page'));
    registerPage('stats', document.getElementById('statistics-page'));
}

export function initializeAllModules() {
    initializeThemeManager();

    // Core Services
    initializeFirebase();
    initializeDataService();
    initializeBeanService();

    // UI Management
    initializeUIManager();
    initializeUITranslator();

    // Controllers
    initializeAuthController();
    initializeRoastWorkflowController();
    initializeBeanStockController();
    initializeTimerController();
    initializeGraphController();
    initializeStatisticsController();

    // UI Modules
    initializeAuthForms();
    initializeRoastFormUI();
    initializeRoastListUI();
    initializeTimerDisplayUI();
    initializeConfirmModal();
    initializeProfileModalUI();
    initializeBeanStockModalUI();
    initializeComparisonModalUI(getRoastDetailsByIds);
    initializeRealtimeGraphUI();
    initializeRealtimeLogTableUI();

    // Initialize navigation and page registration last
    registerPages();
    initializePageNavigation();
}
