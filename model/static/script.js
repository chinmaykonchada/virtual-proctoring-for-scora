let noFaceCount = 0;
let multiplePeopleCount = 0;
let cellPhoneCount = 0;
let bookCount = 0;
let audioCount = 0;
let fullscreenExitCount = 0;
let copyPasteCount = 0;

const questions = [
    {
        question: "What is the primary use of the SQL language?",
        answers: [
            { "text": "System programming", "correct": false },
            { "text": "Web development", "correct": false },
            { "text": "Database management", "correct": true },
            { "text": "Machine learning", "correct": false }
        ]
    },
    {
        question: "What is the time complexity of a binary search algorithm?",
        answers: [
            { "text": "O(n)", "correct": false },
            { "text": "O(log n)", "correct": true },
            { "text": "O(n^2)", "correct": false },
            { "text": "O(n log n)", "correct": false }
        ]
    },
    {
        question: "What does the term 'polymorphism' refer to in object-oriented programming?",
        answers: [
            { "text": "Inheritance", "correct": false },
            { "text": "The ability to take many forms", "correct": true },
            { "text": "Encapsulation", "correct": false },
            { "text": "Abstraction", "correct": false }
        ]
    },
    {
        question: "Which programming language is used most for machine learning?",
        answers: [
            { text: "Java", correct: false },
            { text: "Python", correct: true },
            { text: "C", correct: false },
            { text: "C++", correct: false },
        ]
    },
    {
        question: "What is the main advantage of quantum computing over classical computing?",
        answers: [
            { "text": "Energy efficiency", "correct": false },
            { "text": "Parallel processing", "correct": true },
            { "text": "Ease of programming", "correct": false },
            { "text": "Cost effectiveness", "correct": false }
        ]
    }
];

const startButton = document.getElementById("start-btn");
const submitButton = document.getElementById("submit-btn");
const questionElement = document.getElementById("question");
const answerButtons = document.getElementById("answer-buttons");
const nextButton = document.getElementById("next-btn");
const scoreContainer = document.getElementById("score-container");
const scoreText = document.getElementById("score-text");
const quizContainer = document.getElementById("quiz-container");
const video = document.getElementById('video');
const returnFullscreenButton = document.getElementById('returnFullscreenButton');

let currentQuestionIndex = 0;
let score = 0;
let intervalId;
let isLockdownActive = false;

function startQuiz() {
    startButton.style.display = "none"; // Hide the start button
    quizContainer.classList.remove("hide");
    submitButton.classList.remove("hide");
    nextButton.classList.remove("hide"); // Show the next button from the start
    currentQuestionIndex = 0;
    score = 0;
    nextButton.innerHTML = "Next";
    showQuestion();
    startProctoring();
    resetAlertCounts();
    startProctoring();
}

function showQuestion() {
    resetState();
    let currentQuestion = questions[currentQuestionIndex];
    let questionNo = currentQuestionIndex + 1;
    questionElement.innerHTML = questionNo + ". " + currentQuestion.question;

    currentQuestion.answers.forEach(answer => {
        const button = document.createElement("button");
        button.innerHTML = answer.text;
        button.classList.add("btn");
        answerButtons.appendChild(button);
        if(answer.correct) {
            button.dataset.correct = answer.correct;
        }
        button.addEventListener("click", selectAnswer);
    });
}

function resetState() {
    nextButton.style.display = "none";
    while(answerButtons.firstChild) {
        answerButtons.removeChild(answerButtons.firstChild);
    }
}

function selectAnswer(e) {
    const selectedBtn = e.target;
    const isCorrect = selectedBtn.dataset.correct === "true";
    if(isCorrect) {
        selectedBtn.classList.add("correct");
        score++;
    } else {
        selectedBtn.classList.add("incorrect");
    }
    Array.from(answerButtons.children).forEach(button => {
        if(button.dataset.correct === "true") {
            button.classList.add("correct");
        }
        button.disabled = true;
    });
    nextButton.style.display = "block";
}

function showScore() {
    resetState();
    questionElement.innerHTML = `You scored ${score} out of ${questions.length}!`;
    nextButton.innerHTML = "Play Again";
    nextButton.style.display = "block";
    submitButton.classList.add("hide");
    stopProctoring();
}

function handleNextButton() {
    currentQuestionIndex++;
    if(currentQuestionIndex < questions.length) {
        showQuestion();
    } else {
        showScore();
    }
}

function startProctoring() {
    if (!intervalId) {
        fetch('/start_detection', { method: 'POST' })
            .then(response => response.json())
            .then(data => console.log(data.message))
            .catch(error => console.error('Error:', error));

        intervalId = setInterval(captureFrame, 2000);

        // Activate lockdown features
        isLockdownActive = true;
        enterFullScreen();
        document.addEventListener('visibilitychange', handleVisibilityChange);
        addCopyPasteListeners();
    }
}

function stopProctoring() {
    if (intervalId) {
        fetch('/stop_detection', { method: 'POST' })
            .then(response => response.json())
            .then(data => console.log(data.message))
            .catch(error => console.error('Error:', error));

        clearInterval(intervalId);
        intervalId = null;

        // Deactivate lockdown features
        isLockdownActive = false;
        exitFullScreen();
        hideReturnFullscreenButton();
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        removeCopyPasteListeners();
    }
}

