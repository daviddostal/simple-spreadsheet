(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
    typeof define === 'function' && define.amd ? define(['exports'], factory) :
    (global = global || self, factory(global.SimpleSpreadsheet = {}));
}(this, function (exports) { 'use strict';

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
        constructor(rules = {
            '$': TokenType.EOF,
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
            '\\d+(?:\\.\\d+)?': TokenType.NUMBER,
            '\\"(?:[^"\\\\]|\\\\.)*\\"': TokenType.STRING,
            '[a-zA-Z]\\w+': TokenType.IDENTIFIER,
        }) {
            this.rules = rules;
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
        get position() { return `${this.col}${this.row}`; }
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

        // Cell -> Expression | simple value (string or number)
        parseCell() {
            if (this.tokens.remaining.startsWith('=')) {
                this._expectAny(TokenType.EQUALS);
                const result = this.parseExpression();
                this._require(TokenType.EOF);
                return result;
            } else {
                const value = this.tokens.rest();
                if (value.match(/^[+-]?\d+(?:\.\d+)?$/)) return new Value(parseFloat(value));
                else return new Value(value);
            }
        }

        // Expression -> Factor
        parseExpression() {
            return this.parseTerm();
        }

        // Term -> Factor ([+-] Factor)*
        parseTerm() {
            let left = this.parseFactor();
            let operation;
            while ((operation = this._expectAny(TokenType.PLUS, TokenType.MINUS)) !== null) {
                left = new BinaryOp(left, operation.value, this.parseFactor());
            }
            return left;
        }

        // Factor -> Unary ([*/] Unary)*
        parseFactor() {
            let left = this.parseUnary();
            let operation;
            while ((operation = this._expectAny(TokenType.STAR, TokenType.SLASH)) !== null) {
                left = new BinaryOp(left, operation.value, this.parseUnary());
            }
            return left;
        }

        // Unary -> [+-] Unary | Value
        parseUnary() {
            let operation = this._expectAny(TokenType.PLUS, TokenType.MINUS);
            return operation !== null
                ? new UnaryOp(operation.value, this.parseUnary())
                : this.parseValue();
        }

        // Value -> Identifier | number | string | ( Expression ) | RangeReference
        parseValue() {
            // Parenthesized expression
            if (this._expectAny(TokenType.LPAREN)) {
                const contents = this.parseExpression();
                this._require(TokenType.RPAREN);
                return contents;
            }

            // Number
            const number = this._expectAny(TokenType.NUMBER);
            if (number !== null) { return new Value(parseFloat(number.value)); }

            // String
            const string = this._expectAny(TokenType.STRING);
            if (string !== null) {
                const withoutQuotes = string.value.substring(1, string.value.length - 1);
                const escapedString = withoutQuotes.replace(/\\(.)/g, '$1');
                return new Value(escapedString);
            }

            const identifier = this._require(TokenType.IDENTIFIER);
            // Range
            if (identifier !== null && this._expectAny(TokenType.COLON)) {
                const endIdentifier = this._require(TokenType.IDENTIFIER);
                const from = this._parseReference(identifier.value);
                const to = this._parseReference(endIdentifier.value);
                return new Range(from, to);
            }

            // Function call
            if (this._expectAny(TokenType.LPAREN)) {
                let value = identifier.value;
                do {
                    const args = this.parseArguments();
                    value = new FunctionCall(value, args);
                } while (this._expectAny(TokenType.LPAREN))
                return value;
            }

            // Reference
            return this._parseReference(identifier.value);
        }

        // Reference -> [A-Za-z]+\d+
        _parseReference(reference) {
            const referenceParts = reference.match(/^([A-Za-z]+)(\d+)$/);
            if (referenceParts === null)
                throw new ParsingError(`Invalid format of cell reference: ${reference}`);
            return new Reference(referenceParts[1], parseInt(referenceParts[2]));
        }

        // Arguments -> (Expression (, Expression)*)?
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
                    return this.evaluateReference(cell.position, environment);
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
            const cells = this._cellsInRange(from, to);
            const cellValues = cells.map(cell => this.evaluateCell(cell, environment));
            return cellValues;
        }

        _cellsInRange(from, to) {
            const cells = [];
            for (let col of this._range(from.col.charCodeAt(0), to.col.charCodeAt(0)))
                for (let row of this._range(from.row, to.row))
                    cells.push(new Reference(String.fromCharCode(col), row));
            return cells;
        }

        _range(from, to) {
            return from <= to
                ? Array.from({ length: to - from + 1 }, (_, i) => i + from)
                : Array.from({ length: from - to + 1 }, (_, i) => from - i);
        }
    }

    class Environment {
        constructor(cells = {}, builtinFunctions = {}) {
            this.cells = cells;
            this.functions = builtinFunctions;
            this._parser = new Parser(new Tokenizer());
            this._evaluator = new Evaluator();
        }

        getText(position) {
            return this.cells.hasOwnProperty(position) ? this.cells[position].toString() : "";
        }

        getExpression(position) {
            const value = this.cells.hasOwnProperty(position) ? this.cells[position] : null;
            return this._parser.parse(value);
        }

        getValue(position) {
            return this._evaluator.evaluateCell(this.getExpression(position), this);
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
    }

    exports.builtinFunctions = builtinFunctions;
    exports.Spreadsheet = Spreadsheet;
    exports.SpreadsheetError = SpreadsheetError;
    exports.RuntimeError = RuntimeError;
    exports.ParsingError = ParsingError;

    Object.defineProperty(exports, '__esModule', { value: true });

}));
//# sourceMappingURL=simple-spreadsheet.js.map
