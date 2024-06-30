import { CellsChangedListener, Environment, FunctionsMap } from './environment';
import EventEmitter, { Listener } from './event-emitter';
import { CellContent, CellPosition, CellValue, SpreadsheetFunctionDefinition } from './types';

// Currently Spreadsheet has only one supported listener type.
export type SpreadsheetListenerType = 'cellsChanged';

export type SpreadsheetOptions = {
    cells?: Map<CellPosition, CellContent>,
    functions?: FunctionsMap | { [key: string]: SpreadsheetFunctionDefinition },
    onCellsChanged?: CellsChangedListener,
}

export class Spreadsheet {
    private _eventEmitter: EventEmitter<SpreadsheetListenerType>;
    private _environment: Environment;

    constructor({ cells = new Map(), functions = new Map(), onCellsChanged }: SpreadsheetOptions = {}) {
        this._eventEmitter = new EventEmitter<SpreadsheetListenerType>();

        const handleCellsChanged: CellsChangedListener = (cells, { originatingCell }) => {
            if (onCellsChanged !== undefined)
                onCellsChanged(cells, { originatingCell });

            this._eventEmitter.emit('cellsChanged', cells, { originatingCell });
        }

        this._environment = new Environment({
            cells: cells instanceof Map ? cells : new Map(Object.entries(cells)),
            functions: functions instanceof Map ? functions : new Map(Object.entries(functions)),
            onCellsChanged: handleCellsChanged
        });
    }

    addListener(type: SpreadsheetListenerType, listener: Listener): void {
        if (type !== 'cellsChanged')
            throw new Error(`Event type '${type} does not exist on Spreadsheet.'`);

        this._eventEmitter.addListener(type, listener);
    }

    removeListener(type: SpreadsheetListenerType, listener: Listener): void {
        if (type !== 'cellsChanged')
            throw new Error(`Event type '${type} does not exist on Spreadsheet.'`);
        
        this._eventEmitter.removeListener(type, listener);
    }

    getText(position: CellPosition): string {
        return this._environment.getText(position);
    }

    setText(position: CellPosition, text: CellContent): void {
        this._environment.setText(position, text);
    }

    getValue(position: CellPosition): CellValue {
        return this._environment.getValue(position);
    }

    evaluateQuery(expression: string): CellValue {
        return this._environment.evaluateQuery(expression);
    }

    cells(): IterableIterator<[string, CellContent]> {
        return this._environment.cells();
    }
}