# Version Management

This project supports multiple version bumping strategies:

## GitHub Repository Requirements

For automatic version bumping to work in CI:

1. **Repository Settings** → **Actions** → **General**
2. Set **Workflow permissions** to: "Read and write permissions"
3. Check "Allow GitHub Actions to create and approve pull requests"

OR ensure the repository has proper permissions configured for the GITHUB_TOKEN.

## 1. Manual Version Bumping

Edit `package.json` directly and update the version field:
```json
{
  "version": "0.2.0"
}
```

## 2. Semantic Release (Automatic)

Uses conventional commits to automatically determine version bumps:

- `feat:` → Minor version bump (0.1.0 → 0.2.0)
- `fix:` → Patch version bump (0.1.0 → 0.1.1)  
- `feat!:` or `BREAKING CHANGE:` → Major version bump (0.1.0 → 1.0.0)

**Configuration:** `.releaserc`
**Command:** `npm run release`
**CI Trigger:** Runs automatically on main branch pushes

## 3. Simple npm Version Bump

Use npm commands locally or in CI:

```bash
npm run version:patch   # 0.1.0 → 0.1.1 (no git operations)
npm run version:minor   # 0.1.0 → 0.2.0 (no git operations)
npm run version:major   # 0.1.0 → 1.0.0 (no git operations)
```

**Note:** These commands only update package.json. In CI, git operations (commit, tag, push) are handled separately for proper authentication.

### CI Trigger with Commit Messages

Include these tags in commit messages to trigger auto-bumping:

- `[version:patch]` - Patch version bump
- `[version:minor]` - Minor version bump  
- `[version:major]` - Major version bump

Example:
```bash
git commit -m "Add new feature [version:minor]"
```

## Recommended Workflow

1. **Development:** Use manual version bumping for local testing
2. **CI/CD:** Use semantic-release for automatic versioning
3. **Hotfixes:** Use `[version:patch]` commit tag for quick patches
4. **New Features:** Use conventional commits (`feat:`) for automatic minor bumps