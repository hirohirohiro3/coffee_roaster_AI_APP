// firebaseService.js (各認証関数の先頭でauthオブジェクトの状態をログ出力する版)

// 1. 必要なFirebaseモジュールをインポート
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import {
    getFirestore,
    collection,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    onSnapshot,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// 2. Firebase設定情報
const firebaseConfig = {
    apiKey: "AIzaSyDQiGrfF00jke9TDa1U_upnH5ucpBmK0dw",
    authDomain: "coffee-roast-log.firebaseapp.com",
    projectId: "coffee-roast-log",
    storageBucket: "coffee-roast-log.firebasestorage.app",
    messagingSenderId: "434122863622",
    appId: "1:434122863622:web:0582ac8061ae5bcd2fbf87",
    measurementId: "G-DEXHN4KC9J"
};

// 3. Firebaseアプリ、Auth、Firestoreインスタンスのグローバル変数
let app;
let auth; // ★ この変数の状態が問題
let db;
let currentUserIdInternal = null;
let unsubscribeRoasts = null;

// 4. main.js から渡されるコールバック関数を保持する変数
let mainOnAuthStateChangedCallback;
let mainOnDataUpdateCallback;
let mainShowToastCallback;

// 5. 現在のユーザーIDをエクスポートする関数
export function currentUserId() {
    return currentUserIdInternal;
}

// 6. 焙煎記録のリアルタイムリスナー関数
function listenToRoasts(userId) {
    console.log(`firebaseService: listenToRoasts for userId: ${userId}`);
    if (!db) {
        console.error("firebaseService: Firestore is not initialized in listenToRoasts.");
        if (mainShowToastCallback) mainShowToastCallback("データベースに接続できません。", "error");
        return;
    }
    if (unsubscribeRoasts) {
        unsubscribeRoasts();
    }
    const roastsRef = collection(db, `users/${userId}/roasts`);
    const q = query(roastsRef, orderBy("roastDate", "desc"));
    unsubscribeRoasts = onSnapshot(q, (querySnapshot) => {
        const roasts = [];
        querySnapshot.forEach((doc) => {
            roasts.push({ id: doc.id, ...doc.data() });
        });
        if (mainOnDataUpdateCallback) {
            mainOnDataUpdateCallback(roasts);
        }
    }, (error) => {
        console.error("firebaseService: Error listening to roast data:", error);
        if (mainShowToastCallback) mainShowToastCallback("焙煎記録の取得に失敗しました。", "error");
        if (mainOnDataUpdateCallback) {
            mainOnDataUpdateCallback([]);
        }
    });
}

// 7. Firebase初期化関数
export function initializeFirebase(onAuthStateChangedCb, onDataUpdateCb, showToastCb) {
    console.log("firebaseService: initializeFirebase function called.");
    try {
        if (!app) {
            app = initializeApp(firebaseConfig);
            auth = getAuth(app); // ★ ここで auth が初期化される
            db = getFirestore(app);
            console.log("firebaseService: Firebase App, Auth, Firestore INSTANCES CREATED. Auth object:", auth); // ★ 初期化直後のauthもログ出力

            mainOnAuthStateChangedCallback = onAuthStateChangedCb;
            mainOnDataUpdateCallback = onDataUpdateCb;
            mainShowToastCallback = showToastCb;

            if (auth && mainOnAuthStateChangedCallback) {
                onAuthStateChanged(auth, (user) => {
                    console.log("firebaseService: onAuthStateChanged TRIGGERED. User UID:", user ? user.uid : 'null', "Email:", user ? user.email : 'N/A');
                    currentUserIdInternal = user ? user.uid : null;
                    
                    console.log("firebaseService: Checking mainOnAuthStateChangedCallback. Type is:", typeof mainOnAuthStateChangedCallback);
                    if (typeof mainOnAuthStateChangedCallback === 'function') {
                        console.log("firebaseService: Attempting to call mainOnAuthStateChangedCallback.");
                        try {
                            mainOnAuthStateChangedCallback(user);
                            console.log("firebaseService: Successfully called mainOnAuthStateChangedCallback.");
                        } catch (e) {
                            console.error("firebaseService: Error DURING mainOnAuthStateChangedCallback execution:", e);
                        }
                    } else {
                        console.error("firebaseService: mainOnAuthStateChangedCallback is NOT a function or undefined!");
                    }

                    if (user) {
                        listenToRoasts(user.uid);
                    } else {
                        if (unsubscribeRoasts) {
                            unsubscribeRoasts();
                            unsubscribeRoasts = null;
                        }
                        if (mainOnDataUpdateCallback) {
                             mainOnDataUpdateCallback([]);
                        }
                    }
                });
            } else {
                console.error("firebaseService: Auth instance or onAuthStateChangedCb (mainOnAuthStateChangedCallback) is missing. Cannot register onAuthStateChanged listener.");
            }
        }
    } catch (error) {
        console.error("firebaseService: CRITICAL error during Firebase initialization:", error);
        if (mainShowToastCallback) {
            mainShowToastCallback(`Firebase初期化中に重大なエラー: ${error.message}`, "error");
        }
    }
}

// --- 認証関連の関数 ---

export async function signUpWithEmailPassword(email, password) {
    // ★★★ authオブジェクトの状態を確認するログを追加 ★★★
    console.log(`firebaseService: signUpWithEmailPassword called for email: ${email}. Current auth object:`, auth);
    if (!auth) {
        console.error("firebaseService: Firebase Auth is not initialized in signUpWithEmailPassword.");
        if (mainShowToastCallback) mainShowToastCallback("認証システムエラー。", "error");
        return { user: null, error: { message: "認証システムが初期化されていません。" } };
    }
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("firebaseService: signUpWithEmailPassword successful. User UID:", user.uid, "Email:", user.email);
        if (mainShowToastCallback) mainShowToastCallback("アカウントを登録しました！", "success");
        
        console.log("firebaseService: Sign up successful. Expecting onAuthStateChanged to fire soon with this new user.");
        setTimeout(() => {
            if (auth.currentUser) {
                console.log("firebaseService: DEBUG - auth.currentUser after 100ms in signUp success:", auth.currentUser.uid, auth.currentUser.email);
            } else {
                console.log("firebaseService: DEBUG - auth.currentUser is NULL after 100ms in signUp success.");
            }
        }, 100);

        return { user: user, error: null };
    } catch (error) {
        console.error("firebaseService: signUpWithEmailPassword error:", error.code, error.message);
        if (mainShowToastCallback) mainShowToastCallback(`登録エラー: ${error.message}`, "error");
        return { user: null, error: error };
    }
}

