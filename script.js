const puzzleBoard = document.getElementById('puzzle-board');
const difficultySelect = document.getElementById('difficulty');
const startButton = document.getElementById('startButton');
const resetButton = document.getElementById('resetButton');
const timeDisplay = document.getElementById('time');
const puzzleSolvedOverlay = document.getElementById('puzzle-solved-overlay');

const IMAGE_PATH = 'test.png'; // Assuming test.png is in the root

let pieces = [];
let shuffledPieces = [];
let timerInterval;
let startTime;
let currentDifficulty = 6; // Default to 6 pieces

let draggedPiece = null;
let dropTarget = null;

// --- Game Initialization ---

// Preload the image to get its dimensions
const puzzleImage = new Image();
puzzleImage.src = IMAGE_PATH;
puzzleImage.onload = () => {
    // Image loaded, now we can proceed with game setup
    startButton.disabled = false; // Enable start button once image is ready
};
puzzleImage.onerror = () => {
    console.error("Error loading puzzle image. Make sure 'test.png' is in the root directory.");
    alert("Could not load puzzle image. Please check the 'test.png' file.");
    startButton.disabled = true;
};

startButton.addEventListener('click', startGame);
resetButton.addEventListener('click', resetGame);
difficultySelect.addEventListener('change', (event) => {
    currentDifficulty = parseInt(event.target.value);
    resetGame(); // Reset game when difficulty changes
});

// --- Core Game Functions ---

function startGame() {
    startButton.disabled = true;
    difficultySelect.disabled = true;
    puzzleSolvedOverlay.classList.add('hidden');
    timeDisplay.textContent = '00:00';
    clearTimeout(timerInterval); // Clear any existing timer

    createPuzzlePieces(currentDifficulty);
    shufflePieces();
    renderPuzzle();
    startTimer();
}

function resetGame() {
    startButton.disabled = false;
    difficultySelect.disabled = false;
    puzzleSolvedOverlay.classList.add('hidden');
    timeDisplay.textContent = '00:00';
    clearTimeout(timerInterval);
    puzzleBoard.innerHTML = ''; // Clear the board
    pieces = [];
    shuffledPieces = [];
    draggedPiece = null;
    dropTarget = null;
}

function createPuzzlePieces(numPieces) {
    pieces = [];
    const imageWidth = puzzleImage.naturalWidth;
    const imageHeight = puzzleImage.naturalHeight;

    let cols, rows;
    // Determine grid based on total pieces
    if (numPieces === 6) {
        cols = 3; rows = 2;
    } else if (numPieces === 12) {
        cols = 4; rows = 3;
    } else if (numPieces === 24) {
        cols = 6; rows = 4;
    } else if (numPieces === 36) {
        cols = 6; rows = 6;
    } else {
        console.error("Invalid number of pieces:", numPieces);
        return;
    }

    const pieceWidth = imageWidth / cols;
    const pieceHeight = imageHeight / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const index = r * cols + c;
            pieces.push({
                id: index,
                originalIndex: index,
                x: c,
                y: r,
                width: pieceWidth,
                height: pieceHeight,
                backgroundPositionX: -c * pieceWidth,
                backgroundPositionY: -r * pieceHeight
            });
        }
    }

    // Set grid template for CSS dynamically
    puzzleBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    puzzleBoard.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    // Adjust puzzle-area dimensions based on image aspect ratio and base width
    const aspectRatio = imageWidth / imageHeight;
    const basePuzzleWidth = 500; // From CSS
    puzzleBoard.style.width = `${basePuzzleWidth}px`;
    puzzleBoard.style.height = `${basePuzzleWidth / aspectRatio}px`;
    document.querySelector('.puzzle-area').style.width = `${basePuzzleWidth}px`;
    document.querySelector('.puzzle-area').style.height = `${basePuzzleWidth / aspectRatio}px`;
}

function shufflePieces() {
    shuffledPieces = [...pieces];
    // Fisher-Yates shuffle algorithm
    for (let i = shuffledPieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffledPieces[i], shuffledPieces[j]] = [shuffledPieces[j], shuffledPieces[i]];
    }
}

