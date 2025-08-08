import { eventBus } from './EventBus.js';

async function loadComponent(url, containerId) {
    try {
        const response = await fetch(`./components/${url}`);
        if (!response.ok) throw new Error(`Network response was not ok for ${url}`);
        const html = await response.text();
        const container = document.getElementById(containerId);
        if (container) {
            container.innerHTML = html;
        }
    } catch (error) {
        console.error(`Error loading component ${url}:`, error);
    }
}

export async function loadAllComponents(components) {
    const promises = components.map(comp => loadComponent(comp.url, comp.containerId));
    await Promise.all(promises);
    
    // ▼▼▼ 全て読み込み終わったらイベントを発行 ▼▼▼
    eventBus.emit('html:loaded');
    console.log("[htmlLoader.js] All components loaded and 'html:loaded' event emitted.");
}