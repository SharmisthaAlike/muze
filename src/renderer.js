const audio = document.getElementById('audio');
const state = { libraryPaths: loadLibraryPaths(), libraryPath: localStorage.getItem('muze-library-path'), albums: [], queue: [], queueIndex: -1, currentAlbum: null, recentAlbums: loadRecentAlbums() };
const $ = (id) => document.getElementById(id);
const RECENT_ALBUM_LIMIT = 6;

function loadLibraryPaths() {
  try {
    const paths = JSON.parse(localStorage.getItem('muze-library-paths') || '[]');
    if (Array.isArray(paths)) return paths;
  } catch {}
  const previousPath = localStorage.getItem('muze-library-path');
  return previousPath ? [previousPath] : [];
}
function saveLibraryPaths() { localStorage.setItem('muze-library-paths', JSON.stringify(state.libraryPaths)); }
function loadRecentAlbums() {
  try { const albums = JSON.parse(localStorage.getItem('muze-recent-albums') || '[]'); return Array.isArray(albums) ? albums : []; } catch { return []; }
}
function saveRecentAlbums() { localStorage.setItem('muze-recent-albums', JSON.stringify(state.recentAlbums)); }

function formatTime(seconds) { if (!Number.isFinite(seconds)) return '0:00'; return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }
function allTracks() { return state.albums.flatMap((album) => album.tracks.map((track) => ({ ...track, albumTitle: album.title, albumId: album.id }))); }
function albumColor(index) { return ['coral', 'moss', 'gold', 'blue', 'plum'][index % 5]; }

function render() {
  const tracks = allTracks();
  $('trackCount').textContent = tracks.length;
  $('albumCount').textContent = state.albums.length;
  renderFolderList();
  $('emptyState').hidden = state.albums.length > 0;
  $('playAllButton').disabled = tracks.length === 0;
  $('albumGrid').innerHTML = state.albums.map((album, index) => `<button class="album-card" data-album="${index}"><div class="album-art ${albumColor(index)}"><span>${album.title.slice(0, 1).toUpperCase()}</span><i>♪</i></div><strong>${escapeHtml(album.title)}</strong><span>${album.tracks.length} ${album.tracks.length === 1 ? 'track' : 'tracks'}</span></button>`).join('');
  document.querySelectorAll('.album-card').forEach((card) => card.addEventListener('click', () => showAlbum(Number(card.dataset.album))));
  renderAlbumHistory();
  if (state.currentAlbum !== null) renderTrackPanel(state.currentAlbum);
}
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function renderFolderList() {
  $('folderList').innerHTML = state.libraryPaths.length ? state.libraryPaths.map((path) => {
    const albumCount = state.albums.filter((album) => album.libraryPath === path).length;
    return `<button class="folder-item${path === state.libraryPath ? ' active' : ''}" data-folder-path="${escapeHtml(path)}"><span class="folder-icon">▰</span><span class="folder-name" title="${escapeHtml(path)}">${escapeHtml(path.split('/').pop() || path)}</span><span class="count">${albumCount}</span></button>`;
  }).join('') : '<span class="history-empty">No folders selected</span>';
  document.querySelectorAll('.folder-item').forEach((item) => item.addEventListener('click', () => selectFolder(item.dataset.folderPath)));
}
function selectFolder(path) {
  if (!state.libraryPaths.includes(path)) return;
  state.libraryPath = path;
  localStorage.setItem('muze-library-path', path);
  state.currentAlbum = null;
  $('trackPanel').hidden = true;
  $('viewTitle').textContent = 'All music';
  render();
}
function renderAlbumHistory() {
  const history = state.recentAlbums.filter((entry) => entry.libraryPath === state.libraryPath && state.albums.some((album) => album.id === entry.id));
  $('albumHistory').innerHTML = history.length ? history.map((entry) => `<button class="history-item" data-album-id="${escapeHtml(entry.id)}"><span class="history-art">${escapeHtml(entry.title.slice(0, 1).toUpperCase())}</span><span class="history-title">${escapeHtml(entry.title)}</span></button>`).join('') : '<span class="history-empty">Open an album to see it here</span>';
  document.querySelectorAll('.history-item').forEach((item) => item.addEventListener('click', () => showAlbumById(item.dataset.albumId)));
}
function showAlbumById(id) { const index = state.albums.findIndex((album) => album.id === id); if (index >= 0) showAlbum(index); }
function showAlbum(index) {
  const album = state.albums[index]; if (!album) return;
  if (album.libraryPath && album.libraryPath !== state.libraryPath) {
    state.libraryPath = album.libraryPath;
    localStorage.setItem('muze-library-path', state.libraryPath);
  }
  state.currentAlbum = index;
  state.recentAlbums = [{ id: album.id, title: album.title, libraryPath: state.libraryPath }, ...state.recentAlbums.filter((entry) => !(entry.id === album.id && entry.libraryPath === state.libraryPath))].slice(0, RECENT_ALBUM_LIMIT);
  saveRecentAlbums();
  $('viewTitle').textContent = album.title;
  renderTrackPanel(index);
  renderAlbumHistory();
}
function renderTrackPanel(index) {
  const album = state.albums[index]; if (!album) return;
  $('trackPanel').hidden = false; $('panelTitle').textContent = album.title; $('panelMeta').textContent = `${album.tracks.length} tracks`;
  $('trackList').innerHTML = album.tracks.map((track, i) => `<button class="track-row" data-track="${i}"><span class="track-number">${String(i + 1).padStart(2, '0')}</span><span class="track-name">${escapeHtml(track.title)}</span><span class="track-file">${escapeHtml(track.fileName)}</span><span class="track-play">▶</span></button>`).join('');
  document.querySelectorAll('.track-row').forEach((row) => row.addEventListener('click', () => playAlbumTrack(index, Number(row.dataset.track))));
}
function setQueue(queue, index) { state.queue = queue; state.queueIndex = index; playTrack(queue[index]); }
function playAlbumTrack(albumIndex, trackIndex) { const queue = state.albums[albumIndex].tracks.map((track) => ({ ...track, albumTitle: state.albums[albumIndex].title, albumId: state.albums[albumIndex].id })); setQueue(queue, trackIndex); }
async function playTrack(track) {
  if (!track) return;
  $('nowTitle').textContent = track.title;
  $('nowAlbum').textContent = track.albumTitle;
  $('coverArt').textContent = track.albumTitle.slice(0, 1).toUpperCase();
  $('playButton').disabled = true;
  try {
    const playablePath = await window.muze.prepareAudio(track.path);
    audio.src = `file://${encodeURI(playablePath).replaceAll('#', '%23')}`;
    await audio.play();
    $('playButton').disabled = false;
    $('playButton').textContent = 'Ⅱ';
    document.title = `${track.title} · Muze`;
  } catch (error) {
    $('nowAlbum').textContent = 'This file could not be prepared for playback';
    console.error(error);
  }
}
function togglePlay() { if (!audio.src) return; if (audio.paused) { audio.play(); $('playButton').textContent = 'Ⅱ'; } else { audio.pause(); $('playButton').textContent = '▶'; } }
function nextTrack() { if (state.queueIndex < state.queue.length - 1) { state.queueIndex += 1; playTrack(state.queue[state.queueIndex]); } }
function previousTrack() { if (audio.currentTime > 3) audio.currentTime = 0; else if (state.queueIndex > 0) { state.queueIndex -= 1; playTrack(state.queue[state.queueIndex]); } }
async function chooseFolder() {
  const result = await window.muze.chooseFolder(); if (!result) return;
  if (!state.libraryPaths.includes(result.path)) state.libraryPaths.push(result.path);
  saveLibraryPaths();
  state.libraryPath = result.path;
  localStorage.setItem('muze-library-path', result.path);
  const newAlbums = result.albums.map((album) => ({ ...album, libraryPath: result.path }));
  state.albums = [...state.albums.filter((album) => album.libraryPath !== result.path), ...newAlbums];
  state.currentAlbum = null;
  $('trackPanel').hidden = true;
  $('viewTitle').textContent = 'All music';
  render();
}
async function rescan() {
  if (!state.libraryPath) return chooseFolder();
  const currentAlbumId = state.currentAlbum === null ? null : state.albums[state.currentAlbum]?.id;
  const result = await window.muze.scanFolder(state.libraryPath);
  const scannedAlbums = result.albums.map((album) => ({ ...album, libraryPath: state.libraryPath }));
  state.albums = [...state.albums.filter((album) => album.libraryPath !== state.libraryPath), ...scannedAlbums];
  state.currentAlbum = currentAlbumId === null ? null : state.albums.findIndex((album) => album.id === currentAlbumId);
  if (state.currentAlbum < 0) { state.currentAlbum = null; $('trackPanel').hidden = true; $('viewTitle').textContent = 'All music'; }
  render();
}

