import { TokenType } from './tokenizer';
import { ParsingError } from './errors';
import { Value, CellReference, BinaryOp, UnaryOp, Range, FunctionCall, Reference } from './expressions';
import * as Helpers from './helpers';

export default class Parser {
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
            : this._parseCall();
    }

    // call => value ('(' arguments ')')*
    _parseCall() {
        let value = this._parseValue();
        while (this._tokens.expect(TokenType.LPAREN)) {
            const args = this._parseArguments();
            this._tokens.expect(TokenType.RPAREN);
            value = new FunctionCall(value, args);
        }
        return value;
    }

    // value => number | string | rangeReference | reference | parenthesized
    _parseValue() {
        const number = this._tokens.expect(TokenType.NUMBER)
        if (number !== null)
            return this._parseNumber(number);

        const string = this._tokens.expect(TokenType.STRING);
        if (string !== null)
            return this._parseString(string);

        const reference = this._tokens.expect(TokenType.REFERENCE);
        if (reference != null && this._tokens.expect(TokenType.COLON))
            return this._parseRangeReference(reference);
        else if (reference != null)
            return this._parseCellReference(reference);

        const identifier = this._tokens.expect(TokenType.IDENTIFIER);
        if (identifier !== null)
            return new Reference(identifier.value);

        if (this._tokens.expect(TokenType.LPAREN))
            return this._parseParenthesized();

        throw new ParsingError(`Unexpected ${this._tokens.peek().type}, expected an expression or value`)
    }

    // parenthesized => '(' expression ')'
    _parseParenthesized() {
        // ( is already parsed by parseValue
        const contents = this._parseExpression();
        this._tokens.require(TokenType.RPAREN);
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

    // rangeReference => IDENTIFIER ':' IDENTIFIER
    _parseRangeReference(fromReference) {
        // start identifier and : are already parsed
        const toReference = this._tokens.require(TokenType.REFERENCE);
        const from = new CellReference(fromReference.value);
        const to = new CellReference(toReference.value);
        return new Range(from, to);
    }

    _parseCellReference(reference) {
        // TODO: make nicer, maybe drop helper functions altogether.
        const parsedPos = Helpers.parsePosition(reference.value);
        const position = Helpers.makePosition(parsedPos.col, parsedPos.row);
        return new CellReference(position);
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
            case CellReference:
                return [expression.position];
            case UnaryOp:
                return this._getReferences(expression.value);
            case BinaryOp:
                return [...this._getReferences(expression.left), ...this._getReferences(expression.right)];
            case FunctionCall:
                return expression.args.flatMap(arg => this._getReferences(arg));
            case Range:
                return Helpers.positionsInRange(expression.from.position, expression.to.position)
                    .map(pos => Helpers.makePosition(pos.col, pos.row));
            default:
                throw new ParsingError(`Unknown expression type: ${typeof expression}`);
        }
    }
}