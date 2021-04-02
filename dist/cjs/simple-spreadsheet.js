'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class NotImplementedError extends Error {
    constructor(message) { super(message); }
    toString() { return `Not implemented: ${this.message}` }
}

class SpreadsheetError extends Error { }

class ParsingError extends SpreadsheetError {
    constructor(message) { super(message); }
    toString() { return `Syntax error: ${this.message}`; }
}

class RuntimeError extends SpreadsheetError {
    constructor(message) { super(message); }
    toString() { return `Evaluation error: ${this.message}`; }
}

class ReferencedCellError extends RuntimeError {
    constructor(cell) {
        super(`Error in referenced cell: ${cell}`);
        this.cell = cell;
    }
}

class CircularReferenceError extends RuntimeError {
    constructor(cells) {
        super(`Circular reference detected: ${cells.join(' -> ')}`);
        this.cells = cells;
    }
}

class FunctionEvaluationError extends RuntimeError {
    constructor(functionName, error) {
        super(`Error in function ${functionName}: ${error}`);
        this.functionName = functionName;
        this.error = error;
    }
}

class RangeReferenceNotAllowedError extends RuntimeError {
    constructor() { super(`Range references are allowed only as references to functions`); }
}

class UnknownFunctionError extends RuntimeError {
    constructor(functionName) {
        super(`Unknown function: ${functionName}`);
        this.functionName = functionName;
    }
}

class TokenStream {
    constructor(tokens) {
        this._tokens = tokens;
        this._currentPos = 0;
    }

    peek() {
        return this._tokens[this._currentPos] || null;
    }

    expect(...types) {
        const token = this.peek();
        if (token !== null && types.includes(token.type)) {
            this._currentPos++;
            return token;
        }
        return null;
    }

    require(...types) {
        const token = this.expect(...types);
        if (token === null)
            throw new ParsingError(`Unexpected ${this.peek().type.description}, expected ${types.map(sym => sym.description).join(' or ')}`);
        return token;
    }
}

const TokenType = Object.freeze({
    // Note: strings must be unique, because they are used for comparison
    EOF: Symbol('end of formula'),
    WHITESPACE: Symbol('whitespace'),
    PLUS: Symbol('+'),
    MINUS: Symbol('-'),
    STAR: Symbol('*'),
    SLASH: Symbol('/'),
    LPAREN: Symbol('opening parenthesis'),
    RPAREN: Symbol('closing parenthesis'),
    COLON: Symbol(':'),
    EQUALS: Symbol('='),
    COMMA: Symbol('comma'),
    NUMBER: Symbol('number'),
    STRING: Symbol('string'),
    IDENTIFIER: Symbol('identifier'),
});

class Tokenizer {
    constructor() {
        this._rules = [
            // NUMBER and IDENTIFIER are used the most so keep them at the top (for performance reasons - it makes a difference, I measured it)
            // Patterns usually start with ^ so they match the start of the remaining
            // string, not anywhere in the middle.
            { pattern: /^\d+(?:\.\d+)?/, type: TokenType.NUMBER },
            { pattern: /^[a-zA-Z]\w+/, type: TokenType.IDENTIFIER },
            { pattern: /^"(?:[^"\\]|\\.)*"/, type: TokenType.STRING },
            { pattern: /^$/, type: TokenType.EOF },
        ];

        this._operators = {
            ' ': TokenType.WHITESPACE,
            '\t': TokenType.WHITESPACE,
            '\r': TokenType.WHITESPACE,
            '\n': TokenType.WHITESPACE,
            '+': TokenType.PLUS,
            '-': TokenType.MINUS,
            '*': TokenType.STAR,
            '/': TokenType.SLASH,
            '(': TokenType.LPAREN,
            ')': TokenType.RPAREN,
            '=': TokenType.EQUALS,
            ':': TokenType.COLON,
            ',': TokenType.COMMA,
        };
    }

    tokenize(text) {
        const tokens = [];
        let remaining = text;
        while (remaining.length > 0) {
            const token = this._nextToken(remaining);
            tokens.push(token);
            remaining = remaining.slice(token.value.length);
        }
        tokens.push({ type: TokenType.EOF, value: '' });
        return new TokenStream(tokens.filter(token => token.type !== TokenType.WHITESPACE));
    }

    _nextToken(text) {
        const firstChar = text[0];
        const operator = this._operators[firstChar];
        if (operator !== undefined) return { type: operator, value: firstChar };

        for (let rule of this._rules) {
            const match = text.match(rule.pattern);
            if (match !== null)
                return { type: rule.type, value: match[0] };
        }
        throw new ParsingError(`Unknown token at '${text}'`);
    }
}

class Expression { }

