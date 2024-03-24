import { Tokenizer } from './tokenizer.js';
import Parser from './parser.js';
import Evaluator from './evaluator.js';
import { UnknownFunctionError, RuntimeError, ParsingError } from './errors.js';
import ReferencesMap from './referencesMap.js';

export class Environment {
    constructor({ cells = new Map(), functions = new Map(), onCellsChanged = () => {} }) {
        this._cells = cells; // { position => formula text }
        this._functions = functions; // { name => function or lazy function }
        this._onCellsChanged = onCellsChanged;
        this._parser = new Parser(new Tokenizer());
        this._evaluator = new Evaluator();

        this._expressionsCache = new Map(); // { position => expression tree (AST) }
        this._valuesCache = new Map(); // { position => value; }
        this._errorsCache = new Map(); // { position => error; }
        this._referencesMap = new ReferencesMap(); // tracks references between cells
    }

    getText(position) {
        return this._cells.has(position) ? this._cells.get(position).toString() : '';
    }

    setText(position, text) {
        if (this.getText(position) === text) return;

        this._cells.set(position, text);

        // affectedCells also contains `position`
        const affectedCells = this._referencesMap.cellsDependingOn(position);
        for (let pos of affectedCells) {
            this._valuesCache.delete(pos);
            this._errorsCache.delete(pos);
        }

        this._expressionsCache.delete(position);
        this._referencesMap.removeReferencesFrom(position);

        this._onCellsChanged([...affectedCells]);
    }

    getExpression(position) {
        if (this._expressionsCache.has(position))
            return this._expressionsCache.get(position);

        if (this._errorsCache.has(position))
            throw this._errorsCache.get(position);

        const text = this._cells.has(position) ? this._cells.get(position) : null;
        try {
            const { parsed, references } = this._parser.parse(text);
            this._expressionsCache.set(position, parsed);
            this._referencesMap.addReferences(position, references);
            return parsed;
        } catch (ex) {
            if (ex instanceof ParsingError)
                this._errorsCache.set(position, ex);
            throw ex;
        }
    }

    getValue(position) {
        if (this._valuesCache.has(position))
            return this._valuesCache.get(position);

        if (this._errorsCache.has(position))
            throw this._errorsCache.get(position);

        try {
            const result = this._evaluator.evaluateCellAt(position, this.getExpression(position), this);
            this._valuesCache.set(position, result);
            return result;
        } catch (ex) {
            if (ex instanceof RuntimeError)
                this._errorsCache.set(position, ex);
            throw ex;
        }
    }

    evaluateQuery(expression) {
        const { parsed, _ } = this._parser.parse(expression);
        return this._evaluator.evaluateQuery(parsed, this);
    }

    getFunction(name) {
        if (!this._functions.has(name))
            throw new UnknownFunctionError(name);
        return this._functions.get(name);
    }

    cells() {
        return this._cells.entries();
    }
}