import { Environment } from './environment';
export { RuntimeError } from './environment';
export { ParsingError } from './tokenizer';

export class Spreadsheet {
    constructor(cells = {}) {
        this.cells = cells;

        this.builtinFunctions = {
            SUM: (...values) => values.flat().reduce((a, b) => a + b, 0),
            AVERAGE: (...values) => values.flat().reduce((a, b) => a + b, 0) / values.flat().length,
        };

        this.environment = new Environment(cells, this.builtinFunctions);
    }

    text(position) {
        return this.environment.getText(position);
    }

    value(position) {
        return this.environment.getValue(position);
    }
}