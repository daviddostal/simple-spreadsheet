var SimpleSpreadsheet =
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/spreadsheet.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/environment.js":
/*!****************************!*\
  !*** ./src/environment.js ***!
  \****************************/
/*! exports provided: RuntimeError, default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "RuntimeError", function() { return RuntimeError; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Environment; });
class RuntimeError extends Error { constructor(message) { super(message); } }

class Environment {
    constructor(cells = {}, builtinFunctions = {}) {
        this.cells = cells
        this.functions = builtinFunctions;
    }

    getEntry(position) {
        return this.cells[position] === undefined ? null : this.cells[position];
    }

    setEntry(position, entry) {
        this.cells[position] = entry;
    }

    getFunction(name) {
        if (this.functions[name] === undefined)
            throw new Error(`Unknown function: ${name}`);
        return this.functions[name];
    }
}

/***/ }),

/***/ "./src/evaluator.js":
/*!**************************!*\
  !*** ./src/evaluator.js ***!
  \**************************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Evaluator; });
/* harmony import */ var _environment__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./environment */ "./src/environment.js");
/* harmony import */ var _expressions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./expressions */ "./src/expressions.js");



class Evaluator {
    evaluateCell(cell, environment) {
        switch (cell.constructor) {
            case _expressions__WEBPACK_IMPORTED_MODULE_1__["Value"]:
                return cell.value;
            case _expressions__WEBPACK_IMPORTED_MODULE_1__["Reference"]:
                const entry = environment.getEntry(cell.position) || new _expressions__WEBPACK_IMPORTED_MODULE_1__["Value"](null);
                return this.evaluateCell(entry, environment);
            case _expressions__WEBPACK_IMPORTED_MODULE_1__["BinaryOp"]:
                return this.evaluateBinary(cell.left, cell.op, cell.right, environment);
            case _expressions__WEBPACK_IMPORTED_MODULE_1__["FunctionCall"]:
                return this.evaluateFunction(cell.functionName, cell.args, environment);
            case _expressions__WEBPACK_IMPORTED_MODULE_1__["Range"]:
                throw new _environment__WEBPACK_IMPORTED_MODULE_0__["RuntimeError"](`Range references are allowed only as arguments of functions`);
            default:
                throw new _environment__WEBPACK_IMPORTED_MODULE_0__["RuntimeError"](`Unknown expression type: ${typeof cell}`);
        }
    }

    evaluateExpression(value, environment) {
        switch (value.constructor) {
            case _expressions__WEBPACK_IMPORTED_MODULE_1__["Range"]: return this.evaluateRange(value.from, value.to, environment);
            default: return this.evaluateCell(value, environment);
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
            default: throw new _environment__WEBPACK_IMPORTED_MODULE_0__["RuntimeError"](`Unknown binary operator: ${op.type}`);
        }
    }

    evaluateFunction(functionName, args, environment) {
        const argumentValues = args.map(arg => this.evaluateExpression(arg, environment));
        const func = environment.getFunction(functionName);
        try {
            return func(...argumentValues);
        } catch (ex) {
            throw new _environment__WEBPACK_IMPORTED_MODULE_0__["RuntimeError"](`Error in function ${functionName}: ${ex}`);
        }
    }

    evaluateRange(from, to, environment) {
        const cells = this._cellsInRange(from, to);
        const cellValues = cells.map(cell => this.evaluateCell(cell, environment));
        return cellValues;
    }

    _cellsInRange(from, to) {
        if (from.col === to.col)
            return this._range(from.row, to.row)
                .map(row => new _expressions__WEBPACK_IMPORTED_MODULE_1__["Reference"](from.col, row));
        else if (from.row === to.row)
            return this._range(from.col.charCodeAt(0), to.col.charCodeAt(0))
                .map(col => new _expressions__WEBPACK_IMPORTED_MODULE_1__["Reference"](String.fromCharCode(col), from.row));
        else
            throw new _environment__WEBPACK_IMPORTED_MODULE_0__["RuntimeError"](`Range must be in same row or column. From: ${from}, To: ${to}`);
    }

    _range(from, to) {
        return from <= to
            ? Array.from({ length: to - from + 1 }, (_, i) => i + from)
            : Array.from({ length: from - to + 1 }, (_, i) => from - i);
    }
}


/***/ }),

/***/ "./src/expressions.js":
/*!****************************!*\
  !*** ./src/expressions.js ***!
  \****************************/
