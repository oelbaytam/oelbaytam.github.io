// --- Elements ---
const playerWidget = document.getElementById('mc-player');
const playerToggle = document.getElementById('player-toggle');
const audio = document.getElementById('audio-source');
const playerFrame = window.parent.document.getElementById('player');

// UI Controls
const playBtn = document.getElementById('btn-play');
const playIcon = document.getElementById('play-icon');
const nextBtn = document.getElementById('btn-next');
const prevBtn = document.getElementById('btn-prev');
const seekBar = document.getElementById('seek-bar');
const volumeSlider = document.getElementById('volume-slider');
const currentTimeEl = document.getElementById('current-time');
const durationEl = document.getElementById('duration');
const titleDisplay = document.getElementById('now-playing');

let playlist = []; 
let currentIndex = -1;
let isPlaying = false;
let isDraggingSeek = false;

audio.volume = 0.3
// ==========================================
// 1. PUBLIC FUNCTIONS (Called by Jukebox)
// ==========================================

// NEW: Receive the full list of songs
window.setPlaylist = function(discsData) {
    playlist = discsData;
};

window.playTrack = function(filename, trackName) {
    // 1. Open the player
    if (playerWidget.classList.contains('hidden-player')) {
        playerWidget.classList.remove('minimized-player');
        playerFrame.setAttribute("class", "visible minimized");
    }
    playerWidget.classList.remove('hidden-player');


    // 2. Sync Index (Critical for Next/Prev buttons)
    const foundIndex = playlist.findIndex(track => track.src === filename);
    if (foundIndex !== -1) {
        currentIndex = foundIndex;
    }

    // 3. Update Audio Source
    const newSrc = `./public/music/${filename}`;
    
    // Only reload if it's a different track
    if (decodeURIComponent(audio.src).indexOf(filename) === -1) {
        audio.src = newSrc;
        titleDisplay.innerText = trackName;
        seekBar.value = 0;
        currentTimeEl.innerText = "0:00";
    }

    // 4. Play
    audio.play().then(() => {
        isPlaying = true;
        playIcon.src = './public/pause.png';
    }).catch(err => console.error("Playback Error:", err));
};

// ==========================================
// 2. INTERNAL AUDIO LOGIC
// ==========================================

// NEW: Missing function that fixes the buttons
function loadTrack(index) {
    if (index < 0 || index >= playlist.length) return;
    
    const track = playlist[index];
    // Re-use the public play function
    window.playTrack(track.src, track.name);
}

function togglePlay() {
    if (isPlaying) {
        audio.pause();
        isPlaying = false;
        playIcon.src = './public/play.png';
    } else {
        audio.play();
        isPlaying = true;
        playIcon.src = './public/pause.png';
    }
}

function nextTrack() {
    if (playlist.length === 0) return;
    let newIndex = currentIndex + 1;
    if (newIndex >= playlist.length) newIndex = 0;
    loadTrack(newIndex);
}

function prevTrack() {
    if (playlist.length === 0) return;
    let newIndex = currentIndex - 1;
    if (newIndex < 0) newIndex = playlist.length - 1;
    loadTrack(newIndex);
}

// Event Listeners
nextBtn.addEventListener('click', nextTrack);
prevBtn.addEventListener('click', prevTrack);
playBtn.addEventListener('click', togglePlay);
playerToggle.addEventListener('click', () => {
    playerWidget.classList.toggle('minimized-player');
    playerFrame.classList.toggle("visible");
});

// Volume
volumeSlider.addEventListener('input', (e) => audio.volume = parseFloat(e.target.value));

// Seek Bar
audio.addEventListener('timeupdate', () => {
    if (!audio.duration || isDraggingSeek) return;
    seekBar.value = audio.currentTime;
    currentTimeEl.innerText = formatTime(audio.currentTime);
});

audio.addEventListener('loadedmetadata', () => {
    if (audio.duration) {
        durationEl.innerText = formatTime(audio.duration);
        seekBar.max = Math.floor(audio.duration);
    }
});

// Seek Dragging
seekBar.addEventListener('mousedown', () => isDraggingSeek = true);
seekBar.addEventListener('touchstart', () => isDraggingSeek = true);
seekBar.addEventListener('change', () => {
    audio.currentTime = seekBar.value;
    isDraggingSeek = false;
});

function formatTime(s) {
    if (!s || isNaN(s)) return "0:00";
    return `${Math.floor(s/60)}:${Math.floor(s%60).toString().padStart(2,'0')}`;
}

// Auto-play next song
audio.addEventListener('ended', nextTrack);