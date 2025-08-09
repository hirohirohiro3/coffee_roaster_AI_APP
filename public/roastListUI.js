import { eventBus } from './EventBus.js';

// DOM Elements
let roastLogDiv, searchInput, searchButton, exportCsvButton, sortSelect, filterFavoritesCheckbox;

/**
 * 焙煎記録のリストを描画する。
 */
function renderRoastList({ roasts, keyword }) {
    if (!roastLogDiv) {
        console.error("RoastListUI: Cannot render list, 'roastLogDiv' element not found.");
        return;
    }

    roastLogDiv.innerHTML = ''; 

    if (!roasts || roasts.length === 0) {
        roastLogDiv.innerHTML = `<p class="text-center text-gray-500 py-8">${keyword ? '検索結果に一致する記録はありません。' : 'まだ焙煎記録がありません。'}</p>`;
        return;
    }

    const fragment = document.createDocumentFragment();
    roasts.forEach(roast => {
        const card = document.createElement('div');
        card.className = 'bg-white p-4 rounded-lg shadow-sm mb-4';
        card.dataset.id = roast.id; 
        
        // 1. メインの総合評価を決定
        let overallRatingDisplay = '未評価';
        if (typeof roast.overallRating === 'number') {
            overallRatingDisplay = roast.overallRating.toFixed(1);
        } 
        else if (roast.ratings && typeof roast.ratings === 'object') {
            const ratingValues = Object.values(roast.ratings).map(v => parseInt(v, 10)).filter(v => !isNaN(v));
            if (ratingValues.length > 0) {
                const sum = ratingValues.reduce((acc, val) => acc + val, 0);
                overallRatingDisplay = (sum / ratingValues.length).toFixed(1);
            }
        }
        
        // 2. 詳細評価のミニグラフを生成 (復活)
        let detailRatingsHtml = '';
        if (roast.ratings && typeof roast.ratings === 'object') {
            const categories = { 
                flavor: 'フレーバー', 
                bitterness: '苦味', 
                acidity: '酸味', 
                sweetness: '甘味', 
                body: 'ボディ' 
            };
            detailRatingsHtml += '<div class="text-xs text-gray-500 font-mono mt-2 space-y-1 w-32">';
            for (const [key, fullName] of Object.entries(categories)) {
                const value = roast.ratings[key] || 0;
                const filled = '■'.repeat(value);
                const empty = '□'.repeat(5 - value);
                detailRatingsHtml += `
                    <div class="flex items-center justify-between">
                        <span class="text-left">${fullName}</span>
                        <span class="text-left">${filled}${empty}</span>
                    </div>
                `;
            }
            detailRatingsHtml += '</div>';
        }
        
        const starIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ${roast.isFavorite ? 'text-yellow-400' : 'text-gray-300'}" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>`;
        const beanNameToDisplay = roast.beanName || '豆の名前がありません';

        // ▼▼▼ カード全体のHTML構造を修正 ▼▼▼
        card.innerHTML = `
        <div class="flex justify-between items-start gap-4">
            <div class="flex-shrink-0 flex items-center h-full pt-2">
                <input type="checkbox" class="roast-compare-checkbox h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" data-id="${roast.id}">
            </div>
            <div class="flex-grow cursor-pointer" onclick="eventBus.emit('ui:view-profile-clicked', '${roast.id}')">
                <p class="text-sm text-gray-500">${roast.roastDate || '日付不明'}</p>
                <h3 class="text-xl font-bold text-gray-800 truncate">${beanNameToDisplay}</h3>
                <p class="text-sm text-gray-600">${roast.roastLevel || '焙煎度未設定'} | 総時間: ${roast.totalRoastTime || '--:--'}</p>
                <p class="text-xs text-gray-400 mt-1 truncate">記録ID: ${roast.customRoastId || 'N/A'}</p>
            </div>
            <div class="flex-shrink-0 flex flex-col items-end justify-between">
                <div class="flex items-start space-x-2">
                     <div class="text-right">
                        <span class="text-2xl font-bold">${overallRatingDisplay}</span>
                        ${detailRatingsHtml}
                    </div>
                    <button class="favorite-btn p-1" data-id="${roast.id}">${starIcon}</button>
                </div>
                <div class="mt-4 flex justify-end space-x-2">
                    <button class="view-btn px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm" data-id="${roast.id}">詳細</button>
                    <button class="edit-btn px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm" data-id="${roast.id}">編集</button>
                    <button class="delete-btn px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm" data-id="${roast.id}" data-name="${beanNameToDisplay}">削除</button>
                </div>
            </div>
        </div>
        `;
        // ▲▲▲ 修正完了 ▲▲▲
        
        fragment.appendChild(card);
    });

    roastLogDiv.appendChild(fragment);
}

