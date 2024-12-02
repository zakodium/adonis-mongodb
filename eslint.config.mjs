import { globals } from 'eslint-config-zakodium';
import adonisV5 from 'eslint-config-zakodium/adonis-v5';
import ts from 'eslint-config-zakodium/ts';
import unicorn from 'eslint-config-zakodium/unicorn';

export default [
  {
    ignores: ['lib', 'coverage'],
  },
  ...ts,
  ...unicorn,
  ...adonisV5,
  {
    languageOptions: {
      globals: {
        ...globals.nodeBuiltin,
      },
    },
    rules: {
      'no-await-in-loop': 'off',
      '@typescript-eslint/use-unknown-in-catch-callback-variable': 'off',
      'unicorn/prefer-event-target': 'off',
    },
  },
];
