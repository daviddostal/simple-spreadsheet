export type Listener = (..._args: unknown[]) => void;

export default class EventEmitter<TEventType = string> {
    private _listeners: Map<TEventType, Listener[]>;

    constructor() {
        this._listeners = new Map();
    }

    addListener(type: TEventType, listener: Listener) {
        const listenersForType = this._listeners.get(type) ?? [];
        listenersForType.push(listener);
        this._listeners.set(type, listenersForType);
    }

    removeListener(type: TEventType, listener: Listener) {
        const listeners = this._listeners.get(type);
        if (listeners === undefined) {
            return;
        }

        const listenerIndex = listeners.findLastIndex(l => l === listener);
        if (listenerIndex < 0) {
            return;
        }

        listeners.splice(listenerIndex, 1);
    }

    emit(type: TEventType, ...args: unknown[]) {
        const listeners = this._listeners.get(type);
        if (listeners === undefined) return;

        for (const listener of listeners)
            listener(...args);
    }
}