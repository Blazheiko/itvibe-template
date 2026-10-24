import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
    {
        ignores: [
            '**/dist/**',
            '**/node_modules/**',
            '**/*.js',
            '**/*.mjs',
            '**/coverage/**',
            '**/generated/**',
            'documentation/.vitepress/cache/**',
            'eslint.config.ts',
            'packages/backend/vitest.config.ts',
            'packages/backend/vitest.redis.config.ts',
            'packages/backend/vitest.pg.config.ts',
            'packages/backend/drizzle.config.ts',
        ],
    },

    eslint.configs.recommended,

    ...tseslint.configs.strictTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,

    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                extraFileExtensions: ['.vue'],
                tsconfigRootDir: import.meta.dirname,
            },
        },
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'error',
            '@typescript-eslint/explicit-module-boundary-types': 'error',
            '@typescript-eslint/no-explicit-any': 'error',
            '@typescript-eslint/no-unsafe-assignment': 'error',
            '@typescript-eslint/no-unsafe-call': 'error',
            '@typescript-eslint/no-unsafe-member-access': 'error',
            '@typescript-eslint/no-unsafe-return': 'error',
            '@typescript-eslint/strict-boolean-expressions': [
                'error',
                {
                    allowString: false,
                    allowNumber: false,
                    allowNullableObject: false,
                },
            ],
            '@typescript-eslint/switch-exhaustiveness-check': 'error',
            '@typescript-eslint/consistent-type-imports': [
                'error',
                { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
            ],
            '@typescript-eslint/consistent-type-exports': [
                'error',
                { fixMixedExportsWithInlineTypeSpecifier: true },
            ],
            '@typescript-eslint/no-unused-vars': [
                'error',
                { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
            ],
        },
    },
    {
        files: ['packages/api-playground/**/*.{ts,mts,tsx,vue}'],
        rules: {
            '@typescript-eslint/explicit-function-return-type': 'off',
            '@typescript-eslint/explicit-module-boundary-types': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unnecessary-condition': 'off',
            '@typescript-eslint/strict-boolean-expressions': 'off',
            '@typescript-eslint/no-dynamic-delete': 'off',
            '@typescript-eslint/no-redundant-type-constituents': 'off',
            '@typescript-eslint/no-invalid-void-type': 'off',
            '@typescript-eslint/no-unnecessary-type-conversion': 'off',
            '@typescript-eslint/prefer-nullish-coalescing': 'off',
            '@typescript-eslint/prefer-optional-chain': 'off',
            '@typescript-eslint/restrict-template-expressions': 'off',
            '@typescript-eslint/restrict-plus-operands': 'off',
            '@typescript-eslint/switch-exhaustiveness-check': 'off',
            '@typescript-eslint/no-unsafe-enum-comparison': 'off',
            '@typescript-eslint/no-non-null-assertion': 'off',
            '@typescript-eslint/consistent-type-definitions': 'off',
        },
    },
    {
        files: [
            'eslint.config.ts',
            'packages/api-playground/eslint.config.ts',
            'packages/api-playground/vite.sw.config.ts',
            'packages/frontend/eslint.config.ts',
            'packages/frontend/vite.sw.config.ts',
            'packages/backend/vitest.config.ts',
        ],
        languageOptions: {
            parserOptions: {
                projectService: true,
                allowDefaultProject: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    {
        ignores: [
            'packages/api-playground/**/*.vue',
            'packages/frontend/**/*.vue',
            'packages/frontend/vite.sw.config.ts',
        ],
    },
    {
        // Backend tests: mocks and fixtures. Production backend code gets the full rule set.
        files: [
            'packages/backend/**/*.spec.ts',
            'packages/backend/**/*.test.ts',
            'packages/backend/src/test-support/**/*.ts',
        ],
        rules: {
            // Return types of test callbacks and mock factories add noise, not safety.
            '@typescript-eslint/explicit-function-return-type': 'off',
            // Partial fakes of uWS, drizzle and ioredis objects.
            '@typescript-eslint/no-explicit-any': 'off',
            // No-op mocks and async mocks that resolve immediately.
            '@typescript-eslint/no-empty-function': 'off',
            '@typescript-eslint/require-await': 'off',
            // Assertions on fixtures the test has just created.
            '@typescript-eslint/no-non-null-assertion': 'off',
            // Resetting env and mock registries between tests.
            '@typescript-eslint/no-dynamic-delete': 'off',
        },
    },
    {
        files: ['packages/backend/src/app/controllers/types/index.d.ts'],
        rules: {
            '@typescript-eslint/consistent-type-imports': 'off',
            '@typescript-eslint/no-explicit-any': 'off',
        },
    },
    {
        files: ['packages/frontend/src/types/i18n.d.ts'],
        rules: {
            '@typescript-eslint/no-empty-object-type': 'off',
        },
    },
    {
        files: ['packages/backend/drizzle.config.ts'],
        languageOptions: {
            parserOptions: {
                projectService: true,
                allowDefaultProject: true,
            },
        },
    },
    {
        files: ['**/*.spec.ts', '**/*.test.ts'],
        rules: {
            '@typescript-eslint/no-unsafe-assignment': 'off',
            '@typescript-eslint/no-unsafe-call': 'off',
            '@typescript-eslint/no-unsafe-member-access': 'off',
            '@typescript-eslint/no-unsafe-argument': 'off',
            '@typescript-eslint/no-unsafe-return': 'off',
        },
    },
)
