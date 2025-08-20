import { eventBus } from './EventBus.js';
import * as BeanService from './beanService.js';
import { t, getCurrentLanguage } from './i18n.js';

let localBeansCache = [];
let showEmptyBeans = false;

function applyFiltersAndRender() {
    let beansToDisplay = localBeansCache;
    if (!showEmptyBeans) {
        beansToDisplay = localBeansCache.filter(bean => (bean.remainingAmount || 0) > 0);
    }
    beansToDisplay.sort((a, b) => a.beanName.localeCompare(b.beanName, getCurrentLanguage()));
    eventBus.emit('beans:render-stock-list', {
        beans: beansToDisplay,
        editHandler: handleEditBeanClick
    });
    const beansForRoastForm = localBeansCache.filter(bean => (bean.remainingAmount || 0) > 0);
    eventBus.emit('beans:updated-for-roast-form', beansForRoastForm);
}

function handleBeansUpdate(updatedBeans) {
    localBeansCache = updatedBeans || [];
    applyFiltersAndRender();
}

function handleAddNewBeanClick() {
    eventBus.emit('ui:show-bean-form', { isEdit: false, data: null });
}

function handleEditBeanClick(beanId) {
    const beanToEdit = localBeansCache.find(b => b.id === beanId);
    if (beanToEdit) {
        eventBus.emit('ui:show-bean-form', { isEdit: true, data: beanToEdit });
    }
}

function handleToggleShowEmpty(isChecked) {
    showEmptyBeans = isChecked;
    applyFiltersAndRender();
}

async function handleSaveBean({ formData, beanId }) {
    const dataToSave = {
        beanName: formData.beanName,
        origin: formData.origin || '',
        farm: formData.farm || '',
        variety: formData.variety || '',
        altitude: formData.altitude ? parseInt(formData.altitude, 10) : null,
        process: formData.process || '',
        purchaseDate: formData.purchaseDate || '',
        notes: formData.notes || '',
        purchaseAmount: formData.purchaseAmount ? parseFloat(formData.purchaseAmount) : null,
        price: formData.price ? parseInt(formData.price, 10) : null,
        remainingAmount: formData.remainingAmount !== '' && formData.remainingAmount !== null ? parseFloat(formData.remainingAmount) : null
    };

    if (!dataToSave.beanName) {
        eventBus.emit('ui:show-toast', { message: t('toast.beanNameRequired'), type: "error" });
        return;
    }

    let success = false;
    let toastMessage = "";

    if (beanId) {
        if (dataToSave.remainingAmount === null) {
            delete dataToSave.remainingAmount;
        }
        success = await BeanService.updateBean(beanId, dataToSave);
        toastMessage = success ? t('toast.beanUpdateSuccess') : t('toast.beanUpdateFail');
    } else {
        if (dataToSave.remainingAmount === null) {
            dataToSave.remainingAmount = dataToSave.purchaseAmount || 0;
        }
        const newId = await BeanService.addBean(dataToSave);
        success = !!newId;
        toastMessage = success ? t('toast.beanAddSuccess') : t('toast.beanAddFail');
    }

    eventBus.emit('ui:show-toast', { message: toastMessage, type: success ? "success" : "error" });
    if (success) {
        eventBus.emit('ui:hide-bean-form');
    }
}

async function handleDeleteBean({ beanId }) {
    if (!beanId) return;

    const beanToDelete = localBeansCache.find(b => b.id === beanId);
    const confirmDelete = window.confirm(t('confirm.deleteBean', { beanName: beanToDelete?.beanName || t('text.deletedBeanFallback') }));

    if (confirmDelete) {
        const success = await BeanService.deleteBean(beanId);
        const toastMessage = success ? t('toast.beanDeleteSuccess') : t('toast.beanDeleteFail');
        eventBus.emit('ui:show-toast', { message: toastMessage, type: success ? "success" : "error" });
        if (success) {
            eventBus.emit('ui:hide-bean-form');
        }
    }
}


export function initializeBeanStockController() {
    eventBus.on('data:beans-updated', handleBeansUpdate);
    eventBus.on('ui:bean-stock:add-new', handleAddNewBeanClick);
    eventBus.on('ui:bean-stock:toggle-show-empty', handleToggleShowEmpty);
    eventBus.on('ui:bean-stock:save-bean', handleSaveBean);
    eventBus.on('ui:bean-stock:delete-bean', handleDeleteBean);
    
    const openBeanStockModalButton = document.getElementById('openBeanStockModalButton');
    if (openBeanStockModalButton) {
        openBeanStockModalButton.addEventListener('click', () => {
            eventBus.emit('ui:show-bean-stock-modal');
        });
    }

    console.log("✅ BeanStockController initialized.");
}