$('chooseFolderButton').addEventListener('click', chooseFolder); $('emptyChooseButton').addEventListener('click', chooseFolder); $('rescanButton').addEventListener('click', rescan); $('playButton').addEventListener('click', togglePlay); $('nextButton').addEventListener('click', nextTrack); $('previousButton').addEventListener('click', previousTrack);
$('playAllButton').addEventListener('click', () => { const queue = allTracks(); setQueue(queue, 0); }); $('volume').addEventListener('input', (event) => { audio.volume = event.target.value; });
$('progress').addEventListener('input', (event) => { if (audio.duration) audio.currentTime = (event.target.value / 100) * audio.duration; });
audio.volume = 0.8; audio.addEventListener('timeupdate', () => { $('currentTime').textContent = formatTime(audio.currentTime); $('progress').value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0; }); audio.addEventListener('loadedmetadata', () => { $('totalTime').textContent = formatTime(audio.duration); }); audio.addEventListener('ended', nextTrack);
window.addEventListener('keydown', (event) => { if (event.code === 'Space' && event.target.tagName !== 'INPUT') { event.preventDefault(); togglePlay(); } if (event.code === 'ArrowRight' && event.metaKey) nextTrack(); if (event.code === 'ArrowLeft' && event.metaKey) previousTrack(); });
if (state.libraryPaths.length) Promise.all(state.libraryPaths.map((path) => window.muze.scanFolder(path))).then((results) => {
  state.albums = results.flatMap((result, index) => result.albums.map((album) => ({ ...album, libraryPath: state.libraryPaths[index] })));
  if (!state.libraryPath || !state.libraryPaths.includes(state.libraryPath)) state.libraryPath = state.libraryPaths[0];
  localStorage.setItem('muze-library-path', state.libraryPath);
  render();
}).catch(() => { state.libraryPaths = []; state.libraryPath = null; localStorage.removeItem('muze-library-path'); render(); }); else render();
