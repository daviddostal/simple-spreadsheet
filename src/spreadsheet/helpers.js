export function positionsInRange(from, to) {
    const positions = [];
    for (let col of _range(stringToColIndex(from.col), stringToColIndex(to.col)))
        for (let row of _range(from.row, to.row))
            positions.push({ col: colIndexToString(col), row: row });
    return positions;
}

function _range(from, to) {
    return from <= to
        ? Array.from({ length: to - from + 1 }, (_, i) => i + from)
        : Array.from({ length: from - to + 1 }, (_, i) => from - i);
}

export function parsePosition(position) {
    const positionParts = position.match(/^([A-Za-z]+)(\d+)$/);
    return positionParts &&
        { col: positionParts[1], row: parseInt(positionParts[2]) };
}

export function makePosition(col, row) {
    return `${col}${row}`;
}

export function colIndexToString(colNumber) {
    return String.fromCharCode('A'.charCodeAt() + colNumber);
}

export function stringToColIndex(colString) {
    return colString.charCodeAt(0) - 'A'.charCodeAt();
}

export function rowIndexToString(rowNumber) {
    return (rowNumber + 1).toString();
}

export function stringToRowIndex(rowString) {
    return parseInt(rowString) - 1;
}
