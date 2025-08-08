import { loadAllComponents } from './htmlLoader.js';
import { initializeFirebase } from './firebaseService.js';
import { initializeDataService } from './dataService.js';
import { initializeBeanService } from './beanService.js';
import { initializeUIManager } from './uiManager.js';
import { initializePageNavigation, registerPage } from './pageViewManager.js';
import { eventBus } from './EventBus.js';
import { fetchCurrentWeatherForRoast } from './weatherService.js';
import { initializeAuthController } from './authController.js';
import { initializeRoastWorkflowController, handleAddNewRoast, getRoastsByIds } from './roastWorkflowController.js';
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
        console.log("Application starting...");

        // 1. 先に「HTMLの読み込み完了」イベントを受け取る準備をする
        eventBus.on('html:loaded', () => {
            console.log("app.js: 'html:loaded' event received. Initializing modules...");
            
            // 2. HTMLの準備ができてから、全てのJSモジュールを初期化する
            this._initializeAllModules();
            this._setupGlobalEventListeners();
            
            // 3. 全ての準備が整ったことを通知する
            eventBus.emit('app:ready');
            console.log("Application is ready!");
        });
        
        // 4. 最後にHTMLの読み込みを開始する
        try {
            await this._loadComponents();
        } catch (error) {
            console.error("FATAL: Application failed to start during component loading.", error);
        }
    }

    // ▼▼▼ この関数内のリストが修正されました ▼▼▼
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
            // IDが重複する古い_modals.htmlではなく、
            // すべてのモーダル定義を含む新しい_bean_stock_modal.htmlを読み込みます
            { url: '_bean_stock_modal.html', containerId: 'modals-container' },
            { url: '_comparison_modal.html', containerId: 'modals-container', append: true },
            { url: '_statistics.html', containerId: 'statistics-page' },
        ];
        
        await loadAllComponents(componentsToLoad);
    }
    // ▲▲▲ 修正完了 ▲▲▲
    
    _registerPages() {
        registerPage('list', document.getElementById('roast-list-page'));
        registerPage('stats', document.getElementById('statistics-page'));
    }
    
    _initializeAllModules() {
        // Core Services
        initializeFirebase();
        initializeDataService();
        initializeBeanService();
        
        // UI Management
        initializeUIManager();
        
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
        initializeComparisonModalUI(getRoastsByIds);
        initializeRealtimeGraphUI();
        initializeRealtimeLogTableUI();

        // 最後にナビゲーションとページ登録を初期化
        this._registerPages();
        initializePageNavigation();
    }
    
    _setupGlobalEventListeners() {
        eventBus.on('ui:log-event-time', this.handleLogEventTime.bind(this));
        eventBus.on('audio:speak', (text) => speak(text));
        eventBus.on('ui:fetch-weather', this.handleFetchWeather.bind(this));

        const addNewRoastButton = document.getElementById('addNewRoastButton');
        
        eventBus.on('beans:updated-for-roast-form', (beansInStock) => {
            if (addNewRoastButton) {
                const hasBeans = beansInStock.some(b => (b.remainingAmount || 0) > 0);
                addNewRoastButton.disabled = !hasBeans;
                addNewRoastButton.innerHTML = hasBeans ? '新しい焙煎を記録' : '在庫の豆がありません';
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
                if (showToastCb) showToastCb(`気象情報を取得しました: 気温 ${weatherData.temperature}°C, 湿度 ${weatherData.humidity}%`, "success");
            } else {
                const message = weatherData?.error || '不明なエラーです。';
                eventBus.emit('weather:data-fetched', { temperature: null, humidity: null });
                if (showToastCb) showToastCb(`気象情報の取得に失敗: ${message}`, "error", 5000);
            }
        } catch (e) {
            console.error("app.js: Unexpected error in handleFetchWeather:", e);
            eventBus.emit('weather:data-fetched', { temperature: null, humidity: null });
            if (showToastCb) showToastCb("気象情報の取得中に予期せぬエラーが発生しました。", "error", 5000);
        } finally {
            if (fetchButton) fetchButton.disabled = false;
        }
    }

    handleLogEventTime(targetFieldId) {
        const t = getCurrentElapsedTimeInSeconds();
        const f = formatTime(t);
        
        if (!targetFieldId || targetFieldId.trim() === '') {
            showToast("記録対象イベントが選択されていません。", "warning");
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
            if (!window.confirm(`「${eventName}」は ${existingTime} で記録済みです。新しい時間 (${f}) で上書きしますか？`)) {
                return; 
            }
        }
        
        if (t >= 0) {
            setFormFieldValue(targetFieldId, f);
            speak(`${eventName} の時間を ${f} で記録しました。`);

            eventBus.emit('ui:update-event-button-state', {
                eventType: targetFieldId,
                time: f
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
}