import globals from 'globals';
import pluginJs from '@eslint/js';
import jest from 'eslint-plugin-jest';


export default [
  {
    languageOptions: { globals: globals.node },
    rules: {
      semi: 'error',
      quotes: ['error', 'single']
    },
  },
  pluginJs.configs.recommended,
  jest.configs['flat/style'],
];
