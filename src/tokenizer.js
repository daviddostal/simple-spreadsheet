export class ParsingError extends Error {
    constructor(message) { super(message); }
    toString() { return `ParsingError: ${this.message}`; }
}

export const TokenType = Object.freeze({
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

export class Tokenizer {
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