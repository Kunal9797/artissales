#!/usr/bin/env node

/**
 * Version Bump Script
 *
 * Single source of truth: app.json
 * This script updates version in app.json and syncs to package.json
 *
 * Usage:
 *   node scripts/bump-version.js patch   # 1.2.1 -> 1.2.2
 *   node scripts/bump-version.js minor   # 1.2.1 -> 1.3.0
 *   node scripts/bump-version.js major   # 1.2.1 -> 2.0.0
 *   node scripts/bump-version.js 1.5.0   # Set specific version
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const APP_JSON_PATH = path.join(ROOT_DIR, 'app.json');
const PACKAGE_JSON_PATH = path.join(ROOT_DIR, 'package.json');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function bumpVersion(currentVersion, type) {
  const [major, minor, patch] = currentVersion.split('.').map(Number);

  switch (type) {
    case 'major':
      return `${major + 1}.0.0`;
    case 'minor':
      return `${major}.${minor + 1}.0`;
    case 'patch':
      return `${major}.${minor}.${patch + 1}`;
    default:
      // Assume it's a specific version string
      if (/^\d+\.\d+\.\d+$/.test(type)) {
        return type;
      }
      throw new Error(`Invalid version type: ${type}. Use 'major', 'minor', 'patch', or a version like '1.2.3'`);
  }
}

function main() {
  const bumpType = process.argv[2];

  if (!bumpType) {
    console.error('Usage: node scripts/bump-version.js <patch|minor|major|x.y.z>');
    process.exit(1);
  }

  // Read current versions
  const appJson = readJson(APP_JSON_PATH);
  const packageJson = readJson(PACKAGE_JSON_PATH);

  const currentVersion = appJson.expo.version;
  const currentVersionCode = appJson.expo.android.versionCode;

  // Calculate new version
  const newVersion = bumpVersion(currentVersion, bumpType);
  const newVersionCode = currentVersionCode + 1;

  // Update app.json
  appJson.expo.version = newVersion;
  appJson.expo.android.versionCode = newVersionCode;
  writeJson(APP_JSON_PATH, appJson);

  // Update package.json
  packageJson.version = newVersion;
  writeJson(PACKAGE_JSON_PATH, packageJson);

  console.log('✅ Version bumped successfully!');
  console.log('');
  console.log(`   Version:     ${currentVersion} → ${newVersion}`);
  console.log(`   VersionCode: ${currentVersionCode} → ${newVersionCode}`);
  console.log('');
  console.log('Files updated:');
  console.log('   - app.json (version, versionCode)');
  console.log('   - package.json (version)');
  console.log('   - android/app/build.gradle (reads from app.json automatically)');
}

main();
