// 1. Import Firebase Modules
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-analytics.js";
import { getFirestore, collection, addDoc, getDocs, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";
import { getAuth, signInAnonymously } from "https://www.gstatic.com/firebasejs/9.6.1/firebase-auth.js";
import badWordsList from "./badwords.js"; // External file with bad words
import {query, where, orderBy, limit, deleteDoc, doc} from "https://www.gstatic.com/firebasejs/9.6.1/firebase-firestore.js";

// 2a. Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDBgRh-t6pJOEZfQanb-T6KYNj_XbL_YP8",
    authDomain: "runfactor-cf724.firebaseapp.com",
    projectId: "runfactor-cf724",
    storageBucket: "runfactor-cf724.firebasestorage.app",
    messagingSenderId: "882591954418",
    appId: "1:882591954418:web:39964ebfa664061fb4a76b",
    measurementId: "G-KWWWHF4NQE"
};

// 2b. Initialize Firebase
const app = initializeApp(firebaseConfig);
// Disabling Analytics for now.
// const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);


// Call the function once to delete all scores for "Adan Sneg"




// 3.Sign in user anonymously
signInAnonymously(auth)
    .then(() => {
        console.log("Signed in anonymously");
    })
    .catch((error) => {
        console.error("Authentication error:", error);
    });

