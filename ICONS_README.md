# PWA Icons

The PWA manifest requires two icon files:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)

## Quick Setup:

### Option 1: Generate Online (Easiest)
1. Go to https://favicon.io/favicon-generator/
2. Create an icon with "🍽️" emoji or "KP" text
3. Download and extract
4. Rename the 192x192 and 512x512 files
5. Upload to your repository root

### Option 2: Use Existing Logo
If you have a logo/image:
1. Go to https://realfavicongenerator.net/
2. Upload your image
3. Generate PWA icons
4. Download and add `icon-192.png` and `icon-512.png` to root

### Option 3: Temporary Fix
For now, the app will work without icons, but you'll see a warning in the console.
The icons are only needed for the home screen/desktop icon after installation.

## After Adding Icons:
Your repository should look like:
```
YourRepo/
  icon-192.png    ← Add this
  icon-512.png    ← Add this
  manifest.json   ✅ Already added
  sw.js          ✅ Already added
  index.html     ✅ Already updated
```
