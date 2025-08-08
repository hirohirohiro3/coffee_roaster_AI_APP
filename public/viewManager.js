// /public/viewManager.js

// --- DOM要素を保持する変数 ---
let viewRoastListTab, viewStatisticsTab;
let roastListPage, statisticsPage;

// --- 現在アクティブなビューを保持 ---
let currentView = 'roastList';

/**
 * ビュー管理モジュールを初期化します。
 */
export function initializeViewManager(initialView = 'roastList') {
    viewRoastListTab = document.getElementById('viewRoastListTab');
    viewStatisticsTab = document.getElementById('viewStatisticsTab');
    roastListPage = document.getElementById('roast-list-page');
    statisticsPage = document.getElementById('statisticsPage');

    if (!viewRoastListTab || !viewStatisticsTab || !roastListPage || !statisticsPage) {
        console.error("ViewManager: One or more essential view elements are missing.");
        return;
    }

    viewRoastListTab.addEventListener('click', () => switchView('roastList'));
    viewStatisticsTab.addEventListener('click', () => switchView('statistics'));

    switchView(initialView);
}

/**
 * 表示するページを切り替えます。
 * @param {'roastList' | 'statistics'} viewToShow - 表示したいビューの名前
 */
export function switchView(viewToShow) {
    currentView = viewToShow;

    // すべてのページを一旦非表示
    roastListPage.style.display = 'none';
    statisticsPage.style.display = 'none';

    // すべてのタブを非アクティブなスタイルに
    viewRoastListTab.classList.remove('border-amber-500', 'text-amber-600');
    viewRoastListTab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    viewStatisticsTab.classList.remove('border-amber-500', 'text-amber-600');
    viewStatisticsTab.classList.add('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');

    if (viewToShow === 'roastList') {
        roastListPage.style.display = 'block';
        viewRoastListTab.classList.add('border-amber-500', 'text-amber-600');
        viewRoastListTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
    } else if (viewToShow === 'statistics') {
        statisticsPage.style.display = 'block';
        viewStatisticsTab.classList.add('border-amber-500', 'text-amber-600');
        viewStatisticsTab.classList.remove('border-transparent', 'text-gray-500', 'hover:text-gray-700', 'hover:border-gray-300');
        
        // 外部から統計データの更新をトリガーできるようにイベントを発行
        // （app.jsがこれをリッスンしてStatisticsControllerを呼び出す）
        document.dispatchEvent(new CustomEvent('viewChanged', { detail: { view: 'statistics' } }));
    }
}

/**
 * 現在表示されているビューの名前を返します。
 * @returns {'roastList' | 'statistics'}
 */
export function getCurrentView() {
    return currentView;
}