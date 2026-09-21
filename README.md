# Muze

Muze is a small macOS desktop music player for local album folders. Choose the folder that contains your music and play tracks directly in the app without opening QuickTime one song at a time.

## Run locally

```bash
npm install
npm start
```

Choose **Add music folder** and select the folder containing your albums. Muze scans nested folders for MP3, WAV, M4A, AAC, FLAC, OGG, OPUS, and AIFF files.

## Build a macOS app

```bash
npm run build:mac
```

The packaged DMG will be written to `dist/`.