/*! exports provided: Expression, Value, Reference, BinaryOp, UnaryOp, FunctionCall, Range */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Expression", function() { return Expression; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Value", function() { return Value; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Reference", function() { return Reference; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "BinaryOp", function() { return BinaryOp; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "UnaryOp", function() { return UnaryOp; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "FunctionCall", function() { return FunctionCall; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Range", function() { return Range; });
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

/***/ }),

/***/ "./src/parser.js":
/*!***********************!*\
  !*** ./src/parser.js ***!
  \***********************/
/*! exports provided: default */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "default", function() { return Parser; });
/* harmony import */ var _tokenizer__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./tokenizer */ "./src/tokenizer.js");
/* harmony import */ var _expressions__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./expressions */ "./src/expressions.js");



class Parser {
    constructor(tokenizer) {
        this.tokens = tokenizer;
    }

    parse(text) {
        if (text === null) return new _expressions__WEBPACK_IMPORTED_MODULE_1__["Value"](null);
        this.tokens.begin(text);
        const result = this.parseCell();
        return result;
    }

    // Cell -> Expression | simple value (string or number)
    parseCell() {
        if (this.tokens.remaining.startsWith('=')) {
            this._expectAny(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].EQUALS);
            const result = this.parseExpression();
            this._require(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].EOF);
            return result;
        } else {
            const value = this.tokens.rest();
            if (value.match(/^\d+(?:\.\d+)?$/)) return new _expressions__WEBPACK_IMPORTED_MODULE_1__["Value"](parseFloat(value));
            else return new _expressions__WEBPACK_IMPORTED_MODULE_1__["Value"](value);
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
        while ((operation = this._expectAny(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].PLUS, _tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].MINUS)) !== null) {
            left = new _expressions__WEBPACK_IMPORTED_MODULE_1__["BinaryOp"](left, operation.value, this.parseFactor());
        }
        return left;
    }

    // Factor -> Unary ([*/] Unary)*
    parseFactor() {
        let left = this.parseUnary();
        let operation;
        while ((operation = this._expectAny(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].STAR, _tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].SLASH)) !== null) {
            left = new _expressions__WEBPACK_IMPORTED_MODULE_1__["BinaryOp"](left, operation.value, this.parseUnary());
        }
        return left;
    }

    // Unary -> [+-] Unary | Value
    parseUnary() {
        let operation = this._expectAny(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].PLUS, _tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].MINUS);
        return operation !== null
            ? new _expressions__WEBPACK_IMPORTED_MODULE_1__["UnaryOp"](operation.value, this.parseUnary())
            : this.parseValue();
    }

    // Value -> Identifier | number | string | ( Expression ) | RangeReference
    parseValue() {
        // Parenthesized expression
        if (this._expectAny(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].LPAREN)) {
            const contents = this.parseExpression();
            this._require(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].RPAREN);
            return contents;
        }

        // Number
        const number = this._expectAny(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].NUMBER)
        if (number !== null) { return new _expressions__WEBPACK_IMPORTED_MODULE_1__["Value"](parseFloat(number.value)); }

        // String
        const string = this._expectAny(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].STRING);
        if (string !== null) { return new _expressions__WEBPACK_IMPORTED_MODULE_1__["Value"](string.value.substring(1, string.value.length - 1)); }

        const identifier = this._require(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].IDENTIFIER);
        // Range
        if (identifier !== null && this._expectAny(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].COLON)) {
            const endIdentifier = this._require(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].IDENTIFIER);
            const from = this._parseReference(identifier.value);
            const to = this._parseReference(endIdentifier.value);
            if (!(from.col === to.col || from.row === to.row))
                throw new _tokenizer__WEBPACK_IMPORTED_MODULE_0__["ParsingError"](`Range start and end not in same column or row: ${identifier.value}:${endIdentifier.value}`);
            return new _expressions__WEBPACK_IMPORTED_MODULE_1__["Range"](from, to);
        }

        // Function call
        if (this._expectAny(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].LPAREN)) {
            let value = identifier.value;
            do {
                const args = this.parseArguments();
                value = new _expressions__WEBPACK_IMPORTED_MODULE_1__["FunctionCall"](value, args);
            } while (this._expectAny(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].LPAREN))
            return value;
        }

        // Reference
        return this._parseReference(identifier.value);
    }

    // Reference -> [A-Za-z]+\d+
    _parseReference(reference) {
        const referenceParts = reference.match(/^([A-Za-z]+)(\d+)$/);
        if (referenceParts === null)
            throw new _tokenizer__WEBPACK_IMPORTED_MODULE_0__["ParsingError"](`Invalid format of cell reference: ${reference}`);
        return new _expressions__WEBPACK_IMPORTED_MODULE_1__["Reference"](referenceParts[1], parseInt(referenceParts[2]));
    }

    // Arguments -> (Expression (, Expression)*)?
    parseArguments() {
        const args = [];
        while (!this._expectAny(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].RPAREN)) {
            if (args.length != 0)
                this._require(_tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].COMMA);
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
            throw new _tokenizer__WEBPACK_IMPORTED_MODULE_0__["ParsingError"](`Expected ${type}, got ${this.tokens.peek().type} instead`);
        else
            return next;
    }

    _next() {
        let current = this.tokens.peek();
        while (current.type === _tokenizer__WEBPACK_IMPORTED_MODULE_0__["TokenType"].WHITESPACE) {
            this.tokens.next();
            current = this.tokens.peek();
        }
        return current;
    }
}

