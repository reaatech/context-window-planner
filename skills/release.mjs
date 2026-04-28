/**
 * Agent Skill: Release and Publishing Workflows
 * 
 * This skill defines patterns and procedures for releasing and publishing
 * the context-window-planner library.
 */

export const skill = {
  name: 'release',
  description: 'Release and publishing workflows',
  version: '1.0.0',
};

/**
 * Create GitHub release workflow
 */
export function createReleaseWorkflow() {
  return {
    type: 'file',
    name: '.github/workflows/release.yml',
    content: `name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  release:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      id-token: write
    steps:
      - name: Checkout
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          registry-url: 'https://registry.npmjs.org'

      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Run tests
        run: pnpm test

      - name: Build packages
        run: pnpm build

      - name: Generate changelog
        id: changelog
        run: |
          echo "CHANGELOG<<EOF" >> $GITHUB_OUTPUT
          git log --pretty=format:"- %s" \${{ github.event.repository.default_branch }}..HEAD >> $GITHUB_OUTPUT
          echo "EOF" >> $GITHUB_OUTPUT

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v1
        with:
          name: Release \${{ github.ref_name }}
          body: |
            ## Changes

            \${{ steps.changelog.outputs.CHANGELOG }}

            ## Installation

            \`\`\`bash
            npm install context-window-planner@\${{ github.ref_name }}
            \`\`\`
          draft: false
          prerelease: \${{ contains(github.ref_name, 'beta') || contains(github.ref_name, 'alpha') }}
          generate_release_notes: true

      - name: Publish to npm
        run: |
          cd packages/core
          pnpm publish --access public --no-git-checks
        env:
          NODE_AUTH_TOKEN: \${{ secrets.NPM_TOKEN }}
          NPM_CONFIG_PROVENANCE: true
`,
  };
}

/**
 * Create version bump script
 */
export function createVersionScript() {
  return {
    type: 'file',
    name: 'scripts/version.js',
    content: `#!/usr/bin/env node

/**
 * Version bump script for context-window-planner.
 * 
 * Usage:
 *   node scripts/version.js major|minor|patch|prerelease
 *   node scripts/version.js 1.2.3
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const ROOT = process.cwd();
const PACKAGE_JSON_PATH = join(ROOT, 'packages', 'core', 'package.json');
const ROOT_PACKAGE_JSON_PATH = join(ROOT, 'package.json');

/**
 * Parse version string
 */
function parseVersion(version) {
  const match = version.match(/^(\\d+)\\.(\\d+)\\.(\\d+)(?:-(.+))?$/);
  if (!match) {
    throw new Error(\`Invalid version: \${version}\`);
  }
  return {
    major: parseInt(match[1], 10),
    minor: parseInt(match[2], 10),
    patch: parseInt(match[3], 10),
    prerelease: match[4],
  };
}

/**
 * Format version string
 */
function formatVersion(version) {
  const base = \`\${version.major}.\${version.minor}.\${version.patch}\`;
  return version.prerelease ? \`\${base}-\${version.prerelease}\` : base;
}

/**
 * Bump version based on type
 */
function bumpVersion(current, type) {
  const version = parseVersion(current);
  
  switch (type) {
    case 'major':
      version.major++;
      version.minor = 0;
      version.patch = 0;
      version.prerelease = undefined;
      break;
    case 'minor':
      version.minor++;
      version.patch = 0;
      version.prerelease = undefined;
      break;
    case 'patch':
      version.patch++;
      version.prerelease = undefined;
      break;
    case 'prerelease':
      if (version.prerelease) {
        const match = version.prerelease.match(/^(.+?)(\\d+)$/);
        if (match) {
          version.prerelease = \`\${match[1]}\${parseInt(match[2], 10) + 1}\`;
        } else {
          version.prerelease = \`\${version.prerelease}1\`;
        }
      } else {
        version.prerelease = 'beta.1';
      }
      break;
    default:
      // Assume it's a specific version
      return formatVersion(parseVersion(type));
  }
  
  return formatVersion(version);
}

/**
 * Read and parse JSON file
 */
function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf-8'));
}

/**
 * Write JSON file
 */
function writeJson(path, data) {
  writeFileSync(path, JSON.stringify(data, null, 2) + '\\n');
}

/**
 * Main function
 */
function main() {
  const bumpType = process.argv[2];
  
  if (!bumpType) {
    console.error('Usage: node scripts/version.js major|minor|patch|prerelease|<version>');
    process.exit(1);
  }
  
  // Read current version
  const packageJson = readJson(PACKAGE_JSON_PATH);
  const rootPackageJson = readJson(ROOT_PACKAGE_JSON_PATH);
  const currentVersion = packageJson.version;
  
  console.log(\`Current version: \${currentVersion}\`);
  
  // Calculate new version
  const newVersion = bumpVersion(currentVersion, bumpType);
  console.log(\`New version: \${newVersion}\`);
  
  // Update package.json files
  packageJson.version = newVersion;
  writeJson(PACKAGE_JSON_PATH, packageJson);
  
  rootPackageJson.version = newVersion;
  writeJson(ROOT_PACKAGE_JSON_PATH, rootPackageJson);
  
  console.log('Updated package.json files');
  
  // Create git tag
  const tagName = \`v\${newVersion}\`;
  console.log(\`Creating git tag: \${tagName}\`);
  
  execSync('git add packages/core/package.json package.json', { stdio: 'inherit' });
  execSync(\`git commit -m "chore: release v\${newVersion}"\`, { stdio: 'inherit' });
  execSync(\`git tag \${tagName}\`, { stdio: 'inherit' });
  
  console.log('\\nVersion bumped successfully!');
  console.log(\`Run 'git push && git push --tags' to publish\`);
}

main();
`,
  };
}

