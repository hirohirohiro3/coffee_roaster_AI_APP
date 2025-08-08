import { eventBus } from './EventBus.js';
import * as RoastUtils from './roastUtils.js';
import { showToast } from './ui.js';
import { getRoastAnalysisFromAI } from './firebaseService.js';

// DOM Elements
let formSection, form, formTitle, editRoastIdInput, saveButton, cancelButton;
let greenBeanWeightInput, roastedBeanWeightInput, weightLossDisplay;
let beanSelect, ratingsContainer;
let roastWeatherTempInput, roastWeatherHumidityInput, fetchWeatherButton;
let overallRatingStars, overallRatingInput;
let roastLevelSlider, roastLevelLabel, roastLevelHiddenInput;
let getAiPlanButton;
let isFormDirty = false;

const RATING_DEFINITIONS = { flavor: 'フレーバー', bitterness: '苦味', acidity: '酸味', sweetness: '甘味', body: 'ボディ' };

function getFormData() {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    
    data.ratings = {};
    Object.keys(RATING_DEFINITIONS).forEach(key => {
        const ratingValue = formData.get(`ratings[${key}]`);
        if (ratingValue) {
            data.ratings[key] = parseInt(ratingValue, 10);
        }
        delete data[`ratings[${key}]`];
    });
    
    return data;
}

function showRoastForm({ isEdit, data }) {
    formTitle.textContent = isEdit ? '焙煎記録を編集' : '新しい焙煎を記録';
    editRoastIdInput.value = isEdit ? data.id : '';
    form.reset();
    updateStarDisplay(0);

    if (roastLevelSlider) {
        roastLevelSlider.value = 5; // デフォルトはシティロースト
        _updateRoastLevelSlider();
    }
    
    if (isEdit && data) {
        Object.keys(data).forEach(key => {
            const input = form.elements[key];
            if (input && data[key] !== null && data[key] !== undefined) {
                input.value = data[key];
            }
        });

        if (data.beanId) beanSelect.value = data.beanId;
        
        const roastLevels = ["ライト", "シナモン", "ミディアム", "ハイ", "シティ", "フルシティ", "フレンチ", "イタリアン"];
        const levelIndex = roastLevels.findIndex(l => data.roastLevel?.startsWith(l));
        if (roastLevelSlider && levelIndex !== -1) {
            roastLevelSlider.value = levelIndex + 1;
        }

        if (data.ratings) {
            Object.entries(data.ratings).forEach(([category, value]) => {
                const radio = form.querySelector(`input[name="ratings[${category}]"][value="${value}"]`);
                if (radio) radio.checked = true;
            });
        }
        if (data.overallRating) {
            updateStarDisplay(data.overallRating);
            if (overallRatingInput) overallRatingInput.value = data.overallRating;
        }
    }
    _updateRoastLevelSlider();
    updateWeightLoss();
    formSection.classList.remove('hidden');
    formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    isFormDirty = false;
    eventBus.emit('form:opened');
}

function hideRoastForm() {
    if (isFormDirty && !window.confirm('編集中の内容が失われますが、よろしいですか？')) {
        return;
    }
    form.reset();
    updateStarDisplay(0);
    if (roastLevelSlider) roastLevelSlider.value = 5;
    _updateRoastLevelSlider();
    editRoastIdInput.value = '';
    formSection.classList.add('hidden');
    isFormDirty = false;
    eventBus.emit('form:closed');
}

function updateBeanSelection(beans) {
    if (!beanSelect) return;
    const beansInStock = beans.filter(b => (b.remainingAmount || 0) > 0);
    const currentValue = beanSelect.value;
    beanSelect.innerHTML = '<option value="">在庫から豆を選択してください</option>';
    beansInStock.forEach(bean => {
        const option = document.createElement('option');
        option.value = bean.id;
        option.textContent = `${bean.beanName} (残 ${bean.remainingAmount.toFixed(3)}kg)`;
        beanSelect.appendChild(option);
    });
    if (beans.find(b => b.id === currentValue)) beanSelect.value = currentValue;
}

