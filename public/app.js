import { initI18n, setLanguage, t } from './i18n.js';
import { initializeUITranslator, updateUIText } from './uiTranslator.js';
import { loadAllComponents } from './htmlLoader.js';
import { initializeFirebase } from './firebaseService.js';
import { initializeDataService } from './dataService.js';
import { initializeBeanService } from './beanService.js';
import { initializeUIManager } from './uiManager.js';
import { initializePageNavigation, registerPage } from './pageViewManager.js';
import { eventBus } from './EventBus.js';
import { fetchCurrentWeatherForRoast } from './weatherService.js';
import { initializeAuthController } from './authController.js';
import { initializeRoastWorkflowController, handleAddNewRoast, getRoastDetailsByIds } from './roastWorkflowController.js';
import { initializeBeanStockController } from './beanStockController.js';
import { initializeTimerController, getCurrentElapsedTimeInSeconds, getIsTimerRunning, recordCrackTime } from './timerController.js';
import { initializeGraphController } from './graphController.js';
import { initializeStatisticsController } from './statisticsController.js';
import { showToast, setFormFieldValue, speak } from './ui.js';
import { initializeAuthForms } from './authUI.js';
import { initializeRoastFormUI } from './roastFormUI.js';
import { initializeRoastListUI } from './roastListUI.js';
import { initializeTimerDisplayUI } from './timerDisplayUI.js';
import { initializeConfirmModal } from './confirmModalUI.js';
import { initializeProfileModalUI } from './profileModalUI.js';
import { initializeBeanStockModalUI } from './beanStockModalUI.js';
import { initializeComparisonModalUI } from './comparisonModalUI.js';
import { initializeRealtimeGraphUI } from './realtimeGraphUI.js';
import { initializeRealtimeLogTableUI } from './RealtimeLogTableUI.js';
import { formatTime } from './roastUtils.js';

export default class App {
    constructor() {
        // constructor is empty
    }

    async start() {
        initI18n(); // Initialize i18n
        console.log("Application starting...");

        // 1. Wait for the 'html:loaded' event
        eventBus.on('html:loaded', () => {
            console.log("app.js: 'html:loaded' event received. Initializing modules...");
            
            // 2. Initialize all JavaScript modules
            this._initializeAllModules();
            this._setupGlobalEventListeners();
            
            // 3. Perform initial UI translation
            updateUIText();

            // 4. Notify that the application is ready
            eventBus.emit('app:ready');
            console.log("Application is ready!");
        });
        
        // 5. Start loading HTML components
        try {
            await this._loadComponents();
        } catch (error) {
            console.error("FATAL: Application failed to start during component loading.", error);
        }
    }

    async _loadComponents() {
        const componentsToLoad = [
            { url: '_header.html', containerId: 'header-container' },
            { url: '_auth_forms.html', containerId: 'authSection' },
            { url: '_add_new_button.html', containerId: 'add-new-button-container' },
            { url: '_timer.html', containerId: 'timer-container' },
            { url: '_roast_form.html', containerId: 'roast-form-container' },
            { url: '_filter.html', containerId: 'filter-sort-container' },
            { url: '_roast_list.html', containerId: 'roast-list-container' },
            { url: '_footer.html', containerId: 'footer-container' },
            { url: '_bean_stock_modal.html', containerId: 'modals-container' },
            { url: '_comparison_modal.html', containerId: 'modals-container', append: true },
            { url: '_statistics.html', containerId: 'statistics-page' },
        ];
        
        await loadAllComponents(componentsToLoad);
    }
    
    _registerPages() {
        registerPage('list', document.getElementById('roast-list-page'));
        registerPage('stats', document.getElementById('statistics-page'));
    }
    
    _initializeAllModules() {
        this._initializeThemeManager();

        // Core Services
        initializeFirebase();
        initializeDataService();
        initializeBeanService();
        
        // UI Management
        initializeUIManager();
        initializeUITranslator(); // Initialize UI Translator
        
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
        this._registerPages();
        initializePageNavigation();
    }
    
