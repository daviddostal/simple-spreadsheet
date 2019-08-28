class SpreadsheetError extends Error { }

class ParsingError extends SpreadsheetError {
    constructor(message) { super(message); }
    toString() { return `Syntax error: ${this.message}`; }
}

class RuntimeError extends SpreadsheetError {
    constructor(message) { super(message); }
    toString() { return `Evaluation error: ${this.message}`; }
}

const TokenType = Object.freeze({
    EOF: 'EOF',
    WHITESPACE: 'WHITESPACE',
    PLUS: 'PLUS',
    MINUS: 'MINUS',
    STAR: 'STAR',
    SLASH: 'SLASH',
    LPAREN: 'LPAREN',
    RPAREN: 'RPAREN',
    COLON: 'COLON',
    EQUALS: 'EQUALS',
    COMMA: 'COMMA',
    NUMBER: 'NUMBER',
    STRING: 'STRING',
    IDENTIFIER: 'IDENTIFIER',
});

class Tokenizer {
    constructor() {
        this.rules = {
            // NUMBER and IDENTIFIER are used the most so keep them at the top
            '\\d+(?:\\.\\d+)?': TokenType.NUMBER,
            '[a-zA-Z]\\w+': TokenType.IDENTIFIER,
            '\\s+': TokenType.WHITESPACE,
            '\\+': TokenType.PLUS,
            '-': TokenType.MINUS,
            '\\*': TokenType.STAR,
            '\\/': TokenType.SLASH,
            '\\(': TokenType.LPAREN,
            '\\)': TokenType.RPAREN,
            '=': TokenType.EQUALS,
            ':': TokenType.COLON,
            ',': TokenType.COMMA,
            '\\"(?:[^"\\\\]|\\\\.)*\\"': TokenType.STRING,
            '$': TokenType.EOF,
        };
    }

    begin(str) {
        this.remaining = str;
        return this;
    }

    next() {
        const next = this.peek();
        this.remaining = this.remaining.slice(next.value.length);
        return next;
    }

    peek() {
        for (let rule in this.rules) {
            const match = this.remaining.match(new RegExp('^' + rule));
            if (match !== null) {
                return { type: this.rules[rule], value: match[0] };
            }
        }
        throw new ParsingError(`Unknown token '${this.remaining}'`);
    }

    rest() {
        const rest = this.remaining;
        this.remaining = "";
        return rest;
    }
}

class Expression { }

class Value extends Expression {
    constructor(value) { super(); this.value = value; }
    toString() { return this.value.constructor === String ? `"${this.value}"` : `${this.value}`; }
}

class Reference extends Expression {
    constructor(col, row) { super(); this.col = col; this.row = row; }
    toString() { return `Reference(${this.col}${this.row})`; }
}

class BinaryOp extends Expression {
    constructor(left, op, right) { super(); this.left = left; this.op = op; this.right = right; }
    toString() { return `BinaryOp(${this.left} ${this.op} ${this.right})`; }
}

class UnaryOp extends Expression {
    constructor(op, value) { super(); this.op = op; this.value = value; }
    toString() { return `UnaryOp(${this.op} ${this.value})`; }
}

class FunctionCall extends Expression {
    constructor(functionName, args) { super(); this.functionName = functionName; this.args = args; }
    toString() { return `FunctionCall(${this.functionName}, ${this.args.join(', ')})`; }
}

class Range extends Expression {
    constructor(from, to) { super(); this.from = from; this.to = to; }
    toString() { return `Range(${this.from}, ${this.to})`; }
}

