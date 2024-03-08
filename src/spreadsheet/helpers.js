export function positionsInRange(from, to) {
    const positions = [];
    for (let row of _range(from.row, to.row))
        for (let col of _range(stringToColIndex(from.col), stringToColIndex(to.col)))
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
    if (typeof (colNumber) !== 'number') throw new Error(`"colNumber" must be a number, got ${typeof (colNumber)}`);
    if (colNumber < 0 || !Number.isInteger(colNumber)) throw new Error(`Invalid column index ${colNumber}, positive integer required`);

    const base = 'Z'.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    let colString = '';
    while (colNumber >= 0) {
        const currentChar = String.fromCharCode('A'.charCodeAt() + (colNumber % base));
        colString = currentChar + colString;
        colNumber = Math.floor(colNumber / base) - 1;
    }
    return colString;
}

export function stringToColIndex(colString) {
    if (typeof (colString) !== 'string') throw new Error(`"colString" must be a string, got ${typeof (colNumber)}`);

    const base = 'Z'.charCodeAt() - 'A'.charCodeAt() + 1;
    let result = 0;
    for (let char of colString) {
        const charIndex = char.charCodeAt() - 'A'.charCodeAt();
        if (charIndex < 0 || charIndex >= base) throw new Error(`Invalid character "${char}" in column name "${colString}", only A-Z are allowed`);
        result *= base;
        result += charIndex + 1;
    }
    return result - 1;
}

export function rowIndexToString(rowNumber) {
    return (rowNumber + 1).toString();
}

export function stringToRowIndex(rowString) {
    return parseInt(rowString) - 1;
}
