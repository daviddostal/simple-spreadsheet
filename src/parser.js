import { TokenType } from './tokenizer';
import { ParsingError } from './errors';
import { Value, Reference, BinaryOp, UnaryOp, Range, FunctionCall } from './expressions';
import * as Helpers from './helpers';

export default class Parser {
    constructor(tokenizer) {
        this.tokens = tokenizer;
    }

    parse(text) {
        if (text === null || text === undefined || text.constructor !== String)
            return { parsed: new Value(text), references: [] }; // if there is nothing to parse, return the value.

        this.tokens.begin(text);
        const parsed = this._parseCell();
        return { parsed, references: [...new Set(this._getReferences(parsed))] };
    }

    // Cell => '=' Expression | SimpleValue
    _parseCell() {
        if (this.tokens.remaining.startsWith('=')) {
            this._expectAny(TokenType.EQUALS);
            const result = this._parseExpression();
            this._require(TokenType.EOF);
            return result;
        } else {
            return this._parseSimpleValue();
        }
    }

    // SimpleValue => number | text
    _parseSimpleValue() {
        const value = this.tokens.rest();
        if (value.match(/^[+-]?\d+(?:\.\d+)?$/)) return new Value(parseFloat(value));
        else return new Value(value);
    }

    // Expression => Term
    _parseExpression() {
        return this._parseTerm();
    }

    // Term => Factor ([+-] Factor)*
    _parseTerm() {
        let left = this._parseFactor();
        let operation;
        while ((operation = this._expectAny(TokenType.PLUS, TokenType.MINUS)) !== null) {
            left = new BinaryOp(left, operation.value, this._parseFactor());
        }
        return left;
    }

    // Factor => Unary ([*/] Unary)*
    _parseFactor() {
        let left = this._parseUnary();
        let operation;
        while ((operation = this._expectAny(TokenType.STAR, TokenType.SLASH)) !== null) {
            left = new BinaryOp(left, operation.value, this._parseUnary());
        }
        return left;
    }

    // Unary => [+-] Unary | Value
    _parseUnary() {
        let operation = this._expectAny(TokenType.PLUS, TokenType.MINUS);
        return operation !== null
            ? new UnaryOp(operation.value, this._parseUnary())
            : this._parseValue();
    }

    // Value => Parenthesized | number | string | RangeReference | FunctionCall | Reference
    _parseValue() {
        if (this._expectAny(TokenType.LPAREN))
            return this._parseParenthesized();

        const number = this._expectAny(TokenType.NUMBER)
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
        const contents = this._parseExpression();
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
            const args = this._parseArguments();
            value = new FunctionCall(value, args);
        } while (this._expectAny(TokenType.LPAREN))
        return value;
    }

    // Reference => [A-Za-z]+\d+
    _parseReference(reference) {
        const position = Helpers.parsePosition(reference);
        if (position === null)
            throw new ParsingError(`Invalid format of cell reference: ${reference}`);
        return new Reference(position.col, position.row);
    }

    // Arguments => (Expression (',' Expression)*)?
    _parseArguments() {
        const args = [];
        while (!this._expectAny(TokenType.RPAREN)) {
            if (args.length != 0)
                this._require(TokenType.COMMA);
            args.push(this._parseExpression());
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

    _getReferences(expression) {
        switch (expression.constructor) {
            case Value:
                return [];
            case Reference:
                return [Helpers.makePosition(expression.col, expression.row)];
            case UnaryOp:
                return this._getReferences(expression.value);
            case BinaryOp:
                return [...this._getReferences(expression.left), ...this._getReferences(expression.right)];
            case FunctionCall:
                return expression.args.flatMap(arg => this._getReferences(arg));
            case Range:
                return Helpers.positionsInRange(expression.from, expression.to)
                    .map(pos => Helpers.makePosition(pos.col, pos.row));
            default:
                throw new ParsingError(`Unknown expression type: ${typeof expression}`);
        }
    }
}