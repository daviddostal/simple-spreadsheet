import { Tokenizer, ParsingError } from './tokenizer';
import Parser from './parser';
import Environment from './environment';
import Evaluator from './evaluator';

export class Spreadsheet {
    constructor(cells = {}) {
        this._parser = new Parser(new Tokenizer());
        this._evaluator = new Evaluator();

        this.cells = cells;

        this.builtinFunctions = {
            SUM: (...values) =>
                values.flat().reduce((a, b) => a + b, 0),
            AVERAGE: (...values) =>
                values.flat().reduce((a, b) => a + b, 0) / values.flat().length,
        };

        const parsedExpressions = this._mapValues(this.cells, cell => {
            try {
                return this._parser.parse(cell);
            } catch (ex) {
                if (ex instanceof ParsingError) return ex;
                else throw ex;
            }
        });
        this.environment = new Environment(parsedExpressions, this.builtinFunctions);
    }

    text(position) {
        return this.cells[position] === undefined ? "" : this.cells[position];
    }

    value(position) {
        return this._evaluator.evaluateCell(this._expression(position), this.environment);
    }

    _expression(position) {
        const value = this.environment.getEntry(position);
        if(value instanceof ParsingError) throw value;
        else return value;
        // const value = this.cells[position] === undefined ? null : this.cells[position];;
        // return this._parser.parse(value);
    }

    _mapValues(obj, fn) {
        const result = {};
        for (let prop in obj) {
            result[prop] = fn(obj[prop]);
        }
        return result;
    }
}