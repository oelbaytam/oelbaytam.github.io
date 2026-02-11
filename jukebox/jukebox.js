const discs = document.querySelectorAll('.disc');

// Helper: Send command to the Player Iframe
function triggerRemotePlayer(src, name) {
    if (!window.parent) return;
    const playerFrame = window.parent.document.getElementById('player');
    
    // Ensure playlist is synced before playing
    sendPlaylist(playerFrame);

    if (playerFrame && playerFrame.contentWindow && playerFrame.contentWindow.playTrack) {
        playerFrame.contentWindow.playTrack(src, name);
    }
}

// NEW: Send the list of discs to the player so Next/Prev works
function sendPlaylist(playerFrame) {
    if (!playerFrame || !playerFrame.contentWindow || !playerFrame.contentWindow.setPlaylist) return;

    const playlist = [];
    discs.forEach(disc => {
        playlist.push({
            src: disc.getAttribute('data-src'),
            name: disc.getAttribute('data-name')
        });
    });

    playerFrame.contentWindow.setPlaylist(playlist);
}

// Initialize on Load
window.addEventListener('load', () => {
    if (window.parent) {
        const playerFrame = window.parent.document.getElementById('player');
        // Try to send playlist immediately
        if(playerFrame) sendPlaylist(playerFrame);
    }
});

// ==========================================
// DRAG & DROP LOGIC
// ==========================================
discs.forEach(disc => {
    // Desktop Drag
    disc.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('src', e.target.getAttribute('data-src'));
        e.dataTransfer.setData('name', e.target.getAttribute('data-name'));
    });

    // Double Click to Play
    disc.addEventListener('dblclick', () => {
        triggerRemotePlayer(disc.getAttribute('data-src'), disc.getAttribute('data-name'));
    });

    // Mobile Touch Start
    disc.addEventListener('touchstart', handleTouchStart, {passive:false});
});

// Desktop Drop
document.addEventListener('dragover', (e) => e.preventDefault());
document.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.target.closest('.jukebox-container')) {
        const src = e.dataTransfer.getData('src');
        const discEl = document.querySelector(`.disc[data-src="${src}"]`);
        const name = discEl ? discEl.getAttribute('data-name') : "Unknown Track";
        
        if (src) triggerRemotePlayer(src, name);
    }
});

// ==========================================
// MOBILE TOUCH LOGIC
// ==========================================
let activeDisc = null;
let touchClone = null;

function handleTouchStart(e) {
    const touch = e.touches[0];
    activeDisc = e.target;
    
    // Create Ghost
    touchClone = activeDisc.cloneNode(true);
    touchClone.style.cssText = `
        position: fixed; opacity: 0.8; width: 70px; z-index: 1000; pointer-events: none;
        left: ${touch.clientX - 35}px; top: ${touch.clientY - 35}px;
    `;
    document.body.appendChild(touchClone);
}

document.addEventListener('touchmove', (e) => {
    if (!activeDisc || !touchClone) return;
    const touch = e.touches[0];
    e.preventDefault();
    touchClone.style.left = (touch.clientX - 35) + 'px';
    touchClone.style.top = (touch.clientY - 35) + 'px';
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!activeDisc || !touchClone) return;
    
    const touch = e.changedTouches[0];
    const target = document.elementFromPoint(touch.clientX, touch.clientY);

    if (target && target.closest('.jukebox-container')) {
        const src = activeDisc.getAttribute('data-src');
        const name = activeDisc.getAttribute('data-name');
        triggerRemotePlayer(src, name);
    }

    touchClone.remove();
    activeDisc = null;
    touchClone = null;
});