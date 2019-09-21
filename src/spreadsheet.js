import { Environment } from './environment';
import { builtinValues } from './builtinValues';
import * as Helpers from './helpers';
export { Helpers };
export { SpreadsheetError, RuntimeError, ParsingError } from './errors';
export { builtinValues };

export class Spreadsheet {
    constructor(cells = {}, globals = builtinValues, cellsChangedListener) {
        this.cells = cells;
        this._environment = new Environment(this.cells, globals, cellsChangedListener);
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