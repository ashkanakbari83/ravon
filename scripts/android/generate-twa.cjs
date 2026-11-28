#!/usr/bin/env node
/**
 * Generates an Android (TWA) project for RAVON using @bubblewrap/core's
 * programmatic API — no interactive CLI, so it can run headlessly in CI.
 *
 * Why this exists: RAVON is a PWA (see vite.config.js for the web manifest).
 * To let a friend install it as a normal APK (no Google Play, no server),
 * we wrap it in a Trusted Web Activity — a thin native shell that opens the
 * deployed PWA full-screen, with its own app icon and no browser chrome.
 *
 * This script only *generates the Android project + signing key*. The
 * actual Gradle build runs afterwards (see .github/workflows/android-apk.yml)
 * because it needs a modern Android SDK and internet access to Google's
 * Maven repo, neither of which is available in the sandbox this was
 * written in. It deliberately never commits the keystore — see the
 * workflow for how it's generated fresh and handed back as an artifact.
 *
 * Run with: node scripts/android/generate-twa.cjs
 * Env vars (all optional, used by CI):
 *   ANDROID_HOME / ANDROID_SDK_ROOT - path to the Android SDK
 *   JAVA_HOME                      - path to the JDK
 *   ANDROID_KEYSTORE_BASE64        - base64 of an existing .keystore to reuse
 *                                    (so every build keeps the same signature
 *                                    and Digital Asset Links verification —
 *                                    see public/.well-known/assetlinks.json —
 *                                    keeps matching). Falls back to creating
 *                                    a brand new keystore if unset.
 *   ANDROID_KEYSTORE_PASSWORD      - required when ANDROID_KEYSTORE_BASE64 is set
 *   ANDROID_KEY_PASSWORD           - required when ANDROID_KEYSTORE_BASE64 is set
 *   APP_VERSION_CODE               - override the numeric version code
 */

const fs = require('fs')
const path = require('path')
const crypto = require('crypto')
const {
  TwaManifest,
  TwaGenerator,
  KeyTool,
  JdkHelper,
  Config,
  ConsoleLog,
} = require('@bubblewrap/core')

const ROOT = path.resolve(__dirname, '..', '..')
const ANDROID_DIR = path.join(ROOT, 'android')
const KEYSTORE_PATH = path.join(ANDROID_DIR, 'ravon-release.keystore')
const KEY_ALIAS = 'ravon'

// --- Web app identity, mirrored from vite.config.js's PWA manifest -------
// Hardcoded (rather than fetched) because the sandbox this script was
// written in cannot reach the production URL; CI *can* reach it to
// download the icon files themselves, but the text fields below are the
// source of truth from vite.config.js.
const HOST = 'ravon-beta.vercel.app'
const ORIGIN = `https://${HOST}`
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))

function versionCodeFromSemver(version) {
  const [major = 0, minor = 0, patch = 0] = version.split('.').map((n) => parseInt(n, 10) || 0)
  return major * 10000 + minor * 100 + patch
}

function randomPassword() {
  return crypto.randomBytes(18).toString('base64').replace(/[^A-Za-z0-9]/g, '').slice(0, 20)
}

