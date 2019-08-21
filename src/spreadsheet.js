import { Environment } from './environment';
import { builtinFunctions } from './functions';
import * as Helpers from './helpers';
export { Helpers };
export { SpreadsheetError, RuntimeError, ParsingError } from './errors';
export { builtinFunctions };

export class Spreadsheet {
    constructor(cells = {}, functions = builtinFunctions) {
        this.cells = cells;
        this.builtinFunctions = functions;
        this.environment = new Environment(this.cells, this.builtinFunctions);
    }

    text(position) {
        return this.environment.getText(position);
    }

    set(position, text) {
        this.environment.setText(position, text);
    }

    value(position) {
        return this.environment.getValue(position);
    }

    query(expression) {
        return this.environment.evaluateExpression(expression);
    }
}