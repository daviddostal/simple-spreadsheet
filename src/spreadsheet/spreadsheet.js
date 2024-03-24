import { Environment } from './environment.js';

export class Spreadsheet {
    constructor({
        cells = new Map(),
        functions = new Map(),
        onCellsChanged = (() => { })
    } = {}) {
        this._environment = new Environment({
            cells: cells instanceof Map ? cells : new Map(Object.entries(cells)),
            functions: functions instanceof Map ? functions : new Map(Object.entries(functions)),
            onCellsChanged
        });
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