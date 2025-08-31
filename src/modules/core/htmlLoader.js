import { eventBus } from './EventBus.js';

async function loadComponent(url, containerId, append = false) {
    try {
        // パスを修正: Viteのルートからの絶対パスに修正
        const response = await fetch(`/src/components/${url}`);
        if (!response.ok) {
            throw new Error(`Network response was not ok for ${url}: ${response.statusText}`);
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
            console.warn(`[htmlLoader] Container #${containerId} not found for component ${url}.`);
        }
    } catch (error) {
        // エラーを再スローして、Promise.allSettledで捕捉できるようにする
        console.error(`[htmlLoader] Failed to load component ${url}:`, error);
        throw error;
    }
}

export async function loadAllComponents(components) {
    const promises = components.map(comp =>
        loadComponent(comp.url, comp.containerId, comp.append)
    );

    // Promise.allをPromise.allSettledに置き換えて、1つの失敗で全体が止まらないようにする
    const results = await Promise.allSettled(promises);

    let allSucceeded = true;
    results.forEach((result, index) => {
        if (result.status === 'rejected') {
            allSucceeded = false;
            // 失敗したコンポーネントの情報をコンソールに明確に表示
            console.error(`[htmlLoader] Component loading failed: ${components[index].url}`, result.reason);
        }
    });

    if (allSucceeded) {
        console.log("[htmlLoader.js] All components loaded successfully.");
    } else {
        console.warn("[htmlLoader.js] Some components failed to load. Check the errors above. The application will continue to initialize.");
    }
    
    // 成功・失敗にかかわらず、html:loadedイベントを発行してアプリの初期化を続行させる
    eventBus.emit('html:loaded');
    console.log("[htmlLoader.js] 'html:loaded' event emitted.");
}