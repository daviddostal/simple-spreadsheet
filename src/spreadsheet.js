import { Environment } from './environment';
import { builtinFunctions } from './functions';
import * as Helpers from './helpers';
export { Helpers };
export { SpreadsheetError, RuntimeError, ParsingError } from './errors';
export { builtinFunctions };

export class Spreadsheet {
    constructor(cells = {}, functions = builtinFunctions) {
        this.cells = cells;
        this._environment = new Environment(this.cells, functions);
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