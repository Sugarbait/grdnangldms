# Build & Version Management Process

## Version Number Location
- **File**: `version.ts` (root directory)
- **Current Version**: `1.0.0`
- **Display**: Shows at the bottom of both desktop sidebar and mobile footer as `v1.0.0`

## How to Create a New Build & Update Version

### Step 1: Update Version Number
Edit `version.ts` and update the `APP_VERSION`:

```typescript
export const APP_VERSION = '1.0.1'; // Change this to the new version
```

### Step 2: Test Locally
```bash
npm run dev
```
- Navigate to any authenticated page (Dashboard, Vault, Recipients, Settings)
- Check the bottom of the left sidebar (desktop) or footer (mobile) to verify the version displays correctly

### Step 3: Build for Production
```bash
npm run build
```

### Step 4: Commit & Push to GitHub
```bash
# Stage all changes
git add -A

# Commit with version in message
git commit -m "Release v1.0.1 - [description of changes]"

# Push to GitHub
git push origin main
```

## Semantic Versioning
Use standard semantic versioning:
- **MAJOR** (1.0.0): Breaking changes
- **MINOR** (1.1.0): New features, backwards compatible
- **PATCH** (1.0.1): Bug fixes, backwards compatible

## Example: Creating Build v1.0.2

```bash
# 1. Update version.ts
echo "export const APP_VERSION = '1.0.2';" > version.ts

# 2. Test locally
npm run dev
# (verify v1.0.2 appears in UI)

# 3. Build
npm run build

# 4. Commit & Push
git add -A
git commit -m "Release v1.0.2 - Fixed session timer display on mobile"
git push origin main
```

## Version Display Locations
- ✅ Desktop: Bottom of left sidebar, above copyright text
- ✅ Mobile: Bottom of page footer, above navigation bar
- ✅ Both views: Small, subtle gray text for non-intrusive display

## Deployment
After pushing to GitHub, the main branch will reflect the new version. The app will display the updated version number in both desktop and mobile views automatically.