// 4. Define PrimeFactorGame Class
class PrimeFactorGame {
    constructor() {
        this.easyPrimes = [2, 3, 5, 7, 11];
        this.hardPrimes = [13, 17, 19, 23];
        this.usedNumbers = new Set();
        this.score = 0;
        this.combo = 0;
        this.perfectStreak = 0;
        this.correctList = [];
        this.wrongList = [];
        this.mistakeMade = false;
        this.mistakeCount = 0;
        this.questionNumber = 0;
        this.timeLeft = 120.00;
        this.gameRunning = false;
        this.username = "";
        this.difficultyThresholds = [35000, 90000, 200000];
        this.startTime = null;
        //.....
    }
    startGame() {
        this.username = document.getElementById("username").value || "Player";
        document.getElementById("username-display").innerText = `Player: ${this.username}`;
        document.getElementById("start-screen").style.display = "none";
        document.getElementById("game-screen").style.display = "block";
        
        let countdown = 3;
        document.getElementById("number-display").innerText = `Starting in ${countdown}...`;
    
        let countdownInterval = setInterval(() => {
            countdown--;
            document.getElementById("number-display").innerText = `Starting in ${countdown}...`;
            if (countdown <= 0) {
                clearInterval(countdownInterval);
                console.log("Starting game...");
                this.beginGame(); // This should now trigger correctly
            }
        }, 1000);
    }
    beginGame() {
        console.log("Game has started!"); // Debugging line
        this.gameRunning = true;
        this.createButtons();
        this.newRound();
        this.timerInterval = setInterval(() => this.updateTimer(), 10);
        this.startTime = Date.now(); // Record the exact time game started
    }
    createButtons() {
        const buttonContainer = document.getElementById("buttons");
        buttonContainer.innerHTML = "";
        
        [...this.easyPrimes, ...this.hardPrimes].forEach(prime => {
            let btn = document.createElement("button");
            btn.innerText = prime;
            btn.classList.add("prime-btn");
            btn.onclick = () => this.handleGuess(prime, btn);
            buttonContainer.appendChild(btn);
        });
    }
    setQuestion() {
        let number;
        do {
            number = this.generateCompositeNumber();
        } while (this.usedNumbers.has(number));
    
        this.usedNumbers.add(number);
        return number;
    }
    generateCompositeNumber() {
        let score = this.score;
        let numEasy, numHard;

        if (score >= 200000) {
            numEasy = Math.floor(Math.random() * 6) + 2;
            numHard = Math.floor(Math.random() * 4) + 3;
        } else if (score >= 90000) {
            numEasy = Math.floor(Math.random() * 5) + 2;
            numHard = Math.floor(Math.random() * 3) + 2;
        } else if (score >= 35000) {
            numEasy = Math.floor(Math.random() * 4) + 2;
            numHard = 1;
        } else {
            numEasy = Math.floor(Math.random() * 3) + 2;
            numHard = 0;
        }

        let factors = [];
        for (let i = 0; i < numEasy; i++) {
            factors.push(this.easyPrimes[Math.floor(Math.random() * this.easyPrimes.length)]);
        }
        for (let i = 0; i < numHard; i++) {
            factors.push(this.hardPrimes[Math.floor(Math.random() * this.hardPrimes.length)]);
        }

        return factors.reduce((a, b) => a * b, 1);
    }
    handleGuess(prime, button) {
        if (!this.gameRunning) return;
    
        if (this.currentNumber % prime !== 0) {
            button.classList.add("wrong"); // Shake animation
            setTimeout(() => button.classList.remove("wrong"), 500);
            this.mistakeMade = true;
            this.combo = 0; // Reset combo on mistake
            this.perfectStreak = 0;
            this.applyPenalty();
            return;
        }
    
        button.classList.add("correct"); // Highlight correct answer
        setTimeout(() => button.classList.remove("correct"), 500);
        this.currentNumber /= prime;
        this.updateScore(prime);
        document.getElementById("number-display").innerText = `Factorize: ${this.currentNumber}`;
    
        if (this.currentNumber === 1) {
            this.completeFactorization();
        }
    }
    updateScore(prime) {
        let baseScore = this.getBaseScore(prime);
        this.combo++; // Increment combo counter
    
        let comboBonus = 50 * this.combo;
        let scoreIncrement = baseScore + comboBonus; // Combine base score and combo bonus
    
        let clearBonus = 0;
        if (this.currentNumber === 1) {
            // Determine clear bonus based on the perfect clear or not
            let m = this.questionNumber; // Current question number
            clearBonus = this.mistakeMade ? (1000 * m) : (3500 * Math.pow(1.05, m)); // Use perfect bonus if no mistakes
        }
    
        scoreIncrement += clearBonus; // Include clear bonus in the total increment score
    
        // Calculate the duration for the fadeout and score increase
        let duration = Math.max(400, Math.round(75 * Math.log(scoreIncrement))); // Ensure a minimum duration
        let steps = Math.ceil(scoreIncrement / 100); // Determine number of steps based on increment size
        let stepIncrement = scoreIncrement / steps; // Calculate the value for each step
    
        let scoreDisplay = document.getElementById("score-display");
        let actionText = document.getElementById("action-text");
    
        // Show the increment text
        actionText.innerText = `+${scoreIncrement}`;
        actionText.style.display = "block";
    
        // Remove the class to reset animation
        actionText.classList.remove("action-popup");
    
        // Force reflow to restart animation
        void actionText.offsetWidth;
    
        // Re-add the animation class
        actionText.classList.add("action-popup");
        // Gradually increase the score instead of an instant jump
        let currentScore = this.score;
        let targetScore = this.score + scoreIncrement;
        let interval = setInterval(() => {
            if (currentScore < targetScore) {
                currentScore += stepIncrement; // Increment by the calculated step
                this.score = Math.min(currentScore, targetScore); // Prevent overshooting
                scoreDisplay.innerText = `Score: ${Math.round(this.score)}`; // Round for cleaner display
            } else {
                this.score = targetScore; // Ensure exact value
                scoreDisplay.innerText = `Score: ${this.score.toFixed(1)}`;
                clearInterval(interval);
            }
        }, duration / steps); // Adjust timing based on number of steps
    
        // Hide action text after the same duration as the animation
        setTimeout(() => {
            actionText.style.display = "none";
        }, duration); // Use the calculated duration
    }
    newRound() {
        this.mistakeMade = false;
        this.currentNumber = this.setQuestion();
        this.originalNumber = this.currentNumber;
        
        console.log("New number generated:", this.currentNumber); // Debugging line
        document.getElementById("number-display").innerText = `Factorize: ${this.currentNumber}`;
    }  
    getBaseScore(prime) {
        if ([2, 3, 5, 7].includes(prime)) return 100;
        if ([11, 13, 17].includes(prime)) return 300;
        return 500;
    }
    completeFactorization() {
        let m = this.questionNumber; // Current question number
        let clearBonus = 1000 * m; // Base clear bonus
        let perfectBonus = 3500 * Math.pow(1.05, m); // Base perfect clear bonus
        let streakBonus = this.perfectStreak > 0 ? 3500 * Math.pow(1.618, Math.sqrt(this.perfectStreak)) : 0; // Streak bonus
        
        let baseScore = this.getBaseScore(this.originalNumber); // Get base score based on the final factor
        let totalScoreIncrement = baseScore + (50 * this.combo) + (this.mistakeMade ? clearBonus : (this.perfectStreak > 0 ? streakBonus : perfectBonus));
    
        let factorization = this.getFactorization(this.originalNumber);
        
        // Check if the player made any mistakes
        if (this.mistakeMade) {
            this.wrongList.push({ number: this.originalNumber, factors: factorization });
            this.score += clearBonus; // Only add the clear bonus
            this.perfectStreak = 0; // Reset streak on mistake
        } else {
            this.correctList.push({ number: this.originalNumber, factors: factorization });
            this.score += totalScoreIncrement; // Add the total increment score for perfect clear
            this.perfectStreak++; // Increase perfect streak count
        }
        
        // Update the score display immediately
        document.getElementById("score-display").innerText = `Score: ${this.score.toFixed(1)}`;
    
        // Start the next round
        this.newRound();
    }
    applyPenalty() {
        this.mistakeCount++;
        let penalty = this.fibonacci(this.mistakeCount) * 0.1;
        this.timeLeft -= penalty;
        if (this.timeLeft < 0) this.timeLeft = 0;
    }
    fibonacci(n) {
        if (n <= 1) return n;
        let a = 0, b = 1, temp;
        for (let i = 2; i <= n; i++) {
            temp = a + b;
            a = b;
            b = temp;
        }
        return b;
    }
    updateTimer() {
        if (!this.gameRunning) return;
        // Calculate elapsed time
        const elapsedTime = (Date.now() - this.startTime) / 1000;
        this.timeLeft = Math.max(0, 120 - elapsedTime); // 120 sec total

        document.getElementById("timer-display").innerText = `Time Left: ${this.timeLeft.toFixed(2)}s`;

        if (this.timeLeft <= 0) {
            clearInterval(this.timerInterval);
            this.endGame();
        }
    }
    endGame() {
        // Ensure elements exist before modifying them
        const endScreen = document.getElementById("end-screen");
        const finalScoreElement = document.getElementById("final-score");
        const correctListElement = document.getElementById("correct-list");
        const wrongListElement = document.getElementById("wrong-list");
    
        if (!endScreen || !finalScoreElement || !correctListElement || !wrongListElement) {
            console.error("End screen elements not found!");
            return;
        }
        document.getElementById("game-screen").style.display = "none";
        endScreen.style.display = "block";
    
        finalScoreElement.innerText = `Final Score: ${this.score.toFixed(1)}`;
    
        correctListElement.innerHTML = this.correctList.length > 0 
            ? this.correctList.map(q => `<li title="${q.factors}">${q.number}</li>`).join('') 
            : '<li>None</li>';
    
        wrongListElement.innerHTML = this.wrongList.length > 0 
            ? this.wrongList.map(q => `<li title="${q.factors}">${q.number}</li>`).join('') 
            : '<li>None</li>';
        gameOver();
    }
    getFactorization(number) {
        let n = number;
        let factors = {};
        for (let prime of [...this.easyPrimes, ...this.hardPrimes]) {
            while (n % prime === 0) {
                factors[prime] = (factors[prime] || 0) + 1;
                n /= prime;
            }
        }
        return Object.entries(factors).map(([base, exp]) => exp > 1 ? `${base}^${exp}` : base).join(" × ");
    }
}

