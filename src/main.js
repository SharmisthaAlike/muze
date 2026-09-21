const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { execFile } = require('node:child_process');
const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs/promises');

const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.ogg', '.oga', '.opus', '.aiff', '.aif']);

function prepareAudioFile(filePath) {
  if (!['.aiff', '.aif'].includes(path.extname(filePath).toLowerCase())) return filePath;

  return new Promise((resolve, reject) => {
    const cacheName = `${crypto.createHash('sha1').update(filePath).digest('hex')}.wav`;
    const outputPath = path.join(app.getPath('temp'), 'muze-audio', cacheName);
    execFile('mkdir', ['-p', path.dirname(outputPath)], (mkdirError) => {
      if (mkdirError) return reject(mkdirError);
      execFile('afconvert', ['-f', 'WAVE', '-d', 'LEI16', filePath, outputPath], (error) => {
        if (error) return reject(new Error(`Could not convert AIFF file: ${error.message}`));
        resolve(outputPath);
      });
    });
  });
}

async function scanFolder(folderPath) {
  const albums = [];

  async function visit(directory) {
    const entries = await fs.readdir(directory, { withFileTypes: true });
    const tracks = entries
      .filter((entry) => entry.isFile() && AUDIO_EXTENSIONS.has(path.extname(entry.name).toLowerCase()))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }))
      .map((entry, index) => ({
        id: `${directory}:${entry.name}`,
        title: path.basename(entry.name, path.extname(entry.name)),
        fileName: entry.name,
        path: path.join(directory, entry.name),
        number: index + 1,
      }));

    if (tracks.length) {
      albums.push({
        id: directory,
        title: path.basename(directory) || directory,
        path: directory,
        tracks,
      });
    }

    const childDirectories = entries.filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of childDirectories) await visit(path.join(directory, entry.name));
  }

  await visit(folderPath);
  return albums.sort((a, b) => a.title.localeCompare(b.title));
}

function createWindow() {
  const window = new BrowserWindow({
    width: 1240,
    height: 820,
    minWidth: 900,
    minHeight: 620,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#101313',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  window.loadFile(path.join(__dirname, 'index.html'));
}

app.whenReady().then(() => {
  ipcMain.handle('choose-folder', async () => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    if (result.canceled || !result.filePaths[0]) return null;
    const folderPath = result.filePaths[0];
    return { path: folderPath, albums: await scanFolder(folderPath) };
  });

  ipcMain.handle('scan-folder', async (_event, folderPath) => ({ path: folderPath, albums: await scanFolder(folderPath) }));
  ipcMain.handle('prepare-audio', async (_event, filePath) => prepareAudioFile(filePath));
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