/**
 * Create publish checklist
 */
export function createPublishChecklist() {
  return {
    type: 'file',
    name: 'PUBLISH_CHECKLIST.md',
    content: `# Publishing Checklist

Use this checklist before publishing a new version.

## Pre-Publish

- [ ] All tests passing (\`pnpm test\`)
- [ ] Test coverage ≥90% (\`pnpm test:coverage\`)
- [ ] ESLint clean (\`pnpm lint\`)
- [ ] TypeScript clean (\`pnpm typecheck\`)
- [ ] Build successful (\`pnpm build\`)
- [ ] Documentation updated
  - [ ] README.md reflects new features
  - [ ] API docs generated (\`pnpm docs\`)
  - [ ] CHANGELOG.md updated
- [ ] Version bumped correctly
  - [ ] package.json version updated
  - [ ] Git tag created

## Publishing

- [ ] Run \`node scripts/version.js <type>\`
- [ ] Push changes: \`git push && git push --tags\`
- [ ] GitHub Actions will:
  - [ ] Run CI checks
  - [ ] Create GitHub Release
  - [ ] Publish to npm

## Post-Publish

- [ ] Verify npm package published
- [ ] Verify GitHub release created
- [ ] Test installation: \`npm install context-window-planner@latest\`
- [ ] Announce release (if significant)

## Version Guidelines

Follow [Semantic Versioning](https://semver.org/):

- **Major**: Breaking changes
- **Minor**: New features (backward compatible)
- **Patch**: Bug fixes (backward compatible)
- **Prerelease**: Alpha/beta releases (e.g., 1.0.0-beta.1)
`,
  };
}

/**
 * Create npm publish configuration
 */
export function createNpmConfig() {
  return {
    type: 'file',
    name: '.npmrc',
    content: `# NPM Configuration for context-window-planner

# Use provenance for security
provenance=true

# Always use exact versions when saving dependencies
save-exact=true

# Registry
registry=https://registry.npmjs.org/

# Scope registry (if using scoped packages)
@reaatech:registry=https://registry.npmjs.org/
`,
  };
}

/**
 * Generate all release-related files
 */
export function generateReleaseFiles() {
  const files = {};

  const releaseWorkflow = createReleaseWorkflow();
  const versionScript = createVersionScript();
  const publishChecklist = createPublishChecklist();
  const npmConfig = createNpmConfig();

  files[releaseWorkflow.name] = releaseWorkflow.content;
  files[versionScript.name] = versionScript.content;
  files[publishChecklist.name] = publishChecklist.content;
  files[npmConfig.name] = npmConfig.content;

  return files;
}

export default skill;
