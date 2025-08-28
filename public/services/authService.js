import { firebaseConfig, recaptchaSiteKey } from './firebaseConfig.js';
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app-check.js";
import {
    getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
    signInWithEmailAndPassword, sendPasswordResetEmail, signOut,
    connectAuthEmulator
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore, collection, onSnapshot, query, orderBy, connectFirestoreEmulator
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import { getFunctions } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-functions.js";
import { eventBus } from '../modules/core/EventBus.js';
import { t } from '../modules/core/i18n.js';

let app;
let currentUserIdInternal = null;
let unsubscribes = [];
let beansCache = new Map();

export function getCurrentUser(auth) { return auth ? auth.currentUser : null; }
export function currentUserId() { return currentUserIdInternal; }

export function listenToAllData(userId, db, { collection, onSnapshot, query, orderBy }) {
    currentUserIdInternal = userId;
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
        eventBus.emit('data:beans-updated', Array.from(beansCache.values()));

        if (unsubscribes.length < 2) {
            const roastsQuery = query(roastsRef, orderBy("roastDate", "desc"), orderBy("createdAt", "desc"));
            const unsubRoasts = onSnapshot(roastsQuery, (roastSnapshot) => {
                const roasts = roastSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                const joinedData = roasts.map(roast => {
                    const beanData = beansCache.get(roast.beanId) || {};
                    return { ...roast, beanName: beanData.beanName || t('text.unlinkedBean') };
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

export function clearAllDataListeners() {
    currentUserIdInternal = null;
    unsubscribes.forEach(unsub => unsub());
    unsubscribes = [];
    beansCache.clear();
    eventBus.emit('data:roasts-updated', []);
    eventBus.emit('beans:updated-for-roast-form', []);
}

let firebaseServices = null;

export function initializeFirebase() {
    return new Promise((resolve, reject) => {
        if (firebaseServices) {
            resolve(firebaseServices);
            return;
        }
        try {
            app = initializeApp(firebaseConfig);
            const auth = getAuth(app);
            const db = getFirestore(app);
            const functions = getFunctions(app);

            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
                connectFirestoreEmulator(db, 'localhost', 8081);
                console.log("✅ Using Firebase Emulators on Auth:9099 and Firestore:8081.");
            } else {
                try {
                    initializeAppCheck(app, {
                        provider: new ReCaptchaV3Provider(recaptchaSiteKey),
                        isTokenAutoRefreshEnabled: true
                    });
                    console.log("✅ Firebase App Check initialization SUCCESSFUL.");
                } catch (error) {
                    console.error("❌ Firebase App Check initialization FAILED:", error);
                }
            }

            firebaseServices = { auth, db, functions, collection, onSnapshot, query, orderBy };
            console.log("✅ Firebase Core services initialized.");
            resolve(firebaseServices);
        } catch (error) {
            console.error("❌ Firebase initialization error:", error);
            reject(error);
        }
    });
}

export async function signUpWithEmailAndPassword(auth, email, password) {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error) {
        return { user: null, error: error };
    }
}

export async function signInUserWithEmailPassword(auth, email, password) {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        return { user: userCredential.user, error: null };
    } catch (error) {
        return { user: null, error: error };
    }
}

export function firebaseSignOut(auth) {
    return signOut(auth);
}
