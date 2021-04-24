// https://eslint.org/docs/rules/
module.exports = {
    extends: 'eslint:recommended',
    rules: {
        'no-console': 2,
        'no-unused-vars': 2,
        'semi': [ 'error', 'always' ]
    },
    globals: {},
    env: {
        browser: false,
        node: true,
        es6: true
    },
    parserOptions: {
        ecmaVersion: 2018,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
            impliedStrict: true
        }
    }
};
