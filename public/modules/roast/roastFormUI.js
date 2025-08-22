import { eventBus } from '../core/EventBus.js';
import * as RoastUtils from '../../utils/roastUtils.js';
import { showToast } from '../../ui/ui.js';
import { t } from '../core/i18n.js';
import { createStarRating, createTagSelector } from '../../ui/ui-utils.js';

// --- Module Scope Variables ---
let formSection, form, formTitle, editRoastIdInput, saveButton, cancelButton;
let greenBeanWeightInput, roastedBeanWeightInput, weightLossDisplay;
let beanSelect;
let roastLevelSlider, roastLevelLabel, roastLevelHiddenInput;
let generateAiPromptButton, aiProfileInput, applyAiProfileButton;
let roastWeatherTempInput, roastWeatherHumidityInput, fetchWeatherButton;
let isFormDirty = false;

// --- Constants for Tag Selectors ---
const getFlavorTags = () => t('flavorTags').split(',');
const getAcidityQualityTags = () => t('acidityQualityTags').split(',');
const getBodyTextureTags = () => t('bodyTextureTags').split(',');

// --- Core Functions ---

function getFormData() {
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    const numericFields = [
        'greenBeanWeight', 'roastedBeanWeight', 'chargingTemperature', 'turningPointTemp', 'endOfRoastTemp',
        'overallRating', 'acidityIntensity', 'bodyWeight', 'aftertasteLength', 'aftertasteQuality', 'balance'
    ];
    numericFields.forEach(field => {
        if (data[field] && data[field].trim() !== '') {
            data[field] = parseFloat(data[field]);
        } else {
            data[field] = null;
        }
    });
    const textFields = ['flavorProfile', 'acidityQuality', 'bodyTexture'];
    textFields.forEach(field => {
        if (data[field] && data[field].trim() === '') {
            data[field] = '';
        }
    });
    return data;
}

