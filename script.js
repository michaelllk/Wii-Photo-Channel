const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game-screen');
const difficultyButtons = document.querySelectorAll('.difficulty-btn');
const backButton = document.getElementById('backButton'); // Non-functional but present
const viewRecordsButton = document.getElementById('viewRecordsButton'); // Non-functional but present
const puzzleBoard = document.getElementById('puzzle-board');
const timeDisplay = document.getElementById('time');
const puzzleSolvedOverlay = document.getElementById('puzzle-solved-overlay');
const finalTimeDisplay = document.getElementById('final-time');
const continueButton = document.getElementById('continueButton');

const IMAGE_PATH = 'test.png'; // Assuming test.png is in the root

let pieces = [];
let shuffledPieces = [];
let timerInterval;
let startTime;
let currentDifficulty = 0; // Will be set by button click

let draggedPiece = null;
let dropTarget = null;

// --- Game Initialization ---

// Preload the image to get its dimensions
const puzzleImage = new Image();
puzzleImage.src = IMAGE_PATH;
puzzleImage.onload = () => {
    // Image loaded, now ensure initial screen is correct
    showScreen('start');
};
puzzleImage.onerror = () => {
    console.error("Error loading puzzle image. Make sure 'test.png' is in the root directory.");
    alert("Could not load puzzle image. Please check the 'test.png' file and refresh.");
    // Disable buttons if image fails to load
    difficultyButtons.forEach(button => button.disabled = true);
};

// --- Event Listeners ---

difficultyButtons.forEach(button => {
    button.addEventListener('click', (event) => {
        currentDifficulty = parseInt(event.target.dataset.difficulty);
        startGame();
    });
});

continueButton.addEventListener('click', resetGame);

// Non-functional buttons, for replica appearance only
backButton.addEventListener('click', () => {
    console.log("Back button clicked (non-functional for replica).");
    // Optionally: You could make this go back to a 'main menu' if you expand the game.
});
viewRecordsButton.addEventListener('click', () => {
    console.log("View records button clicked (non-functional for replica).");
    // Optionally: You could display a simple 'records' screen here.
});


// --- Screen Management ---
function showScreen(screenId) {
    startScreen.classList.add('hidden');
    gameScreen.classList.add('hidden');
    document.getElementById(`${screenId}-screen`).classList.remove('hidden');
}


// --- Core Game Functions ---

function startGame() {
    showScreen('game');
    puzzleSolvedOverlay.classList.add('hidden');
    timeDisplay.textContent = '00:00:00';
    clearTimeout(timerInterval); // Clear any existing timer

    createPuzzlePieces(currentDifficulty);
    shufflePieces();
    renderPuzzle();
    startTimer();
}

function resetGame() {
    showScreen('start'); // Go back to start screen
    puzzleSolvedOverlay.classList.add('hidden');
    timeDisplay.textContent = '00:00:00';
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
    } else if (numPieces === 48) { // Added for 48 pieces
        cols = 8; rows = 6;
    } else {
        console.error("Invalid number of pieces:", numPieces);
        return;
    }

    // Set dynamic dimensions for the puzzle area based on image aspect ratio
    const aspectRatio = imageWidth / imageHeight;
    // Aim for a consistent width for the puzzle area, e.g., 480px,
    // and adjust height based on aspect ratio
    const puzzleAreaWidth = 480; // Defined in CSS, use here for calculation consistency
    puzzleBoard.style.width = `${puzzleAreaWidth}px`;
    puzzleBoard.style.height = `${puzzleAreaWidth / aspectRatio}px`;
    document.querySelector('.puzzle-area').style.width = `${puzzleAreaWidth}px`;
    document.querySelector('.puzzle-area').style.height = `${puzzleAreaWidth / aspectRatio}px`;


    // The natural dimensions of the piece in the original image
    const originalPieceWidth = imageWidth / cols;
    const originalPieceHeight = imageHeight / rows;

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const index = r * cols + c;
            pieces.push({
                id: index,
                originalIndex: index, // Store original position for win condition
                backgroundPositionX: -c * originalPieceWidth, // Negative for background-position
                backgroundPositionY: -r * originalPieceHeight
            });
        }
    }

    // Set grid template for CSS dynamically
    puzzleBoard.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    puzzleBoard.style.gridTemplateRows = `repeat(${rows}, 1fr)`;
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
    const cols = parseInt(puzzleBoard.style.gridTemplateColumns.split(' ').length);
    const rows = parseInt(puzzleBoard.style.gridTemplateRows.split(' ').length);

    shuffledPieces.forEach(piece => {
        const pieceElement = document.createElement('div');
        pieceElement.classList.add('puzzle-piece');
        pieceElement.setAttribute('data-id', piece.id); // Store the original piece ID
        pieceElement.setAttribute('draggable', true);

        // Set background image and position
        pieceElement.style.backgroundImage = `url(${IMAGE_PATH})`;
        pieceElement.style.backgroundSize = `${cols * 100}% ${rows * 100}%`; // Scale background to fit the whole grid
        pieceElement.style.backgroundPosition = `${piece.backgroundPositionX}px ${piece.backgroundPositionY}px`;

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
        const draggedId = parseInt(draggedPiece.dataset.id); // Original ID of the dragged piece
        const dropTargetId = parseInt(dropTarget.dataset.id); // Original ID of the drop target piece

        // Find the actual piece objects in shuffledPieces array
        const draggedObject = shuffledPieces.find(p => p.id === draggedId);
        const dropTargetObject = shuffledPieces.find(p => p.id === dropTargetId);

        if (draggedObject && dropTargetObject) {
            // Swap the 'originalIndex' values for the actual piece objects,
            // or more simply, swap the objects themselves in the shuffled array
            const draggedCurrentIndex = shuffledPieces.indexOf(draggedObject);
            const dropTargetCurrentIndex = shuffledPieces.indexOf(dropTargetObject);

            [shuffledPieces[draggedCurrentIndex], shuffledPieces[dropTargetCurrentIndex]] =
            [shuffledPieces[dropTargetCurrentIndex], shuffledPieces[draggedCurrentIndex]];

            renderPuzzle(); // Re-render the puzzle to reflect the visual swap
            checkWinCondition();
        }
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
    // Check if current order of IDs matches their original positions
    const isSolved = shuffledPieces.every((piece, index) => {
        // The piece at 'index' in the shuffled array should have an 'originalIndex' of 'index'
        return piece.originalIndex === index;
    });

    if (isSolved) {
        clearTimeout(timerInterval);
        const finalTime = timeDisplay.textContent;
        finalTimeDisplay.textContent = finalTime; // Update final time on overlay
        puzzleSolvedOverlay.classList.remove('hidden');
    }
}

// --- Timer Functionality ---

function startTimer() {
    startTime = Date.now();
    timerInterval = setInterval(updateTimer, 10); // Update every 10ms for hundredths
}

function updateTimer() {
    const elapsedTime = Date.now() - startTime;
    const minutes = Math.floor(elapsedTime / 60000);
    const seconds = Math.floor((elapsedTime % 60000) / 1000);
    const hundredths = Math.floor((elapsedTime % 1000) / 10); // Get hundredths of a second

    const formattedMinutes = String(minutes).padStart(2, '0');
    const formattedSeconds = String(seconds).padStart(2, '0');
    const formattedHundredths = String(hundredths).padStart(2, '0');

    timeDisplay.textContent = `${formattedMinutes}:${formattedSeconds}:${formattedHundredths}`;
                                                             }
