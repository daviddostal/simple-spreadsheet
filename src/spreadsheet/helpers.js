export function positionsInRange(from, to) {
    const positions = [];
    // TODO: Use flatMap?
    for (let col of _range(columnIndex(from.col), columnIndex(to.col)))
        for (let row of _range(from.row, to.row))
            positions.push({ col: columnLetter(col), row: row });
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

export function columnIndex(colLetter) {
    return colLetter.charCodeAt(0) - 65;
}

export function columnLetter(colIndex) {
    return String.fromCharCode(colIndex + 65);
}