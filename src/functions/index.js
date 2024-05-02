export const builtinFunctions = {
    SUM: function SUM(...args) {
        let sum = 0;
        for (let arg of args.flat()) {
            if (typeof (arg) === 'number')
                sum += arg;
            else if (!(arg === null || arg === undefined))
                throw new Error(`${typeof (arg)} is not a valid argument to SUM(). Expected number, number[], null or undefined.`);
        }
        return sum;
    },

    AVERAGE: function AVERAGE(...args) {
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
        isLazy: true,
        function: function IF(condition, trueBranch, falseBranch) {
            return condition() ? trueBranch() : falseBranch()
        }
    },

    OR: {
        isLazy: true,
        function: function OR(...conditions) {
            if (conditions.length === 0) throw new Error(`OR() expects at least 1 argument.`);
            return conditions.some(condition => condition());
        }
    },

    AND: {
        isLazy: true,
        function: function AND(...conditions) {
            if (conditions.length === 0) throw new Error(`AND() expects at least 1 argument.`);
            return conditions.every(condition => condition());
        }
    },

    NOT: function NOT(boolean, ...rest) {
        if (rest.length !== 0) throw new Error(`NOT() expects exactly 1 argument.`);
        return !boolean;
    },

    PI: function PI() {
        if (arguments.length > 0)
            throw new Error(`PI() expects 0 arguments, got ${arguments.length} arguments.`);
        return 3.141592653589793;
    },

    E: function E() {
        if (arguments.length > 0)
            throw new Error(`E() expects 0 arguments, got ${arguments.length} arguments.`);
        return 2.718281828459045;
    },
};