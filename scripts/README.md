# Tandem Scripts

Utility scripts for managing and maintaining the Tandem application.

## Admin Scripts

Scripts for administrative tasks and setup:

**Security & Authentication:**
- `admin/hash-password.js` - Generate bcrypt password hash for admin authentication
- `admin/generate-jwt-secret.js` - Create secure JWT secret key
- `admin/generate-secure-password.js` - Generate cryptographically secure passwords

**Puzzle Management:**
- `admin/seed-puzzles.js` - Seed initial puzzles to database
- `admin/assess-all-puzzles.js` - Validate and analyze puzzle data quality

**Asset Generation:**
- `admin/generate-achievement-artwork.js` - Create Game Center achievement artwork

## Maintenance Scripts

Scripts for ongoing maintenance and data migrations:

- `maintenance/fix-hint-encoding.js` - Fix character encoding issues in hint text
- `maintenance/migrate-hints.js` - Migrate hint data format
- `maintenance/update-logging.sh` - Update logging configuration across files

## Usage

All scripts can be run using Node.js from the project root:

```bash
# Example: Generate admin password hash
node scripts/admin/hash-password.js

# Example: Seed puzzles
node scripts/admin/seed-puzzles.js
```

## NPM Scripts

Some scripts are available as npm commands (see package.json):

```bash
npm run hash-password    # Run hash-password.js
# Add more as needed
```
