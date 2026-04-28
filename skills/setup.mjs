/**
 * Agent Skill: Project Setup
 * 
 * This skill defines the patterns and procedures for initializing and configuring
 * the context-window-planner project environment.
 */

export const skill = {
  name: 'setup',
  description: 'Project initialization and environment setup',
  version: '1.0.0',
};

/**
 * Initialize a new pnpm workspace project
 */
export function initializeWorkspace() {
  return {
    steps: [
      {
        id: 'init-pnpm',
        description: 'Initialize pnpm workspace',
        commands: [
          'pnpm init',
        ],
        files: {
          'pnpm-workspace.yaml': `packages:
  - 'packages/*'`,
        },
      },
      {
        id: 'init-typescript',
        description: 'Configure TypeScript',
        commands: [
          'pnpm add -wD typescript',
        ],
        files: {
          'tsconfig.base.json': `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitThis": true,
    "exactOptionalPropertyTypes": true
  }
}`,
        },
      },
      {
        id: 'init-tooling',
        description: 'Add development tooling',
        commands: [
          'pnpm add -wD eslint prettier husky lint-staged',
          'pnpm add -wD vitest @vitest/coverage-v8',
          'pnpm add -wD tsup',
          'pnpm add -wD @types/node',
        ],
      },
      {
        id: 'init-git',
        description: 'Initialize Git repository',
        commands: [
          'git init',
          'git branch -M main',
        ],
      },
      {
        id: 'create-gitignore',
        description: 'Create .gitignore',
        files: {
          '.gitignore': `# Dependencies
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
        },
      },
      {
        id: 'init-husky',
        description: 'Initialize husky v9 pre-commit hooks',
        commands: [
          'npx husky init',
        ],
        files: {
          '.husky/pre-commit': `pnpm lint-staged
`,
        },
      },
    ],
  };
}

/**
 * Create a new package in the workspace
 */
export function createPackage(name, options = {}) {
  const { type = 'lib', description = '' } = options;
  
  return {
    steps: [
      {
        id: 'create-package-dir',
        description: `Create packages/${name} directory`,
        commands: [
          `mkdir -p packages/${name}`,
        ],
      },
      {
        id: 'init-package-json',
        description: 'Initialize package.json',
        files: {
          [`packages/${name}/package.json`]: `{
  "name": "${name}",
  "version": "0.0.1",
  "description": "${description || `A ${type} package for context-window-planner`}",
  "type": "module",
  "main": "./dist/index.js",
  "types": "./dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/reaatech/context-window-planner.git",
    "directory": "packages/${name}"
  },
  "scripts": {
    "build": "tsup src/index.ts --format esm --dts",
    "dev": "tsup src/index.ts --format esm --watch --dts",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage",
    "lint": "eslint src --ext .ts",
    "typecheck": "tsc --noEmit"
  },
  "peerDependencies": {},
  "devDependencies": {}
}`,
        },
      },
      {
        id: 'create-tsconfig',
        description: 'Create package tsconfig.json',
        files: {
          [`packages/${name}/tsconfig.json`]: `{
  "extends": "../../tsconfig.base.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "test"]
}`,
        },
      },
      {
        id: 'create-src-dir',
        description: 'Create source directory structure',
        commands: [
          `mkdir -p packages/${name}/src`,
          `touch packages/${name}/src/index.ts`,
        ],
      },
      {
        id: 'create-vitest-config',
        description: 'Create Vitest configuration',
        files: {
          [`packages/${name}/vitest.config.ts`]: `import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      thresholds: {
        global: {
          statements: 90,
          branches: 90,
          functions: 90,
          lines: 90,
        },
      },
    },
  },
});`,
        },
      },
    ],
  };
}

/**
 * Setup pre-commit hooks with lint-staged
 */
export function setupPreCommitHooks() {
  return {
    steps: [
      {
        id: 'create-lintstagedrc',
        description: 'Create .lintstagedrc configuration',
        files: {
          '.lintstagedrc': `{
  "*.ts": ["eslint --fix", "prettier --write"],
  "*.{json,md}": ["prettier --write"]
}`,
        },
      },
      {
        id: 'verify-husky',
        description: 'Ensure husky pre-commit hook exists',
        commands: [
          'test -f .husky/pre-commit || echo "pnpm lint-staged" > .husky/pre-commit',
        ],
      },
    ],
  };
}

/**
 * Initialize GitHub repository settings
 */
export function initGitHub() {
  return {
    steps: [
      {
        id: 'create-github-dirs',
        description: 'Create GitHub configuration directories',
        commands: [
          'mkdir -p .github/workflows',
          'mkdir -p .github/ISSUE_TEMPLATE',
        ],
      },
      {
        id: 'create-ci-workflow',
        description: 'Create CI workflow',
        files: {
          '.github/workflows/ci.yml': `name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js \${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: \${{ matrix.node-version }}
      - name: Install pnpm
        uses: pnpm/action-setup@v4
        with:
          version: 9
      - name: Install dependencies
        run: pnpm install
      - name: Run tests
        run: pnpm test
      - name: Check coverage
        run: pnpm test:coverage

  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      - name: Install dependencies
        run: pnpm install
      - name: Run ESLint
        run: pnpm lint
      - name: Check TypeScript
        run: pnpm typecheck

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Use Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      - name: Install dependencies
        run: pnpm install
      - name: Build packages
        run: pnpm build`,
        },
      },
    ],
  };
}

export default skill;