async function main() {
  fs.mkdirSync(ANDROID_DIR, { recursive: true })

  const androidSdkPath = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
  const jdkPath = process.env.JAVA_HOME
  if (!androidSdkPath || !jdkPath) {
    throw new Error('ANDROID_HOME (or ANDROID_SDK_ROOT) and JAVA_HOME must be set in the environment.')
  }

  const config = new Config(jdkPath, androidSdkPath)
  const jdkHelper = new JdkHelper(process, config)
  const log = new ConsoleLog('ravon')

  let keystorePassword
  let keyPassword

  if (process.env.ANDROID_KEYSTORE_BASE64) {
    if (!process.env.ANDROID_KEYSTORE_PASSWORD) {
      throw new Error('ANDROID_KEYSTORE_PASSWORD must be set alongside ANDROID_KEYSTORE_BASE64.')
    }
    fs.writeFileSync(KEYSTORE_PATH, Buffer.from(process.env.ANDROID_KEYSTORE_BASE64, 'base64'))
    keystorePassword = process.env.ANDROID_KEYSTORE_PASSWORD
    keyPassword = process.env.ANDROID_KEY_PASSWORD || keystorePassword
    log.info(`Restored signing key from ANDROID_KEYSTORE_BASE64 at ${KEYSTORE_PATH}`)
  } else if (!fs.existsSync(KEYSTORE_PATH)) {
    // Modern keystores are PKCS12 by default, which doesn't really support a
    // key password distinct from the store password (keytool accepts one,
    // but tools reading it back — e.g. apksigner — fail with a misleading
    // "wrong password" BadPaddingException). Keep them identical.
    keystorePassword = randomPassword()
    keyPassword = keystorePassword
    const keyTool = new KeyTool(jdkHelper, log)
    await keyTool.createSigningKey({
      path: KEYSTORE_PATH,
      alias: KEY_ALIAS,
      password: keystorePassword,
      keypassword: keyPassword,
      fullName: 'Ravon',
      organizationalUnit: 'Ravon',
      organization: 'Ravon',
      country: 'IR',
    })
    log.warn(
      'Created a NEW, one-off signing key (no ANDROID_KEYSTORE_BASE64 secret set). ' +
        'This build will not match previously issued APKs or the asset-link fingerprint ' +
        'published at /.well-known/assetlinks.json.',
    )
  } else {
    throw new Error(`${KEYSTORE_PATH} already exists locally but no password was provided.`)
  }

  // SHA-256 fingerprint of the signing cert — not secret (it's meant to be
  // published, see public/.well-known/assetlinks.json), safe to print in CI
  // logs even on a public repo.
  const { execFileSync } = require('child_process')
  const keytoolOutput = execFileSync(
    path.join(jdkHelper.getJavaHome(), 'bin', 'keytool'),
    ['-list', '-v', '-keystore', KEYSTORE_PATH, '-alias', KEY_ALIAS, '-storepass', keystorePassword],
    { encoding: 'utf8' },
  )
  const sha256Line = keytoolOutput.split('\n').find((l) => l.includes('SHA256:'))
  const sha256Fingerprint = sha256Line ? sha256Line.split('SHA256:')[1].trim() : '(not found)'
  log.info(`SHA-256 cert fingerprint: ${sha256Fingerprint}`)

  // Write the passwords next to the keystore so the workflow can bundle
  // them together into one artifact. Never committed to git (see .gitignore).
  fs.writeFileSync(
    path.join(ANDROID_DIR, 'keystore-credentials.txt'),
    [
      'RAVON Android signing key — keep this file + the .keystore file safe.',
      'You need BOTH to publish an update to the same app (same signature).',
      'If you lose them, your friend must uninstall the old app before installing a new one.',
      '',
      `keystore file : ravon-release.keystore`,
      `alias         : ${KEY_ALIAS}`,
      `store password: ${keystorePassword}`,
      `key password  : ${keyPassword}`,
      `SHA-256 fingerprint: ${sha256Fingerprint}`,
      '',
    ].join('\n'),
  )

  const appVersion = pkg.version || '0.1.0'
  const appVersionCode = parseInt(process.env.APP_VERSION_CODE, 10) || versionCodeFromSemver(appVersion)

  const twaManifest = new TwaManifest({
    packageId: 'ir.ravon.twa',
    host: HOST,
    name: 'رَوون | RAVON',
    launcherName: 'رَوون',
    display: 'standalone',
    themeColor: '#f4f5fa',
    themeColorDark: '#15161c',
    navigationColor: '#f4f5fa',
    backgroundColor: '#f4f5fa',
    enableNotifications: false,
    startUrl: '/',
    iconUrl: `${ORIGIN}/icon-512.png`,
    maskableIconUrl: `${ORIGIN}/icon-maskable-512.png`,
    splashScreenFadeOutDuration: 300,
    signingKey: { path: KEYSTORE_PATH, alias: KEY_ALIAS },
    appVersion,
    appVersionCode,
    // androidbrowserhelper 2.8.0 (the TWA support library) requires API 24+;
    // the bubblewrap default of 21 fails the manifest merge.
    minSdkVersion: 24,
    orientation: 'default',
    fallbackType: 'customtabs',
    shortcuts: [
      { name: 'پروژه‌ی جدید', shortName: 'جدید', url: '/#/new', chosenIconUrl: `${ORIGIN}/icon-192.png` },
      { name: 'تسویه‌نشده‌ها', shortName: 'تسویه', url: '/#/projects?filter=unsettled', chosenIconUrl: `${ORIGIN}/icon-192.png` },
      { name: 'گزارش‌ها', shortName: 'گزارش', url: '/#/reports', chosenIconUrl: `${ORIGIN}/icon-192.png` },
    ],
  })

  const validationError = twaManifest.validate()
  if (validationError) {
    throw new Error(`Invalid TWA manifest: ${validationError}`)
  }

  const twaGenerator = new TwaGenerator()
  const projectDir = path.join(ANDROID_DIR, 'project')
  fs.rmSync(projectDir, { recursive: true, force: true })
  fs.mkdirSync(projectDir, { recursive: true })

  await twaGenerator.createTwaProject(projectDir, twaManifest, log)
  await twaManifest.saveToFile(path.join(projectDir, 'twa-manifest.json'))

  // The bundled template still points at jcenter(), which has been shut down.
  // The one dependency this project needs from it (androidbrowserhelper) is
  // on Maven Central, so swap it in or the Gradle build fails to resolve.
  const rootBuildGradlePath = path.join(projectDir, 'build.gradle')
  const rootBuildGradle = fs.readFileSync(rootBuildGradlePath, 'utf8')
  fs.writeFileSync(rootBuildGradlePath, rootBuildGradle.replaceAll('jcenter()', 'mavenCentral()'))

  // Save the keystore credentials as JSON too, so the signing step (run in a
  // separate CI step/process) can read them back without re-deriving anything.
  fs.writeFileSync(
    path.join(ANDROID_DIR, 'keystore-credentials.json'),
    JSON.stringify({ keystorePath: KEYSTORE_PATH, alias: KEY_ALIAS, storePassword: keystorePassword, keyPassword }, null, 2),
  )

  log.info(`TWA project generated at ${projectDir}`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
