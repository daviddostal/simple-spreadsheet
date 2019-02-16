import { ParsingError, TokenType } from './tokenizer';
import { Value, Reference, BinaryOp, UnaryOp, Range, FunctionCall } from './expressions';

export default class Parser {
    constructor(tokenizer) {
        this.tokens = tokenizer;
    }

    parse(text) {
        if (text === null) return new Value(null);
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
            if (value.match(/^\d+(?:\.\d+)?$/)) return new Value(parseFloat(value));
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
        const number = this._expectAny(TokenType.NUMBER)
        if (number !== null) { return new Value(parseFloat(number.value)); }

        // String
        const string = this._expectAny(TokenType.STRING);
        if (string !== null) { return new Value(string.value.substring(1, string.value.length - 1)); }

        const identifier = this._require(TokenType.IDENTIFIER);
        // Range
        if (identifier !== null && this._expectAny(TokenType.COLON)) {
            const endIdentifier = this._require(TokenType.IDENTIFIER);
            const from = this._parseReference(identifier.value);
            const to = this._parseReference(endIdentifier.value);
            if (!(from.col === to.col || from.row === to.row))
                throw new ParsingError(`Range start and end not in same column or row: ${identifier.value}:${endIdentifier.value}`);
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