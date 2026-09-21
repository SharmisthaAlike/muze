const audio = document.getElementById('audio');
const state = { libraryPath: localStorage.getItem('muze-library-path'), albums: [], queue: [], queueIndex: -1, currentAlbum: null };
const $ = (id) => document.getElementById(id);

function formatTime(seconds) { if (!Number.isFinite(seconds)) return '0:00'; return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`; }
function allTracks() { return state.albums.flatMap((album) => album.tracks.map((track) => ({ ...track, albumTitle: album.title, albumId: album.id }))); }
function albumColor(index) { return ['coral', 'moss', 'gold', 'blue', 'plum'][index % 5]; }

function render() {
  const tracks = allTracks();
  $('trackCount').textContent = tracks.length;
  $('albumCount').textContent = state.albums.length;
  $('folderPath').textContent = state.libraryPath || 'No folder selected';
  $('emptyState').hidden = state.albums.length > 0;
  $('playAllButton').disabled = tracks.length === 0;
  $('albumGrid').innerHTML = state.albums.map((album, index) => `<button class="album-card" data-album="${index}"><div class="album-art ${albumColor(index)}"><span>${album.title.slice(0, 1).toUpperCase()}</span><i>♪</i></div><strong>${escapeHtml(album.title)}</strong><span>${album.tracks.length} ${album.tracks.length === 1 ? 'track' : 'tracks'}</span></button>`).join('');
  document.querySelectorAll('.album-card').forEach((card) => card.addEventListener('click', () => showAlbum(Number(card.dataset.album))));
  if (state.currentAlbum !== null) renderTrackPanel(state.currentAlbum);
}
function escapeHtml(value) { return value.replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }
function showAlbum(index) { state.currentAlbum = index; $('viewTitle').textContent = state.albums[index].title; renderTrackPanel(index); }
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
async function chooseFolder() { const result = await window.muze.chooseFolder(); if (!result) return; state.libraryPath = result.path; state.albums = result.albums; localStorage.setItem('muze-library-path', result.path); state.currentAlbum = null; $('trackPanel').hidden = true; $('viewTitle').textContent = 'All music'; render(); }
async function rescan() { if (!state.libraryPath) return chooseFolder(); const result = await window.muze.scanFolder(state.libraryPath); state.albums = result.albums; render(); }

$('chooseFolderButton').addEventListener('click', chooseFolder); $('emptyChooseButton').addEventListener('click', chooseFolder); $('rescanButton').addEventListener('click', rescan); $('playButton').addEventListener('click', togglePlay); $('nextButton').addEventListener('click', nextTrack); $('previousButton').addEventListener('click', previousTrack);
$('playAllButton').addEventListener('click', () => { const queue = allTracks(); setQueue(queue, 0); }); $('volume').addEventListener('input', (event) => { audio.volume = event.target.value; });
$('progress').addEventListener('input', (event) => { if (audio.duration) audio.currentTime = (event.target.value / 100) * audio.duration; });
audio.volume = 0.8; audio.addEventListener('timeupdate', () => { $('currentTime').textContent = formatTime(audio.currentTime); $('progress').value = audio.duration ? (audio.currentTime / audio.duration) * 100 : 0; }); audio.addEventListener('loadedmetadata', () => { $('totalTime').textContent = formatTime(audio.duration); }); audio.addEventListener('ended', nextTrack);
window.addEventListener('keydown', (event) => { if (event.code === 'Space' && event.target.tagName !== 'INPUT') { event.preventDefault(); togglePlay(); } if (event.code === 'ArrowRight' && event.metaKey) nextTrack(); if (event.code === 'ArrowLeft' && event.metaKey) previousTrack(); });
if (state.libraryPath) window.muze.scanFolder(state.libraryPath).then((result) => { state.albums = result.albums; render(); }).catch(() => { localStorage.removeItem('muze-library-path'); }); else render();