function updateAlertCounts(message) {
    if (message.includes("No face detected")) {
        noFaceCount++;
        document.getElementById('no-face-count').textContent = noFaceCount;
    }
    if (message.includes("people detected")) {
        multiplePeopleCount++;
        document.getElementById('multiple-people-count').textContent = multiplePeopleCount;
    }
    if (message.includes("Cell phone detected")) {
        cellPhoneCount++;
        document.getElementById('cell-phone-count').textContent = cellPhoneCount;
    }
    if (message.includes("Book detected")) {
        bookCount++;
        document.getElementById('book-count').textContent = bookCount;
    }
    if (message.includes("Audio detected")) {
        audioCount++;
        document.getElementById('audio-count').textContent = audioCount;
    }
}

async function init() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        video.srcObject = stream;
    } catch (error) {
        console.error('Error accessing webcam or microphone:', error);
    }
}

function customAlert(message) {
    const alertDiv = document.createElement('div');
    alertDiv.style.position = 'fixed';
    alertDiv.style.top = '10px';
    alertDiv.style.left = '50%';
    alertDiv.style.transform = 'translateX(-50%)';
    alertDiv.style.backgroundColor = 'rgba(255, 0, 0, 0.8)';
    alertDiv.style.color = 'white';
    alertDiv.style.padding = '10px';
    alertDiv.style.borderRadius = '5px';
    alertDiv.style.zIndex = '9999';
    alertDiv.textContent = message;
    document.body.appendChild(alertDiv);

    setTimeout(() => {
        document.body.removeChild(alertDiv);
    }, 3000);
}

function captureFrame() {
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => { // Blob (Binary Large Object)
        const formData = new FormData();
        formData.append('image', blob, 'image.jpg');

        fetch('/process_image', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            console.log(data.message);
            if (data.alert) {
                customAlert(data.message);
                updateAlertCounts(data.message);
            }
        })
        .catch(error => console.error('Error:', error));
    }, 'image/jpeg');
}

function resetAlertCounts() {
    noFaceCount = 0;
    multiplePeopleCount = 0;
    cellPhoneCount = 0;
    bookCount = 0;
    audioCount = 0;
    fullscreenExitCount = 0;
    copyPasteCount = 0;
    document.getElementById('no-face-count').textContent = '0';
    document.getElementById('multiple-people-count').textContent = '0';
    document.getElementById('cell-phone-count').textContent = '0';
    document.getElementById('book-count').textContent = '0';
    document.getElementById('audio-count').textContent = '0';
    document.getElementById('fullscreen-exit-count').textContent = '0';
    document.getElementById('copy-paste-count').textContent = '0';
}

function addCopyPasteListeners() {
    document.addEventListener('copy', handleCopyPaste);
    document.addEventListener('paste', handleCopyPaste);
    document.addEventListener('cut', handleCopyPaste);
}

function removeCopyPasteListeners() {
    document.removeEventListener('copy', handleCopyPaste);
    document.removeEventListener('paste', handleCopyPaste);
    document.removeEventListener('cut', handleCopyPaste);
}

function enterFullScreen() {
    const element = document.documentElement;
    if (element.requestFullscreen) {
        element.requestFullscreen();
    } else if (element.mozRequestFullScreen) {
        element.mozRequestFullScreen();
    } else if (element.webkitRequestFullscreen) {
        element.webkitRequestFullscreen();
    } else if (element.msRequestFullscreen) {
        element.msRequestFullscreen();
    }
}

function exitFullScreen() {
    if (document.exitFullscreen) {
        document.exitFullscreen();
    } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
    } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
    }
}

function showReturnFullscreenButton() {
    returnFullscreenButton.style.display = 'block';
}

function hideReturnFullscreenButton() {
    returnFullscreenButton.style.display = 'none';
}

function handleVisibilityChange() {
    if (isLockdownActive && document.hidden) {
        customAlert("Tab shifting is not allowed! Please return to the exam tab.");
        if (!document.fullscreenElement) {
            showReturnFullscreenButton();
        }
    }
}

function handleCopyPaste(e) {
    if (isLockdownActive) {
        e.preventDefault();
        customAlert("Copy/Paste is not allowed!");
        copyPasteCount++;
        document.getElementById('copy-paste-count').textContent = copyPasteCount;
    }
}

function resetQuiz() {
    startButton.style.display = "block"; // Show the start button again
    quizContainer.classList.add("hide");
    submitButton.classList.add("hide");
    nextButton.classList.add("hide");
    scoreContainer.classList.add("hide");
}

startButton.addEventListener("click", startQuiz);
nextButton.addEventListener("click", () => {
    if (currentQuestionIndex < questions.length) {
        handleNextButton();
    } else {
        resetQuiz(); // Reset the quiz when "Play Again" is clicked
    }
});
submitButton.addEventListener("click", showScore);

returnFullscreenButton.addEventListener('click', () => {
    enterFullScreen();
});

document.addEventListener('fullscreenchange', () => {
    if (isLockdownActive && !document.fullscreenElement) {
        customAlert("You have exited fullscreen mode. Please return to fullscreen to continue the exam.");
        showReturnFullscreenButton();
        fullscreenExitCount++;
        document.getElementById('fullscreen-exit-count').textContent = fullscreenExitCount;
    } else if (document.fullscreenElement) {
        hideReturnFullscreenButton();
    }
});

init();