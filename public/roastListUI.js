import { eventBus } from './EventBus.js';

// DOM Elements
let roastLogDiv, searchInput, searchButton, exportCsvButton, sortSelect, filterFavoritesCheckbox;

/**
 * 総合評価に基づいて星のSVGアイコンを生成する。
 * @param {number | string} rating - 評価点 (0-5)。
 * @returns {string} - 星のHTML文字列。
 */
function createStarRatingDisplay(rating) {
    const numRating = typeof rating === 'string' ? parseFloat(rating) : rating;
    if (isNaN(numRating) || numRating <= 0) {
        return '<div class="flex items-center" title="未評価"></div>';
    }

    let stars = '';
    for (let i = 1; i <= 5; i++) {
        // 塗りつぶされた星
        const fullStar = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>';
        // 空の星
        const emptyStar = '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-gray-300" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>';

        if (i <= numRating) {
            stars += fullStar;
        } else {
            stars += emptyStar;
        }
    }
    return `<div class="flex items-center" title="評価: ${numRating.toFixed(1)} / 5.0">${stars}</div>`;
}


/**
 * フレーバープロファイルに基づいてタグのHTMLを生成する。
 * @param {string | null | undefined} flavorProfile - "ベリー,チョコレート" のようなカンマ区切りの文字列。
 * @returns {string} - タグのHTML文字列。
 */
function createFlavorTagsDisplay(flavorProfile) {
    if (!flavorProfile || typeof flavorProfile !== 'string' || flavorProfile.trim() === '') {
        return '';
    }
    const tags = flavorProfile.split(',').map(tag => tag.trim()).filter(tag => tag);
    if (tags.length === 0) {
        return '';
    }

    const tagsHtml = tags.map(tag => `
        <span class="inline-block bg-gray-200 rounded-full px-2 py-0.5 text-xs font-semibold text-gray-700">
            ${tag}
        </span>
    `).join('');

    return `<div class="mt-2 flex flex-wrap gap-1">${tagsHtml}</div>`;
}


/**
 * 焙煎記録のリストを描画する。
 */