class Value extends Expression {
    constructor(value) { super(); this.value = value; }
    toString() { return this.value.constructor === String ? `"${this.value}"` : `${this.value}`; }
}

class Reference extends Expression {
    // TODO: Maybe refactor to only hold single property?
    // Normalize position?
    constructor(col, row) { super(); this.col = col; this.row = row; }
    toString() { return `${this.col}${this.row}`; }
}

class BinaryOp extends Expression {
    constructor(left, op, right) { super(); this.left = left; this.op = op; this.right = right; }
    toString() { return `(${this.left} ${this.op} ${this.right})`; }
}

class UnaryOp extends Expression {
    constructor(op, value) { super(); this.op = op; this.value = value; }
    toString() { return `${this.op}${this.value}`; }
}

class FunctionCall extends Expression {
    constructor(functionName, args) { super(); this.functionName = functionName; this.args = args; }
    toString() { return `${this.functionName}(${this.args.join(', ')})`; }
}

class Range extends Expression {
    constructor(from, to) { super(); this.from = from; this.to = to; }
    toString() { return `${this.from}:${this.to}`; }
}

function positionsInRange(from, to) {
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

function parsePosition(position) {
    const positionParts = position.match(/^([A-Za-z]+)(\d+)$/);
    return positionParts &&
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
    __proto__: null,
    positionsInRange: positionsInRange,
    parsePosition: parsePosition,
    makePosition: makePosition,
    columnIndex: columnIndex,
    columnLetter: columnLetter
});

class Parser {
    constructor(tokenizer) {
        this._tokenizer = tokenizer;
        this._tokens = null;
    }

    // cell => empty | '=' expression EOF | number | string
    parse(text) {
        const needsParsing = text !== null && text !== undefined && text.constructor === String;
        if (!needsParsing)
            return { parsed: new Value(text), references: [] };

        const isFormula = text[0] === '='; // TODO: add test with and without whitespace
        if (isFormula) {
            this._tokens = this._tokenizer.tokenize(text);
            this._tokens.require(TokenType.EQUALS);
            const parsed = this._parseExpression();
            this._tokens.require(TokenType.EOF);
            const references = this._referencesIn(parsed);
            return { parsed, references };
        }

        // number
        if (text.match(/^[+-]?\d+(?:\.\d+)?$/))
            return { parsed: new Value(parseFloat(text)), references: [] };

        // string
        return { parsed: new Value(text), references: [] };
    }

    // expression => term
    _parseExpression() {
        return this._parseTerm();
    }

    // term => factor (('+'|'-') factor)*
    _parseTerm() {
        let left = this._parseFactor();
        let operation;
        while ((operation = this._tokens.expect(TokenType.PLUS, TokenType.MINUS)) !== null) {
            left = new BinaryOp(left, operation.value, this._parseFactor());
        }
        return left;
    }

    // factor => unary (('*'|'/') unary)*
    _parseFactor() {
        let left = this._parseRange();
        let operation;
        while ((operation = this._tokens.expect(TokenType.STAR, TokenType.SLASH)) !== null) {
            left = new BinaryOp(left, operation.value, this._parseRange());
        }
        return left;
    }

    // range => unary (':' unary)*
    _parseRange() {
        // TODO: Make ranges first-class
        return this._parseUnary();
    }

    // unary => ('+'|'-') unary | call
    _parseUnary() {
        const operation = this._tokens.expect(TokenType.PLUS, TokenType.MINUS);
        return operation !== null
            ? new UnaryOp(operation.value, this._parseUnary())
            : this._parseValue();
    }

    // value => number | string | rangeReference | reference | parenthesized | functionCall
    _parseValue() {
        if (this._tokens.expect(TokenType.LPAREN))
            return this._finishParenthesized();

        const number = this._tokens.expect(TokenType.NUMBER);
        if (number !== null)
            return new Value(parseFloat(number.value));

        const string = this._tokens.expect(TokenType.STRING);
        if (string !== null)
            return this._parseString(string);


        const identifier = this._tokens.expect(TokenType.IDENTIFIER);
        if (identifier !== null) {
            if (this._tokens.expect(TokenType.COLON))
                return this._finishRangeReference(identifier);

            if (this._tokens.expect(TokenType.LPAREN))
                return this._finishFunctionCall(identifier);

            return this._parseReference(identifier.value);
        }
        throw new ParsingError(`Unexpected ${this._tokens.peek().type.description}, expected an expression or value`)
    }

    // parenthesized => '(' expression ')'
    _finishParenthesized() {
        const contents = this._parseExpression();
        this._tokens.require(TokenType.RPAREN);
        return contents;
    }

    _parseString(string) {
        const withoutQuotes = string.value.substring(1, string.value.length - 1);
        const escapedString = withoutQuotes.replace(/\\(.)/g, '$1'); // TODO: check escaped characters are escapable
        return new Value(escapedString);
    }

