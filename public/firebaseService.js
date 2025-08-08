import { firebaseConfig, recaptchaSiteKey } from './firebaseConfig.js'; 
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app-check.js";
import {
    getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, sendPasswordResetEmail, signOut,
    connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore, collection, addDoc, doc, updateDoc, deleteDoc,
    onSnapshot, query, orderBy, serverTimestamp, connectFirestoreEmulator
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";
import { eventBus } from './EventBus.js';

let app;
let auth;
export let db;
export let functions;
let currentUserIdInternal = null;
let unsubscribes = [];
let beansCache = new Map();

export function getCurrentUser() { return auth ? auth.currentUser : null; }
export function currentUserId() { return currentUserIdInternal; }

function listenToAllData(userId) {
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];
    beansCache.clear();
    const beansRef = collection(db, `users/${userId}/beans`);
    const roastsRef = collection(db, `users/${userId}/roasts`);
    const unsubBeans = onSnapshot(beansRef, (beanSnapshot) => {
        beansCache.clear();
        beanSnapshot.forEach(doc => {
            beansCache.set(doc.id, { ...doc.data(), id: doc.id });
        });
        eventBus.emit('beans:updated-for-roast-form', Array.from(beansCache.values()));

        if (unsubscribes.length < 2) {
            const roastsQuery = query(roastsRef, orderBy("roastDate", "desc"), orderBy("createdAt", "desc"));
            const unsubRoasts = onSnapshot(roastsQuery, (roastSnapshot) => {
                const roasts = roastSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const joinedData = roasts.map(roast => {
                    const beanData = beansCache.get(roast.beanId) || {};
                    return { ...roast, beanName: beanData.beanName || '紐付けられた豆がありません' };
                });
                eventBus.emit('data:roasts-updated', joinedData);
            });
            unsubscribes.push(unsubRoasts);
        }
    }, (error) => {
        console.error("Bean data listening error:", error);
    });
    unsubscribes.push(unsubBeans);
}

export function initializeFirebase() {
    try {
        if (app) return;
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        functions = getFunctions(app);

        if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
            try {
                const appCheck = initializeAppCheck(app, {
                    provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                    isTokenAutoRefreshEnabled: true
                });
                console.log("✅ Firebase App Check initialization SUCCESSFUL.", appCheck);
            } catch (error) {
                console.error("❌ Firebase App Check initialization FAILED:", error);
            }
        }
        
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
            connectFirestoreEmulator(db, 'localhost', 8080);
        }

        onAuthStateChanged(auth, (user) => {
            currentUserIdInternal = user ? user.uid : null;
            eventBus.emit('auth:state-changed', user);
            if (user) {
                listenToAllData(user.uid);
            } else {
                unsubscribes.forEach(unsub => unsub());
                unsubscribes = [];
                beansCache.clear();
                eventBus.emit('data:roasts-updated', []);
                eventBus.emit('beans:updated-for-roast-form', []);
            }
        });
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
}

// --- Auth ---
export async function signUpWithEmailAndPassword(email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error) {
        return { user: null, error: error };
    }
}

export async function signInUserWithEmailPassword(email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error) {
        return { user: null, error: error };
    }
}

export function firebaseSignOut() {
    return signOut(auth);
}

// --- Roasts ---
export function addRoastRecord(data) {
    if (!currentUserIdInternal) return Promise.reject(new Error("User not logged in."));
    const dataToSave = { ...data, createdAt: serverTimestamp(), updatedAt: serverTimestamp() };
    return addDoc(collection(db, `users/${currentUserIdInternal}/roasts`), dataToSave);
}

export function updateRoastRecord(docId, data) {
    if (!currentUserIdInternal) return Promise.reject(new Error("User not logged in."));
    const roastDocRef = doc(db, `users/${currentUserIdInternal}/roasts`, docId);
    return updateDoc(roastDocRef, { ...data, updatedAt: serverTimestamp() });
}

export async function deleteRoastRecord(docId) {
    if (!currentUserIdInternal) {
        console.error("deleteRoastRecord: User not logged in.");
        return false;
    }
    try {
        const roastDocRef = doc(db, `users/${currentUserIdInternal}/roasts`, docId);
        await deleteDoc(roastDocRef);
        return true;
    } catch (error) {
        console.error("FirebaseService: Error deleting roast record:", error);
        return false;
    }
}

export async function updateFavoriteStatus(docId, isFavorite) {
    if (!currentUserIdInternal) return Promise.reject(new Error("User not logged in."));
    const roastDocRef = doc(db, `users/${currentUserIdInternal}/roasts`, docId);
    try {
        await updateDoc(roastDocRef, { isFavorite: isFavorite });
        return { success: true };
    } catch (error) {
        console.error("Error updating favorite status:", error);
        return { success: false, error: error };
    }
}

// --- Beans ---
export async function addBean(beanData) {
    if (!currentUserIdInternal) return null;
    try {
        const docRef = await addDoc(collection(db, `users/${currentUserIdInternal}/beans`), { ...beanData, createdAt: serverTimestamp() });
        return docRef.id;
    } catch (e) {
        console.error("FirebaseService: Error adding bean:", e);
        return null;
    }
}

export async function updateBean(beanId, beanData) {
    if (!currentUserIdInternal) return null;
    try {
        const beanDocRef = doc(db, `users/${currentUserIdInternal}/beans`, beanId);
        await updateDoc(beanDocRef, { ...beanData, updatedAt: serverTimestamp() });
        return true;
    } catch (e) {
        console.error("FirebaseService: Error updating bean:", e);
        return false;
    }
}

export async function deleteBean(beanId) {
    if (!currentUserIdInternal) return null;
    try {
        const beanDocRef = doc(db, `users/${currentUserIdInternal}/beans`, beanId);
        await deleteDoc(beanDocRef);
        return true;
    } catch (e) {
        console.error("FirebaseService: Error deleting bean:", e);
        return false;
    }
}

// --- Gemini API ---
export async function getRoastAnalysisFromAI(roastPlan) {
    if (!auth.currentUser) {
        throw new Error("認証が必要です。");
    }
    const getAnalysis = httpsCallable(functions, 'getRoastAnalysis');
    try {
        const result = await getAnalysis(roastPlan);
        return result.data;
    } catch (error) {
        console.error("Function call failed:", error);
        throw new Error(error.message || "AIとの通信中に不明なエラーが発生しました。");
    }
}