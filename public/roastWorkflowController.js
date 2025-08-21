import { eventBus } from './EventBus.js';
import * as RoastDataManager from './roastDataManager.js';
import { t } from './i18n.js';
import * as RoastUtils from './roastUtils.js';
import { getRoastRecord, updateFavoriteStatus } from './services/firestoreService.js';

let localRoastsCache = [];
let currentSearchKeyword = '';
let currentRoastIdToDeleteForConfirmation = null;
let currentSortOption = 'date-desc';
let isFavoritesFilterActive = false;

function _calculateAverageRating(roast) {
    if (typeof roast.overallRating === 'number') {
        return roast.overallRating;
    }
    if (roast && roast.ratings && typeof roast.ratings === 'object') {
        const ratingValues = Object.values(roast.ratings).map(v => parseInt(v, 10)).filter(v => !isNaN(v));
        if (ratingValues.length > 0) {
            const sum = ratingValues.reduce((acc, val) => acc + val, 0);
            return sum / ratingValues.length;
        }
    }
    return -1;
}

export function initializeRoastWorkflowController() {
    eventBus.on('data:roasts-updated', handleDataUpdate);
    eventBus.on('profile:save-temperatures', handleSaveTemperatures);
    eventBus.on('ui:view-profile-clicked', handleViewProfileButtonClick);
    eventBus.on('ui:edit-roast-clicked', handleEditButtonClick);
    eventBus.on('ui:delete-roast-clicked', ({ id, name }) => handleDeleteButtonClick(id, name));
    eventBus.on('ui:toggle-favorite-clicked', handleToggleFavorite);
    eventBus.on('ui:confirm-delete-clicked', handleConfirmDelete);
    eventBus.on('ui:add-new-roast-clicked', handleAddNewRoast);
    eventBus.on('ui:search-requested', handleSearch);
    eventBus.on('ui:sort-changed', handleSortChange);
    eventBus.on('ui:filter-favorites-changed', handleFilterChange);
    eventBus.on('ui:export-csv-clicked', handleExportCsv);
    eventBus.on('form:submit-roast', async ({ formData, editId }) => {
        const result = await handleRoastFormSubmit(formData, editId);
        eventBus.emit('form:submit-completed', result); 
        if (result && result.success) {
            eventBus.emit('ui:hide-roast-form');
            if (!editId) {
                eventBus.emit('ui:timer:reset-clicked');
            }
        }
    });
}

function _applyFiltersAndDisplay() {
    if (!localRoastsCache) return;
    let filteredRoasts = localRoastsCache;
    if (isFavoritesFilterActive) {
        filteredRoasts = filteredRoasts.filter(roast => roast.isFavorite === true);
    }
    if (currentSearchKeyword) {
        filteredRoasts = filteredRoasts.filter(roast =>
            roast.beanName && roast.beanName.toLowerCase().includes(currentSearchKeyword.toLowerCase())
        );
    }

    let sortedRoasts = [...filteredRoasts];
    switch (currentSortOption) {
        case 'date-desc': sortedRoasts.sort((a, b) => (b.roastDate || '').localeCompare(a.roastDate || '')); break;
        case 'date-asc': sortedRoasts.sort((a, b) => (a.roastDate || '').localeCompare(b.roastDate || '')); break;
        case 'name-asc': sortedRoasts.sort((a, b) => (a.beanName || '').localeCompare(b.beanName || '', 'ja')); break;
        case 'rating-desc': sortedRoasts.sort((a, b) => _calculateAverageRating(b) - _calculateAverageRating(a)); break;
        case 'rating-asc': sortedRoasts.sort((a, b) => _calculateAverageRating(a) - _calculateAverageRating(b)); break;
        default: sortedRoasts.sort((a, b) => (b.roastDate || '').localeCompare(a.roastDate || ''));
    }
    
    eventBus.emit('roasts:render-list', {
        roasts: sortedRoasts,
        keyword: currentSearchKeyword
    });
}

function handleDataUpdate(updatedRoasts) {
    localRoastsCache = updatedRoasts || [];
    _applyFiltersAndDisplay();
}

