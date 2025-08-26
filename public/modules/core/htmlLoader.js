import { eventBus } from './EventBus.js';

async function loadComponent(url, containerId, append = false) {
    try {
        const response = await fetch(`./components/${url}`);
        if (!response.ok) {
            throw new Error(`Network response was not ok for ${url}`);
        }
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            if (append) {
                container.innerHTML += html;
            } else {
                container.innerHTML = html;
            }
        } else {
            // It's possible for a container not to exist if the user isn't on a page that needs it.
            // This is not necessarily a critical error.
            console.warn(`[htmlLoader] Container #${containerId} not found for component ${url}.`);
        }
    } catch (error) {
        console.error(`[htmlLoader] Critical error loading component ${url}:`, error);
        throw error;
    }
}

export async function loadAllComponents(components) {
    const promises = components.map(comp => loadComponent(comp.url, comp.containerId, comp.append));
    await Promise.all(promises);
    
    // ▼▼▼ 全て読み込み終わったらイベントを発行 ▼▼▼
    eventBus.emit('html:loaded');
    console.log("[htmlLoader.js] All components loaded and 'html:loaded' event emitted.");
}