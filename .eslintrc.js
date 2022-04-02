module.exports = {
  extends: 'erb',
  rules: {
    // A temporary hack related to IDE not resolving correct package.json
    'import/no-extraneous-dependencies': 'off',
    'no-console': 'off',
    'max-classes-per-file': ['error', 3],
    'no-underscore-dangle': 'off',
    'no-loop-func': 'off',
    '@typescript-eslint/no-loop-func': 'off',
    'no-param-reassign': 'off',
    'promise/always-return': 'off',
    'consistent-return': 'off',
    'promise/catch-or-return': 'off',
    'no-continue': 'off',
    'no-shadow': 'off',
    '@typescript-eslint/no-shadow': 'off',
    'import/prefer-default-export': 'off',
    'no-restricted-syntax': 'off',
    'no-await-in-loop': 'off',
    '@typescript-eslint/naming-convention': 'off',
    'react/jsx-props-no-spreading': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'jsx-a11y/no-noninteractive-tabindex': 'off',
    '@typescript-eslint/no-explicit-any': 'off',
    'react/prop-types': 'off',
    'react/no-array-index-key': 'off',
    'no-restricted-properties': 'off',
    'react-hooks/exhaustive-deps': 'off',
    'prefer-const': 'off',
    'prettier/prettier': ['error', { endOfLine: 'auto' }],
    'react/self-closing-comp': 'off',
  },
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
    tsconfigRootDir: __dirname,
    createDefaultProgram: true,
  },
  settings: {
    'import/resolver': {
      // See https://github.com/benmosher/eslint-plugin-import/issues/1396#issuecomment-575727774 for line below
      node: {},
      webpack: {
        config: require.resolve('./.erb/configs/webpack.config.eslint.js'),
      },
    },
    'import/parsers': {
      '@typescript-eslint/parser': ['.ts', '.tsx'],
    },
  },
};