async function handleSaveTemperatures({ docId, newBeanTemps, newChamberTemps }) {
    const success = await RoastDataManager.processAndUpdateTemperatures(docId, newBeanTemps, newChamberTemps);
    if (success) {
        handleViewProfileButtonClick(docId);
    }
    return success;
}

export function handleSortChange(sortValue) {
    currentSortOption = sortValue;
    _applyFiltersAndDisplay();
}

export function handleFilterChange(isFavoritesChecked) {
    isFavoritesFilterActive = isFavoritesChecked;
    _applyFiltersAndDisplay();
}

export function handleSearch(keyword) {
    currentSearchKeyword = keyword;
    _applyFiltersAndDisplay();
}

export function handleAddNewRoast() {
    eventBus.emit('ui:show-roast-form', { isEdit: false, data: null });
}

export function handleEditButtonClick(roastId) {
    const roastToEdit = localRoastsCache.find(r => r.id === roastId);
    if (roastToEdit) {
        eventBus.emit('ui:show-roast-form', { isEdit: true, data: roastToEdit });
    } else {
        eventBus.emit('ui:show-toast', { message: t('recordToEditNotFound'), type: "error" });
    }
}

export function handleDeleteButtonClick(roastId, beanName) {
    currentRoastIdToDeleteForConfirmation = roastId;
    const name = beanName || t('thisRecord');
    eventBus.emit('ui:show-confirm-modal', { message: t('confirmDeleteRecord', { beanName: name }) });
}

export async function handleConfirmDelete() {
    if (currentRoastIdToDeleteForConfirmation) {
        await RoastDataManager.processDeleteRoastData(currentRoastIdToDeleteForConfirmation);
        currentRoastIdToDeleteForConfirmation = null;
    }
    eventBus.emit('ui:close-confirm-modal');
}

export function handleViewProfileButtonClick(roastId) {
    const roastToView = localRoastsCache.find(r => r.id === roastId);
    if (roastToView) {
        eventBus.emit('ui:show-profile-modal', roastToView);
    } else {
        eventBus.emit('ui:show-toast', { message: t('recordToViewNotFound'), type: "error" });
    }
}

export async function handleRoastFormSubmit(formData, editId) {
    const dtrValue = RoastUtils.calculateDTR(formData.firstCrackTime, formData.totalRoastTime);

    const dataToSave = {
        ...formData,
        overallRating: formData.overallRating ? parseInt(formData.overallRating, 10) : null,
        dtr: dtrValue ? parseFloat(dtrValue.toFixed(2)) : null,
    };
    
    const originalData = editId ? localRoastsCache.find(r => r.id === editId) : null;

    const result = await RoastDataManager.processAndSaveRoastData(dataToSave, editId, originalData);
    
    return result;
}

export async function handleToggleFavorite(roastId) {
    const roast = localRoastsCache.find(r => r.id === roastId);
    if (!roast) {
        eventBus.emit('ui:show-toast', { message: t('recordNotFound'), type: "error" });
        return;
    }
    const newFavoriteStatus = !roast.isFavorite;
    await updateFavoriteStatus(roastId, newFavoriteStatus);
}

