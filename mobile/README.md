# HisabRakho — mobile

Stack (from the shared plan): React Native CLI + JavaScript/JSX,
React Navigation, TanStack Query, Axios, React Hook Form + Zod,
Lucide React Native, secure credential storage, AsyncStorage.

## Phase 1 status

- Theme tokens: `src/theme/tokens.js`
- API client (backend only, never MongoDB directly): `src/services/api.js`
- Navigation skeleton: `src/app/App.jsx` — tabs Home, History, Add, Insights, Profile

## Local setup (needs Android SDK / Xcode on your machine)

This VM does not have a full Android SDK, so the native CLI project
is initialised on a developer machine, not here:

```sh
npx react-native@latest init HisabRakho --directory mobile-app
# then copy src/ from this folder into mobile-app/src/ and wire App.jsx
# as the entry point, install navigation/query/axios deps, and run:
npx react-native run-android
```

Backend for local testing: `cd ../backend && npm install && npm run dev`
— the app talks to it at `http://10.0.2.2:8080` from an Android emulator.
