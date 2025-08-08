class EventBus {
    constructor() {
        this.events = {};
        // ★★★ このインスタンス固有のIDを生成 ★★★
        this.instanceId = Math.random().toString(36).substring(2, 9);
        // この初期化ログは一度しか表示されないので、残しておくと便利です
        console.log(`%c--- EventBus INSTANCE CREATED with ID: ${this.instanceId} ---`, 'color: white; background-color: #2c3e50; padding: 2px 5px; border-radius: 3px;');
    }

    on(eventName, listener) {
        if (!this.events[eventName]) {
            this.events[eventName] = [];
        }
        this.events[eventName].push(listener);
    }

    emit(eventName, data) {
        // ▼▼▼ この行をコメントアウトして、イベント発生時のログを無効化 ▼▼▼
        // console.log(`%cEVENT FIRED on [${this.instanceId}]: %c${eventName}`, 'color: #888; font-weight: bold;', 'color: #14a6f0; font-weight: bold;', data);
        
        if (this.events[eventName]) {
            this.events[eventName].forEach(listener => listener(data));
        }
    }

    off(eventName, listenerToRemove) {
        if (!this.events[eventName]) return;
        this.events[eventName] = this.events[eventName].filter(
            listener => listener !== listenerToRemove
        );
    }
}

// exportはシングルトンインスタンスのみ
const eventBus = new EventBus();
export { eventBus };