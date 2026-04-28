# Contributing to context-window-planner

Thank you for your interest in contributing to the context-window-planner
project! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 8.0.0
- Git

### Setting Up Your Development Environment

1. **Fork the repository** on GitHub.

2. **Clone your fork** locally:

   ```bash
   git clone https://github.com/reaatech/context-window-planner.git
   cd context-window-planner
   ```

3. **Install dependencies**:

   ```bash
   pnpm install
   ```

4. **Create a branch** for your changes:
   ```bash
   git checkout -b feat/your-feature-name
   # or for bug fixes:
   git checkout -b fix/your-bug-fix
   ```

## Development

### Project Structure

```
context-window-planner/
├── packages/
│   └── core/              # Main library package
│       ├── src/
│       │   ├── types/     # Type definitions
│       │   ├── items/     # Context item types
│       │   ├── strategies/# Packing strategies
│       │   ├── tokenizer/ # Tokenizer adapters
│       │   └── utils/     # Utilities
│       └── test/          # Test files
├── skills/                # Agent skills for AI assistants
├── examples/              # Usage examples
└── scripts/               # Build and utility scripts
```

### Available Commands

```bash
# Development
pnpm build          # Build all packages
pnpm dev            # Build in watch mode

# Testing
pnpm test           # Run all tests
pnpm test:watch     # Run tests in watch mode
pnpm test:coverage  # Run tests with coverage report

# Code Quality
pnpm lint           # Run ESLint
pnpm lint:fix       # Fix ESLint issues automatically
pnpm typecheck      # Run TypeScript type checking
pnpm format         # Format code with Prettier

# Cleanup
pnpm clean          # Remove build artifacts
```

### Running Tests

We use Vitest for testing. Tests are located alongside source files in `test/`
directories.

```bash
# Run all tests
pnpm test

# Run tests for a specific package
pnpm --filter context-window-planner test

# Run with coverage
pnpm test:coverage
```

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier with 2-space indentation, single quotes
- **Linting**: ESLint with TypeScript support
- **Imports**: Organized and sorted automatically

Please ensure your code follows these standards before submitting a PR.

## Contributing Guidelines

### Types of Contributions

We welcome various types of contributions:

- **Bug fixes**: Fix issues reported in GitHub Issues
- **New features**: Add new packing strategies, item types, or tokenizer
  adapters
- **Documentation**: Improve README, add examples, or enhance API documentation
- **Tests**: Add test coverage for existing or new functionality
- **Performance**: Optimize algorithms or improve build times

### Making Changes

1. **Write code** following the project's coding standards.

2. **Add tests** for new functionality. We aim for ≥90% test coverage.

3. **Update documentation** if your changes affect the public API.

4. **Run checks** before committing:

   ```bash
   pnpm lint
   pnpm typecheck
   pnpm test
   ```

5. **Commit your changes** using Conventional Commits format:
   ```bash
   git commit -m "feat: add new RAG selection strategy"
   git commit -m "fix: correct token count for multi-byte characters"
   git commit -m "docs: update API examples"
   ```

### Commit Message Format

We follow the [Conventional Commits](https://www.conventionalcommits.org/)
specification:

- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `test:` Test additions or modifications
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `chore:` Maintenance tasks

### Pull Request Process

1. **Push your branch** to your fork:

   ```bash
   git push origin feat/your-feature-name
   ```

2. **Open a Pull Request** against the `main` branch of the original repository.

3. **Fill out the PR template** with:
   - Description of changes
   - Related issues (if any)
   - Testing performed
   - Checklist completion

4. **Wait for CI checks** to pass (tests, linting, type checking).

5. **Address review feedback** if requested.

6. **Squash and merge** once approved.

### Code Review Guidelines

- Be respectful and constructive in feedback
- Explain the reasoning behind suggestions
- Approve when the code is ready, not perfect
- Request changes only for important issues

## Reporting Issues

### Bug Reports

When reporting a bug, please include:

- **Description**: Clear description of the issue
- **Steps to reproduce**: Minimal reproduction steps
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: Node.js version, OS, package version
- **Code sample**: Minimal code that reproduces the issue

### Feature Requests

When requesting a feature, please include:

- **Use case**: Why this feature is needed
- **Proposed solution**: How it should work
- **Alternatives considered**: Other approaches you've thought about

## Documentation

### API Documentation

API documentation is generated using TypeDoc. To generate locally:

```bash
pnpm docs
```

### Examples

Add examples to the `examples/` directory for new features. Each example should:

- Have a clear README explaining what it demonstrates
- Include runnable code
- Follow the project's coding standards

## Testing

### Test Coverage

We require ≥90% test coverage for new code. Coverage is checked in CI.

### Property-Based Testing

For packing strategies and algorithms, we use property-based testing with
fast-check:

```typescript
import { fc } from '@fast-check/vitest';

it('should always respect budget constraints', () =>
  fc.assert(
    fc.property(fc.integer({ min: 1000, max: 100000 }), (budget) => {
      // Test implementation
    }),
  ));
```

### Integration Tests

Integration tests verify that different parts of the system work together
correctly. Add integration tests for complex workflows.

## License

By contributing to this project, you agree that your contributions will be
licensed under the [MIT License](LICENSE).

## Questions?

If you have questions about contributing, please:

1. Check existing documentation
2. Search existing issues and discussions
3. Open a new discussion in GitHub Discussions

Thank you for contributing to context-window-planner!
