# GitHub Release Setup

This project is set up so GitHub Actions can build Windows and macOS release files from source.

## What To Commit

Commit the source files, including:

- `.github/workflows/release-windows.yml`
- `build/icon.ico`
- `build/icon.png`
- `css/`
- `electron/`
- `img/`
- `js/`
- `index.html`
- `package.json`
- `package-lock.json`

Do not commit generated or local-only folders:

- `node_modules/`
- `release/`
- `data/`
- `.git/`

## Update Feed

The app is configured to use GitHub Releases from:

```json
"publish": [
  {
    "provider": "github",
    "owner": "zv20",
    "repo": "DMS"
  }
]
```

The Settings page uses this GitHub Releases feed to check for updates in the installed Windows app.
GitHub Actions uses the built-in `GITHUB_TOKEN`, so no personal GitHub credential should be committed into the app.

## Create A Release

1. Update the version in `package.json`, for example `1.0.1`.
2. Commit and push your changes.
3. Create and push a matching tag:

```powershell
git tag v1.0.1
git push origin v1.0.1
```

GitHub Actions will build the desktop app and attach these files to the GitHub Release:

- `DMS-<version>-x64-Setup.exe`
- `DMS-<version>-x64-Portable.exe`
- `DMS-<version>-x64.dmg`
- `DMS-<version>-arm64.dmg`
- macOS `.zip` files
- `latest.yml`
- `latest-mac.yml`
- `.blockmap` files

The installed app needs `latest.yml` and the setup/blockmap files to perform updates.
macOS builds use the app icon, but they are unsigned and not notarized unless Apple Developer signing credentials are added later. Unsigned macOS downloads can show "damaged" or "cannot be opened" Gatekeeper warnings even when the release files are valid.