    // rangeReference => IDENTIFIER ':' IDENTIFIER
    _finishRangeReference(start) {
        // start identifier and : are already parsed
        const end = this._tokens.require(TokenType.IDENTIFIER);
        const from = this._parseReference(start.value);
        const to = this._parseReference(end.value);
        return new Range(from, to);
    }

    // functionCall => IDENTIFIER ('(' arguments ')')*
    _finishFunctionCall(identifier) {
        // TODO: Test or remove nested function calls such as FOO()()
        // Or check for function return types at runtime?

        const args = this._parseArguments();
        this._tokens.expect(TokenType.RPAREN);
        return new FunctionCall(identifier.value, args);
    }

    // reference => [A-Za-z]+\d+
    _parseReference(reference) {
        const position = parsePosition(reference);
        if (position === null)
            throw new ParsingError(`Invalid format of cell reference: ${reference}`);
        return new Reference(position.col, position.row);
    }

    // arguments => (expression (',' expression)*)?
    _parseArguments() {
        const args = [];
        while (this._tokens.peek().type !== TokenType.RPAREN) {
            if (args.length != 0)
                this._tokens.require(TokenType.COMMA);
            args.push(this._parseExpression());
        }
        return args;
    }

    _referencesIn(expression) {
        switch (expression.constructor) {
            case Value:
                return [];
            case Reference:
                return [makePosition(expression.col, expression.row)];
            case UnaryOp:
                return this._referencesIn(expression.value);
            case BinaryOp:
                return [...this._referencesIn(expression.left), ...this._referencesIn(expression.right)];
            case FunctionCall:
                return expression.args.flatMap(arg => this._referencesIn(arg));
            case Range:
                return positionsInRange(expression.from, expression.to)
                    .map(pos => makePosition(pos.col, pos.row));
            default:
                throw new NotImplementedError(`Unknown expression type: ${typeof expression}`);
        }
    }
}

class CircularRefInternal extends Error {
    constructor(position, circlePositions) { super(); this.position = position; this.circlePositions = circlePositions; }
}

class Evaluator {
    constructor() {
        this.visitedCellStack = [];
    }

    evaluateCellAt(position, expression, environment) {
        if (this.visitedCellStack.includes(position))
            throw new CircularRefInternal(position, [...this.visitedCellStack, position]);

        this.visitedCellStack.push(position);
        try {
            const result = this._evaluateCell(expression, environment);
            this.visitedCellStack.pop();
            return result;
        } catch (ex) {
            this.visitedCellStack.pop();
            // Normal errors propagate as usual, but CircularRefInternal is used
            // only to propagate the exception to the originating cell internally
            // (so it doesn't get reported just as an error in a referenced cell).
            // Once the CircularRefInternal reaches back to the originating cell,
            // we turn it into a normal CircularReferenceError.
            if (ex instanceof CircularRefInternal && ex.position === position) {
                throw new CircularReferenceError(ex.circlePositions);
            } else {
                throw ex;
            }
        }
    }

    evaluateQuery(expression, environment) {
        return this._evaluateCell(expression, environment);
    }

    _evaluateCell(expression, environment) {
        switch (expression.constructor) {
            case Value:
                return expression.value;
            case Reference:
                return this._evaluateReference(makePosition(expression.col, expression.row), environment);
            case UnaryOp:
                return this._evaluateUnary(expression.op, expression.value, environment);
            case BinaryOp:
                return this._evaluateBinary(expression.left, expression.op, expression.right, environment);
            case FunctionCall:
                return this._evaluateFunction(expression.functionName, expression.args, environment);
            case Range:
                throw new RangeReferenceNotAllowedError();
            default:
                throw new NotImplementedError(`Unknown expression type: ${typeof expression}`);
        }
    }

    _evaluateReference(position, environment) {
        try {
            return environment.getValue(position);
        } catch (ex) {
            if (ex instanceof ParsingError || ex instanceof RuntimeError)
                throw new ReferencedCellError(position);
            else throw ex;
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
            default: throw new NotImplementedError(`Unknown unary operator: '${op}'`);
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
            default: throw new NotImplementedError(`Unknown binary operator: '${op}'`);
        }
    }

    _evaluateFunction(functionName, args, environment) {
        let func = environment.getFunction(functionName);
        func = func instanceof Function ? { isMacro: false, function: func } : func;
        return (func.isMacro === true) ?
            this._evaluateMacro(functionName, func, args, environment) :
            this._evaluateSpreadsheetFunction(functionName, func, args, environment);
    }

