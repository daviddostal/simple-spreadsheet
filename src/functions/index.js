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
            if(arguments.length !== 3) throw new Error(`IF() function requires 3 arguments.`);
            const conditionResult = condition();
            if (typeof (conditionResult) !== 'boolean')
                throw new Error(`Condition must be a boolean, got ${typeof (conditionResult)}`);
            return condition() ? trueBranch() : falseBranch()
        }
    },

    OR: {
        isLazy: true,
        function: function OR(...conditions) {
            if (conditions.length === 0) throw new Error(`OR() expects at least 1 argument.`);
            for (let i = 0; i < conditions.length; i++) {
                const condition = conditions[i];
                const conditionResult = condition();
                if (typeof (conditionResult) !== 'boolean')
                    throw new Error(`All arguments of OR() must be booleans, but argument ${i + 1} has type ${typeof (conditionResult)}.`);
                if(conditionResult === true) return true;
            }
            return false;
        }
    },

    AND: {
        isLazy: true,
        function: function AND(...conditions) {
            if (conditions.length === 0) throw new Error(`AND() expects at least 1 argument.`);
            for (let i = 0; i < conditions.length; i++) {
                const condition = conditions[i];
                const conditionResult = condition();
                if (typeof (conditionResult) !== 'boolean')
                    throw new Error(`All arguments of AND() must be booleans, but argument ${i + 1} has type ${typeof (conditionResult)}.`);
                if(conditionResult === false) return false;
            }
            return true;
        }
    },

    NOT: function NOT(boolean, ...rest) {
        if (rest.length !== 0) throw new Error(`NOT() expects exactly 1 argument.`);
        if(typeof(boolean) !== 'boolean')
            throw new Error(`NOT() expects a boolean, got ${typeof(boolean)}`);
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