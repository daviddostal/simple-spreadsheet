import { Environment } from './environment';
import * as Helpers from './helpers';
export { Helpers };
export { SpreadsheetError, RuntimeError, ParsingError } from './errors';
// export { builtinFunctions };

export class Spreadsheet {
    constructor(cells = new Map(), functions = {}, onCellsChanged) {
        // TODO: confirm this.cells are updated
        this.cells = cells instanceof Map ? cells : new Map(Object.entries(cells))
        this._environment = new Environment(this.cells, functions, onCellsChanged);
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