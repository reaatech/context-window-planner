/**
 * Agent Skill: Building and Packaging
 * 
 * This skill defines patterns and procedures for building and packaging
 * the context-window-planner library.
 */

export const skill = {
  name: 'build',
  description: 'Building and packaging the library',
  version: '1.0.0',
};

/**
 * Build configuration for tsup
 */
export function createTsupConfig() {
  return {
    type: 'file',
    name: 'packages/core/tsup.config.ts',
    content: `/**
 * tsup configuration for context-window-planner core package.
 * 
 * @see https://tsup.egoist.dev/
 */

import { defineConfig } from 'tsup';

export default defineConfig({
  // Entry point
  entry: ['src/index.ts'],

  // Output formats
  format: ['esm', 'cjs'],

  // Generate declaration files
  dts: true,

  // Generate source maps
  sourcemap: true,

  // Clean output directory before build
  clean: true,

  // Split output into multiple files
  splitting: false,

  // Minify output
  minify: false,

  // Keep names for better debugging
  keepNames: true,

  // External packages (don't bundle these)
  external: [
    // Peer dependencies should be external
  ],

  // Inject CSS (not needed for this library)
  injectStyle: false,

  // Target environment
  target: 'node18',

  // Treeshake unused code
  treeshake: true,

  // Out directory
  outDir: 'dist',
});
`,
  };
}

/**
 * Package.json scripts for building
 */
export function createPackageScripts() {
  return {
    type: 'file',
    name: 'packages/core/package.json',
    content: `{
  "name": "context-window-planner",
  "version": "0.1.0",
  "description": "Optimize token allocation within LLM context windows",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.js"
      },
      "require": {
        "types": "./dist/index.d.ts",
        "default": "./dist/index.cjs"
      }
    }
  },
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "license": "MIT",
  "author": "reaatech",
  "homepage": "https://github.com/reaatech/context-window-planner#readme",
  "repository": {
    "type": "git",
    "url": "https://github.com/reaatech/context-window-planner.git",
    "directory": "packages/core"
  },
  "bugs": {
    "url": "https://github.com/reaatech/context-window-planner/issues"
  },
  "keywords": [
    "llm",
    "context-window",
    "token-budget",
    "packing",
    "rag",
    "conversation",
    "typescript"
  ],
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "test:ui": "vitest --ui",
    "lint": "eslint src test --ext .ts",
    "lint:fix": "eslint src test --ext .ts --fix",
    "typecheck": "tsc --noEmit",
    "prepublishOnly": "pnpm run build",
    "clean": "rm -rf dist"
  },
  "dependencies": {},
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@vitest/coverage-v8": "^1.2.0",
    "eslint": "^8.56.0",
    "tsup": "^8.0.1",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0"
  },
  "peerDependencies": {},
  "engines": {
    "node": ">=18.0.0"
  },
  "sideEffects": false
}
`,
  };
}

/**
 * Root package.json for workspace
 */
export function createRootPackageJson() {
  return {
    type: 'file',
    name: 'package.json',
    content: `{
  "name": "context-window-planner-monorepo",
  "version": "0.1.0",
  "private": true,
  "description": "Optimize token allocation within LLM context windows",
  "type": "module",
  "license": "MIT",
  "author": "reaatech",
  "homepage": "https://github.com/reaatech/context-window-planner#readme",
  "repository": {
    "type": "git",
    "url": "https://github.com/reaatech/context-window-planner.git"
  },
  "bugs": {
    "url": "https://github.com/reaatech/context-window-planner/issues"
  },
  "scripts": {
    "build": "pnpm -r run build",
    "dev": "pnpm -r run dev",
    "test": "pnpm -r run test",
    "test:coverage": "pnpm -r run test:coverage",
    "lint": "pnpm -r run lint",
    "lint:fix": "pnpm -r run lint:fix",
    "typecheck": "pnpm -r run typecheck",
    "clean": "pnpm -r run clean",
    "prepare": "husky"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@typescript-eslint/eslint-plugin": "^6.19.0",
    "@typescript-eslint/parser": "^6.19.0",
    "@fast-check/vitest": "^0.1.0",
    "eslint": "^8.56.0",
    "eslint-config-prettier": "^9.1.0",
    "eslint-plugin-import": "^2.29.1",
    "husky": "^9.0.6",
    "lint-staged": "^15.2.0",
    "prettier": "^3.2.4",
    "typescript": "^5.3.3",
    "vitest": "^1.2.0",
    "@vitest/coverage-v8": "^1.2.0",
    "tsup": "^8.0.1"
  },
  "engines": {
    "node": ">=18.0.0",
    "pnpm": ">=8.0.0"
  },
  "packageManager": "pnpm@8.15.0"
}
`,
  };
}

