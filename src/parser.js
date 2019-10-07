import { TokenType } from './tokenizer';
import { ParsingError } from './errors';
import { Value, Reference, BinaryOp, UnaryOp, Range, FunctionCall } from './expressions';
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
            : this._parseValue();
    }

    // value => number | string | rangeReference | reference | parenthesized | functionCall
    _parseValue() {
        if (this._tokens.expect(TokenType.LPAREN))
            return this._finishParenthesized();

        const number = this._tokens.expect(TokenType.NUMBER)
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
        const position = Helpers.parsePosition(reference);
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