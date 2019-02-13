import Tokenizer from './tokenizer';
import Parser from './parser';
import Environment from './environment';
import Evaluator from './evaluator';

export class Spreadsheet {
    constructor(cells = {}) {
        this._parser = new Parser(new Tokenizer());
        this._evaluator = new Evaluator();

        this.cells = cells;
        this.expressions = this._mapValues(cells, cell => this._parser.parse(cell));
        this._environment = new Environment(this.expressions, {
            SUM: (...values) => values.flat().reduce((a, b) => a + b, 0),
            AVERAGE: (...values) => values.flat().reduce((a, b) => a + b, 0) / values.flat().length,
        });
    }

    text(position) {
        return this.cells[position] === undefined ? "" : this.cells[position];
    }

    value(position) {
        return this._evaluator.evaluateCell(this._expression(position), this._environment);
    }

    _expression(position) {
        return this._parser.parse(this.text(position));
    }

    _mapValues(obj, fn) {
        const result = {};
        for (let prop in obj) {
            result[prop] = fn(obj[prop]);
        }
        return result;
    }
}