import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import eslintConfigPrettier from 'eslint-config-prettier';

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  eslintConfigPrettier,
  {
    rules: {
      // Code conventions: Array<T> / ReadonlyArray<T>, never T[] or readonly T[].
      '@typescript-eslint/array-type': ['error', { default: 'generic', readonly: 'generic' }],
      // Object shapes are declared with `interface`, never `type X = { ... }`.
      '@typescript-eslint/consistent-type-definitions': ['error', 'interface'],
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
