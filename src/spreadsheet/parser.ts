import { Token, TokenType, Tokenizer } from './tokenizer';
import { ParsingError, NotImplementedError } from './errors';
import { Value, Reference, BinaryOp, UnaryOp, Range, FunctionCall, Expression } from './expressions';
import * as Helpers from './helpers';
import TokenStream from './tokenStream';
import { CellContent, CellPosition } from './types';

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
    private _tokenizer: Tokenizer;

    constructor(tokenizer: Tokenizer) {
        this._tokenizer = tokenizer;
    }

    // cell => empty | '=' expression EOF | number | string
    parse(text: CellContent): { parsed: Expression, references: CellPosition[] } {
        // empty cell or non-string value
        // TODO: should arbitrary JS values be allowed here or should we just make exceptions for
        // whitelisted types (numbers, strings)?
        if (typeof (text) !== 'string')
            return { parsed: new Value(text), references: [] };

        // formula
        if (text[0] === '=') {
            const tokens = this._tokenizer.tokenize(text);
            tokens.require(TokenType.EQUALS);
            const parsed = this._parseExpression(tokens);
            tokens.require(TokenType.EOF);
            const references = this._referencesIn(parsed);
            return { parsed, references };
        }

        // number
        if (text.match(/^[+-]?\d+(?:\.\d+)?$/))
            return { parsed: new Value(parseFloat(text)), references: [] };

        // string
        return { parsed: new Value(text), references: [] };
    }

    // expression => comparison
    private _parseExpression(tokens: TokenStream): Expression {
        return this._parseComparison(tokens);
    }

    // comparison => term (('+'|'-') term)*
    private _parseComparison(tokens: TokenStream): Expression {
        return this._parseBinaryOperation(
            tokens,
            [
                TokenType.EQUALS, TokenType.NOT_EQUAL,
                TokenType.GREATER_THAN, TokenType.LESS_THAN,
                TokenType.GREATER_OR_EQUAL, TokenType.LESS_OR_EQUAL
            ],
            () => this._parseTerm(tokens),
        )
    }

    // term => factor (('+'|'-') factor)*
    private _parseTerm(tokens: TokenStream): Expression {
        return this._parseBinaryOperation(
            tokens,
            [TokenType.PLUS, TokenType.MINUS],
            () => this._parseFactor(tokens),
        );
    }

    // factor => unary (('*'|'/') unary)*
    private _parseFactor(tokens: TokenStream): Expression {
        return this._parseBinaryOperation(
            tokens,
            [TokenType.STAR, TokenType.SLASH],
            () => this._parseRange(tokens),
        );
    }

    // range => unary
    private _parseRange(tokens: TokenStream): Expression {
        // NOTE:
        // Currently ranges are allowed only inside function calls, so this function does nothing.
        // In the future, we could make ':' a proper binary operator instead of just part of a range
        // reference, but this would require support for array data types inside cells or for
        // "spilling" cell values into neighboring cells.
        return this._parseUnary(tokens);
    }

    // unary => ('+'|'-') unary | value
    private _parseUnary(tokens: TokenStream): Expression {
        const operation = tokens.expect(TokenType.PLUS, TokenType.MINUS);
        return operation !== null
            ? new UnaryOp(operation.value, this._parseUnary(tokens))
            : this._parseValue(tokens);
    }

    // value => parenthesized | number | string | rangeReference | functionCall | reference
    private _parseValue(tokens: TokenStream): Expression {
        // parenthesized expression
        if (tokens.expect(TokenType.LPAREN))
            return this._finishParenthesized(tokens);

        // number
        const number = tokens.expect(TokenType.NUMBER)
        if (number !== null)
            return new Value(parseFloat(number.value));

        // string
        const string = tokens.expect(TokenType.STRING);
        if (string !== null)
            return this._parseString(string);

        // boolean
        const boolean = tokens.expect(TokenType.BOOLEAN);
        if (boolean !== null)
            return new Value(boolean.value === 'TRUE');

        const identifier = tokens.expect(TokenType.IDENTIFIER);
        if (identifier !== null) {
            // range reference
            if (tokens.expect(TokenType.COLON))
                return this._finishRangeReference(tokens, identifier);

            // function call
            if (tokens.expect(TokenType.LPAREN))
                return this._finishFunctionCall(tokens, identifier);

            // reference
            return this._parseReference(identifier.value);
        }
        throw new ParsingError(`Unexpected ${tokens.peek().type}, expected an expression or value`)
    }

    // parenthesized => '(' expression ')'
    private _finishParenthesized(tokens: TokenStream): Expression {
        const contents = this._parseExpression(tokens);
        tokens.require(TokenType.RPAREN);
        return contents;
    }

    private _parseString(string: Token): Expression {
        const withoutQuotes = string.value.substring(1, string.value.length - 1);
        return new Value(this._parseStringEscapes(withoutQuotes));
    }

    private _parseStringEscapes(string: string): string {
        let result = '';
        let isEscaped = false;

        for (const char of string) {
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
    private _finishRangeReference(tokens: TokenStream, start: Token): Range {
        // start identifier and : are already parsed
        const end = tokens.require(TokenType.IDENTIFIER);
        const from = this._parseReference(start.value);
        const to = this._parseReference(end.value);
        return new Range(from, to);
    }

    // functionCall => IDENTIFIER '(' arguments ')'
    private _finishFunctionCall(tokens: TokenStream, identifier: Token): FunctionCall {
        // NOTE: Currently nested function calls such as FOO()() are not supported.
        // If they were to be added in the future, this would require support for first-class
        // functions as cell values with all the consequences that this includes, such as
        // not knowing what is a function and what not until runtime and making it harder
        // to distinguish cell references from function names.
        const args = this._parseArguments(tokens);
        tokens.expect(TokenType.RPAREN);
        return new FunctionCall(identifier.value, args);
    }

    // reference => [A-Za-z]+\d+
    private _parseReference(reference: string): Reference {
        const position = Helpers.tryParsePosition(reference);
        if (position === null)
            throw new ParsingError(`Invalid format of cell reference: ${reference}`);
        return new Reference(Helpers.makePosition(position.col, position.row));
    }

    // arguments => (expression (',' expression)* )?
    private _parseArguments(tokens: TokenStream): Expression[] {
        const args = [];
        while (tokens.peek().type !== TokenType.RPAREN) {
            if (args.length != 0)
                tokens.require(TokenType.COMMA);
            args.push(this._parseExpression(tokens));
        }
        return args;
    }

    private _parseBinaryOperation(tokens: TokenStream, operators: TokenType[], parseHigherPrecedence: () => Expression): Expression {
        let left = parseHigherPrecedence();
        let operation;
        while ((operation = tokens.expect(...operators)) !== null) {
            left = new BinaryOp(left, operation.value, parseHigherPrecedence());
        }
        return left;
    }

    private _referencesIn(expression: Expression): CellPosition[] {
        if (expression instanceof Value)
            return [];
        else if (expression instanceof Reference)
            return [expression.position];
        else if (expression instanceof UnaryOp)
            return this._referencesIn(expression.value);
        else if (expression instanceof BinaryOp)
            return [...this._referencesIn(expression.left), ...this._referencesIn(expression.right)];
        else if (expression instanceof FunctionCall)
            return expression.args.flatMap(arg => this._referencesIn(arg));
        else if (expression instanceof Range)
            return Helpers.positionsInRange(expression.from.position, expression.to.position);
        else
            throw new NotImplementedError(`Unknown expression type: ${typeof expression}`);
    }
}