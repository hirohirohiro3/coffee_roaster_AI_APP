import {
    collection, addDoc, doc, updateDoc, deleteDoc, getDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";
import { t } from '../modules/core/i18n.js';

// --- Roasts ---
export function addRoastRecord(db, userId, data) {
    if (!userId) return Promise.reject(new Error("User not logged in."));
    const dataToSave = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    return addDoc(collection(db, `users/${userId}/roasts`), dataToSave);
}

export function updateRoastRecord(db, userId, docId, data) {
    if (!userId) return Promise.reject(new Error("User not logged in."));
    const roastDocRef = doc(db, `users/${userId}/roasts`, docId);
    return updateDoc(roastDocRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteRoastRecord(db, userId, docId) {
    if (!userId) {
        console.error("deleteRoastRecord: User not logged in.");
        return false;
    }
    try {
        const roastDocRef = doc(db, `users/${userId}/roasts`, docId);
        await deleteDoc(roastDocRef);
        return true;
    } catch (error) {
        console.error("FirestoreService: Error deleting roast record:", error);
        return false;
    }
}

export async function getRoastRecord(db, userId, docId) {
    if (!userId) return null;
    try {
        const roastDocRef = doc(db, `users/${userId}/roasts`, docId);
        const roastDoc = await getDoc(roastDocRef);
        if (roastDoc.exists()) {
            return { id: roastDoc.id, ...roastDoc.data() };
        } else {
            console.warn(`Roast record with id ${docId} not found.`);
            return null;
        }
    } catch (error) {
        console.error("FirestoreService: Error getting roast record:", error);
        return null;
    }
}

export async function updateFavoriteStatus(db, userId, docId, isFavorite) {
    if (!userId) return Promise.reject(new Error("User not logged in."));
    const roastDocRef = doc(db, `users/${userId}/roasts`, docId);
    try {
        await updateDoc(roastDocRef, { isFavorite: isFavorite });
        return { success: true };
    } catch (error) {
        console.error("Error updating favorite status:", error);
        return { success: false, error: error };
    }
}

// --- Beans ---
export async function addBean(db, userId, beanData) {
    if (!userId) return null;
    try {
        const docRef = await addDoc(collection(db, `users/${userId}/beans`), { ...beanData, createdAt: serverTimestamp() });
        return docRef.id;
    } catch (e) {
        console.error("FirestoreService: Error adding bean:", e);
        return null;
    }
}

export async function updateBean(db, userId, beanId, beanData) {
    if (!userId) return null;
    try {
        const beanDocRef = doc(db, `users/${userId}/beans`, beanId);
        await updateDoc(beanDocRef, { ...beanData, updatedAt: serverTimestamp() });
        return true;
    } catch (e) {
        console.error("FirestoreService: Error updating bean:", e);
        return false;
    }
}

export async function deleteBean(db, userId, beanId) {
    if (!userId) return null;
    try {
        const beanDocRef = doc(db, `users/${userId}/beans`, beanId);
        await deleteDoc(beanDocRef);
        return true;
    } catch (e) {
        console.error("FirestoreService: Error deleting bean:", e);
        return false;
    }
}

// --- Gemini API ---
export async function getRoastAnalysisFromAI(auth, functions, roastPlan) {
    if (!auth.currentUser) {
        throw new Error(t('firebase.authRequired'));
    }
    const getAnalysis = httpsCallable(functions, 'getRoastAnalysis');
    try {
        const result = await getAnalysis(roastPlan);
        return result.data;
    } catch (error) {
        console.error("Function call failed:", error);
        throw new Error(error.message || t('firebase.ai.commError'));
    }
}
