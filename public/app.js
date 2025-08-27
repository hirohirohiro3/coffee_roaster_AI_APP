import { initI18n, setLanguage, t } from './modules/core/i18n.js';
import { updateUIText } from './modules/core/uiTranslator.js';
import { loadAllComponents } from './modules/core/htmlLoader.js';
import { eventBus } from './modules/core/EventBus.js';
import { fetchCurrentWeatherForRoast } from './services/weatherService.js';
import { handleAddNewRoast } from './modules/roast/roastWorkflowController.js';
import { getAuthInstance, getDbInstance, listenToAllData, clearAllDataListeners } from '/services/authService.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { showToast, setFormFieldValue, speak } from './ui/ui.js';
import { formatTime } from './utils/roastUtils.js';
import { initializeCoreModules, initializeMainAppModules } from './modules/app/moduleLoader.js';

export default class App {
    constructor() {
        this.mainAppInitialized = false;
    }

    async start() {
        initI18n();
        console.log("Application starting...");
        window.updateDebugStatus("App starting...");

        const onMainViewReady = () => {
            if (this.mainAppInitialized) return;
            window.updateDebugStatus("OK. Initializing main modules...");
            console.log("app.js: 'ui:main-view-ready' event received. Initializing main app modules...");
            initializeMainAppModules();
            this.mainAppInitialized = true;
            eventBus.off('ui:main-view-ready', onMainViewReady);
        };
        eventBus.on('ui:main-view-ready', onMainViewReady);

        eventBus.on('html:loaded', async () => {
            console.log("app.js: 'html:loaded' event received. Initializing core modules...");
            
            await initializeCoreModules();
            this._setupGlobalEventListeners();
            this._setupAuthListener();
            
            updateUIText();

            eventBus.emit('app:ready');
            console.log("Application is ready for auth state check.");
        });
        
        try {
            await this._loadComponents();
        } catch (error) {
            console.error("FATAL: Application failed to start during component loading.", error);
        }
    }

    _setupAuthListener() {
        const auth = getAuthInstance();
        const db = getDbInstance();
        onAuthStateChanged(auth, (user) => {
            eventBus.emit('auth:state-changed', user);
            if (user) {
                console.log(`Auth state changed: Logged in as ${user.email}`);
                listenToAllData(user.uid, db);
            } else {
                console.log("Auth state changed: Logged out");
                clearAllDataListeners();
                this.mainAppInitialized = false;
            }
        });
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
    
    _setupGlobalEventListeners() {
        const langSwitcher = document.getElementById('language-switcher');
        if (langSwitcher) {
            langSwitcher.addEventListener('click', (e) => {
                const target = e.target.closest('button');
                if (target && target.dataset.lang) {
                    setLanguage(target.dataset.lang);
                }
            });
        }

        eventBus.on('audio:speak', (text) => speak(text));
        eventBus.on('ui:fetch-weather', this.handleFetchWeather.bind(this));

        const addNewRoastButton = document.getElementById('addNewRoastButton');
        
        eventBus.on('beans:updated-for-roast-form', (beansInStock) => {
            if (addNewRoastButton) {
                const hasBeans = beansInStock.some(b => (b.remainingAmount || 0) > 0);
                addNewRoastButton.disabled = !hasBeans;
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
}