/***/ }),

/***/ "./src/spreadsheet.js":
/*!****************************!*\
  !*** ./src/spreadsheet.js ***!
  \****************************/
/*! exports provided: Spreadsheet */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Spreadsheet", function() { return Spreadsheet; });
/* harmony import */ var _tokenizer__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__(/*! ./tokenizer */ "./src/tokenizer.js");
/* harmony import */ var _parser__WEBPACK_IMPORTED_MODULE_1__ = __webpack_require__(/*! ./parser */ "./src/parser.js");
/* harmony import */ var _environment__WEBPACK_IMPORTED_MODULE_2__ = __webpack_require__(/*! ./environment */ "./src/environment.js");
/* harmony import */ var _evaluator__WEBPACK_IMPORTED_MODULE_3__ = __webpack_require__(/*! ./evaluator */ "./src/evaluator.js");





class Spreadsheet {
    constructor(cells = {}) {
        this._parser = new _parser__WEBPACK_IMPORTED_MODULE_1__["default"](new _tokenizer__WEBPACK_IMPORTED_MODULE_0__["Tokenizer"]());
        this._evaluator = new _evaluator__WEBPACK_IMPORTED_MODULE_3__["default"]();

        this.cells = cells;

        this.builtinFunctions = {
            SUM: (...values) =>
                values.flat().reduce((a, b) => a + b, 0),
            AVERAGE: (...values) =>
                values.flat().reduce((a, b) => a + b, 0) / values.flat().length,
        };

        const parsedExpressions = this._mapValues(this.cells, cell => {
            try {
                return this._parser.parse(cell);
            } catch (ex) {
                if (ex instanceof _tokenizer__WEBPACK_IMPORTED_MODULE_0__["ParsingError"]) return ex;
                else throw ex;
            }
        });
        this.environment = new _environment__WEBPACK_IMPORTED_MODULE_2__["default"](parsedExpressions, this.builtinFunctions);
    }

    text(position) {
        return this.cells[position] === undefined ? "" : this.cells[position];
    }

    value(position) {
        return this._evaluator.evaluateCell(this._expression(position), this.environment);
    }

    _expression(position) {
        const value = this.environment.getEntry(position);
        if(value instanceof _tokenizer__WEBPACK_IMPORTED_MODULE_0__["ParsingError"]) throw value;
        else return value;
        // const value = this.cells[position] === undefined ? null : this.cells[position];;
        // return this._parser.parse(value);
    }

    _mapValues(obj, fn) {
        const result = {};
        for (let prop in obj) {
            result[prop] = fn(obj[prop]);
        }
        return result;
    }
}

/***/ }),

/***/ "./src/tokenizer.js":
/*!**************************!*\
  !*** ./src/tokenizer.js ***!
  \**************************/
/*! exports provided: ParsingError, TokenType, Tokenizer */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
__webpack_require__.r(__webpack_exports__);
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "ParsingError", function() { return ParsingError; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "TokenType", function() { return TokenType; });
/* harmony export (binding) */ __webpack_require__.d(__webpack_exports__, "Tokenizer", function() { return Tokenizer; });
class ParsingError extends Error {
    constructor(message) { super(message); }
    toString() { return `ParsingError: ${this.message}`; }
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

/***/ })

/******/ });
//# sourceMappingURL=simple-spreadsheet.js.map