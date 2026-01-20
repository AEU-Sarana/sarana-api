const { flatConfigs } = require('@typescript-eslint/eslint-plugin/use-at-your-own-risk/raw-plugin');

module.exports = [
  { ignores: ['dist/', 'node_modules/', '*.cjs'] },
  ...flatConfigs['flat/recommended'],
  {
    files: ['**/*.ts'],
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
];