/**
 * 焙煎リストUIを初期化し、イベントリスナーを一度だけ設定します。
 */
export function initializeRoastListUI() {
    roastLogDiv = document.getElementById('roast-list-container');
    searchInput = document.getElementById('searchInput');
    searchButton = document.getElementById('searchButton');
    exportCsvButton = document.getElementById('exportCsvButton');
    sortSelect = document.getElementById('sort-select');
    filterFavoritesCheckbox = document.getElementById('filter-favorites');
    const compareRoastsButton = document.getElementById('compareRoastsButton');

    if (!roastLogDiv || !searchButton || !sortSelect || !filterFavoritesCheckbox || !exportCsvButton || !compareRoastsButton) {
        console.error("RoastListUI: One or more essential UI elements are missing from the DOM.");
        return;
    }

    let selectedRoastIds = new Set();

    const updateCompareButtonState = () => {
        const count = selectedRoastIds.size;
        const shouldShow = count >= 2 && count <= 3;

        if (shouldShow) {
            compareRoastsButton.style.display = 'inline-block';
            compareRoastsButton.textContent = `${count}件の焙煎を比較`;
        } else {
            compareRoastsButton.style.display = 'none';
        }
    };

    roastLogDiv.addEventListener('change', (e) => {
        if (e.target.classList.contains('roast-compare-checkbox')) {
            const roastId = e.target.dataset.id;
            if (e.target.checked) {
                selectedRoastIds.add(roastId);
            } else {
                selectedRoastIds.delete(roastId);
            }
            updateCompareButtonState();
        }
    });

    compareRoastsButton.addEventListener('click', () => {
        const selectedIds = Array.from(selectedRoastIds);
        if (selectedIds.length >= 2 && selectedIds.length <= 3) {
            eventBus.emit('ui:show-comparison', selectedIds);
        }
    });

    roastLogDiv.addEventListener('click', (e) => {
        const button = e.target.closest('button');
        if (button) {
            const id = button.dataset.id;
            if (!id) return;

            if (button.classList.contains('view-btn')) {
                eventBus.emit('ui:view-profile-clicked', id);
            } else if (button.classList.contains('edit-btn')) {
                eventBus.emit('ui:edit-roast-clicked', id);
            } else if (button.classList.contains('delete-btn')) {
                eventBus.emit('ui:delete-roast-clicked', { id, name: button.dataset.name });
            } else if (button.classList.contains('favorite-btn')) {
                eventBus.emit('ui:toggle-favorite-clicked', id);
            }
        }
    });

    searchButton.addEventListener('click', () => eventBus.emit('ui:search-requested', searchInput.value));
    searchInput.addEventListener('keyup', (e) => {
        if (e.key === 'Enter') eventBus.emit('ui:search-requested', searchInput.value);
    });
    sortSelect.addEventListener('change', () => eventBus.emit('ui:sort-changed', sortSelect.value));
    filterFavoritesCheckbox.addEventListener('change', () => eventBus.emit('ui:filter-favorites-changed', filterFavoritesCheckbox.checked));
    exportCsvButton.addEventListener('click', () => eventBus.emit('ui:export-csv-clicked'));
    
    eventBus.on('roasts:render-list', renderRoastList);
    console.log("✅ RoastListUI initialized.");
}