function updateWeightLoss() {
    if (!greenBeanWeightInput || !roastedBeanWeightInput || !weightLossDisplay) return;
    const greenWeight = parseFloat(greenBeanWeightInput.value);
    const roastedWeight = parseFloat(roastedBeanWeightInput.value);
    const result = RoastUtils.calculateWeightLoss(greenWeight, roastedWeight);
    weightLossDisplay.textContent = (result && !result.error) ? `${result.lossPercentage}%` : '- %';
}

function setWeatherInfo({ temperature, humidity }) {
    if (roastWeatherTempInput) roastWeatherTempInput.value = temperature !== null ? temperature.toFixed(1) : '';
    if (roastWeatherHumidityInput) roastWeatherHumidityInput.value = humidity !== null ? Math.round(humidity) : '';
}

function _createRatingsInputs() {
    if (!ratingsContainer) return;
    ratingsContainer.innerHTML = '';
    const fragment = document.createDocumentFragment();
    Object.entries(RATING_DEFINITIONS).forEach(([key, label]) => {
        const div = document.createElement('div');
        div.className = 'flex justify-between items-center py-2 border-b border-gray-200 last:border-b-0';
        
        const radioButtonsHtml = [1, 2, 3, 4, 5].map(v => `
            <label class="flex items-center space-x-1 text-sm cursor-pointer p-1">
                <input type="radio" name="ratings[${key}]" value="${v}" class="focus:ring-amber-500 h-4 w-4 text-amber-600 border-gray-300">
                <span>${v}</span>
            </label>
        `).join('');

        div.innerHTML = `
            <label class="text-sm font-medium text-gray-700">${label}</label>
            <div class="flex items-center">
                ${radioButtonsHtml}
            </div>
        `;
        fragment.appendChild(div);
    });
    ratingsContainer.appendChild(fragment);
}

function _createOverallRatingStars() {
    overallRatingStars = document.getElementById('overallRatingStars');
    overallRatingInput = document.getElementById('overallRatingInput');
    if (!overallRatingStars || !overallRatingInput) return;

    overallRatingStars.innerHTML = '';
    for (let i = 1; i <= 5; i++) {
        const star = document.createElement('button');
        star.type = 'button';
        star.dataset.value = i;
        star.innerHTML = `<svg class="w-8 h-8 text-gray-300 pointer-events-none" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>`;
        star.classList.add('p-1', 'transition-transform', 'duration-150', 'hover:scale-110');
        overallRatingStars.appendChild(star);
    }

    overallRatingStars.addEventListener('click', e => {
        const star = e.target.closest('button');
        if (!star) return;
        const value = parseInt(star.dataset.value, 10);
        overallRatingInput.value = value;
        updateStarDisplay(value);
        form.dispatchEvent(new Event('input', { bubbles: true }));
    });
}

function updateStarDisplay(value) {
    if (!overallRatingStars) return;
    const stars = overallRatingStars.querySelectorAll('svg');
    stars.forEach((svg, index) => {
        svg.classList.toggle('text-yellow-400', index < value);
        svg.classList.toggle('text-gray-300', index >= value);
    });
}

function _updateRoastLevelSlider() {
    if (!roastLevelSlider || !roastLevelLabel || !roastLevelHiddenInput) return;
    const roastLevels = ["ライト", "シナモン", "ミディアム", "ハイ", "シティ", "フルシティ", "フレンチ", "イタリアン"];
    const value = roastLevelSlider.value;
    const levelName = roastLevels[value - 1] + "ロースト";
    roastLevelLabel.textContent = levelName;
    roastLevelHiddenInput.value = levelName;
}