    _setupGlobalEventListeners() {
        // Language switcher
        const langSwitcher = document.getElementById('language-switcher');
        if (langSwitcher) {
            langSwitcher.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (target && target.dataset.lang) {
                    setLanguage(target.dataset.lang);
                }
            });
        }

        eventBus.on('ui:log-event-time', this.handleLogEventTime.bind(this));
        eventBus.on('audio:speak', (text) => speak(text));
        eventBus.on('ui:fetch-weather', this.handleFetchWeather.bind(this));

        const addNewRoastButton = document.getElementById('addNewRoastButton');
        
        eventBus.on('beans:updated-for-roast-form', (beansInStock) => {
            if (addNewRoastButton) {
                const hasBeans = beansInStock.some(b => (b.remainingAmount || 0) > 0);
                addNewRoastButton.disabled = !hasBeans;
                // Note: This text will be updated by the i18n system via data-i18n-key
                if (!hasBeans) {
                    addNewRoastButton.textContent = t('noBeansInStock'); // Fallback text
                }
                addNewRoastButton.classList.toggle('bg-amber-400', !hasBeans);
                addNewRoastButton.classList.toggle('cursor-not-allowed', !hasBeans);
                addNewRoastButton.classList.toggle('bg-amber-600', hasBeans);
                addNewRoastButton.classList.toggle('hover:bg-amber-700', hasBeans);
            }
        });
        
        if (addNewRoastButton) {
            addNewRoastButton.addEventListener('click', handleAddNewRoast);
        } else {
            console.warn("app.js: addNewRoastButton not found, its event listener was not attached.");
        }
    }
    
    async handleFetchWeather(showToastCb) {
        const fetchButton = document.getElementById('fetchWeatherButton');
        if (fetchButton) fetchButton.disabled = true;
        try {
            const weatherData = await fetchCurrentWeatherForRoast();
            if (weatherData && !weatherData.error) {
                eventBus.emit('weather:data-fetched', { 
                    temperature: weatherData.temperature, 
                    humidity: weatherData.humidity 
                });
                if (showToastCb) showToastCb(t('weatherFetchSuccess', { temperature: weatherData.temperature, humidity: weatherData.humidity }), "success");
            } else {
                const message = weatherData?.error || t('unknownError');
                eventBus.emit('weather:data-fetched', { temperature: null, humidity: null });
                if (showToastCb) showToastCb(t('weatherFetchFailed', { message }), "error", 5000);
            }
        } catch (e) {
            console.error("app.js: Unexpected error in handleFetchWeather:", e);
            eventBus.emit('weather:data-fetched', { temperature: null, humidity: null });
            if (showToastCb) showToastCb(t('weatherFetchUnexpectedError'), "error", 5000);
        } finally {
            if (fetchButton) fetchButton.disabled = false;
        }
    }

    handleLogEventTime(targetFieldId) {
        const timeValue = getCurrentElapsedTimeInSeconds();
        const formattedTime = formatTime(timeValue);
        
        if (!targetFieldId || targetFieldId.trim() === '') {
            showToast(t('noEventToRecordSelected'), "warning");
            return;
        }

        const targetInput = document.getElementById(targetFieldId);
        if (!targetInput) {
            console.error(`app.js: Target form field with ID '${targetFieldId}' not found.`);
            return;
        }

        const existingTime = targetInput.value;
        const eventButton = document.querySelector(`.log-event-btn[data-event-type="${targetFieldId}"]`);
        const eventName = eventButton ? eventButton.textContent.split(' ')[0] : targetFieldId;
        
        if (existingTime && existingTime.trim() !== '') {
            if (!window.confirm(t('confirmOverwriteEventTime', { eventName, existingTime, newTime: formattedTime }))) {
                return; 
            }
        }
        
        if (timeValue >= 0) {
            setFormFieldValue(targetFieldId, formattedTime);
            speak(t('eventTimeRecorded', { eventName, time: formattedTime }));

            if (targetFieldId === 'turningPointTime') {
                const turningPointTemp = document.getElementById('turningPointTempInput').value;
                if (turningPointTemp) {
                    setFormFieldValue('turningPointTemp', turningPointTemp);
                }
            }

            eventBus.emit('ui:update-event-button-state', {
                eventType: targetFieldId,
                time: formattedTime
            });

            if (targetFieldId === 'firstCrackTime' || targetFieldId === 'secondCrackTime') {
                recordCrackTime(targetFieldId);
            }
            if (targetFieldId === 'totalRoastTime') {
                if (getIsTimerRunning()) {
                    eventBus.emit('ui:timer:start-pause-clicked');
                }
                setTimeout(() => {
                    eventBus.emit('form:submit-by-timer');
                }, 100);
            }
        }
    }

    _initializeThemeManager() {
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
}