function renderPuzzle() {
    puzzleBoard.innerHTML = ''; // Clear existing pieces
    shuffledPieces.forEach(piece => {
        const pieceElement = document.createElement('div');
        pieceElement.classList.add('puzzle-piece');
        pieceElement.setAttribute('data-id', piece.id);
        pieceElement.setAttribute('draggable', true);

        // Calculate background position relative to the piece element's size
        // We'll use background-size: cover in CSS, but position needs to be correct.
        // This is a bit tricky with `background-size: cover` and dynamically sized pieces.
        // The most robust way is to set the background-image directly on the piece,
        // and calculate background-position as percentage of the *original image* size
        // which then scales correctly with `background-size: 1000% 1000%` or similar
        // depending on the number of rows/columns.
        // For a replica, we'll set the image once on the main board and use clip-path or
        // a more complex background-position/size approach.
        // A simpler replica approach: each piece is its own `div` with the full image
        // as background, and background-position moves the visible part.

        const cols = Math.sqrt(currentDifficulty === 6 ? 6/ (puzzleImage.naturalWidth / puzzleImage.naturalHeight) : currentDifficulty === 12 ? 4 : currentDifficulty === 24 ? 6 : 6); // Approximation
        const rows = currentDifficulty / cols;

        pieceElement.style.backgroundImage = `url(${IMAGE_PATH})`;
        pieceElement.style.backgroundSize = `${cols * 100}% ${rows * 100}%`; // Make the background image span the whole grid virtually
        pieceElement.style.backgroundPosition = `${piece.backgroundPositionX / puzzleImage.naturalWidth * 100}% ${piece.backgroundPositionY / puzzleImage.naturalHeight * 100}%`;

        pieceElement.addEventListener('dragstart', handleDragStart);
        pieceElement.addEventListener('dragover', handleDragOver);
        pieceElement.addEventListener('dragleave', handleDragLeave);
        pieceElement.addEventListener('drop', handleDrop);
        pieceElement.addEventListener('dragend', handleDragEnd);

        puzzleBoard.appendChild(pieceElement);
    });
}

// --- Drag and Drop Handlers ---

function handleDragStart(e) {
    draggedPiece = e.target;
    e.dataTransfer.setData('text/plain', e.target.dataset.id);
    e.target.classList.add('dragging');
}

function handleDragOver(e) {
    e.preventDefault(); // Necessary to allow dropping
    const target = e.target.closest('.puzzle-piece');
    if (target && target !== draggedPiece) {
        if (dropTarget && dropTarget !== target) {
            dropTarget.classList.remove('highlight');
        }
        dropTarget = target;
        dropTarget.classList.add('highlight');
    }
}

function handleDragLeave(e) {
    const target = e.target.closest('.puzzle-piece');
    if (target) {
        target.classList.remove('highlight');
    }
    if (dropTarget === target) {
        dropTarget = null;
    }
}

function handleDrop(e) {
    e.preventDefault();
    if (dropTarget && draggedPiece && dropTarget !== draggedPiece) {
        const draggedId = parseInt(draggedPiece.dataset.id);
        const dropTargetId = parseInt(dropTarget.dataset.id);

        const draggedIndex = shuffledPieces.findIndex(p => p.id === draggedId);
        const dropTargetIndex = shuffledPieces.findIndex(p => p.id === dropTargetId);

        // Swap the pieces in our shuffledPieces array
        [shuffledPieces[draggedIndex], shuffledPieces[dropTargetIndex]] =
        [shuffledPieces[dropTargetIndex], shuffledPieces[draggedIndex]];

        renderPuzzle(); // Re-render the puzzle to reflect the swap
        checkWinCondition();
    }
    if (dropTarget) {
        dropTarget.classList.remove('highlight');
    }
    draggedPiece.classList.remove('dragging');
    draggedPiece = null;
    dropTarget = null;
}

function handleDragEnd(e) {
    if (draggedPiece) {
        draggedPiece.classList.remove('dragging');
    }
    if (dropTarget) {
        dropTarget.classList.remove('highlight');
    }
    draggedPiece = null;
    dropTarget = null;
}

// --- Game State Check ---

function checkWinCondition() {
    const isSolved = shuffledPieces.every((piece, index) => piece.originalIndex === index);
    if (isSolved) {
        clearTimeout(timerInterval);
        puzzleSolvedOverlay.classList.remove('hidden');
        startButton.disabled = false;
        difficultySelect.disabled = false;
    }
}

// --- Timer Functionality ---

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 1000);
}

function updateTimer() {
    const elapsedTime = Date.now() - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');

    timeDisplay.textContent = `${formattedMinutes}:${formattedSeconds}`;
  }
