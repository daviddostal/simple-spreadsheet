import { TokenType } from './tokenizer.js';
import { ParsingError, NotImplementedError } from './errors.js';
import { Value, Reference, BinaryOp, UnaryOp, Range, FunctionCall } from './expressions.js';
import * as Helpers from './helpers.js';

// NOTE: Above most parser functions, there are comments describing the grammar rules of the syntax
// being parsed. It uses the following notation:
// 
// - => separates the name of the grammar rule from its meaning
// - UPPERCASE means tokens from the tokenizer
// - 'quoted' strings mean literal characters or character sequences
// - lowercase names reference other rules of this parser
// - (parentheses) mean nothing and are used just for grouping, unless they are quoted: '('
// - |, *, +, [], \d, A-Z etc. are borrowed from regexes and have approximately the same meaning
//   (* meaning 0 or more, + meaning 1 or more, \d matching digits etc.)

export default class Parser {
    constructor(tokenizer) {
        this._tokenizer = tokenizer;
        this._tokens = null;
    }

    // cell => empty | '=' expression EOF | number | string
    parse(text) {
        // empty cell or non-string value
        // TODO: should arbitrary JS values be allowed here or should we just make exceptions for
        // whitelisted types (numbers, strings)?
        if (typeof(text) !== 'string')
            return { parsed: new Value(text), references: [] };

        // formula
        if (text[0] === '=') {
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

    // range => unary
    _parseRange() {
        // NOTE:
        // Currently ranges are allowed only inside function calls, so this function does nothing.
        // In the future, we could make ':' a proper binary operator instead of just part of a range
        // reference, but this would require support for array data types inside cells or for
        // "spilling" cell values into neighboring cells.
        return this._parseUnary();
    }

    // unary => ('+'|'-') unary | value
    _parseUnary() {
        const operation = this._tokens.expect(TokenType.PLUS, TokenType.MINUS);
        return operation !== null
            ? new UnaryOp(operation.value, this._parseUnary())
            : this._parseValue();
    }

    // value => parenthesized | number | string | rangeReference | functionCall | reference
    _parseValue() {
        // parenthesized expression
        if (this._tokens.expect(TokenType.LPAREN))
            return this._finishParenthesized();

        // number
        const number = this._tokens.expect(TokenType.NUMBER)
        if (number !== null)
            return new Value(parseFloat(number.value));

        // string
        const string = this._tokens.expect(TokenType.STRING);
        if (string !== null)
            return this._parseString(string);

        // boolean
        const boolean = this._tokens.expect(TokenType.BOOLEAN);
        if(boolean !== null)
            return new Value(boolean.value === 'TRUE');

        const identifier = this._tokens.expect(TokenType.IDENTIFIER);
        if (identifier !== null) {
            // range reference
            if (this._tokens.expect(TokenType.COLON))
                return this._finishRangeReference(identifier);

            // function call
            if (this._tokens.expect(TokenType.LPAREN))
                return this._finishFunctionCall(identifier);

            // reference
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
        return new Value(this._parseStringEscapes(withoutQuotes));
    }

    _parseStringEscapes(string) {
        let result = '';
        let isEscaped = false;

        for (let char of string) {
            if (!isEscaped) {
                if (char !== '\\') result += char;
                else isEscaped = true;
            } else {
                switch (char) {
                    case '\\':
                    case '"':
                        result += char;
                        break;
                    case 'n':
                        result += '\n';
                        break;
                    default:
                        throw new ParsingError(`Unknown escape sequence '\\${char}'.`);
                }
                isEscaped = false;
            }
        }
        if (isEscaped)
            throw new ParsingError(`'\\' cannot be the last character in a string. Did you mean to escape it ('\\\\')?`);
        return result;
    }

    // rangeReference => IDENTIFIER ':' IDENTIFIER
    _finishRangeReference(start) {
        // start identifier and : are already parsed
        const end = this._tokens.require(TokenType.IDENTIFIER);
        const from = this._parseReference(start.value);
        const to = this._parseReference(end.value);
        return new Range(from, to);
    }

    // functionCall => IDENTIFIER '(' arguments ')'
    _finishFunctionCall(identifier) {
        // NOTE: Currently nested function calls such as FOO()() are not supported.
        // If they were to be added in the future, this would require support for first-class
        // functions as cell values with all the consequences that this includes, such as
        // not knowing what is a function and what not until runtime and making it harder
        // to distinguish cell references from function names.
        const args = this._parseArguments();
        this._tokens.expect(TokenType.RPAREN);
        return new FunctionCall(identifier.value, args);
    }

    // reference => [A-Za-z]+\d+
    _parseReference(reference) {
        const position = Helpers.parsePosition(reference);
        if (position === null)
            throw new ParsingError(`Invalid format of cell reference: ${reference}`);
        return new Reference(Helpers.makePosition(position.col, position.row));
    }

    // arguments => (expression (',' expression)* )?
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
                return [expression.position];
            case UnaryOp:
                return this._referencesIn(expression.value);
            case BinaryOp:
                return [...this._referencesIn(expression.left), ...this._referencesIn(expression.right)];
            case FunctionCall:
                return expression.args.flatMap(arg => this._referencesIn(arg));
            case Range:
                return Helpers.positionsInRange(expression.from.position, expression.to.position)
            default:
                throw new NotImplementedError(`Unknown expression type: ${typeof expression}`);
        }
    }
}