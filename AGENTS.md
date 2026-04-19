# Agent Notes

## Structure

This repository is split into two packages:

- **common/** — shared extensions and skills used on both personal and work machines
- **personal/** — personal-only extensions and skills (not installed at work)

## Development

When working on extensions or skills, edit files in `common/` or `personal/` respectively.
Run `npm install` in `common/` if you change dependencies.

## Releases

1. Bump version in the relevant `package.json`.
2. Update `CHANGELOG.md`.
3. Commit and tag.
