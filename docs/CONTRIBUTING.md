# Contributing to Tandem

Thank you for your interest in contributing to Tandem! This document provides guidelines and standards for development.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Code Standards](#code-standards)
- [Testing Guidelines](#testing-guidelines)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)

## Code of Conduct

- Be respectful and professional
- Focus on constructive feedback
- Welcome newcomers and help them learn
- Assume good intentions

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Xcode 14+ (for iOS development)
- CocoaPods installed (`sudo gem install cocoapods`)
- Git

### Initial Setup

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/your-username/tandem.git
   cd tandem
   ```

2. **Install dependencies**

   ```bash
   npm install
   cd ios/App && pod install && cd ../..
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your configuration
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

## Development Workflow

### Branch Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/feature-name` - New features
- `fix/bug-name` - Bug fixes
- `refactor/description` - Code refactoring
- `docs/description` - Documentation updates

### Creating a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### Before Committing

Run these checks:

```bash
# Lint your code
npm run lint

# Run tests
npm test

# Check formatting
npm run format:check
```

## Code Standards

### JavaScript/React

#### File Naming

- **Components**: PascalCase with `.jsx` extension
  - `GameContainer.jsx`, `PlayingScreen.jsx`
- **Utilities/Services**: camelCase with `.js` extension
  - `apiService.js`, `validation.js`
- **Hooks**: camelCase starting with `use`, `.js` extension
  - `useGame.js`, `useTimer.js`

#### Code Style

**Use Prettier formatting** (configured in `.prettierrc`):

- 2 spaces for indentation
- Single quotes
- Semicolons required
- 100 character line width

**ESLint rules** (configured in `.eslintrc.json`):

- No unused variables
- Use `const` over `let` when possible
- Prefer `===` over `==`
- No `eval()` or similar unsafe code

#### Component Structure

```jsx
/**
 * ComponentName - Brief description
 * Detailed description of what this component does
 */
import React from 'react';
import PropTypes from 'prop-types';

const ComponentName = ({ prop1, prop2 }) => {
  // Hooks at the top
  const [state, setState] = useState(null);

  // Effects
  useEffect(() => {
    // Effect logic
  }, [dependency]);

  // Event handlers
  const handleClick = useCallback(() => {
    // Handler logic
  }, [dependency]);

  // Render
  return <div className="component-name">{/* JSX */}</div>;
};

ComponentName.propTypes = {
  prop1: PropTypes.string.isRequired,
  prop2: PropTypes.number,
};

export default ComponentName;
```

#### Function Documentation (JSDoc)

All exported functions must include JSDoc comments:

```javascript
/**
 * Calculate puzzle completion percentage
 * @param {number} solved - Number of puzzles solved
 * @param {number} total - Total number of puzzles
 * @returns {number} Percentage (0-100)
 */
export function calculateProgress(solved, total) {
  return Math.round((solved / total) * 100);
}
```

#### Avoid Common Pitfalls

❌ **Don't:**

```javascript
// Don't use console.log directly
console.log('Debug info');

// Don't use var
var x = 5;

// Don't use inline styles (use Tailwind CSS)
<div style={{ color: 'red' }}>

// Don't leave commented-out code
// const oldFunction = () => { ... }
```

✅ **Do:**

```javascript
// Use centralized logger
import logger from '@/lib/logger';
logger.debug('Debug info');

// Use const/let
const x = 5;

// Use Tailwind CSS classes
<div className="text-red-500">

// Delete unused code (Git history preserves it)
```

### Swift (iOS)

#### Code Style

- 4 spaces for indentation
- Use `// MARK:` comments to organize code
- Always document public functions
- Use Swift naming conventions (camelCase for functions/variables)

```swift
/**
 * Handle notification presentation when app is in foreground
 * Shows banner, sound, and badge even when app is active
 */
func userNotificationCenter(_ center: UNUserNotificationCenter,
                            willPresent notification: UNNotification,
                            withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
    completionHandler([.banner, .sound, .badge])
}
```

### CSS/Styling

- **Use Tailwind CSS** for all styling
- Only create custom CSS for complex animations or iOS-specific optimizations
- Place custom CSS in `src/styles/` directory
- Use theme variables for colors

```jsx
// Good
<button className="px-4 py-2 bg-sky-600 hover:bg-sky-700 rounded-lg">

// Avoid
<button style={{ padding: '8px 16px', background: '#0284c7' }}>
```

## Testing Guidelines

### Writing Tests

- All new features must include tests
- Aim for 70%+ code coverage
- Test files should be colocated with source files or in `__tests__` directories

```javascript
// src/lib/__tests__/validation.test.js
import { validatePuzzle } from '../validation';

describe('validatePuzzle', () => {
  it('should accept valid puzzle data', () => {
    const puzzle = {
      theme: 'Animals',
      puzzles: [
        { emoji: '🦁', answer: 'LION' },
        { emoji: '🐘', answer: 'ELEPHANT' },
        { emoji: '🦒', answer: 'GIRAFFE' },
        { emoji: '🐒', answer: 'MONKEY' },
      ],
    };

    expect(validatePuzzle(puzzle)).toBe(true);
  });

  it('should reject puzzle with fewer than 4 items', () => {
    const puzzle = {
      theme: 'Animals',
      puzzles: [{ emoji: '🦁', answer: 'LION' }],
    };

    expect(validatePuzzle(puzzle)).toBe(false);
  });
});
```

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## Commit Guidelines

### Commit Message Format

Follow conventional commits:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Build process or tooling changes
- `perf`: Performance improvements

**Examples:**

```
feat(game): add hint system

Implement hint system that reveals the first letter of a puzzle answer.
Users get one hint per puzzle.

Closes #42
```

```
fix(ios): resolve timer not resetting issue

Timer was not resetting when selecting archive puzzles.
Added proper cleanup in useEffect.

Fixes #128
```

### Commit Size

- Keep commits focused and atomic
- One logical change per commit
- If a commit message has "and", consider splitting it

## Pull Request Process

### Before Submitting

1. ✅ Code follows style guidelines
2. ✅ All tests pass (`npm test`)
3. ✅ Linting passes (`npm run lint`)
4. ✅ Code is properly formatted (`npm run format`)
5. ✅ New code includes tests
6. ✅ Documentation updated (if applicable)
7. ✅ Commit messages follow guidelines

### PR Template

When creating a PR, include:

```markdown
## Description

Brief description of changes

## Type of Change

- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing

How to test these changes:

1. Step one
2. Step two
3. Expected result

## Screenshots (if applicable)

[Add screenshots for UI changes]

## Checklist

- [ ] Tests pass
- [ ] Linting passes
- [ ] Documentation updated
- [ ] No console.log statements
- [ ] Follows code standards
```

### Review Process

1. **Automated checks** must pass (linting, tests, build)
2. **Code review** by at least one maintainer
3. **Address feedback** promptly and professionally
4. **Squash commits** if requested
5. **Merge** after approval

### Review Criteria

Reviewers will check:

- Code quality and maintainability
- Test coverage
- Performance implications
- Security considerations
- Accessibility (for UI changes)
- iOS compatibility (if applicable)
- Documentation completeness

## Debugging

### Web Debugging

```javascript
import logger from '@/lib/logger';

// Use logger instead of console.log
logger.debug('User clicked button', { userId, timestamp });
logger.error('API call failed', error);
```

### iOS Debugging

- Use Xcode debugger and console
- Check logs in Xcode's console output
- Test on actual device, not just simulator

## Performance Considerations

- **Lazy load** components when possible
- **Memoize** expensive calculations
- **Debounce** frequent events (scroll, resize, input)
- **Optimize images** (use WebP format)
- **Code split** large bundles

Example:

```javascript
// Memoize expensive calculation
const puzzleStats = useMemo(() => {
  return calculateComplexStats(puzzles);
}, [puzzles]);

// Debounce search input
const debouncedSearch = useMemo(() => debounce(handleSearch, 300), []);
```

## Security Guidelines

### Never Commit:

- API keys or secrets
- Database credentials
- JWT secrets
- Admin passwords

Use environment variables for all secrets.

### Input Validation

Always validate user input:

```javascript
import { schemas } from '@/lib/validation';

// Validate puzzle data
const result = schemas.puzzle.safeParse(puzzleData);
if (!result.success) {
  return { error: 'Invalid puzzle data' };
}
```

### XSS Prevention

- Never use `dangerouslySetInnerHTML` without sanitization
- Use Zod schemas for validation
- Escape user input in displays

## Getting Help

- **Questions**: Create a discussion in GitHub
- **Bugs**: Create an issue with reproduction steps
- **Features**: Create an issue for discussion first
- **Security**: Email security@tandemdaily.com privately

## Recognition

Contributors will be:

- Listed in CONTRIBUTORS.md
- Credited in release notes
- Acknowledged in the app (for significant contributions)

---

Thank you for contributing to Tandem! 🎉
