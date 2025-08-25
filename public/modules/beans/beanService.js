import {
    collection, addDoc, doc, updateDoc, onSnapshot, query,
    orderBy, serverTimestamp, writeBatch, increment
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { eventBus } from '../core/EventBus.js';
import { currentUserId } from '../../services/authService.js';
import * as FirestoreService from '../../services/firestoreService.js';
import { t } from '../core/i18n.js';

let dbInstance = null;
let unsubscribeBeans = null;

/**
 * Firestoreの生豆データの変更をリッスンし、更新があればイベントを発行します。
 */
function listenToBeans() {
    const userId = currentUserId();
    if (!userId || !dbInstance) {
        if (unsubscribeBeans) unsubscribeBeans();
        eventBus.emit('data:beans-updated', []);
        return;
    }

    if (unsubscribeBeans) unsubscribeBeans();

    const beansRef = collection(dbInstance, `users/${userId}/beans`);
    const q = query(beansRef, orderBy("purchaseDate", "desc"));
    
    unsubscribeBeans = onSnapshot(q, (querySnapshot) => {
        const beans = [];
        querySnapshot.forEach((doc) => {
            beans.push({ id: doc.id, ...doc.data() });
        });
        eventBus.emit('data:beans-updated', beans);
    }, (error) => {
        console.error("beanService: Error listening to beans data:", error);
        eventBus.emit('ui:show-toast', { message: t('beanStockFetchFailed'), type: "error" });
        eventBus.emit('data:beans-updated', []);
    });
}

/**
 * ログイン/ログアウトを監視して、生豆データのリッスンを開始/停止します。
 */
export function initializeBeanService(db) {
    dbInstance = db;
    eventBus.on('auth:state-changed', (user) => {
        listenToBeans();
    });
    console.log("✅ BeanService initialized and listening for auth changes.");
}


// --- データ操作関数 ---

export async function addBean(beanData) {
    const userId = currentUserId();
    if (!userId) { console.error("beanService: User not logged in."); return null; }
    return await FirestoreService.addBean(beanData);
}

export async function updateBean(beanId, beanData) {
    const userId = currentUserId();
    if (!userId) { console.error("beanService: User not logged in."); return false; }
    return await FirestoreService.updateBean(beanId, beanData);
}

export async function deleteBean(beanId) {
    const userId = currentUserId();
    if (!userId) {
        console.error("beanService: User not logged in.");
        return false;
    }
    return await FirestoreService.deleteBean(beanId);
}

export async function addRoastAndUpdateStock(roastData, beanId, usedAmount) {
    const userId = currentUserId();
    if (!userId || !beanId || !usedAmount) {
        console.error("beanService: Invalid data for stock update.");
        return null;
    }
    const roastRef = doc(collection(db, `users/${userId}/roasts`));
    const beanRef = doc(db, `users/${userId}/beans`, beanId);
    try {
        const batch = writeBatch(db);
        batch.set(roastRef, { ...roastData, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
        batch.update(beanRef, { remainingAmount: increment(-usedAmount), updatedAt: serverTimestamp() });
        await batch.commit();
        return roastRef.id;
    } catch (e) { console.error("Error in batched write for roast and stock update: ", e); return null; }
}

// =======================================================
// ▼▼▼ この関数が追加されました (課題対応) ▼▼▼
// =======================================================
/**
 * 指定された豆の在庫量を増減させます。（バッチ処理用）
 * @param {import("firebase/firestore").WriteBatch} batch - Firestoreのバッチオブジェクト
 * @param {string} beanId - 対象の生豆ID
 * @param {number} amount - 在庫の変動量。増やす場合は正、減らす場合は負の数。
 */
export function batchUpdateBeanStock(batch, beanId, amount) {
    const userId = currentUserId();
    if (!userId || !beanId || !amount || typeof amount !== 'number') {
        console.error("beanService: Invalid data for batch stock update.", { userId, beanId, amount });
        return;
    }
    const beanRef = doc(db, `users/${userId}/beans`, beanId);
    batch.update(beanRef, {
        remainingAmount: increment(amount),
        updatedAt: serverTimestamp()
    });
}
// =======================================================
// ▲▲▲ 追加完了 ▲▲▲
// =======================================================