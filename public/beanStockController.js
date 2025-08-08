import { eventBus } from './EventBus.js';
import * as BeanService from './beanService.js';

let localBeansCache = [];
let showEmptyBeans = false;

function applyFiltersAndRender() {
    let beansToDisplay = localBeansCache;
    if (!showEmptyBeans) {
        beansToDisplay = localBeansCache.filter(bean => (bean.remainingAmount || 0) > 0);
    }
    beansToDisplay.sort((a, b) => a.beanName.localeCompare(b.beanName, 'ja'));
    eventBus.emit('beans:render-stock-list', {
        beans: beansToDisplay,
        editHandler: handleEditBeanClick
    });
    eventBus.emit('beans:updated-for-roast-form', localBeansCache);
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

// ▼▼▼ THIS FUNCTION WAS MODIFIED ▼▼▼
async function handleSaveBean({ formData, beanId }) {
    // New form items added to the save object
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
        // The value from the new input field is included
        remainingAmount: formData.remainingAmount !== '' && formData.remainingAmount !== null ? parseFloat(formData.remainingAmount) : null
    };

    if (!dataToSave.beanName) {
        eventBus.emit('ui:show-toast', { message: "豆の名前は必須です。", type: "error" });
        return;
    }

    let success = false;
    let toastMessage = "";

    if (beanId) {
        // When editing: if remainingAmount is not manually entered, it is not included in the update
        if (dataToSave.remainingAmount === null) {
            delete dataToSave.remainingAmount;
        }
        success = await BeanService.updateBean(beanId, dataToSave);
        toastMessage = success ? "生豆の情報を更新しました。" : "情報の更新に失敗しました。";
    } else {
        // When creating new: if remainingAmount is not entered, purchaseAmount is the initial value
        if (dataToSave.remainingAmount === null) {
            dataToSave.remainingAmount = dataToSave.purchaseAmount || 0;
        }
        const newId = await BeanService.addBean(dataToSave);
        success = !!newId;
        toastMessage = success ? "新しい生豆を登録しました。" : "登録に失敗しました。";
    }

    eventBus.emit('ui:show-toast', { message: toastMessage, type: success ? "success" : "error" });
    if (success) {
        eventBus.emit('ui:hide-bean-form');
    }
}
// ▲▲▲ END OF MODIFICATION ▲▲▲

async function handleDeleteBean({ beanId }) {
    if (!beanId) return;

    // Final user confirmation
    const beanToDelete = localBeansCache.find(b => b.id === beanId);
    const confirmDelete = window.confirm(`本当に「${beanToDelete?.beanName || 'この豆'}」を削除しますか？\nこの操作は取り消せません。`);

    if (confirmDelete) {
        const success = await BeanService.deleteBean(beanId);
        const toastMessage = success ? "生豆を削除しました。" : "削除に失敗しました。";
        eventBus.emit('ui:show-toast', { message: toastMessage, type: success ? "success" : "error" });
        if (success) {
            eventBus.emit('ui:hide-bean-form');
        }
    }
}


export function initializeBeanStockController() {
    // Listen for data update events
    eventBus.on('data:beans-updated', handleBeansUpdate);

    // Listen for UI events
    eventBus.on('ui:bean-stock:add-new', handleAddNewBeanClick);
    eventBus.on('ui:bean-stock:toggle-show-empty', handleToggleShowEmpty);
    eventBus.on('ui:bean-stock:save-bean', handleSaveBean);
    eventBus.on('ui:bean-stock:delete-bean', handleDeleteBean);
    
    // Listener for the modal open button
    const openBeanStockModalButton = document.getElementById('openBeanStockModalButton');
    if (openBeanStockModalButton) {
        openBeanStockModalButton.addEventListener('click', () => {
            eventBus.emit('ui:show-bean-stock-modal');
        });
    }

    console.log("✅ BeanStockController initialized.");
}