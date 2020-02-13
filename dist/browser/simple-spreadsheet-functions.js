(function (exports) {
    'use strict';

    const builtinFunctions = {
        SUM: (...args) => {
            let sum = 0;
            for (let arg of args.flat()) {
                if (typeof (arg) === 'number')
                    sum += arg;
                else if (!(arg === null || arg === undefined))
                    throw new Error(`${typeof (arg)} is not a valid argument to SUM(). Expected number, number[], null or undefined.`);
            }
            return sum;
        },

        AVERAGE: (...args) => {
            let sum = 0;
            let count = 0;
            for (let arg of args.flat()) {
                if (typeof (arg) === 'number') {
                    sum += arg;
                    count++;
                } else if (!(arg === null || arg === undefined)) {
                    throw new Error(`${typeof (arg)} is not a valid argument to AVERAGE().`);
                }
            }
            return sum / count;
        },

        IF: {
            isMacro: true,
            function: function(condition, trueBranch, falseBranch) {
                return condition() ? trueBranch() : falseBranch()
            }
        },

        PI: function () {
            if (arguments.length > 0)
                throw new Error(`PI() expects 0 arguments, got ${arguments.length} arguments.`);
            return 3.141592653589793;
        },

        E: function () {
            if (arguments.length > 0)
                throw new Error(`E() expects 0 arguments, got ${arguments.length} arguments.`);
            return 2.718281828459045;
        },
    };

    exports.builtinFunctions = builtinFunctions;

}(this.SimpleSpreadsheet = this.SimpleSpreadsheet || {}));
//# sourceMappingURL=simple-spreadsheet-functions.js.map
