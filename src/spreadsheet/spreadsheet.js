import { Environment } from './environment.js';
import EventEmitter from './event-emitter.js';

export class Spreadsheet {
    constructor({ cells = new Map(), functions = new Map(), onCellsChanged } = {}) {
        this._eventEmitter = new EventEmitter();

        this._environment = new Environment({
            cells: cells instanceof Map ? cells : new Map(Object.entries(cells)),
            functions: functions instanceof Map ? functions : new Map(Object.entries(functions)),
            onCellsChanged: (cells, { originatingCell }) => {
                if (onCellsChanged !== undefined) onCellsChanged(cells, { originatingCell });
                this._eventEmitter.emit('cellsChanged', cells, { originatingCell });
            }
        });
    }

    addListener(type, listener) {
        if (type !== 'cellsChanged') throw new Error(`Event type '${type} does not exist on Spreadsheet.'`);
        this._eventEmitter.addListener(type, listener);
    }

    removeListener(type, listener) {
        if (type !== 'cellsChanged') throw new Error(`Event type '${type} does not exist on Spreadsheet.'`);
        this._eventEmitter.removeListener(type, listener);
    }

    getText(position) {
        return this._environment.getText(position);
    }

    setText(position, text) {
        this._environment.setText(position, text);
    }

    getValue(position) {
        return this._environment.getValue(position);
    }

    evaluateQuery(expression) {
        return this._environment.evaluateQuery(expression);
    }

    cells() {
        return this._environment.cells();
    }
}