// 5. Define Helper Functions (Leaderboard, Score Submission)
function gameOver() {
    let username = document.getElementById("username").value;
    let scoreText = document.getElementById("score-display").innerText.trim();

    // Remove any non-numeric characters and convert to a number
    let finalScore = parseFloat(scoreText.replace(/[^\d.]/g, ""));

    console.log("Game over! Submitting score:", { username, finalScore });

    if (username && !isNaN(finalScore)) {
        submitScore(username, finalScore);
    } else {
        console.error("Invalid username or score, not submitting.");
    }
}

let leaderboardLoaded = false;

async function loadLeaderboard() {
    if (leaderboardLoaded) return; // Prevent multiple calls

    const q = query(collection(db, "scores"), orderBy("score", "desc"), limit(10));
    const querySnapshot = await getDocs(q);

    let leaderboardTable = document.getElementById("leaderboard").getElementsByTagName("tbody")[0];
    leaderboardTable.innerHTML = ""; // Clear old data

    querySnapshot.forEach((doc, index) => {
        let row = leaderboardTable.insertRow();
        row.insertCell(0).innerText = index + 1;
        row.insertCell(1).innerText = doc.data().username;
        row.insertCell(2).innerText = doc.data().score;
    });

    leaderboardLoaded = true; // Ensure leaderboard only loads once
}

