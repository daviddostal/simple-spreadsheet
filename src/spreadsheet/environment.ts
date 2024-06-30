import { Tokenizer } from './tokenizer';
import Parser from './parser';
import Evaluator from './evaluator';
import { UnknownFunctionError, RuntimeError, ParsingError, SpreadsheetError } from './errors';
import ReferencesMap from './referencesMap';
import { Expression } from './expressions';
import {
    BasicSpreadsheetFunctionDefinition, CellContent, CellPosition, CellValue,
    LazySpreadsheetFunctionDefinition, SpreadsheetFunctionDefinition
} from './types';

export type FunctionsMap = Map<string, SpreadsheetFunctionDefinition>;
export type CellsChangedListener =
    (cells: CellPosition[], { originatingCell }: { originatingCell: CellPosition }) => void;

export type EnvironmentOptions = {
    cells: Map<CellPosition, CellContent>,
    functions: FunctionsMap,
    onCellsChanged: CellsChangedListener,
}

export class Environment {
    private _cells: Map<CellPosition, CellContent>;
    private _functions: FunctionsMap;
    private _onCellsChanged: CellsChangedListener
    private _parser: Parser;
    private _evaluator: Evaluator;
    private _expressionsCache: Map<CellPosition, Expression>;
    private _valuesCache: Map<CellPosition, CellValue>;
    private _errorsCache: Map<CellPosition, SpreadsheetError>;
    private _referencesMap: ReferencesMap;

    constructor(
        { cells = new Map(), functions = new Map(), onCellsChanged = () => { } }: EnvironmentOptions
    ) {
        this._cells = cells;
        this._functions = functions;
        this._onCellsChanged = onCellsChanged;
        this._parser = new Parser(new Tokenizer());
        this._evaluator = new Evaluator();

        this._expressionsCache = new Map();
        this._valuesCache = new Map();
        this._errorsCache = new Map();
        this._referencesMap = new ReferencesMap(); // tracks references between cells
    }

    getText(position: CellPosition): string {
        const cellContent = this._cells.get(position);
        return (cellContent ?? '').toString();
    }

    setText(position: CellPosition, text: CellContent): void {
        if (this.getText(position) === text) return;

        this._cells.set(position, text);

        // affectedCells also contains `position`
        const affectedCells = this._referencesMap.cellsDependingOn(position);
        for (const pos of affectedCells) {
            this._valuesCache.delete(pos);
            this._errorsCache.delete(pos);
        }

        this._expressionsCache.delete(position);
        this._referencesMap.removeReferencesFrom(position);

        this._onCellsChanged([...affectedCells], { originatingCell: position });
    }

    getExpression(position: CellPosition): Expression {
        if (this._expressionsCache.has(position))
            return this._expressionsCache.get(position)!;

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

    getValue(position: CellPosition): CellValue {
        if (this._valuesCache.has(position))
            return this._valuesCache.get(position);

        if (this._errorsCache.has(position))
            throw this._errorsCache.get(position);

        try {
            const expression = this.getExpression(position);

            const result = this._evaluator.evaluateCellAt(position, expression, this);
            this._valuesCache.set(position, result);
            return result;
        } catch (ex) {
            if (ex instanceof RuntimeError)
                this._errorsCache.set(position, ex);
            throw ex;
        }
    }

    evaluateQuery(expression: string): CellValue {
        const { parsed } = this._parser.parse(expression);
        return this._evaluator.evaluateQuery(parsed, this);
    }

    getFunction(name: string): BasicSpreadsheetFunctionDefinition | LazySpreadsheetFunctionDefinition {
        const func = this._functions.get(name);
        if (func === undefined) throw new UnknownFunctionError(name);

        if (typeof func === 'function' || func.isLazy === undefined)
            return { isLazy: false, function: func };

        return func;
    }

    cells(): IterableIterator<[CellPosition, CellContent]> {
        return this._cells.entries();
    }
}