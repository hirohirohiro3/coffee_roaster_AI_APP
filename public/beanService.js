import {
    collection, addDoc, doc, updateDoc, onSnapshot, query,
    orderBy, serverTimestamp, writeBatch, increment
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { eventBus } from './EventBus.js';
import * as FirebaseService from './firebaseService.js';

let unsubscribeBeans = null;

/**
 * Firestoreの生豆データの変更をリッスンし、更新があればイベントを発行します。
 */
function listenToBeans() {
    const userId = FirebaseService.currentUserId();
    if (!userId) {
        if (unsubscribeBeans) unsubscribeBeans();
        eventBus.emit('data:beans-updated', []);
        return;
    }

    if (unsubscribeBeans) unsubscribeBeans();

    const beansRef = collection(FirebaseService.db, `users/${userId}/beans`);
    const q = query(beansRef, orderBy("purchaseDate", "desc"));
    
    unsubscribeBeans = onSnapshot(q, (querySnapshot) => {
        const beans = [];
        querySnapshot.forEach((doc) => {
            beans.push({ id: doc.id, ...doc.data() });
        });
        eventBus.emit('data:beans-updated', beans);
    }, (error) => {
        console.error("beanService: Error listening to beans data:", error);
        eventBus.emit('ui:show-toast', { message: "生豆の在庫データの取得に失敗しました。", type: "error" });
        eventBus.emit('data:beans-updated', []);
    });
}

/**
 * ログイン/ログアウトを監視して、生豆データのリッスンを開始/停止します。
 */
export function initializeBeanService() {
    eventBus.on('auth:state-changed', (user) => {
        listenToBeans();
    });
    console.log("✅ BeanService initialized and listening for auth changes.");
}


// --- データ操作関数 ---

export async function addBean(beanData) {
    const userId = FirebaseService.currentUserId();
    if (!userId) { console.error("beanService: User not logged in."); return null; }
    return await FirebaseService.addBean(beanData);
}

export async function updateBean(beanId, beanData) {
    const userId = FirebaseService.currentUserId();
    if (!userId) { console.error("beanService: User not logged in."); return false; }
    return await FirebaseService.updateBean(beanId, beanData);
}

export async function deleteBean(beanId) {
    const userId = FirebaseService.currentUserId();
    if (!userId) {
        console.error("beanService: User not logged in.");
        return false;
    }
    return await FirebaseService.deleteBean(beanId);
}

export async function addRoastAndUpdateStock(roastData, beanId, usedAmount) {
    const userId = FirebaseService.currentUserId();
    if (!userId || !beanId || !usedAmount) {
        console.error("beanService: Invalid data for stock update.");
        return null;
    }
    const roastRef = doc(collection(FirebaseService.db, `users/${userId}/roasts`));
    const beanRef = doc(FirebaseService.db, `users/${userId}/beans`, beanId);
    try {
        const batch = writeBatch(FirebaseService.db);
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
    const userId = FirebaseService.currentUserId();
    if (!userId || !beanId || !amount || typeof amount !== 'number') {
        console.error("beanService: Invalid data for batch stock update.", { userId, beanId, amount });
        return;
    }
    const beanRef = doc(FirebaseService.db, `users/${userId}/beans`, beanId);
    batch.update(beanRef, {
        remainingAmount: increment(amount),
        updatedAt: serverTimestamp()
    });
}
// =======================================================
// ▲▲▲ 追加完了 ▲▲▲
// =======================================================