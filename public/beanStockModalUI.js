import { eventBus } from './EventBus.js';

// --- DOM要素 ---
let modalElement, closeButtonElement, addNewBeanButtonElement;
let listContainerElement, showEmptyCheckboxElement;
let formElement, formTitleElement, beanIdInputElement, saveBeanButtonElement, deleteBeanButtonElement;
let purchaseAmountInputElement, priceInputElement, unitPriceDisplayElement;

function showBeanStockModal() {
    if (modalElement) modalElement.classList.add('is-visible');
}

function hideBeanStockModal() {
    if (modalElement) modalElement.classList.remove('is-visible');
}

function renderBeanList({ beans, editHandler }) {
    if (!listContainerElement) return;
    listContainerElement.innerHTML = '';

    if (beans.length === 0) {
        listContainerElement.innerHTML = '<p class="text-sm text-gray-500 italic p-2">該当する生豆はありません。</p>';
        return;
    }

    beans.forEach(bean => {
        const remaining = bean.remainingAmount || 0;
        const purchase = bean.purchaseAmount || 0;
        const percentage = purchase > 0 ? (remaining / purchase) * 100 : 0;
        const isOutOfStock = remaining <= 0;

        const itemElement = document.createElement('div');
        itemElement.className = `p-3 rounded-lg border cursor-pointer transition-all duration-200 ${isOutOfStock ? 'bg-gray-100 opacity-60' : 'bg-white hover:bg-amber-50'}`;
        itemElement.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <p class="font-semibold text-amber-800">${bean.beanName}</p>
                    <p class="text-xs text-gray-500">${bean.origin || ''} ${bean.farm || ''}</p>
                </div>
            </div>
            <div class="mt-2">
                <div class="flex justify-between items-center text-xs text-gray-600 mb-1">
                    <span>残り: ${remaining.toFixed(3)}kg</span>
                    <span>${percentage.toFixed(0)}%</span>
                </div>
                <div class="w-full bg-gray-200 rounded-full h-1.5">
                    <div class="bg-green-500 h-1.5 rounded-full" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
        
        itemElement.addEventListener('click', () => editHandler(bean.id));
        listContainerElement.appendChild(itemElement);
    });
}

function clearAndShowBeanForm({ isEdit, data }) {
    if (!formElement || !formTitleElement || !beanIdInputElement || !addNewBeanButtonElement || !deleteBeanButtonElement) return;
    formElement.reset();
    
    if (isEdit) {
        formTitleElement.textContent = '生豆の情報を編集';
        addNewBeanButtonElement.classList.remove('hidden');
        deleteBeanButtonElement.classList.remove('hidden');
        beanIdInputElement.value = data.id || '';
        Object.keys(data).forEach(key => {
            if (formElement.elements[key]) formElement.elements[key].value = data[key];
        });
    } else {
        formTitleElement.textContent = '新規生豆を登録';
        addNewBeanButtonElement.classList.add('hidden');
        deleteBeanButtonElement.classList.add('hidden');
        beanIdInputElement.value = '';
    }
    _updateUnitPriceDisplay();
}

function _updateUnitPriceDisplay() {
    if (!purchaseAmountInputElement || !priceInputElement || !unitPriceDisplayElement) return;
    const amount = parseFloat(purchaseAmountInputElement.value);
    const price = parseFloat(priceInputElement.value);
    if (!isNaN(amount) && !isNaN(price) && amount > 0) {
        const unitPrice = price / amount;
        unitPriceDisplayElement.textContent = `${unitPrice.toFixed(1)} 円/kg`;
    } else {
        unitPriceDisplayElement.textContent = '- 円/kg';
    }
}

export function initializeBeanStockModalUI() {
    // --- DOM要素の取得 ---
    modalElement = document.getElementById('beanStockModal');
    closeButtonElement = document.getElementById('closeBeanStockModalButton');
    addNewBeanButtonElement = document.getElementById('addNewBeanButton');
    listContainerElement = document.getElementById('beanStockListContainer');
    showEmptyCheckboxElement = document.getElementById('show-empty-beans-checkbox');
    formElement = document.getElementById('beanStockForm');
    formTitleElement = document.getElementById('beanStockFormTitle');
    beanIdInputElement = document.getElementById('beanId');
    saveBeanButtonElement = document.getElementById('saveBeanButton');
    deleteBeanButtonElement = document.getElementById('deleteBeanButton');
    purchaseAmountInputElement = document.getElementById('purchaseAmount');
    priceInputElement = document.getElementById('price');
    unitPriceDisplayElement = document.getElementById('unitPriceDisplay');

    if (!modalElement) {
        console.error("BeanStockModalUI: Modal element 'beanStockModal' not found.");
        return;
    }

    // --- UI操作イベントの発行 ---
    closeButtonElement.addEventListener('click', hideBeanStockModal);
    addNewBeanButtonElement.addEventListener('click', () => eventBus.emit('ui:bean-stock:add-new'));
    showEmptyCheckboxElement.addEventListener('change', (e) => eventBus.emit('ui:bean-stock:toggle-show-empty', e.target.checked));
    
    formElement.addEventListener('submit', (e) => {
        e.preventDefault();
        const formData = new FormData(formElement);
        const data = Object.fromEntries(formData.entries());
        eventBus.emit('ui:bean-stock:save-bean', { formData: data, beanId: data.beanId });
    });

    deleteBeanButtonElement.addEventListener('click', () => {
        const beanId = beanIdInputElement.value;
        if (beanId) {
            eventBus.emit('ui:bean-stock:delete-bean', { beanId });
        }
    });
    
    purchaseAmountInputElement.addEventListener('input', _updateUnitPriceDisplay);
    priceInputElement.addEventListener('input', _updateUnitPriceDisplay);
    
    modalElement.addEventListener('click', (event) => {
        if (event.target === modalElement) hideBeanStockModal();
    });

    // --- Controllerからのイベントの購読 ---
    eventBus.on('ui:show-bean-stock-modal', showBeanStockModal);
    eventBus.on('beans:render-stock-list', renderBeanList);
    eventBus.on('ui:show-bean-form', clearAndShowBeanForm);
    eventBus.on('ui:hide-bean-form', () => clearAndShowBeanForm({ isEdit: false, data: null }));

    console.log("✅ BeanStockModalUI initialized.");
}