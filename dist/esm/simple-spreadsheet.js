class SpreadsheetError extends Error { }

class ParsingError extends SpreadsheetError {
    constructor(message) { super(message); }
    toString() { return `Syntax error: ${this.message}`; }
}

class RuntimeError extends SpreadsheetError {
    constructor(message) { super(message); }
    toString() { return `Evaluation error: ${this.message}`; }
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
            throw new ParsingError(`Unexpected ${this.peek().type}, expected ${types.join(' or ')}`);
        return token;
    }
}

const TokenType = Object.freeze({
    // Note: strings must be unique, because they are used for comparison
    EOF: 'end of formula',
    WHITESPACE: 'whitespace',
    PLUS: '+',
    MINUS: '-',
    STAR: '*',
    SLASH: '/',
    LPAREN: 'opening parenthesis',
    RPAREN: 'closing parenthesis',
    COLON: ':',
    EQUALS: '=',
    COMMA: 'comma',
    NUMBER: 'number',
    STRING: 'string',
    IDENTIFIER: 'identifier',
});

class Tokenizer {
    constructor() {
        this._rules = [
            // NUMBER and IDENTIFIER are used the most so keep them at the top (for performance reasons - it makes a difference, I measured it)
            // Patterns usually start with ^ so they match the start of the remaining
            // string, not anywhere in the middle.
            { pattern: /^\d+(?:\.\d+)?/, type: TokenType.NUMBER },
            // { pattern: /^[A-Za-z]+\d+/, type: TokenType.REFERENCE },
            { pattern: /^[a-zA-Z]\w+/, type: TokenType.IDENTIFIER },
            { pattern: /^\s+/, type: TokenType.WHITESPACE },
            { pattern: /^\+/, type: TokenType.PLUS },
            { pattern: /^\-/, type: TokenType.MINUS },
            { pattern: /^\*/, type: TokenType.STAR },
            { pattern: /^\//, type: TokenType.SLASH },
            { pattern: /^\(/, type: TokenType.LPAREN },
            { pattern: /^\)/, type: TokenType.RPAREN },
            { pattern: /^=/, type: TokenType.EQUALS },
            { pattern: /^:/, type: TokenType.COLON },
            { pattern: /^,/, type: TokenType.COMMA },
            { pattern: /^\"(?:[^"\\]|\\.)*\"/, type: TokenType.STRING },
            { pattern: /^$/, type: TokenType.EOF },
        ];
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
        // empty cell or other value
        if (text === null || text === undefined || text.constructor !== String)
            return { parsed: new Value(text), references: [] };

        // formula
        if (text.trimStart().startsWith('=')) {
            this._tokens = this._tokenizer.tokenize(text);
            this._tokens.require(TokenType.EQUALS);
            const parsed = this._parseExpression();
            this._tokens.require(TokenType.EOF);
            const references = [...new Set(this._getReferences(parsed))];
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
        throw new ParsingError(`Unexpected ${this._tokens.peek().type}, expected an expression or value`)
    }

    // parenthesized => '(' expression ')'
    _finishParenthesized() {
        const contents = this._parseExpression();
        this._tokens.require(TokenType.RPAREN);
        return contents;
    }

    _parseString(string) {
        const withoutQuotes = string.value.substring(1, string.value.length - 1);
        const escapedString = withoutQuotes.replace(/\\(.)/g, '$1');
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

        // let value = identifier.value;
        // do {
        //     const args = this._parseArguments();
        //     this._tokens.expect(TokenType.RPAREN);
        //     value = new FunctionCall(value, args);
        // } while (this._tokens.expect(TokenType.LPAREN))
        // return value;

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

    _getReferences(expression) {
        switch (expression.constructor) {
            case Value:
                return [];
            case Reference:
                return [makePosition(expression.col, expression.row)];
            case UnaryOp:
                return this._getReferences(expression.value);
            case BinaryOp:
                return [...this._getReferences(expression.left), ...this._getReferences(expression.right)];
            case FunctionCall:
                return expression.args.flatMap(arg => this._getReferences(arg));
            case Range:
                return positionsInRange(expression.from, expression.to)
                    .map(pos => makePosition(pos.col, pos.row));
            default:
                throw new ParsingError(`Unknown expression type: ${typeof expression}`);
        }
    }
}

class CircularReferenceError extends Error {
    constructor(message, cell) { super(message); this.cell = cell; }
}

class Evaluator {
    constructor() {
        this.visitedCellStack = [];
    }

    evaluateCellAt(position, cell, environment) {
        if (this.visitedCellStack.includes(position))
            throw new CircularReferenceError(`Circular reference detected (${this.visitedCellStack.join(' -> ')} -> ${position})`, cell);

        this.visitedCellStack.push(position);
        try {
            const result = this._evaluateCell(cell, environment);
            this.visitedCellStack.pop();
            return result;
        } catch (ex) {
            this.visitedCellStack.pop();
            // Normal errors propagate as usual, but CircularReferenceError is used
            // only to propagate the exception to the originating cell internally
            // (so it doesn't get reported just as an error in a referenced cell).
            // Once the CircularReferenceError reaches back to the originating cell,
            // we turn it into a normal RuntimeError.
            if (ex instanceof CircularReferenceError && ex.cell === cell) {
                throw new RuntimeError(ex.message);
            } else {
                throw ex;
            }
        }
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
            return environment.getValue(position);
        } catch (e) {
            if (e instanceof ParsingError || e instanceof RuntimeError)
                throw new RuntimeError(`Error in referenced cell ${position}`);
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
        const func = environment.getFunction(functionName);
        try {
            // TODO: Report different error for arguments and function application
            // And also test both cases :-)
            const argumentValues = args.map(arg => this._evaluateExpression(arg, environment));
            return func(...argumentValues);
        } catch (ex) {
            throw new RuntimeError(`Error in function ${functionName}: ${ex}`);
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
        this._referencesFrom = {};
        this._referencesTo = {};
    }

    getReferencesFrom(position) { return this._referencesFrom[position]; }
    getReferencesTo(position) { return this._referencesTo[position]; }

    addReference(positionFrom, referenceTo) {
        if (!this._referencesFrom[positionFrom])
            this._referencesFrom[positionFrom] = [];
        this._referencesFrom[positionFrom].push(referenceTo);

        if (!this._referencesTo[referenceTo])
            this._referencesTo[referenceTo] = [];
        this._referencesTo[referenceTo].push(positionFrom);
    }

    removeReferencesFrom(position) {
        const targetNodes = this._referencesFrom[position];
        for (let target of targetNodes) {
            const valueIndex = this._referencesTo[target].indexOf(position);
            if (valueIndex > -1) this._referencesTo[target].splice(valueIndex, 1);
        }
        delete this._referencesFrom[position];
    }

    getAffectedCells(position) {
        // TODO: maybe optimize using stack and for loop
        const referencesTo = this.getReferencesTo(position);
        if (!referencesTo) return [];

        const recursiveReferences = referencesTo.flatMap(this.getAffectedCells.bind(this));
        return [...referencesTo, ...recursiveReferences];
    }
}

class Environment {
    constructor(cells, functions, cellsChangedListener) {
        this.cells = cells;
        this.functions = functions;
        this.onCellsChanged = cellsChangedListener;
        this._parser = new Parser(new Tokenizer());
        this._evaluator = new Evaluator();

        this._expressionsCache = new Map(); // { position => expression tree (AST) }
        this._valuesCache = new Map(); // { position => value; }
        this._referencesMap = new ReferencesMap();
    }

    getText(position) {
        return this.cells.has(position) ? this.cells.get(position).toString() : "";
    }

    setText(position, value) {
        this.cells.set(position, value);

        const affectedCells = [position, ...this._referencesMap.getAffectedCells(position)];
        for (let pos of affectedCells)
            this._valuesCache.delete(pos);

        this._expressionsCache.delete(position);
        if (this._referencesMap.getReferencesFrom(position))
            this._referencesMap.removeReferencesFrom(position);

        this.onCellsChanged(affectedCells);
    }

    getExpression(position) {
        if (this._expressionsCache.has(position))
            return this._expressionsCache.get(position);

        const text = this.cells.has(position) ? this.cells.get(position) : null;
        const { parsed, references } = this._parser.parse(text);
        this._expressionsCache.set(position, parsed);

        for (let reference of references)
            this._referencesMap.addReference(position, reference);

        return parsed;
    }

    getValue(position) {
        if (this._valuesCache.has(position))
            return this._valuesCache.get(position);

        const result = this._evaluator.evaluateCellAt(position, this.getExpression(position), this);
        this._valuesCache.set(position, result);
        return result;
    }

    evaluateQuery(expression) {
        const { parsed, _ } = this._parser.parse(expression);
        return this._evaluator.evaluateQuery(parsed, this);
    }

    getFunction(name) {
        if (!this.functions.has(name))
            throw new RuntimeError(`Unknown function: ${name}`);
        return this.functions.get(name);
    }
}

// export { builtinFunctions };

class Spreadsheet {
    constructor(cells = new Map(), functions = new Map(), onCellsChanged = (() => { })) {
        // TODO: confirm this.cells are updated
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

export { helpers as Helpers, ParsingError, RuntimeError, Spreadsheet, SpreadsheetError };
//# sourceMappingURL=simple-spreadsheet.js.map