export async function signInUserWithEmailPassword(email, password) {
    // ★★★ authオブジェクトの状態を確認するログを追加 ★★★
    console.log(`firebaseService: signInUserWithEmailPassword called for email: ${email}. Current auth object:`, auth);
    if (!auth) {
        console.error("firebaseService: Firebase Auth is not initialized in signInUserWithEmailPassword.");
        if (mainShowToastCallback) mainShowToastCallback("認証システムエラー。", "error");
        return { user: null, error: { message: "認証システムが初期化されていません。" } };
    }
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        console.log("firebaseService: signInUserWithEmailPassword successful. User UID from credential:", user.uid, "Email:", user.email);
        if (mainShowToastCallback) mainShowToastCallback("ログインしました！", "success");

        console.log("firebaseService: Login successful. Expecting onAuthStateChanged to fire soon with this user.");
        setTimeout(() => {
            if (auth.currentUser) {
                console.log("firebaseService: DEBUG - auth.currentUser after 100ms in signIn success:", auth.currentUser.uid, auth.currentUser.email);
            } else {
                console.log("firebaseService: DEBUG - auth.currentUser is NULL after 100ms in signIn success.");
            }
        }, 100);

        return { user: user, error: null };
    } catch (error) {
        console.error("firebaseService: signInUserWithEmailPassword error:", error.code, error.message);
        if (mainShowToastCallback) mainShowToastCallback(`ログインエラー: ${error.message}`, "error");
        return { user: null, error: error };
    }
}

export async function sendPasswordReset(email) {
    // ★★★ authオブジェクトの状態を確認するログを追加 ★★★
    console.log(`firebaseService: sendPasswordReset called for email: ${email}. Current auth object:`, auth);
    if (!auth) {
        console.error("firebaseService: Firebase Auth is not initialized in sendPasswordReset.");
        if (mainShowToastCallback) mainShowToastCallback("認証システムエラー。", "error");
        return false;
    }
    try {
        await sendPasswordResetEmail(auth, email);
        console.log("firebaseService: Password reset email sent successfully.");
        if (mainShowToastCallback) mainShowToastCallback("パスワードリセットメールを送信しました。メールボックスを確認してください。", "success");
        return true;
    } catch (error) {
        console.error("firebaseService: sendPasswordResetEmail error:", error.code, error.message);
        if (mainShowToastCallback) mainShowToastCallback(`パスワードリセットメール送信エラー: ${error.message}`, "error");
        return false;
    }
}

export function firebaseSignOut(onSuccess, onError) {
    // ★★★ authオブジェクトの状態を確認するログを追加 ★★★
    console.log("firebaseService: firebaseSignOut function called. Current auth object:", auth);
    if (!auth) {
        console.error("firebaseService: Firebase Auth is not initialized in firebaseSignOut.");
        if (onError) onError({ message: "認証システムが初期化されていません。" });
        return;
    }
    signOut(auth).then(() => {
        console.log("firebaseService: signOut(auth) successful.");
        if (mainShowToastCallback) mainShowToastCallback("ログアウトしました。", "info");
        if (onSuccess) onSuccess();
    }).catch((error) => {
        console.error("firebaseService: signOut(auth) error:", error);
        if (mainShowToastCallback) mainShowToastCallback(`ログアウトエラー: ${error.message}`, "error");
        if (onError) onError(error);
    });
}

// --- Firestore CRUD操作の関数 (変更なし) ---
export async function addRoastRecord(data, showToastCallback) { /* ... (No.105と同様) ... */ }
export async function updateRoastRecord(docId, data, showToastCallback) { /* ... (No.105と同様) ... */ }
export async function deleteRoastRecord(docId, showToastCallback) { /* ... (No.105と同様) ... */ }