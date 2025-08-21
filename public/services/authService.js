import { firebaseConfig, recaptchaSiteKey } from '../firebaseConfig.js';
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
import { eventBus } from '../EventBus.js';
import { t } from '../i18n.js';

let app;
export let auth;
export let db;
export let functions;
let appCheck = null;
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

export function initializeFirebase() {
    try {
        if (app) return;
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        functions = getFunctions(app);

        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
            connectFirestoreEmulator(db, 'localhost', 8080);
            console.log("✅ Using Firebase Emulators.");
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
