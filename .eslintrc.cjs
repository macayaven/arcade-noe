module.exports = {
  root: true,
  extends: ['airbnb-base'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint', 'import'],
  env: {
    node: true,
    es2020: true,
  },
  globals: {
    vitest: true,
    describe: true,
    it: true,
    expect: true,
    beforeEach: true,
    afterEach: true,
    beforeAll: true,
    afterAll: true,
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.base.json',
  },
  settings: {
    'import/resolver': {
      node: {
        extensions: ['.js', '.jsx', '.ts', '.tsx'],
      },
      // Enable eslint-plugin-import to resolve TypeScript paths/types properly
      typescript: {
        project: './tsconfig.base.json',
      },
    },
  },
  rules: {
    'import/extensions': 'off',
    'import/no-unresolved': 'off',
    'import/prefer-default-export': 'off',
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': ['error'],
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': ['error'],
    'no-useless-constructor': 'off',
  },
  overrides: [
    {
      files: ['**/*.test.ts'],
      env: {
        node: true,
      },
    },
  ],
};