export function initializeRoastFormUI() {
    formSection = document.getElementById('roastFormSection');
    form = document.getElementById('roastForm');
    formTitle = document.getElementById('formTitle');
    editRoastIdInput = document.getElementById('editRoastId');
    saveButton = document.getElementById('saveRecordButton');
    cancelButton = document.getElementById('cancelEditButton');
    beanSelect = document.getElementById('beanIdSelect');
    greenBeanWeightInput = document.getElementById('greenBeanWeight');
    roastedBeanWeightInput = document.getElementById('roastedBeanWeight');
    weightLossDisplay = document.getElementById('weightLossDisplay');
    ratingsContainer = document.getElementById('ratingsContainer');
    roastLevelSlider = document.getElementById('roastLevelSlider');
    roastLevelLabel = document.getElementById('roastLevelLabel');
    roastLevelHiddenInput = document.getElementById('roastLevel');
    getAiPlanButton = document.getElementById('getAiPlanButton');
    overallRatingInput = document.getElementById('overallRatingInput');
    overallRatingStars = document.getElementById('overallRatingStars');
    roastWeatherTempInput = document.getElementById('roastWeatherTemp');
    roastWeatherHumidityInput = document.getElementById('roastWeatherHumidity');
    fetchWeatherButton = document.getElementById('fetchWeatherButton');
    
    if (!formSection || !form) return;

    _createRatingsInputs();
    _createOverallRatingStars();

    const submitRoastData = () => {
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.textContent = '保存中...';
        }
        const formData = getFormData();
        const editId = editRoastIdInput.value;
        eventBus.emit('form:submit-roast', { formData, editId });
    };

    if (roastLevelSlider) {
        roastLevelSlider.addEventListener('input', _updateRoastLevelSlider);
        _updateRoastLevelSlider();
    }

    if (getAiPlanButton) {
        getAiPlanButton.addEventListener('click', async () => {
            const planData = {
                beanName: document.getElementById('beanIdSelect').options[document.getElementById('beanIdSelect').selectedIndex].text.split(' (')[0],
                roastLevel: document.getElementById('roastLevel').value,
                greenWeight: document.getElementById('greenBeanWeight').value,
                targetFlavor: document.getElementById('targetFlavor').value,
                roasterModel: document.getElementById('roasterModel').value,
                temp: document.getElementById('roastWeatherTemp').value,
                humidity: document.getElementById('roastWeatherHumidity').value
            };

            getAiPlanButton.disabled = true;
            getAiPlanButton.textContent = '🤖 AIがプランを考えています...';
            showToast("AIに焙煎プランをリクエストしました...", "info");

            try {
                const result = await getRoastAnalysisFromAI(planData);
                
                if (result.chargeTemperature) {
                    const chargeTempInput = document.getElementById('chargingTemperature');
                    if (chargeTempInput) chargeTempInput.value = result.chargeTemperature;
                }
                if (result.temperatureProfile && result.temperatureProfile.length > 0) {
                    eventBus.emit('graph:set-target-profile', result.temperatureProfile);
                }
                showToast("AIの焙煎プランを受け取りました！", "success");

            } catch (error) {
                showToast(`エラー: ${error.message}`, "error", 5000);
            } finally {
                getAiPlanButton.disabled = false;
                getAiPlanButton.textContent = '🤖 AIに焙煎プランを提案してもらう';
            }
        });
    }

    eventBus.on('ui:show-roast-form', showRoastForm);
    eventBus.on('ui:hide-roast-form', hideRoastForm);
    eventBus.on('beans:updated-for-roast-form', updateBeanSelection);
    eventBus.on('weather:data-fetched', setWeatherInfo);
    eventBus.on('form:submit-by-timer', submitRoastData);
    eventBus.on('form:submit-completed', (result) => {
        if (result && result.success) {
            isFormDirty = false;
        }
        if (saveButton) {
            saveButton.disabled = false;
            saveButton.textContent = '記録を保存';
        }
    });
    
    form.addEventListener('submit', (e) => {
        e.preventDefault(); 
        submitRoastData();
    });
    form.addEventListener('input', () => { isFormDirty = true; });

    if (cancelButton) cancelButton.addEventListener('click', () => hideRoastForm());
    if (greenBeanWeightInput) greenBeanWeightInput.addEventListener('input', updateWeightLoss);
    if (roastedBeanWeightInput) roastedBeanWeightInput.addEventListener('input', updateWeightLoss);
    
    if(fetchWeatherButton) {
        fetchWeatherButton.addEventListener('click', () => {
            eventBus.emit('ui:fetch-weather', (message, type) => showToast(message, type));
        });
    }
    
    console.log("✅ RoastFormUI initialized.");
}