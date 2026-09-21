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

## GitHub Actions

Pull requests and pushes to `main` run the CI workflow. It installs the locked dependencies, checks the JavaScript syntax, and builds an unpacked macOS app.

To publish a downloadable macOS release, update the version in `package.json`, commit the change, and push a semantic version tag:

```bash
npm version patch
git push origin main --follow-tags
```

For example, pushing `v0.1.1` starts the release workflow and attaches the macOS DMG to a GitHub Release. The workflow disables code signing, so users may need to approve the downloaded app in macOS. Add an Apple Developer signing identity and notarization credentials later for a smoother distribution experience.

## Package options

Muze is packaged as a macOS desktop application, not as an npm library. The GitHub Release workflow is the recommended distribution path. `npm run build:mac` creates the local DMG, while tagged releases build and publish it automatically.

## License

See the [LICENSE](LICENSE) file for details.