/**
 * ESLint flat configuration
 */
export function createEslintConfig() {
  return {
    type: 'file',
    name: 'eslint.config.mjs',
    content: `import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...tseslint.configs.stylistic,
  importPlugin.flatConfigs.recommended,
  prettierConfig,
  {
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: './tsconfig.base.json',
      },
    },
    rules: {
      // TypeScript specific
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports' },
      ],

      // Import ordering
      'import/order': [
        'error',
        {
          groups: [
            'builtin',
            'external',
            'internal',
            ['parent', 'sibling'],
            'index',
          ],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],

      // General
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      curly: ['error', 'all'],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-console': 'off',
    },
  },
  {
    ignores: ['node_modules', 'dist', 'coverage', '*.js', '*.d.ts'],
  },
);
`,
  };
}

/**
 * Prettier configuration
 */
export function createPrettierConfig() {
  return {
    type: 'file',
    name: '.prettierrc',
    content: `{
  "semi": true,
  "trailingComma": "all",
  "singleQuote": true,
  "printWidth": 100,
  "tabWidth": 2,
  "useTabs": false,
  "bracketSpacing": true,
  "arrowParens": "always",
  "endOfLine": "lf",
  "overrides": [
    {
      "files": "*.json",
      "options": {
        "printWidth": 120
      }
    },
    {
      "files": "*.md",
      "options": {
        "printWidth": 80,
        "proseWrap": "always"
      }
    }
  ]
}
`,
  };
}

/**
 * TypeScript base configuration
 */
export function createTsConfig() {
  return {
    type: 'file',
    name: 'tsconfig.base.json',
    content: `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    
    // Strict type checking
    "strict": true,
    "noImplicitAny": true,
    "strictNullChecks": true,
    "strictFunctionTypes": true,
    "strictBindCallApply": true,
    "strictPropertyInitialization": true,
    "noImplicitThis": true,
    "alwaysStrict": true,
    
    // Additional checks
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "exactOptionalPropertyTypes": true,
    
    // Module settings
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    
    // Source maps
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    
    // Paths (for monorepo)
    "baseUrl": "."
  },
  "exclude": [
    "node_modules",
    "dist",
    "coverage",
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
`,
  };
}

/**
 * Create .gitignore
 */
export function createGitignore() {
  return {
    type: 'file',
    name: '.gitignore',
    content: `# Dependencies
node_modules/
.pnpm-store/

# Build outputs
dist/
build/
*.tsbuildinfo

# Coverage
coverage/

# Logs
logs/
*.log
npm-debug.log*
pnpm-debug.log*

# IDE
.idea/
.vscode/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Environment
.env
.env.local

# Temporary
tmp/
temp/
*.tmp
`,
  };
}

/**
 * Generate all build configuration files
 */
export function generateBuildFiles() {
  const files = {};

  const tsupConfig = createTsupConfig();
  const packageScripts = createPackageScripts();
  const rootPackage = createRootPackageJson();
  const eslintConfig = createEslintConfig();
  const prettierConfig = createPrettierConfig();
  const tsConfig = createTsConfig();
  const gitignore = createGitignore();

  files[tsupConfig.name] = tsupConfig.content;
  files[packageScripts.name] = packageScripts.content;
  files[rootPackage.name] = rootPackage.content;
  files[eslintConfig.name] = eslintConfig.content;
  files[prettierConfig.name] = prettierConfig.content;
  files[tsConfig.name] = tsConfig.content;
  files[gitignore.name] = gitignore.content;

  return files;
}

export default skill;