function _escapeCsvCell(cellData) {
    if (cellData === null || typeof cellData === 'undefined') return '';
    let cellString = String(cellData);
    if (cellString.includes('"') || cellString.includes(',') || cellString.includes('\n')) {
        cellString = '"' + cellString.replace(/"/g, '""') + '"';
    }
    return cellString;
}

export function getRoastsByIds(ids) {
    if (!localRoastsCache) return [];
    return ids.map(id => localRoastsCache.find(roast => roast.id === id)).filter(Boolean);
}

export async function getRoastDetailsByIds(ids) {
    if (!ids || ids.length === 0) return [];

    try {
        const roastPromises = ids.map(id => getRoastRecord(id));
        const detailedRoasts = await Promise.all(roastPromises);

        const validRoasts = detailedRoasts.filter(Boolean);

        // キャッシュからbeanNameなどをマージする
        const roastsWithBeanNames = validRoasts.map(detailedRoast => {
            const cachedRoast = localRoastsCache.find(r => r.id === detailedRoast.id);
            return {
                ...detailedRoast,
                beanName: cachedRoast ? cachedRoast.beanName : '（不明な豆）'
            };
        });

        return roastsWithBeanNames;
    } catch (error) {
        console.error("Error fetching roast details:", error);
        return [];
    }
}

export function handleExportCsv() {
    if (!localRoastsCache || localRoastsCache.length === 0) {
        eventBus.emit('ui:show-toast', { message: t('noRecordsToExport'), type: "warning" });
        return;
    }
    const headers = ["ID", t('csvHeaderBeanName'), t('csvHeaderRoastDate'), t('csvHeaderRoastLevel'), t('csvHeaderOrigin'), t('csvHeaderGreenWeightG'), t('csvHeaderRoastedWeightG'), t('csvHeaderChargingTempC'), t('csvHeaderTpTime'), t('csvHeaderTpTemp'), t('csvHeaderFcTime'), t('csvHeaderScTime'), t('csvHeaderDropTempC'), t('csvHeaderTotalTime'), t('csvHeaderDtrPct'), t('csvHeaderWeightLossPct'), t('csvHeaderWeatherTemp'), t('csvHeaderWeatherHumidity'), t('csvHeaderNotes'), t('csvHeaderBeanTempLog'), t('csvHeaderChamberTempLog'), t('csvHeaderRorLog')];
    const rows = localRoastsCache.map(roast => {
        const greenBeanWeight = roast.greenBeanWeight !== undefined && roast.greenBeanWeight !== null ? roast.greenBeanWeight : '';
        const roastedBeanWeight = roast.roastedBeanWeight !== undefined && roast.roastedBeanWeight !== null ? roast.roastedBeanWeight : '';
        let dtrDisplay = '';
        if (roast.firstCrackTime && roast.totalRoastTime) {
            const dtrVal = RoastUtils.calculateDTR(roast.firstCrackTime, roast.totalRoastTime);
            if (dtrVal !== null) dtrDisplay = dtrVal.toFixed(1) + '%';
        }
        let weightLossDisplay = '';
        if (greenBeanWeight !== '' && roastedBeanWeight !== '') {
            const lossData = RoastUtils.calculateWeightLoss(greenBeanWeight, roastedBeanWeight);
            if (lossData && !lossData.error) weightLossDisplay = lossData.lossPercentage + '%';
        }
        return [roast.id || '', roast.beanName || '', roast.roastDate || '', roast.roastLevel || '', roast.origin || '', greenBeanWeight, roastedBeanWeight, roast.chargingTemperature !== undefined && roast.chargingTemperature !== null ? roast.chargingTemperature : '', roast.turningPointTime || '', roast.turningPointTemp !== undefined && roast.turningPointTemp !== null ? roast.turningPointTemp : '', roast.firstCrackTime || '', roast.secondCrackTime || '', roast.endOfRoastTemp !== undefined && roast.endOfRoastTemp !== null ? roast.endOfRoastTemp : '', roast.totalRoastTime || '', dtrDisplay, weightLossDisplay, roast.roastWeatherTemp !== undefined && roast.roastWeatherTemp !== null ? roast.roastWeatherTemp.toFixed(1) : '', roast.roastWeatherHumidity !== undefined && roast.roastWeatherHumidity !== null ? roast.roastWeatherHumidity.toFixed(0) : '', roast.notes || '', roast.beanTempLog || '', roast.chamberTempLog || '', roast.rorLog || ''].map(cell => _escapeCsvCell(cell));
    });
    let csvContent = "\uFEFF";
    csvContent += headers.join(',') + '\n';
    rows.forEach(rowArray => { csvContent += rowArray.join(',') + '\n'; });
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    if (link.download !== undefined) {
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "roast_log_export.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        eventBus.emit('ui:show-toast', { message: t('csvExportSuccess'), type: "success" });
    } else {
        eventBus.emit('ui:show-toast', { message: t('directDownloadNotSupported'), type: "error" });
        console.error("RoastWorkflowController: CSV export - Download attribute not supported.");
    }
}