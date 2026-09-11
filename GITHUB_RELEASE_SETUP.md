# GitHub Release Setup

This project is set up so GitHub Actions can build the Windows installer and portable `.exe` files from source.

## What To Commit

Commit the source files, including:

- `.github/workflows/release-windows.yml`
- `build/icon.ico`
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

## Configure The Update Feed

Before the first real release, edit `package.json` and replace:

- `CHANGE_ME_GITHUB_OWNER`
- `CHANGE_ME_REPO`

with your GitHub username or organization and repository name.

Example:

```json
"publish": [
  {
    "provider": "github",
    "owner": "your-user-name",
    "repo": "kitchenpro-dms"
  }
]
```

The Settings page uses this GitHub Releases feed to check for updates in the installed Windows app.

## Create A Release

1. Update the version in `package.json`, for example `15.0.1`.
2. Commit and push your changes.
3. Create and push a matching tag:

```powershell
git tag v15.0.1
git push origin v15.0.1
```

GitHub Actions will build the Windows app and attach these files to the GitHub Release:

- `KitchenPro DMS-<version>-x64-Setup.exe`
- `KitchenPro DMS-<version>-x64-Portable.exe`
- `latest.yml`
- `.blockmap` files

The installed app needs `latest.yml` and the setup/blockmap files to perform updates.