export async function fetchLeaderboard(entriesToShow = 10) {
    console.log("Fetching leaderboard...");

    try {
        const db = getFirestore();
        const leaderboardRef = collection(db, "scores");
        const querySnapshot = await getDocs(leaderboardRef);

        let userScores = new Map(); // Map to store highest score per user

        querySnapshot.forEach((doc) => {
            let data = doc.data();
            let scoreValue = data.finalScore ?? data.score;
            let username = data.username;

            if (username && scoreValue !== undefined) {
                // Store only the highest score for each user
                if (!userScores.has(username) || userScores.get(username) < scoreValue) {
                    userScores.set(username, scoreValue);
                }
            } else {
                console.warn("Document is missing username or score:", data);
            }
        });

        // Convert map to array, sort by score descending
        let leaderboardData = Array.from(userScores.entries())
            .map(([username, finalScore]) => ({ username, finalScore }))
            .sort((a, b) => b.finalScore - a.finalScore);

        updateLeaderboardTable(leaderboardData.slice(0, entriesToShow));

        // Store full leaderboard for "Show More" functionality
        window.fullLeaderboard = leaderboardData;

        console.log("Leaderboard updated!");

    } catch (error) {
        console.error("🔥 Error fetching leaderboard:", error);
    }
}

export function updateLeaderboardTable(data) {
    const leaderboardBody = document.getElementById("leaderboard-body");
    leaderboardBody.innerHTML = ""; 

    data.forEach((entry, index) => {
        const row = document.createElement("tr");
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${entry.username || "Unknown"}</td>
            <td>${entry.finalScore || 0}</td>
        `;
        leaderboardBody.appendChild(row);
    });
}

// Call fetchLeaderboard when the end screen is displayed
document.addEventListener("DOMContentLoaded", () => {
    fetchLeaderboard();
});

async function submitScore(username, score) {
    try {
        const scoresRef = collection(db, "scores");

        // Step 1: Fetch all scores by this user
        const q = query(scoresRef, where("username", "==", username), orderBy("score", "desc"));
        const querySnapshot = await getDocs(q);
        let scores = [];

        querySnapshot.forEach(doc => {
            scores.push({ id: doc.id, score: doc.data().score });
        });

        console.log(`Current scores for ${username}:`, scores);

        // Step 2: If 3 or more scores exist, remove the lowest one before adding the new one
        if (scores.length >= 3) {
            let lowestScore = scores[scores.length - 1]; // The lowest score (last one in descending order)
            await deleteDoc(doc(db, "scores", lowestScore.id)); // Remove the lowest score
            console.log(`Deleted lowest score: ${lowestScore.score}`);
        }

        // Step 3: Add the new score
        await addDoc(scoresRef, {
            username: username,
            score: score,
            timestamp: serverTimestamp()
        });

        console.log("Score submitted successfully!");
    } catch (error) {
        console.error("Error submitting score:", error);
    }
}
async function deleteUserScores(username) {
    try {
        const scoresRef = collection(db, "scores");
        const q = query(scoresRef, where("username", "==", username));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
            console.log(`No scores found for ${username}.`);
            return;
        }

        let deletedCount = 0;
        for (const document of querySnapshot.docs) {
            await deleteDoc(doc(db, "scores", document.id));
            deletedCount++;
        }

        console.log(`Deleted ${deletedCount} scores for ${username}.`);
    } catch (error) {
        console.error("Error deleting scores:", error);
    }
}
deleteUserScores("Adan Sneg");

// 6. Initialize Game Object
const game = new PrimeFactorGame();

// 7. Export startGame()
export function startGame() {
    game.startGame();
}
