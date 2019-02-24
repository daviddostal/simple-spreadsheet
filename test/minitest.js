(function (window) {
    this.failedTests = 0;
    this.successfulTests = 0;

    window.getTestResults = function () {
        return {
            successfulTests: this.successfulTests,
            failedTests: this.failedTests,
            passed: this.failedTests === 0,
        };
    }

    window.test = function (description, callback) {
        console.log(`${description}:`);
        this.errorCount = 0;
        this.successCount = 0;
        try {
            callback();
        } catch (e) {
            error(`TEST FAILED: ${e.toString()}`);
        }
        console.log(`SUCCEEDED: ${this.successCount}, FAILED: ${this.errorCount}`);
        console.log('');
        if (this.errorCount !== 0)
            this.failedTests += 1;
        else
            this.successfulTests += 1;
    }

    window.expect = function (value) {
        return {
            toBe: function (expected) {
                if (typeof (value) !== typeof (expected)) {
                    error(`Type mismatch - expected (${typeof (expected)}) ${JSON.stringify(expected)}, got (${typeof (value)}) ${JSON.stringify(value)}`);
                    return false;
                } else if (value === expected || (Number.isNaN(value) && Number.isNaN(expected))) {
                    success(`${JSON.stringify(value)} === ${JSON.stringify(expected)}`);
                    return true;
                } else {
                    error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(value)}`);
                    return false;
                }
            },

            toThrow: function (errorType) {
                try {
                    value();
                } catch (ex) {
                    if (ex instanceof errorType) {
                        success(`Throws ${errorType.name}`);
                        return true;
                    } else {
                        error(`Function throws ${ex}, expected ${errorType.name}`);
                        return false;
                    }
                }
                error(`Expected function to throw ${errorType.name}, but no error was thrown`);
                return false;
            },
        }
    }

    function success(message = '') {
        console.log(`%c  ✔ ${message}`, 'background: #efe; color: #000');
        this.successCount++;
    }

    function error(message = '') {
        console.log(`%c  ✘ ${message}`, 'background: #fee; color: #a00');
        this.errorCount++;
    }
})(this);