function positionsInRange(from, to) {
    const positions = [];
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

function parseRange(range) {
    const [from, to] = range.split(':');
    return { from: parsePosition(from), to: parsePosition(to) };
}

function makeRange(from, to) {
    return `${from}:${to}`;
}

function parsePosition(position) {
    const positionParts = position.match(/^([A-Za-z]+)(\d+)$/);
    return positionParts === null ? null :
        { col: positionParts[1], row: parseInt(positionParts[2]) };
}

function makePosition(col, row) {
    return `${col}${row}`;
}

function columnIndex(colLetter) {
    return colLetter.charCodeAt(0) - 65;
}

function columnLetter(colIndex) {
    return String.fromCharCode(colIndex + 65);
}

var helpers = /*#__PURE__*/Object.freeze({
    positionsInRange: positionsInRange,
    parseRange: parseRange,
    makeRange: makeRange,
    parsePosition: parsePosition,
    makePosition: makePosition,
    columnIndex: columnIndex,
    columnLetter: columnLetter
});

class Parser {
    constructor(tokenizer) {
        this.tokens = tokenizer;
    }

    parse(text) {
        if (text === null || text === undefined || text.constructor !== String)
            return { parsed: new Value(text), references: [] }; // if there is nothing to parse, return the value.
        this.tokens.begin(text);
        const parsed = this.parseCell();
        return { parsed, references: [...new Set(this._getReferencesIn(parsed))] };
    }

    // Cell => '=' Expression | SimpleValue
    parseCell() {
        if (this.tokens.remaining.startsWith('=')) {
            this._expectAny(TokenType.EQUALS);
            const result = this.parseExpression();
            this._require(TokenType.EOF);
            return result;
        } else {
            return this.parseSimpleValue();
        }
    }

    // SimpleValue => number | text
    parseSimpleValue() {
        const value = this.tokens.rest();
        if (value.match(/^[+-]?\d+(?:\.\d+)?$/)) return new Value(parseFloat(value));
        else return new Value(value);
    }

    // Expression => Term
    parseExpression() {
        return this.parseTerm();
    }

    // Term => Factor ([+-] Factor)*
    parseTerm() {
        let left = this.parseFactor();
        let operation;
        while ((operation = this._expectAny(TokenType.PLUS, TokenType.MINUS)) !== null) {
            left = new BinaryOp(left, operation.value, this.parseFactor());
        }
        return left;
    }

    // Factor => Unary ([*/] Unary)*
    parseFactor() {
        let left = this.parseUnary();
        let operation;
        while ((operation = this._expectAny(TokenType.STAR, TokenType.SLASH)) !== null) {
            left = new BinaryOp(left, operation.value, this.parseUnary());
        }
        return left;
    }

    // Unary => [+-] Unary | Value
    parseUnary() {
        let operation = this._expectAny(TokenType.PLUS, TokenType.MINUS);
        return operation !== null
            ? new UnaryOp(operation.value, this.parseUnary())
            : this.parseValue();
    }

    // Value => Parenthesized | number | string | RangeReference | FunctionCall | Reference
    parseValue() {
        if (this._expectAny(TokenType.LPAREN))
            return this._parseParenthesized();

        const number = this._expectAny(TokenType.NUMBER);
        if (number !== null)
            return this._parseNumber(number);

        const string = this._expectAny(TokenType.STRING);
        if (string !== null)
            return this._parseString(string);


        const identifier = this._require(TokenType.IDENTIFIER);

        if (identifier !== null && this._expectAny(TokenType.COLON))
            return this._parseRangeReference(identifier);

        if (this._expectAny(TokenType.LPAREN))
            return this._parseFunctionCall(identifier);

        return this._parseReference(identifier.value);
    }

    // Parenthesized => ( Expression )
    _parseParenthesized() {
        // ( is already parsed by parseValue
        const contents = this.parseExpression();
        this._require(TokenType.RPAREN);
        return contents;
    }

    _parseNumber(number) {
        return new Value(parseFloat(number.value));
    }

    _parseString(string) {
        const withoutQuotes = string.value.substring(1, string.value.length - 1);
        const escapedString = withoutQuotes.replace(/\\(.)/g, '$1');
        return new Value(escapedString);
    }

    // RangeReference => identifier ':' identifier
    _parseRangeReference(identifier) {
        // start identifier and : are already parsed
        const endIdentifier = this._require(TokenType.IDENTIFIER);
        const from = this._parseReference(identifier.value);
        const to = this._parseReference(endIdentifier.value);
        return new Range(from, to);
    }

    // FunctionCall => identifier ( '(' Arguments ')' )*
    _parseFunctionCall(identifier) {
        // function name identifier is already parsed
        let value = identifier.value;
        do {
            const args = this.parseArguments();
            value = new FunctionCall(value, args);
        } while (this._expectAny(TokenType.LPAREN))
        return value;
    }

    // Reference => [A-Za-z]+\d+
    _parseReference(reference) {
        const position = parsePosition(reference);
        if (position === null)
            throw new ParsingError(`Invalid format of cell reference: ${reference}`);
        return new Reference(position.col, position.row);
    }

    // Arguments => (Expression (',' Expression)*)?
    parseArguments() {
        const args = [];
        while (!this._expectAny(TokenType.RPAREN)) {
            if (args.length != 0)
                this._require(TokenType.COMMA);
            args.push(this.parseExpression());
        }
        return args;
    }

    _expectAny(...types) {
        const current = this._next();
        if (types.includes(current.type)) {
            this.tokens.next();
            return current;
        } else {
            return null;
        }
    }

    _require(type) {
        const next = this._expectAny(type);
        if (next === null)
            throw new ParsingError(`Expected ${type}, got ${this.tokens.peek().type} instead`);
        else
            return next;
    }

    _next() {
        let current = this.tokens.peek();
        while (current.type === TokenType.WHITESPACE) {
            this.tokens.next();
            current = this.tokens.peek();
        }
        return current;
    }

    _getReferencesIn(expression) {
        switch (expression.constructor) {
            case Value:
                return [];
            case Reference:
                return [makePosition(expression.col, expression.row)];
            case UnaryOp:
                return this._getReferencesIn(expression.value);
            case BinaryOp:
                return [...this._getReferencesIn(expression.left), ...this._getReferencesIn(expression.right)];
            case FunctionCall:
                return expression.args.flatMap(arg => this._getReferencesIn(arg));
            case Range:
                return positionsInRange(expression.from, expression.to)
                    .map(pos => makePosition(pos.col, pos.row));
            default:
                throw new ParsingError(`Unknown expression type: ${typeof expression}`);
        }
    }
}

class Evaluator {
    constructor() {
        this._currentCellStack = [];
    }

    evaluateCellAt(position, cell, environment) {
        // TODO: here we could check for cycles in cell references
        // if the stack already contains the position.

        this._currentCellStack.push({ position, references: new Set() });
        const result = this._evaluateCell(cell, environment);
        return result;
        return { result, references: this._currentCellStack.pop().references };
    }

    evaluateQuery(cell, environment) {
        return this._evaluateCell(cell, environment);
    }

    _evaluateCell(cell, environment) {
        switch (cell.constructor) {
            case Value:
                return cell.value;
            case Reference:
                return this._evaluateReference(makePosition(cell.col, cell.row), environment);
            case UnaryOp:
                return this._evaluateUnary(cell.op, cell.value, environment);
            case BinaryOp:
                return this._evaluateBinary(cell.left, cell.op, cell.right, environment);
            case FunctionCall:
                return this._evaluateFunction(cell.functionName, cell.args, environment);
            case Range:
                throw new RuntimeError(`Range references are allowed only as arguments of functions`);
            default:
                throw new RuntimeError(`Unknown expression type: ${typeof cell}`);
        }
    }

    _evaluateReference(position, environment) {
        try {
            const value = environment.getValue(position);
            const currentCell = this._currentCellStack[this._currentCellStack.length - 1];
            if (currentCell)
                currentCell.references.add(position);
            return value;
        } catch (e) {
            if (e instanceof ParsingError)
                throw new RuntimeError(`Error in referenced cell: ${position}`);
            else throw e;
        }
    }

    _evaluateExpression(value, environment) {
        switch (value.constructor) {
            case Range: return this._evaluateRange(value.from, value.to, environment);
            default: return this._evaluateCell(value, environment);
        }
    }

    _evaluateUnary(op, expression, environment) {
        const value = this._evaluateCell(expression, environment);
        switch (op) {
            case '+': return value;
            case '-': return -value;
            default: throw new RuntimeError(`Unknown unary operator: '${op}'`);
        }
    }

    _evaluateBinary(left, op, right, environment) {
        const leftValue = this._evaluateCell(left, environment);
        const rightValue = this._evaluateCell(right, environment);
        switch (op) {
            case '+': return leftValue + rightValue;
            case '-': return leftValue - rightValue;
            case '*': return leftValue * rightValue;
            case '/': return leftValue / rightValue;
            default: throw new RuntimeError(`Unknown binary operator: '${op}'`);
        }
    }

    _evaluateFunction(functionName, args, environment) {
        const argumentValues = args.map(arg => this._evaluateExpression(arg, environment));
        const func = environment.getFunction(functionName);
        try {
            return func(...argumentValues);
        } catch (ex) {
            throw new RuntimeError(`Error in function ${functionName}: ${ex}`);
        }
    }

    _evaluateRange(from, to, environment) {
        return positionsInRange(from, to)
            .map(pos => makePosition(pos.col, pos.row))
            .map(pos => this._evaluateReference(pos, environment));

        const cells = positionsInRange(from, to)
            .map(pos => new Reference(pos.col, pos.row));
        return cells.map(cell => this._evaluateCell(cell, environment));
    }
}

class TwoWayMap {
    constructor() {
        this._nodesFrom = {};
        this._nodesTo = {};
    }

    getFrom(from) { return this._nodesFrom[from]; }
    getTo(to) { return this._nodesTo[to]; }

    addNode(from, to) {
        this._addToNode(this._nodesFrom, from, to);
        this._addToNode(this._nodesTo, to, from);
    }

    removeNode(from, to) {
        this._removeFromNode(this._nodesFrom, from, to);
        this._removeFromNode(this._nodesTo, to, from);
    }

    removeNodesFrom(node) {
        this._removeNodes(this._nodesFrom, this._nodesTo, node);
    }

    removeNodesTo(node) {
        this._removeNodes(this._nodesTo, this._nodesFrom, node);
    }

    traverseIncoming(node, callback) {
        callback(node);
        const sourceNodes = this.getTo(node);
        if (sourceNodes) {
            for (let sourceNode of sourceNodes) {
                this.traverseIncoming(sourceNode, callback);
            }        }
    }

    _addToNode(map, node, value) {
        if (!map[node]) map[node] = [];
        map[node].push(value);
    }

    _removeFromNode(map, node, value) {
        const valueIndex = map[node].indexOf(value);
        if (valueIndex > -1) map[node].splice(valueIndex, 1);
    }

    _removeNodes(targetMap, sourceMap, node) {
        const targetNodes = targetMap[node];
        for (let target of targetNodes) {
            this._removeFromNode(sourceMap, target, node);
        }
        delete targetMap[node];
    }

    toString() {
        if (Object.entries(this._nodesFrom).length === 0 && Object.entries(this._nodesTo).length === 0)
            return "{ }";
        let result = "{\n    ";
        for (let nodeFrom in this._nodesFrom)
            result += `${nodeFrom} => [${this._nodesFrom[nodeFrom].join(', ')}]; `;

        result += "\n    ";
        for (let nodeTo in this._nodesTo)
            result += `${nodeTo} <= [${this._nodesTo[nodeTo].join(', ')}]; `;
        result += "\n}";
        return result;
    }
}

class Environment {
    constructor(cells = {}, builtinFunctions = {}) {
        this.cells = cells;
        this.functions = builtinFunctions;
        this._parser = new Parser(new Tokenizer());
        this._evaluator = new Evaluator();

        this._expressionsCache = {}; // position => expression tree

        this._valuesCache = {}; // position => value;
        this._referencesMap = new TwoWayMap();
    }

    getText(position) {
        return this.cells.hasOwnProperty(position) ? this.cells[position].toString() : "";
    }

    setText(position, value) {
        this.cells[position] = value;
        delete this._expressionsCache[position];
        this._referencesMap.traverseIncoming(position,
            pos => delete this._valuesCache[pos]);

        if (this._referencesMap.getFrom(position))
            this._referencesMap.removeNodesFrom(position);
    }

    getExpression(position) {
        if (this._expressionsCache.hasOwnProperty(position))
            return this._expressionsCache[position];

        const text = this.cells.hasOwnProperty(position) ? this.cells[position] : null;
        const { parsed, references } = this._parser.parse(text);
        this._expressionsCache[position] = parsed;

        for (let reference of references)
            this._referencesMap.addNode(position, reference);

        return parsed;
    }

    getValue(position) {
        if (this._valuesCache.hasOwnProperty(position))
            return this._valuesCache[position];

        const result = this._evaluator.evaluateCellAt(position, this.getExpression(position), this);
        this._valuesCache[position] = result;
        return result;
    }

    evaluateQuery(expression) {
        const { parsed, _ } = this._parser.parse(expression);
        return this._evaluator.evaluateQuery(parsed, this);
    }

    getFunction(name) {
        if (this.functions[name] === undefined)
            throw new RuntimeError(`Unknown function: ${name} is not a function`);
        return this.functions[name];
    }
}

const builtinFunctions = {
    SUM: (...args) => {
        let sum = 0;
        for (let arg of args.flat()) {
            if (typeof (arg) === 'number')
                sum += arg;
            else if (!(arg === null || arg === undefined))
                throw new Error(`${typeof (arg)} is not a valid argument to SUM(). Expected number, number[], null or undefined.`);
        }
        return sum;
    },

    AVERAGE: (...args) => {
        let sum = 0;
        let count = 0;
        for (let arg of args.flat()) {
            if (typeof (arg) === 'number') {
                sum += arg;
                count++;
            } else if (!(arg === null || arg === undefined)) {
                throw new Error(`${typeof (arg)} is not a valid argument to AVERAGE().`);
            }
        }
        return sum / count;
    },
};

class Spreadsheet {
    constructor(cells = {}, functions = builtinFunctions) {
        this.cells = cells;
        this._environment = new Environment(this.cells, functions);
    }

    text(position) {
        return this._environment.getText(position);
    }

    set(position, text) {
        this._environment.setText(position, text);
    }

    value(position) {
        return this._environment.getValue(position);
    }

    query(expression) {
        return this._environment.evaluateQuery(expression);
    }
}

export { helpers as Helpers, ParsingError, RuntimeError, Spreadsheet, SpreadsheetError, builtinFunctions };
//# sourceMappingURL=simple-spreadsheet.mjs.map
