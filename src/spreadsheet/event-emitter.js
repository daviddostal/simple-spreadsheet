export default class EventEmitter {
  constructor() {
    this._listeners = new Map(); // type => listener[];
  }

  addListener(type, listener) {
    if (!this._listeners.has(type))
      this._listeners.set(type, []);

    this._listeners.get(type).push(listener);
  }

  removeListener(type, listener) {
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

  emit(type, ...args) {
    const listeners = this._listeners.get(type);
    if (listeners === undefined) return;

    for (let listener of listeners)
      listener(...args);
  }
}