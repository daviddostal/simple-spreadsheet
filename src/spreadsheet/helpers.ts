import { CellPosition } from './types';

export type ParsedCellPosition = { col: string, row: number };

export function positionsInRange(from: CellPosition, to: CellPosition) {
    const { row: fromRow, col: fromCol } = parsePosition(from);
    const { row: toRow, col: toCol } = parsePosition(to);

    const positions = [];
    for (const row of _range(fromRow, toRow))
        for (const col of _range(stringToColIndex(fromCol), stringToColIndex(toCol)))
            positions.push(makePosition(colIndexToString(col), row))

    return positions;
}

function _range(from: number, to: number): number[] {
    return from <= to
        ? Array.from({ length: to - from + 1 }, (_, i) => i + from)
        : Array.from({ length: from - to + 1 }, (_, i) => from - i);
}

export function parsePosition(position: CellPosition): ParsedCellPosition {
    const parsedPosition = tryParsePosition(position);
    if (parsedPosition === null)
        throw new Error(`'position' must be at least one lower- or uppercase letter A-Z followed by at least one digit.`);
    return parsedPosition;
}

export function tryParsePosition(position: CellPosition): ParsedCellPosition | null {
    const positionParts = position.match(/^([A-Za-z]+)(\d+)$/);
    return positionParts &&
        { col: positionParts[1], row: parseInt(positionParts[2]) };
}

export function makePosition(col: string, row: number): CellPosition {
    return `${col}${row}`;
}

export function colIndexToString(colNumber: unknown): string {
    if (typeof (colNumber) !== 'number')
        throw new Error(`"colNumber" must be a number, got ${typeof (colNumber)}`);

    if (colNumber < 0 || !Number.isInteger(colNumber))
        throw new Error(`Invalid column index ${colNumber}, positive integer required`);

    const base = 'Z'.charCodeAt(0) - 'A'.charCodeAt(0) + 1;

    let colString = '';
    let remainingColNumber = colNumber;
    while (remainingColNumber >= 0) {
        const currentChar = String.fromCharCode('A'.charCodeAt(0) + (remainingColNumber % base));
        colString = currentChar + colString;
        remainingColNumber = Math.floor(remainingColNumber / base) - 1;
    }

    return colString;
}

export function stringToColIndex(colString: unknown): number {
    if (typeof (colString) !== 'string')
        throw new Error(`"colString" must be a string, got ${typeof (colString)}`);

    const base = 'Z'.charCodeAt(0) - 'A'.charCodeAt(0) + 1;

    let result = 0;
    for (const char of colString) {
        const charIndex = char.charCodeAt(0) - 'A'.charCodeAt(0);
        
        if (charIndex < 0 || charIndex >= base)
            throw new Error(`Invalid character "${char}" in column name "${colString}", only A-Z are allowed`);

        result *= base;
        result += charIndex + 1;
    }

    return result - 1;
}

export function rowIndexToString(rowNumber: number): string {
    return (rowNumber + 1).toString();
}

export function stringToRowIndex(rowString: string): number {
    return parseInt(rowString) - 1;
}