function renderRoastList({ roasts, keyword }) {
    // ▼▼▼ [修正] 描画対象を #roastLog に変更 ▼▼▼
    const listElement = document.getElementById('roastLog');
    if (!listElement) {
        console.error("RoastListUI: Cannot render list, '#roastLog' element not found.");
        // フォールバックとして、古いコンテナにエラーメッセージを表示
        if (roastLogDiv) roastLogDiv.innerHTML = '<p class="text-red-500 p-4">Error: #roastLog element not found inside the container.</p>';
        return;
    }

    listElement.innerHTML = '';

    if (!roasts || roasts.length === 0) {
        if (keyword) {
            listElement.innerHTML = `<p class="text-center text-gray-500 py-8">検索結果に一致する記録はありません。</p>`;
        } else {
            listElement.innerHTML = `
            <div class="text-center py-12 px-6">
                <svg xmlns="http://www.w3.org/2000/svg" class="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4M4 7s0 4 8 4 8-4 8-4m-8 8c0 2.21-3.582 4-8 4" />
                </svg>
                <h3 class="mt-2 text-lg font-medium text-gray-900">まだ焙煎記録がありません</h3>
                <p class="mt-1 text-sm text-gray-500">最初の焙煎を記録して、分析を始めましょう。</p>
                <div class="mt-6">
                    <button type="button" id="addNewRoastButtonEmpty" class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-amber-600 hover:bg-amber-700">
                        最初の焙煎を記録する
                    </button>
                </div>
            </div>`;
        }
        return;
    }

    const fragment = document.createDocumentFragment();
    roasts.forEach(roast => {
        const card = document.createElement('div');
        card.className = 'roast-card bg-white p-4 rounded-lg shadow-sm mb-4';
        card.dataset.id = roast.id; 
        
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
        
        const starIcon = `<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 ${roast.isFavorite ? 'text-yellow-400' : 'text-gray-300'}" viewBox="0 0 20 20" fill="currentColor"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>`;
        const beanNameToDisplay = roast.beanName || '豆の名前がありません';

        card.innerHTML = `
        <div class="flex flex-col sm:flex-row justify-between items-stretch gap-3">
            <div class="flex-shrink-0 flex items-center sm:h-full pt-2 sm:pt-0">
                <input type="checkbox" class="roast-compare-checkbox h-5 w-5 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500" data-id="${roast.id}">
            </div>

            <div class="flex-grow cursor-pointer view-profile-trigger" data-id="${roast.id}">
                <p class="text-sm text-gray-500">${roast.roastDate || '日付不明'}</p>
                <h3 class="text-xl font-bold text-gray-800 truncate">${beanNameToDisplay}</h3>
                <p class="text-sm text-gray-600">${roast.roastLevel || '焙煎度未設定'} | 総時間: ${roast.totalRoastTime || '--:--'}</p>
                ${createFlavorTagsDisplay(roast.flavorProfile)}
                <p class="text-xs text-gray-400 mt-2 truncate">記録ID: ${roast.id || 'N/A'}</p>
            </div>

            <div class="flex-shrink-0 flex sm:flex-col justify-between items-end">
                <div class="flex items-start space-x-2">
                    <div class="text-right">
                        <div class="flex items-center justify-end gap-2">
                            <span class="text-2xl font-bold">${overallRatingDisplay}</span>
                            ${createStarRatingDisplay(overallRatingDisplay)}
                        </div>
                    </div>
                    <button class="favorite-btn p-1" data-id="${roast.id}">${starIcon}</button>
                </div>
                <div class="mt-2 sm:mt-4 flex justify-end space-x-2">
                    <button class="view-btn inline-flex items-center gap-x-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm" data-id="${roast.id}"><svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-4 h-4 -ml-1"><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"></path></svg>詳細</button>
                    <button class="edit-btn inline-flex items-center gap-x-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm" data-id="${roast.id}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 -ml-1"><path d="M2.695 14.763l-1.262 3.154a.5.5 0 00.65.65l3.155-1.262a4 4 0 001.343-.885L17.5 5.5a2.121 2.121 0 00-3-3L3.58 13.42a4 4 0 00-.885 1.343z"></path></svg>編集</button>
                    <button class="delete-btn inline-flex items-center gap-x-1 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 text-sm" data-id="${roast.id}" data-name="${beanNameToDisplay}"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" class="w-4 h-4 -ml-1"><path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>削除</button>
                </div>
            </div>
        </div>
        `;
        
        fragment.appendChild(card);
    });

    listElement.appendChild(fragment);
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
        const isEnabled = count >= 2 && count <= 3;

        compareRoastsButton.disabled = !isEnabled;

        if (isEnabled) {
            compareRoastsButton.textContent = `${count}件の焙煎を比較`;
            compareRoastsButton.classList.remove('bg-gray-300', 'cursor-not-allowed');
            compareRoastsButton.classList.add('bg-indigo-600', 'hover:bg-indigo-700');
        } else {
            compareRoastsButton.textContent = '比較する (2-3件選択)';
            compareRoastsButton.classList.add('bg-gray-300', 'cursor-not-allowed');
            compareRoastsButton.classList.remove('bg-indigo-600', 'hover:bg-indigo-700');
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

    // ▼▼▼ [修正] イベントリスナーをより堅牢に ▼▼▼
    roastLogDiv.addEventListener('click', (e) => {
        const target = e.target;

        // 1. ボタンのクリックを最優先で処理
        const button = target.closest('button');
        if (button) {
            const id = button.dataset.id;
            if (id) {
                if (button.classList.contains('view-btn')) {
                    eventBus.emit('ui:view-profile-clicked', id);
                } else if (button.classList.contains('edit-btn')) {
                    eventBus.emit('ui:edit-roast-clicked', id);
                } else if (button.classList.contains('delete-btn')) {
                    eventBus.emit('ui:delete-roast-clicked', { id, name: button.dataset.name });
                } else if (button.classList.contains('favorite-btn')) {
                    eventBus.emit('ui:toggle-favorite-clicked', id);
                }
            } else if (button.id === 'addNewRoastButtonEmpty') {
                eventBus.emit('ui:add-new-roast-clicked');
            }
            return; // ボタン処理後は他の処理をしない
        }

        // 2. ボタン以外がクリックされた場合、詳細表示のトリガーを探す
        const profileTrigger = target.closest('.view-profile-trigger');
        if (profileTrigger) {
            const id = profileTrigger.dataset.id;
            if (id) {
                eventBus.emit('ui:view-profile-clicked', id);
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

    // 初期状態を設定
    updateCompareButtonState();

    console.log("✅ RoastListUI initialized.");
}