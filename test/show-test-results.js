const testResults = getTestResults();
console.log('ALL TESTS PASSED: ', testResults.passed);
document.addEventListener('DOMContentLoaded', function () {
    if (!testResults.passed) {
        document.body.insertAdjacentHTML('beforeend',
            '<div data-test-result="failed"></div>');
    } else {
        document.body.insertAdjacentHTML('beforeend',
            '<div data-test-result="succeeded"></div>');
    }
});