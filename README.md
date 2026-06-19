# CSV Budget Tracker

A private, **offline**, encrypted Android budgeting app built with React Native.
Import your bank's CSV export and the app parses your transactions, automatically
detects recurring subscriptions, and shows a clean dark-mode dashboard with smooth
**up-to-120 fps** animations — all stored encrypted on-device with **zero network
access**.

> **Privacy first:** the release build ships **without** the `INTERNET`
> permission, so it physically cannot send your financial data anywhere. No
> cloud, no accounts, no analytics, no tracking.

---

## Features

- 🔒 **Biometric + PIN lock** — fingerprint/face unlock with a PIN fallback,
  auto-lock after inactivity, and lock-on-background.
- 🔐 **AES-256 encryption** — every sensitive field is encrypted before it
  touches the database; the key lives in the hardware-backed Android Keystore.
- 📥 **CSV importer** — works with any bank's export (BECU, Chase, Bank of
  America, …) via flexible header mapping; bad rows are skipped, never crash.
- 🔁 **Subscription detection** — finds recurring charges, projects monthly /
  yearly cost + next due date, and flags price increases, duplicates, and
  unfamiliar merchants.
- 📊 **Dashboard** — month spending vs budget, animated category donut + bars,
  and a searchable, filterable transaction history.
- ⚡ **120 fps performance** — Reanimated UI-thread animations, a high-refresh
  display request, and tuned FlatLists. Adapts to 90/60 Hz devices.
- 🌑 **Dark mode** — black/gray surfaces, green income, red expenses.

---

## Tech stack

| Area | Library |
| --- | --- |
| Framework | React Native 0.76 (Hermes) |
| Navigation | @react-navigation (native / bottom-tabs / stack) |
| CSV / data | papaparse, lodash, react-native-sqlite-storage |
| Security | react-native-sensitive-info (Keystore), react-native-biometrics, react-native-encrypted-storage, crypto-js, react-native-get-random-values |
| Animation | react-native-reanimated 3, react-native-gesture-handler |
| Charts / UI | react-native-svg (custom charts), react-native-paper, react-native-vector-icons |
| Files | react-native-document-picker, react-native-fs |

> **Notes on the dependency list:** `react-native-svg` (custom charts),
> `react-native-vector-icons` (Paper icons), `crypto-js` +
> `react-native-get-random-values` (encryption + CSPRNG),
> `react-native-document-picker` + `react-native-fs` (file picker/reader), and
> `react-native-screens` / `react-native-safe-area-context` (navigation peers)
> were added beyond the original brief because the features require them.
> `@d11/react-native-fast-image` is the maintained fork of `react-native-fast-image`.

---

## Project structure

```
src/
  auth/          BiometricAuth, PINLock, LockScreen
  csv/           CSVParser, FileImporter
  encryption/    Crypto (AES-256 + PBKDF2), SecureStorage (Keystore)
  data/          Database (SQLite), Transaction/Subscription/Budget models
  subscriptions/ SubscriptionDetector, List, Detail, FormModal
  budget/        BudgetDashboard (tab nav), SpendingOverview, CategoryChart
  tabs/          Home, Subscriptions, Transactions, Budget, Settings
  components/     Header, Card, Button, TabBar, Spinner, SearchBar, …
  utils/         formatDate, formatCurrency, detectRecurring, getDeviceFrameRate
  animations/    SmoothAnimations, FrameRateManager
  context/       AppDataContext (state + auto-lock)
  navigation/    RootNavigator
  theme/         theme (design tokens + Paper/Navigation themes)
android/         native Android project (offline manifest, 120 Hz MainActivity)
sample-data/     sample-transactions.csv (for testing import)
.github/workflows/build-apk.yml   CI that builds the installable APK
```

---

## 1. Get the APK

### Option A — download from CI (no local setup)

Every push to `main` runs **`.github/workflows/build-apk.yml`**, which builds a
signed release APK and uploads it as a workflow artifact.

1. Open the repo's **Actions** tab → latest **Build Android APK** run.
2. Download the **`csv-budget-tracker-release-apk`** artifact and unzip it.
3. Install on a device:
   ```bash
   adb install app-release.apk
   ```
   (or copy the APK to the phone and tap it; allow "install from this source").

### Option B — build locally

Requirements: **Node.js 18+**, **JDK 17**, **Android SDK** (platform 35,
build-tools 35, NDK 26.1.10909125, CMake), and a device/emulator.

```bash
npm install

# Debug build onto a connected device:
npm run android

# Release APK (self-signed with the debug key unless you provide a keystore):
cd android && ./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk
```

To sign a real release, pass your keystore via Gradle properties:
```bash
./gradlew assembleRelease \
  -PRELEASE_STORE_FILE=my-release.keystore \
  -PRELEASE_STORE_PASSWORD=*** \
  -PRELEASE_KEY_ALIAS=*** \
  -PRELEASE_KEY_PASSWORD=***
```

- **Target:** Android 12+ (API 31+) · **Min:** Android 8.0 (API 26)
- **Architectures:** arm64-v8a + armeabi-v7a · **No root required**

---

## 2. Export a CSV from your bank

1. Sign in to your bank's website (or app).
2. Open the account → **Download / Export transactions**.
3. Choose a date range (e.g. the last 30–90 days).
4. Select **CSV** format and download it to your phone.

The parser auto-detects common columns — `Date`, `Description`,
`Amount` (or `Debit`/`Credit`), `Balance`, and `Type` — so most bank formats
work as-is. A ready-made example lives at
[`sample-data/sample-transactions.csv`](sample-data/sample-transactions.csv).

---

## 3. Import into the app

1. Open the app and unlock with biometrics or your PIN (you'll create a PIN on
   first launch).
2. On **Home** (or **Settings → Import CSV**) tap **Import CSV**.
3. Pick your CSV file. The app parses it, skips duplicates and invalid rows, and
   automatically detects recurring subscriptions.
4. Review your dashboard, **Subscriptions**, **Transactions**, and **Budget**.

---

## 4. Security

- **Biometric lock** (fingerprint/face) with a **PIN fallback** (stored only as a
  PBKDF2-SHA256 salted hash — never in plaintext).
- **Auto-lock** after 30 s of inactivity (configurable) and **lock when the app
  is minimized**.
- **AES-256** (CBC + HMAC-SHA256, encrypt-then-MAC) on all sensitive fields
  before they're written to SQLite.
- Encryption key generated with a CSPRNG and kept in the **Android Keystore**.
- **Local-only:** no `INTERNET` permission in release → no network requests, no
  cloud backup, no analytics, no crash reporting.
- **Parameterized SQL** everywhere (no injection); CSV input sanitized and
  formula-injection neutralized on export.

---

## 5. Performance

- **Pixel 10 Pro:** 120 fps animations (the app requests the display's highest
  refresh mode at runtime).
- **Adaptive:** automatically tunes motion for 90 Hz / 60 Hz devices via a
  pure-JS refresh-rate sampler.
- **No lag on any Android 12+ device:** Reanimated runs animations on the UI
  thread; transaction lists use a virtualized, fixed-height FlatList.
- **Fast + small:** Hermes engine, R8/Proguard minification, and resource
  shrinking keep startup quick and the APK well under 50 MB.

---

## Development

```bash
npm install        # install dependencies
npm start          # start the Metro bundler
npm run android    # build + run the debug app
npm run lint       # eslint
npm test           # jest
```

> The **debug** variant includes the `INTERNET` permission so Metro can connect;
> the **release** variant does not — keeping production fully offline.

## License

MIT
