// --- Configuration & Elements ---
const books = document.querySelectorAll('.book');
const lecternImg = document.getElementById('lectern-main');
const statusText = document.getElementById('book-status');
const previewZone = document.getElementById('preview_zone');
const previewContent = document.querySelector('.preview_book');
const guestbookFrame = document.getElementById('guestbook-frame');
// All UI elements to hide when in Guestbook mode
const uiElements = document.querySelectorAll('.ui-element'); 

let current_page = 1;
let pages_content = [];

// ==========================================
// 1. DESKTOP DRAG & DROP
// ==========================================
if (window.marked) {
    const renderer = {
        link({ href, title, tokens }) {
            const text = this.parser.parseInline(tokens);
            return `<a target="_blank" href="${href}" title="${title || ''}">${text}</a>`;
        }
    };
    marked.use({ renderer });
}

books.forEach(book => {
    book.addEventListener('dragstart', (e) => {
        const content = e.target.getAttribute('data-content');
        const type = e.target.getAttribute('data-type');
        e.dataTransfer.setData('content', content);
        e.dataTransfer.setData('type', type);
    });
});

document.addEventListener('dragover', (e) => e.preventDefault());

document.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.target.closest('#lectern-main') || e.target.id === 'lectern-main') {
        const content = e.dataTransfer.getData('content');
        const type = e.dataTransfer.getData('type');
        handleDropLogic(type, content);
    }
});

// ==========================================
// 2. MOBILE TOUCH DRAG
// ==========================================
let activeBook = null;
let touchClone = null;

books.forEach(book => {
    book.addEventListener('touchstart', (e) => {
        const touch = e.touches[0];
        activeBook = book;
        
        // Create ghost image
        touchClone = book.cloneNode(true);
        touchClone.style.position = 'fixed';
        touchClone.style.opacity = '0.8';
        touchClone.style.width = '80px';
        touchClone.style.zIndex = '1000';
        touchClone.style.pointerEvents = 'none';
        document.body.appendChild(touchClone);

        moveClone(touch.clientX, touch.clientY);
    }, { passive: false });
});

document.addEventListener('touchmove', (e) => {
    if (!activeBook || !touchClone) return;
    const touch = e.touches[0];
    e.preventDefault(); // Stop scrolling
    moveClone(touch.clientX, touch.clientY);
}, { passive: false });

document.addEventListener('touchend', (e) => {
    if (!activeBook || !touchClone) return;

    // Check what we dropped on
    const touch = e.changedTouches[0];
    const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);

    if (dropTarget && (dropTarget.id === 'lectern-main' || dropTarget.closest('#lectern-main'))) {
        const content = activeBook.getAttribute('data-content');
        const type = activeBook.getAttribute('data-type');
        handleDropLogic(type, content);
    }

    // Cleanup
    touchClone.remove();
    activeBook = null;
    touchClone = null;
});

function moveClone(x, y) {
    if (touchClone) {
        touchClone.style.left = (x - 40) + 'px';
        touchClone.style.top = (y - 40) + 'px';
    }
}

// ==========================================
// 3. CORE LOGIC (ROUTING)
// ==========================================
function handleDropLogic(type, content) {
    if (type === 'guestbook') {
        openGuestbook(content);
    } else {
        loadMarkdownBook(content);
    }
}

// --- Mode A: Guestbook (Iframe) ---
function openGuestbook(url) {
    lecternImg.src = './public/lecternBook.png';
    statusText.innerText = "Signing Guestbook...";
    previewZone.style.display = 'block';

    // Hide normal book UI, Show Iframe
    uiElements.forEach(el => el.classList.add('hidden-ui'));
    guestbookFrame.classList.remove('hidden-ui');
    guestbookFrame.src = url;
}

// --- Mode B: Text Book (Fetch) ---
async function loadMarkdownBook(filename) {
    try {
        const response = await fetch(`./public/${filename}`);
        if (!response.ok) throw new Error("File not found");
        const text = await response.text();
        
        // Setup UI
        lecternImg.src = './public/lecternBook.png';
        statusText.innerText = "Reading...";
        previewZone.style.display = 'block';

        // Show normal book UI, Hide Iframe
        guestbookFrame.classList.add('hidden-ui');
        guestbookFrame.src = 'about:blank';
        uiElements.forEach(el => el.classList.remove('hidden-ui'));

        // Parse & Paginate
        const fullHtml = marked.parse(text);
        console.log(text);
        paginateContent(fullHtml);
        current_page = 1;
        update_preview();

    } catch (err) {
        console.error(err);
        statusText.innerText = "Error loading book!";
    }
}

// ==========================================
// 4. PAGINATION & NAVIGATION
// ==========================================
async function paginateContent(html) {
    const tester = document.createElement('div');
    tester.className = 'preview_book'; 
    tester.style.width = '280px'; // MUST MATCH CSS WIDTH OF TEXT AREA
    tester.style.position = 'fixed';
    tester.style.visibility = 'hidden';
    tester.style.height = 'auto'; 
    document.body.appendChild(tester);

    const maxHeight = 380; // MUST MATCH CSS HEIGHT OF TEXT AREA
    pages_content = [];
    
    // Split by <hr> first
    const manualPages = html.split(/<hr\s*\/?>/i);

    manualPages.forEach(pageHtml => {
        if (!pageHtml.trim()) return;

        tester.innerHTML = pageHtml;
        
        if (tester.scrollHeight <= maxHeight) {
            pages_content.push(pageHtml);
        } else {
            // Split word by word
            const tokens = pageHtml.split(/(<[^>]*>|[\s\n]+)/);
            let currentChunk = "";

            for (let token of tokens) {
                tester.innerHTML = currentChunk + token;
                if (tester.scrollHeight > maxHeight) {
                    pages_content.push(currentChunk);
                    currentChunk = token;
                } else {
                    currentChunk += token;
                }
            }
            if (currentChunk.trim()) pages_content.push(currentChunk);
        }
    });

    document.body.removeChild(tester);
}

function update_preview() {
    previewContent.innerHTML = pages_content[current_page - 1] || "";
    document.querySelector('.npage').innerText = current_page;
    document.querySelector('.totalpage').innerText = pages_content.length;
    
    document.querySelector('.left').style.display = current_page > 1 ? 'block' : 'none';
    document.querySelector('.right').style.display = current_page < pages_content.length ? 'block' : 'none';
}

document.querySelector('.right').addEventListener('click', () => {
    if (current_page < pages_content.length) {
        current_page++;
        update_preview();
    }
});

document.querySelector('.left').addEventListener('click', () => {
    if (current_page > 1) {
        current_page--;
        update_preview();
    }
});

// ==========================================
// 5. CLOSE BUTTON
// ==========================================
document.getElementById('close-btn').addEventListener('click', () => {
    previewZone.style.display = 'none';
    lecternImg.src = './public/lectern.png';
    statusText.innerText = "Drag book here";
    
    // Reset everything
    guestbookFrame.src = 'about:blank';
    guestbookFrame.classList.add('hidden-ui');
    uiElements.forEach(el => el.classList.remove('hidden-ui'));
});