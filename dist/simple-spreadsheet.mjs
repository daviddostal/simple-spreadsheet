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
            return new Value(text); // if there is nothing to parse, return the value.

        this.tokens.begin(text);
        const result = this.parseCell();
        return result;
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
}

class Evaluator {
    evaluateCell(cell, environment) {
        switch (cell.constructor) {
            case Value:
                return cell.value;
            case Reference:
                return this.evaluateReference(makePosition(cell.col, cell.row), environment);
            case UnaryOp:
                return this.evaluateUnary(cell.op, cell.value, environment);
            case BinaryOp:
                return this.evaluateBinary(cell.left, cell.op, cell.right, environment);
            case FunctionCall:
                return this.evaluateFunction(cell.functionName, cell.args, environment);
            case Range:
                throw new RuntimeError(`Range references are allowed only as arguments of functions`);
            default:
                throw new RuntimeError(`Unknown expression type: ${typeof cell}`);
        }
    }

    evaluateReference(position, environment) {
        try {
            const entry = environment.getExpression(position) || new Value(null);
            return this.evaluateCell(entry, environment);
        } catch (e) {
            if (e instanceof ParsingError)
                throw new RuntimeError(`Error in referenced cell: ${position}`);
            else throw e;
        }
    }

    evaluateExpression(value, environment) {
        switch (value.constructor) {
            case Range: return this.evaluateRange(value.from, value.to, environment);
            default: return this.evaluateCell(value, environment);
        }
    }

    evaluateUnary(op, expression, environment) {
        const value = this.evaluateCell(expression, environment);
        switch (op) {
            case '+': return value;
            case '-': return -value;
            default: throw new RuntimeError(`Unknown unary operator: '${op}'`);
        }
    }

    evaluateBinary(left, op, right, environment) {
        const leftValue = this.evaluateCell(left, environment);
        const rightValue = this.evaluateCell(right, environment);
        switch (op) {
            case '+': return leftValue + rightValue;
            case '-': return leftValue - rightValue;
            case '*': return leftValue * rightValue;
            case '/': return leftValue / rightValue;
            default: throw new RuntimeError(`Unknown binary operator: '${op}'`);
        }
    }

    evaluateFunction(functionName, args, environment) {
        const argumentValues = args.map(arg => this.evaluateExpression(arg, environment));
        const func = environment.getFunction(functionName);
        try {
            return func(...argumentValues);
        } catch (ex) {
            throw new RuntimeError(`Error in function ${functionName}: ${ex}`);
        }
    }

    evaluateRange(from, to, environment) {
        const cells = positionsInRange(from, to)
            .map(pos => new Reference(pos.col, pos.row));
        return cells.map(cell => this.evaluateCell(cell, environment));
    }
}

class Environment {
    constructor(cells = {}, builtinFunctions = {}) {
        this.cells = cells;
        this.functions = builtinFunctions;
        this._parser = new Parser(new Tokenizer());
        this._evaluator = new Evaluator();
        this._expressionsCache = {};
        // caching values assumes the spreadsheet cells don't change
        this._valuesCache = {};
    }

    getText(position) {
        return this.cells.hasOwnProperty(position) ? this.cells[position].toString() : "";
    }

    getExpression(position) {
        if (this._expressionsCache.hasOwnProperty(position))
            return this._expressionsCache[position];
        const text = this.cells.hasOwnProperty(position) ? this.cells[position] : null;
        const parsed = this._parser.parse(text);
        this._expressionsCache[position] = parsed;
        return parsed;
    }

    getValue(position) {
        if (this._valuesCache.hasOwnProperty(position))
            return this._valuesCache[position];
        const value = this._evaluator.evaluateCell(this.getExpression(position), this);
        this._valuesCache[position] = value;
        return value;
    }

    evaluateExpression(expression) {
        const parsed = this._parser.parse(expression);
        const evaluated = this._evaluator.evaluateCell(parsed, this);
        return evaluated;
    }

    getFunction(name) {
        if (this.functions[name] === undefined)
            throw new RuntimeError(`Unknown function: ${name} is not a function`);
        return this.functions[name];
    }
}

const builtinFunctions = {
    SUM: (...values) => values.flat().reduce((a, b) => a + b, 0),
    AVERAGE: (...values) => values.flat().reduce((a, b) => a + b, 0) / values.flat().length,
};

class Spreadsheet {
    constructor(cells = {}, functions = builtinFunctions) {
        this.cells = cells;
        this.builtinFunctions = functions;
        this.environment = new Environment(this.cells, this.builtinFunctions);
    }

    text(position) {
        return this.environment.getText(position);
    }

    value(position) {
        return this.environment.getValue(position);
    }

    query(expression) {
        return this.environment.evaluateExpression(expression);
    }
}

export { helpers as Helpers, ParsingError, RuntimeError, Spreadsheet, SpreadsheetError, builtinFunctions };
//# sourceMappingURL=simple-spreadsheet.mjs.map
