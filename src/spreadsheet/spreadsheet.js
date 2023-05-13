import { Environment } from './environment.js';
import * as Helpers from './helpers.js';
export { Helpers };
export * from './errors.js';

export class Spreadsheet {
    constructor(cells = new Map(), functions = new Map(), onCellsChanged = (() => { })) {
        this.cells = cells instanceof Map ? cells : new Map(Object.entries(cells));
        this.functions = functions instanceof Map ? functions : new Map(Object.entries(functions));
        this._environment = new Environment(this.cells, this.functions, onCellsChanged);
    }

    text(position) {
        return this._environment.getText(position);
    }

    set(position, text) {
        this._environment.setText(position, text);
    }

    value(position) {
        return this._environment.getValue(position);
    }

    query(expression) {
        return this._environment.evaluateQuery(expression);
    }
}