    _evaluateSpreadsheetFunction(functionName, func, args, environment) {
        const argumentValues = args.map(arg => this._evaluateExpression(arg, environment));
        try {
            return func.function(...argumentValues);
        } catch (ex) {
            throw new FunctionEvaluationError(functionName, ex);
        }
    }

    _evaluateMacro(macroName, macro, args, environment) {
        const argsLazyValues = args.map(arg => () => this._evaluateExpression(arg, environment));
        try {
            return macro.function(...argsLazyValues);
        } catch (ex) {
            throw new FunctionEvaluationError(macroName, ex);
        }
    }

    _evaluateRange(from, to, environment) {
        return positionsInRange(from, to)
            .map(pos => makePosition(pos.col, pos.row))
            .map(pos => this._evaluateReference(pos, environment));
    }
}

class ReferencesMap {
    constructor() {
        this._referencesFrom = new Map(); // { position => Set(referencesFrom) }
        this._referencesTo = new Map(); // { position => Set(referencedBy) }
    }

    addReferences(positionFrom, referencesTo) {
        if (!this._referencesFrom.has(positionFrom))
            this._referencesFrom.set(positionFrom, new Set(referencesTo));

        for (let referenceTo of referencesTo) {
            this._referencesFrom.get(positionFrom).add(referenceTo);

            if (!this._referencesTo.has(referenceTo))
                this._referencesTo.set(referenceTo, new Set());
            this._referencesTo.get(referenceTo).add(positionFrom);
        }
    }

    removeReferencesFrom(position) {
        // TODO: test this code works properly
        const targetNodes = this._referencesFrom.get(position);
        if (targetNodes) {
            for (let target of targetNodes)
                this._referencesTo.get(target).delete(position);
            this._referencesFrom.delete(position);
        }
    }

    cellsDependingOn(position) {
        const visited = new Set();
        const toVisitStack = [position];
        while (toVisitStack.length > 0) {
            const current = toVisitStack.pop();
            visited.add(current);
            const neighbors = this._referencesTo.has(current) ?
                [...this._referencesTo.get(current)].filter(n => !visited.has(n)) : [];
            const newNeighbors = neighbors.filter(n => !visited.has(n));
            toVisitStack.push(...newNeighbors);
        }
        return visited;
    }
}

class Environment {
    constructor(cells, functions, cellsChangedListener) {
        this.cells = cells; // { position => formula text }
        this.functions = functions; // { name => function or macro }
        this.onCellsChanged = cellsChangedListener;
        this._parser = new Parser(new Tokenizer());
        this._evaluator = new Evaluator();

        this._expressionsCache = new Map(); // { position => expression tree (AST) }
        this._valuesCache = new Map(); // { position => value; }
        this._errorsCache = new Map(); // { position => error; }
        this._referencesMap = new ReferencesMap(); // tracks references between cells
    }

    getText(position) {
        return this.cells.has(position) ? this.cells.get(position).toString() : "";
    }

    setText(position, text) {
        this.cells.set(position, text);

        // affectedCells also contains `position`
        const affectedCells = this._referencesMap.cellsDependingOn(position);
        for (let pos of affectedCells) {
            this._valuesCache.delete(pos);
            this._errorsCache.delete(pos);
        }

        this._expressionsCache.delete(position);
        this._referencesMap.removeReferencesFrom(position);

        this.onCellsChanged([...affectedCells]); // TODO: should this remain a Set?
    }

    getExpression(position) {
        if (this._expressionsCache.has(position))
            return this._expressionsCache.get(position);

        if (this._errorsCache.has(position))
            throw this._errorsCache.get(position);

        const text = this.cells.has(position) ? this.cells.get(position) : null;
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
        if (!this.functions.has(name))
            throw new UnknownFunctionError(name);
        return this.functions.get(name);
    }
}

class Spreadsheet {
    constructor(cells = new Map(), functions = new Map(), onCellsChanged = (() => { })) {
        this.cells = cells instanceof Map ? cells : new Map(Object.entries(cells));
        this.functions = functions instanceof Map ? functions : new Map(Object.entries(functions));
        this._environment = new Environment(this.cells, this.functions, onCellsChanged);
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

exports.CircularReferenceError = CircularReferenceError;
exports.FunctionEvaluationError = FunctionEvaluationError;
exports.Helpers = helpers;
exports.NotImplementedError = NotImplementedError;
exports.ParsingError = ParsingError;
exports.RangeReferenceNotAllowedError = RangeReferenceNotAllowedError;
exports.ReferencedCellError = ReferencedCellError;
exports.RuntimeError = RuntimeError;
exports.Spreadsheet = Spreadsheet;
exports.SpreadsheetError = SpreadsheetError;
exports.UnknownFunctionError = UnknownFunctionError;
//# sourceMappingURL=simple-spreadsheet.js.map
