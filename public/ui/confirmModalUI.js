import { eventBus } from '../modules/core/EventBus.js';

let modal, messageSpan, confirmButton, cancelButton;

function showConfirmModal({ message }) {
    if (!modal) return;
    messageSpan.textContent = message;
    modal.classList.remove('hidden');
    setTimeout(() => {
        modal.classList.add('is-visible');
    }, 10);
}

function closeConfirmModal() {
    if (!modal) return;
    modal.classList.remove('is-visible');
    modal.addEventListener('transitionend', () => {
        modal.classList.add('hidden');
    }, { once: true });
}

export function initializeConfirmModal() {
    modal = document.getElementById('confirmModal');
    messageSpan = document.getElementById('confirmMessage');
    confirmButton = document.getElementById('confirmDeleteButton');
    cancelButton = document.getElementById('cancelDeleteButton');

    if (!modal || !messageSpan || !confirmButton || !cancelButton) {
        console.warn("ConfirmModalUI: One or more parts of the modal are missing, feature disabled.");
        return;
    }

    confirmButton.addEventListener('click', () => {
        eventBus.emit('ui:confirm-delete-clicked');
    });

    cancelButton.addEventListener('click', closeConfirmModal);
    
    eventBus.on('ui:show-confirm-modal', showConfirmModal);
    eventBus.on('ui:close-confirm-modal', closeConfirmModal);
    
    console.log("✅ ConfirmModalUI initialized.");
}