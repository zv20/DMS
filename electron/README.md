# Electron desktop shell

This directory packages the renderer under the local `dms://app` protocol. In Electron, `js/desktop-storage-adapter.js` uses SQLite in Electron's per-user data directory.

The compatibility documents are also transactionally normalized into SQLite projection tables for recipes, ingredients, allergens, their relationships, planned menu items, templates, and template images. Desktop create/update/delete paths for catalogs, menu slots, templates, settings, imports, exports, images, and saved-menu history go through the preload IPC bridge.

## Security posture

- Renderer Node integration is disabled.
- Context isolation and the Chromium sandbox are enabled.
- Renderer content is served only from a local, traversal-checked protocol.
- Navigation, pop-up windows, and runtime permission requests are denied.
- The preload bridge exposes runtime information and explicit storage/repository operations used by the current app.

The existing renderer uses inline event handlers and inline styles, so the compatibility CSP temporarily allows `unsafe-inline` for scripts/styles. Replacing those handlers is a prerequisite for tightening this policy in the desktop-parity phase.

## Run

Use Node.js 20 or newer. Install dependencies with `npm install`, then run `npm run desktop:dev`.

If `npm install` skips native install scripts or the app reports that `better_sqlite3.node` is missing or not a valid Win32 application, install the Electron-native SQLite prebuild with `npm run desktop:install-native`. Use `npm run desktop:rebuild-native` only when a prebuilt binary is unavailable and Visual Studio Build Tools are installed.

`npm run desktop:check` performs syntax validation without launching Electron.

`npm run desktop:test-storage` verifies document import and relational projection using a temporary SQLite database.

`npm run desktop:install-native` downloads the `better-sqlite3` prebuilt binary for the installed Electron version and current platform/architecture.

The storage test runs through the normal Electron app entrypoint with `--storage-test`; this avoids Windows crashes seen when launching Electron in arbitrary script mode.

`npm run desktop:pack` creates an unpacked local desktop build under `release/`.

`npm run desktop:dist:win:x64` creates Windows x64 NSIS and portable artifacts under `release/`.