function showRoastForm({ isEdit, data }) {
    formTitle.textContent = isEdit ? t('editRoastRecord') : t('addNewRoast');
    editRoastIdInput.value = isEdit ? data.id : '';
    form.reset();
    _resetFormUI();

    if (isEdit && data) {
        Object.keys(data).forEach(key => {
            const input = form.elements[key];
            if (input && data[key] !== null && data[key] !== undefined) {
                input.value = data[key];
            }
        });
        if (data.beanId) beanSelect.value = data.beanId;
        
        const roastLevelIndex = t('roastLevelNames').split(',').findIndex(l => data.roastLevel?.startsWith(l));
        if (roastLevelSlider && roastLevelIndex !== -1) {
            roastLevelSlider.value = roastLevelIndex + 1;
        }

        document.getElementById('overallRatingStars').setRating(data.overallRating || 0);
        document.getElementById('flavorTagsContainer').setSelectedTags(data.flavorProfile || '');
        document.getElementById('acidityQualityTags').setSelectedTags(data.acidityQuality || '');
        document.getElementById('bodyTextureTags').setSelectedTags(data.bodyTexture || '');

        const detailsElement = document.getElementById('cuppingLogDetails');
        const hasDetailedData = data.flavorProfile || data.acidityQuality || data.bodyTexture ||
                                data.acidityIntensity > 0 || data.bodyWeight > 0 || data.aftertasteLength > 0 ||
                                data.aftertasteQuality > 0 || data.balance > 0;
        if (detailsElement && hasDetailedData) {
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
    if (isFormDirty && !window.confirm(t('toast.confirmDiscard'))) {
        return;
    }
    form.reset();
    _resetFormUI();
    editRoastIdInput.value = '';
    formSection.classList.add('hidden');
    isFormDirty = false;
    eventBus.emit('form:closed');
}

function _resetFormUI() {
    ['acidityIntensity', 'bodyWeight', 'aftertasteLength', 'aftertasteQuality', 'balance'].forEach(id => {
        const slider = document.getElementById(id);
        if (slider) slider.value = 3;
    });
    if (roastLevelSlider) roastLevelSlider.value = 5;
    _updateRoastLevelSlider();
    document.getElementById('overallRatingStars').setRating(0);
    document.getElementById('flavorTagsContainer').populate();
    document.getElementById('acidityQualityTags').populate();
    document.getElementById('bodyTextureTags').populate();
    const detailsElement = document.getElementById('cuppingLogDetails');
    if (detailsElement) detailsElement.open = false;
}

function updateBeanSelection(beans) {
    if (!beanSelect) return;
    const beansInStock = beans.filter(b => (b.remainingAmount || 0) > 0);
    const currentValue = beanSelect.value;
    beanSelect.innerHTML = `<option value="">${t('selectBeanFromStock')}</option>`;
    beansInStock.forEach(bean => {
        const option = document.createElement('option');
        option.value = bean.id;
        option.textContent = t('beanStockLabel', { beanName: bean.beanName, amount: bean.remainingAmount.toFixed(3) });
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

function _updateRoastLevelSlider() {
    if (!roastLevelSlider || !roastLevelLabel || !roastLevelHiddenInput) return;
    const roastLevels = t('roastLevelNames').split(',');
    const value = roastLevelSlider.value;
    const levelName = roastLevels[value - 1];
    roastLevelLabel.textContent = levelName;
    roastLevelHiddenInput.value = levelName;
    for (let i = 1; i <= 8; i++) {
        roastLevelSlider.classList.remove(`roast-level-${i}`);
    }
    roastLevelSlider.classList.add(`roast-level-${value}`);
}

function _handleGenerateAiPrompt() {
    const data = getFormData();
    const beanName = beanSelect.selectedOptions[0]?.textContent.split('(')[0].trim() || t('text.deletedBeanFallback');

    const promptText = t('aiPrompt.base', {
        beanName: beanName,
        roastLevel: data.roastLevel || t('text.notSet'),
        greenBeanWeight: data.greenBeanWeight || t('text.notSet'),
        targetFlavor: data.targetFlavor || t('text.noneSpecified'),
        roasterModel: data.roasterModel || t('text.unknown'),
        roastWeatherTemp: data.roastWeatherTemp || t('text.unknown'),
        roastWeatherHumidity: data.roastWeatherHumidity || t('text.unknown')
    });

    navigator.clipboard.writeText(promptText).then(() => {
        showToast(t('aiPromptCopied'), 'success');
    }).catch(err => {
        console.error('Failed to copy AI prompt: ', err);
        showToast(t('aiPromptCopyFailed'), 'error');
    });
}

function _handleApplyAiProfile() {
    const text = aiProfileInput.value.trim();
    if (!text) {
        showToast(t('pasteAiSuggestionFirst'), 'warning');
        return;
    }

    try {
        const points = text.split('\n').map(line => {
            const parts = line.split(/[,、]/); // Supports both comma and Japanese comma
            if (parts.length !== 2) return null;

            const timeStr = parts[0].trim();
            const tempStr = parts[1].trim();

            const timeParts = timeStr.split(':');
            if (timeParts.length !== 2) return null;

            const minutes = parseInt(timeParts[0], 10);
            const seconds = parseInt(timeParts[1], 10);
            const temperature = parseFloat(tempStr);

            if (isNaN(minutes) || isNaN(seconds) || isNaN(temperature)) return null;

            return {
                x: (minutes * 60) + seconds,
                y: temperature
            };
        }).filter(p => p !== null);

        if (points.length === 0) {
            showToast(t('aiSuggestionParseError'), 'error');
            return;
        }

        eventBus.emit('graph:set-target-profile', points);
        showToast(t('aiSuggestionApplied'), 'success');

    } catch (error) {
        console.error('Error parsing AI profile:', error);
        showToast(t('aiSuggestionParseFailed'), 'error');
    }
}


export function initializeRoastFormUI() {
    formSection = document.getElementById('roastFormSection');
    form = document.getElementById('roastForm');
    if (!formSection || !form) return;

    formTitle = document.getElementById('formTitle');
    editRoastIdInput = document.getElementById('editRoastId');
    saveButton = document.getElementById('saveRecordButton');
    cancelButton = document.getElementById('cancelEditButton');
    beanSelect = document.getElementById('beanIdSelect');
    greenBeanWeightInput = document.getElementById('greenBeanWeight');
    roastedBeanWeightInput = document.getElementById('roastedBeanWeight');
    weightLossDisplay = document.getElementById('weightLossDisplay');
    roastLevelSlider = document.getElementById('roastLevelSlider');
    roastLevelLabel = document.getElementById('roastLevelLabel');
    roastLevelHiddenInput = document.getElementById('roastLevel');
    generateAiPromptButton = document.getElementById('generateAiPromptButton');
    aiProfileInput = document.getElementById('aiProfileInput');
    applyAiProfileButton = document.getElementById('applyAiProfileButton');
    roastWeatherTempInput = document.getElementById('roastWeatherTemp');
    roastWeatherHumidityInput = document.getElementById('roastWeatherHumidity');
    fetchWeatherButton = document.getElementById('fetchWeatherButton');

    createStarRating('overallRatingStars', 'overallRatingInput');
    createTagSelector('flavorTagsContainer', 'flavorProfile', getFlavorTags);
    createTagSelector('acidityQualityTags', 'acidityQuality', getAcidityQualityTags);
    createTagSelector('bodyTextureTags', 'bodyTexture', getBodyTextureTags);

    if (roastLevelSlider) {
        roastLevelSlider.addEventListener('input', _updateRoastLevelSlider);
        _updateRoastLevelSlider();
    }

    const submitRoastData = () => {
        if (saveButton) {
            saveButton.disabled = true;
            const textSpan = saveButton.querySelector('span');
            if (textSpan) textSpan.textContent = t('saving');
        }
        const formData = getFormData();
        const editId = editRoastIdInput.value;
        eventBus.emit('form:submit-roast', { formData, editId });
    };

    form.addEventListener('submit', (e) => { e.preventDefault(); submitRoastData(); });
    form.addEventListener('input', () => { isFormDirty = true; });

    if (cancelButton) cancelButton.addEventListener('click', () => hideRoastForm());
    if (greenBeanWeightInput) greenBeanWeightInput.addEventListener('input', updateWeightLoss);
    if (roastedBeanWeightInput) roastedBeanWeightInput.addEventListener('input', updateWeightLoss);
    if(fetchWeatherButton) {
        fetchWeatherButton.addEventListener('click', () => {
            eventBus.emit('ui:fetch-weather', (message, type) => showToast(message, type));
        });
    }

    if (generateAiPromptButton) {
        generateAiPromptButton.addEventListener('click', _handleGenerateAiPrompt);
    }
    if (applyAiProfileButton) {
        applyAiProfileButton.addEventListener('click', _handleApplyAiProfile);
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
            const textSpan = saveButton.querySelector('span');
            if (textSpan) textSpan.textContent = t('saveRecord');
        }
    });
    
    eventBus.on('form:clear-event-times', () => {
        const timeFieldIds = ['turningPointTime', 'firstCrackTime', 'secondCrackTime', 'totalRoastTime', 'turningPointTemp'];
        timeFieldIds.forEach(id => {
            const field = document.getElementById(id);
            if (field) field.value = '';
        });
        if (weightLossDisplay) {
            weightLossDisplay.textContent = '- %';
        }
    });

    document.addEventListener('language-changed', () => {
        if (formSection && formSection.classList.contains('hidden')) return;
        const editId = editRoastIdInput.value;
        const isEdit = !!editId;
        const data = isEdit ? getFormData() : null;
        if (isEdit && data) data.id = editId;
        showRoastForm({ isEdit, data });
    });

    console.log("✅ RoastFormUI initialized.");
}