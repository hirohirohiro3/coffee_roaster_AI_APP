import { eventBus } from './EventBus.js';
import * as RoastUtils from './roastUtils.js';
import { showToast } from './ui.js';

// DOM Elements
let formSection, form, formTitle, editRoastIdInput, saveButton, cancelButton;
let greenBeanWeightInput, roastedBeanWeightInput, weightLossDisplay;
let beanSelect, ratingsContainer;
let roastWeatherTempInput, roastWeatherHumidityInput, fetchWeatherButton;
let overallRatingStars, overallRatingInput;
let roastLevelSlider, roastLevelLabel, roastLevelHiddenInput;
let generateAiPromptButton, aiProfileInput, applyAiProfileButton;
let flavorProfilesSelect, acidityQualitySlider, acidityQualityLabel, bodySlider, bodyLabel;
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

    if (flavorProfilesSelect) {
        data.flavorProfiles = Array.from(flavorProfilesSelect.selectedOptions).map(option => option.value);
    }
    
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

        // Set detailed cupping log values
        if (data.flavorProfiles && flavorProfilesSelect) {
            Array.from(flavorProfilesSelect.options).forEach(option => {
                option.selected = data.flavorProfiles.includes(option.value);
            });
        }
        if (data.acidityQuality && acidityQualitySlider) {
            acidityQualitySlider.value = data.acidityQuality;
            if(acidityQualityLabel) acidityQualityLabel.textContent = data.acidityQuality;
        }
        if (data.body && bodySlider) {
            bodySlider.value = data.body;
            if(bodyLabel) bodyLabel.textContent = data.body;
        }

        // Open the details section if it contains data
        const detailsElement = form.querySelector('details');
        if (detailsElement && (data.flavorProfiles?.length > 0 || data.acidityQuality || data.body)) {
            detailsElement.open = true;
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
    if (acidityQualitySlider) acidityQualitySlider.value = 3;
    if (bodySlider) bodySlider.value = 3;
    if (acidityQualityLabel) acidityQualityLabel.textContent = '3';
    if (bodyLabel) bodyLabel.textContent = '3';
    const detailsElement = form.querySelector('details');
    if (detailsElement) detailsElement.open = false;

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

    const roastLevels = ["ライト", "シナモン", "ミディアM", "ハイ", "シティ", "フルシティ", "フレンチ", "イタリアン"];
    const value = roastLevelSlider.value;
    const levelName = roastLevels[value - 1] + "ロースト";

    roastLevelLabel.textContent = levelName;
    roastLevelHiddenInput.value = levelName;

    // Remove all existing roast-level-* classes
    for (let i = 1; i <= 8; i++) {
        roastLevelSlider.classList.remove(`roast-level-${i}`);
    }

    // Add the new class
    roastLevelSlider.classList.add(`roast-level-${value}`);
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
    overallRatingInput = document.getElementById('overallRatingInput');
    overallRatingStars = document.getElementById('overallRatingStars');
    generateAiPromptButton = document.getElementById('generateAiPromptButton');
    aiProfileInput = document.getElementById('aiProfileInput');
    applyAiProfileButton = document.getElementById('applyAiProfileButton');
    roastWeatherTempInput = document.getElementById('roastWeatherTemp');
    roastWeatherHumidityInput = document.getElementById('roastWeatherHumidity');
    fetchWeatherButton = document.getElementById('fetchWeatherButton');
    flavorProfilesSelect = document.getElementById('flavorProfiles');
    acidityQualitySlider = document.getElementById('acidityQuality');
    acidityQualityLabel = document.getElementById('acidityQualityLabel');
    bodySlider = document.getElementById('body');
    bodyLabel = document.getElementById('bodyLabel');
    
    if (!formSection || !form) return;

    _createRatingsInputs();
    _createOverallRatingStars();

    if (acidityQualitySlider && acidityQualityLabel) {
        acidityQualitySlider.addEventListener('input', (e) => {
            acidityQualityLabel.textContent = e.target.value;
        });
    }
    if (bodySlider && bodyLabel) {
        bodySlider.addEventListener('input', (e) => {
            bodyLabel.textContent = e.target.value;
        });
    }

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

    if (generateAiPromptButton) {
        generateAiPromptButton.addEventListener('click', () => {
            const selectedBeanOption = beanSelect.options[beanSelect.selectedIndex];
            const beanName = selectedBeanOption ? selectedBeanOption.text.split(' (')[0] : 'N/A';
            const roastLevel = roastLevelHiddenInput.value;
            const greenBeanWeight = greenBeanWeightInput.value;
            const targetFlavor = document.getElementById('targetFlavor').value;
            const roasterModel = document.getElementById('roasterModel').value;
            const temp = roastWeatherTempInput.value;
            const humidity = roastWeatherHumidityInput.value;

            const data = {
                beanName: beanName,
                roastLevel: roastLevel,
                targetFlavor: targetFlavor || '指定なし',
                roasterModel: roasterModel || '指定なし',
                greenWeight: greenBeanWeight,
                temp: temp,
                humidity: humidity
            };

            const prompt = `あなたは、Webアプリケーションにデータを提供するための、高精度なテキスト解析・生成AIです。あなたのタスクは、ユーザーからの自然言語の要求を解釈し、指定された厳密なフォーマットでデータを出力することです。会話や説明は行いません。

# 依頼内容
以下の条件に基づいて、コーヒー焙煎における理想的な投入温度と、その後の1分ごとの豆温度の推移を計算し、指定されたフォーマットで出力してください。

# 条件
- 使用する豆: ${data.beanName}
- 目標の焙煎度: ${data.roastLevel}
- 目標とする風味: ${data.targetFlavor}
- 使用する焙煎機: ${data.roasterModel}
- 投入する生豆重量: ${data.greenWeight ? data.greenWeight * 1000 + "g" : "（未入力）"}
- 気温: ${data.temp ? data.temp + "℃" : "（未取得）"}
- 湿度: ${data.humidity ? data.humidity + "%" : "（未取得）"}

#【最重要】出力に関する厳密なルール
- **以下のフォーマットのみを出力してください。**
- **指定されたフォーマット以外の文字列（前置き、挨拶、解説、単位、言い訳など）は、絶対に含めないでください。**
- あなたの応答は、プログラムによって自動的に解析されます。指定外のテキストが1文字でも含まれていると、システムがエラーを起こし、処理が失敗します。

# 出力フォーマット
投入温度: XXX.X℃
1分: YYY.Y℃
2分: ZZZ.Z℃
(以下、焙煎終了まで続く)`;

            navigator.clipboard.writeText(prompt.trim())
                .then(() => showToast("AIへの質問プロンプトをクリップボードにコピーしました。", "success"))
                .catch(err => showToast("クリップボードへのコピーに失敗しました: " + err, "error"));
        });
    }

    if (applyAiProfileButton) {
        applyAiProfileButton.addEventListener('click', () => {
            const text = aiProfileInput.value;
            if (!text.trim()) {
                showToast("AIからの提案を先にテキストエリアに貼り付けてください。", "warning");
                return;
            }

            const regex = /(\d+(?:\.\d+)?)\s*分\s*:\s*(\d+(?:\.\d+)?)\s*℃/g;
            const parsedData = [];
            let match;
            while ((match = regex.exec(text)) !== null) {
                parsedData.push({
                    x: parseFloat(match[1]),
                    y: parseFloat(match[2])
                });
            }

            if (parsedData.length === 0) {
                showToast("有効な形式「(数値)分: (数値)℃」のデータが見つかりませんでした。", "error");
                return;
            }

            eventBus.emit('graph:set-target-profile', parsedData);
            showToast(`AIの目標プロファイルをグラフに適用しました (${parsedData.length}点)。`, "success");
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