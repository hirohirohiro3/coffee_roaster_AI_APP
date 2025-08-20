// ================================================================
// --- public/roastDataManager.js (在庫連動修正版) ---
// ================================================================

import { showToast } from './ui.js';
import { t } from './i18n.js';
// ▼▼▼ import文に `db` を追加 ▼▼▼
import { currentUserId, addRoastRecord, updateRoastRecord, deleteRoastRecord, db } from './firebaseService.js';
// ▼▼▼ import文に `batchUpdateBeanStock` を追加 ▼▼▼
import { addRoastAndUpdateStock, batchUpdateBeanStock } from './beanService.js';
import { getGraphLogsForSaving } from './graphController.js';
// ▼▼▼ Firestore SDKから直接 `writeBatch` と `doc` をインポート ▼▼▼
import { writeBatch, doc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

const RATING_CATEGORIES = ['flavor', 'bitterness', 'acidity', 'sweetness', 'body'];

function _generateCustomId(roastDate) {
    const datePart = roastDate.replace(/-/g, '');
    const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let randomPart = '';
    for (let i = 0; i < 4; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `${datePart}-${randomPart}`;
}

function _prepareRoastDataForSave(rawFormData) {
    const roastData = { ...rawFormData };
    if (!roastData.beanId || !roastData.roastDate || !roastData.totalRoastTime) {
        showToast(t('toast.roast.requiredFields'), "error");
        return null;
    }
    const numericFields = ['greenBeanWeight', 'roastedBeanWeight', 'chargingTemperature', 'turningPointTemp', 'endOfRoastTemp', 'roastWeatherTemp', 'roastWeatherHumidity'];
    numericFields.forEach(field => {
        const value = roastData[field];
        if (value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '') {
            const numVal = parseFloat(value);
            if (!isNaN(numVal)) {
                roastData[field] = numVal;
            } else {
                delete roastData[field];
            }
        } else if (value === '' || value === null || value === undefined) {
            delete roastData[field];
        }
    });
    
    const ratings = {};
    let hasAnyRating = false;
    RATING_CATEGORIES.forEach(category => {
        const fieldName = `ratings[${category}]`;
        if (rawFormData[fieldName] && rawFormData[fieldName] !== '') {
            const ratingValue = parseInt(rawFormData[fieldName], 10);
            if (!isNaN(ratingValue)) {
                ratings[category] = ratingValue;
                hasAnyRating = true;
            }
        }
        delete roastData[fieldName];
    });
    if (hasAnyRating) roastData.ratings = ratings;
    
    const optionalStringFields = [
        'targetFlavor', 'roasterModel', 'turningPointTime', 'firstCrackTime',
        'secondCrackTime', 'notes', 'aiNotes', 'flavorProfile', 'acidityQuality', 'bodyTexture', 'overallRating'
    ];
    optionalStringFields.forEach(field => {
        if (roastData.hasOwnProperty(field) && (roastData[field] === null || roastData[field] === undefined || (typeof roastData[field] === 'string' && roastData[field].trim() === ''))) {
            delete roastData[field];
        }
    });
    
    const graphLogs = getGraphLogsForSaving();
    if (graphLogs && graphLogs.beanTempLog) {
        Object.assign(roastData, graphLogs);
    }
    
    delete roastData.editRoastId;
    
    return roastData;
}

// =======================================================
// ▼▼▼ この関数が修正されました (課題対応) ▼▼▼
// =======================================================
export async function processAndSaveRoastData(formDataFromUI, editId, originalRoastData) {
    if (!currentUserId()) {
        showToast(t('toast.roast.notLoggedIn'), "error");
        return { success: false, error: "User not logged in" };
    }
    
    const roastDataToSave = _prepareRoastDataForSave(formDataFromUI);
    if (!roastDataToSave) {
        return { success: false, error: "Data preparation failed" };
    }
    
    try {
        if (editId) {
            // --- 編集時の処理 ---
            const finalDataToUpdate = { ...originalRoastData, ...roastDataToSave };
            
            // 在庫変動量の計算
            const oldWeight = originalRoastData.greenBeanWeight || 0;
            const newWeight = finalDataToUpdate.greenBeanWeight || 0;
            const weightDifference = newWeight - oldWeight;

            // バッチ処理を開始
            const batch = writeBatch(db);

            // 1. 焙煎記録の更新をバッチに追加
            const roastRef = doc(db, `users/${currentUserId()}/roasts`, editId);
            batch.update(roastRef, finalDataToUpdate);
            
            // 2. 在庫変動があれば、在庫更新もバッチに追加
            if (weightDifference !== 0 && finalDataToUpdate.beanId) {
                // 在庫の調整量を計算（例：20g→25gなら、在庫は-5g）
                const stockAdjustment = -weightDifference;
                batchUpdateBeanStock(batch, finalDataToUpdate.beanId, stockAdjustment);
            }
            
            // バッチ処理を実行（焙煎記録と在庫を同時に更新）
            await batch.commit();
            showToast(t('toast.roast.updateSuccess'), "success");
            return { success: true };

        } else {
            // --- 新規作成時の処理（変更なし） ---
            roastDataToSave.customRoastId = _generateCustomId(roastDataToSave.roastDate);
            const beanId = roastDataToSave.beanId;
            const usedAmount = roastDataToSave.greenBeanWeight;

            if (!beanId || !usedAmount || usedAmount <= 0) {
                showToast(t('toast.roast.stockUpdateRequired'), "error", 5000);
                return { success: false, error: "Bean ID or used amount is missing." };
            }
            const newDocId = await addRoastAndUpdateStock(roastDataToSave, beanId, usedAmount);
            showToast(t('toast.roast.addSuccess'), "success");
            return { success: !!newDocId, docId: newDocId };
        }
    } catch (error) {
        console.error("Error saving roast data with stock update:", error);
        showToast(t('toast.roast.saveError', { message: error.message }), "error");
        return { success: false, error: error.message };
    }
}
// =======================================================
// ▲▲▲ 修正完了 ▲▲▲
// =======================================================

export async function processDeleteRoastData(roastId) {
    if (!roastId || !currentUserId()) {
        showToast(t('toast.roast.deletePrereq'), "error");
        return false;
    }
    try {
        const success = await deleteRoastRecord(roastId);
        if (success) {
            showToast(t('toast.roast.deleteSuccess'), "success");
        } else {
            showToast(t('toast.roast.deleteFail'), "error");
        }
        return success;
    } catch (error) {
        console.error(`Error deleting record ${roastId}:`, error);
        showToast(t('toast.roast.deleteError', { message: error.message }), "error");
        return false;
    }
}

export async function processAndUpdateTemperatures(docId, newBeanTemps, newChamberTemps) {
    if (!docId || !currentUserId()) {
        showToast(t('toast.roast.updateTempPrereq'), "error");
        return false;
    }
    const newRorValues = [null];
    for (let i = 1; i < newBeanTemps.length; i++) {
        const prevTemp = newBeanTemps[i - 1];
        const currentTemp = newBeanTemps[i];
        if (prevTemp !== null && currentTemp !== null) {
            newRorValues.push(currentTemp - prevTemp);
        } else {
            newRorValues.push(null);
        }
    }
    const formatForSave = (arr) => arr.map(val => (val !== null && !isNaN(val)) ? val.toFixed(1) : '').join(',');
    const dataToUpdate = {
        beanTempLog: formatForSave(newBeanTemps),
        chamberTempLog: formatForSave(newChamberTemps),
        rorLog: formatForSave(newRorValues),
    };
    return await updateRoastRecord(docId, dataToUpdate);
}