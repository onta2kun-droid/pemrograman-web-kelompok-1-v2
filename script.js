const introScreen = document.getElementById("introScreen");
const outroScreen = document.getElementById("outroScreen");
const startBtn = document.getElementById("startBtn");
const repeatBtn = document.getElementById("repeatBtn");

const world = document.getElementById("world");
const viewport = document.getElementById("viewport");
const player = document.getElementById("player");
const door = document.getElementById("door");
const progressText = document.getElementById("progressText");
const leftBtn = document.getElementById("leftBtn");
const rightBtn = document.getElementById("rightBtn");
const floatingCards = [...document.querySelectorAll(".floating-card")];

const choiceScreen = document.getElementById("choiceScreen");
const continueBtn = document.getElementById("continueBtn");
const repeatJourneyBtn = document.getElementById("repeatJourneyBtn");

const quizScreen = document.getElementById("quizScreen");
const quizLives = document.getElementById("quizLives");
const quizCounter = document.getElementById("quizCounter");
const quizQuestion = document.getElementById("quizQuestion");
const answerA = document.getElementById("answerA");
const answerB = document.getElementById("answerB");
const answerAText = document.getElementById("answerAText");
const answerBText = document.getElementById("answerBText");
const quizFeedback = document.getElementById("quizFeedback");
const quizPlayer = document.getElementById("quizPlayer");
const quizPlayerLane = document.querySelector(".quiz-player-lane");

const bgMusic = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");
const musicIcon = document.getElementById("musicIcon");

const ICON_UNMUTE = "icons/unmute.png";
const ICON_MUTE = "icons/mute.png";
const MUSIC_VOLUME = window.matchMedia("(max-width: 768px)").matches ? 0.18 : 0.28;

const state = {
  started: false,
  finished: false,
  movingLeft: false,
  movingRight: false,
  direction: 1,
  speed: 4.2,
  playerX: 120,
  minX: 80,
  maxX: 6200,
  viewportWidth: window.innerWidth,
  worldWidth: 6600,
  playerWidth: 66,
  doorX: 6140,
  lastTime: 0,
  rafId: null,
};

const quizQuestions = [
  {
    question: "Komputer pertama di dunia bernama?",
    answers: ["ENIAC", "Windows"],
    correctIndex: 0,
  },
  {
    question: "Generasi pertama komputer menggunakan?",
    answers: ["Touchscreen", "Tabung vakum"],
    correctIndex: 1,
  },
  {
    question: "Siapa yang dikenal sebagai bapak komputer?",
    answers: ["Charles Babbage", "Elon Musk"],
    correctIndex: 0,
  },
  {
    question: "Komputer generasi kedua menggunakan?",
    answers: ["Lampu LED", "Transistor"],
    correctIndex: 1,
  },
  {
    question: "Media penyimpanan pada komputer lama adalah?",
    answers: ["Punch Card", "Flashdisk"],
    correctIndex: 0,
  },
  {
    question: "Komputer generasi ketiga menggunakan?",
    answers: ["Keyboard RGB", "Integrated Circuit"],
    correctIndex: 1,
  },
  {
    question: "Komputer generasi keempat ditandai dengan?",
    answers: ["Mikroprosesor", "Tabung vakum"],
    correctIndex: 0,
  },
  {
    question: "Internet pertama kali dikembangkan dari proyek?",
    answers: ["Facebook", "ARPANET"],
    correctIndex: 1,
  },
  {
    question: "CPU adalah singkatan dari?",
    answers: ["Central Processing Unit", "Computer Personal Unit"],
    correctIndex: 0,
  },
  {
    question: "RAM berfungsi untuk?",
    answers: ["Menyimpan data permanen", "Menyimpan data sementara"],
    correctIndex: 1,
  },
];

const quizState = {
  active: false,
  lives: 3,
  current: 0,
};

const quizMoveState = {
  active: false,
  x: 0,
  minX: -520,
  maxX: 520,
  speed: 4.2,
  locked: false,
};

let quizTransitionTimeout = null;
let quizTransitioning = false;

let isMuted = false;
let fadeFrame = null;

/* =========================
   HELPERS
========================= */
function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function clearQuizTimeout() {
  if (quizTransitionTimeout) {
    clearTimeout(quizTransitionTimeout);
    quizTransitionTimeout = null;
  }
}

function updateMetrics() {
  state.viewportWidth = viewport?.clientWidth || window.innerWidth;
  state.worldWidth = world?.offsetWidth || 6600;
  state.playerWidth = player?.offsetWidth || 66;
  updateQuizMovementBounds();
}

function updateQuizMovementBounds() {
  if (!quizPlayerLane || !quizPlayer || !answerA || !answerB) return;

  const laneRect = quizPlayerLane.getBoundingClientRect();
  const playerWidth = quizPlayer.offsetWidth || 64;

  const leftPortal = answerA.querySelector(".quiz-door__portal");
  const rightPortal = answerB.querySelector(".quiz-door__portal");

  if (!leftPortal || !rightPortal) return;

  const leftRect = leftPortal.getBoundingClientRect();
  const rightRect = rightPortal.getBoundingClientRect();

  const laneCenter = laneRect.left + laneRect.width / 2;

  const leftTarget = leftRect.left + leftRect.width / 2 - laneCenter;
  const rightTarget = rightRect.left + rightRect.width / 2 - laneCenter;

  const extraReach = playerWidth * 0.35;

  quizMoveState.minX = Math.floor(leftTarget - extraReach);
  quizMoveState.maxX = Math.ceil(rightTarget + extraReach);

  quizMoveState.x = clamp(
    quizMoveState.x,
    quizMoveState.minX,
    quizMoveState.maxX
  );
}

function setPressed(direction, isPressed) {
  if (direction === "left") state.movingLeft = isPressed;
  if (direction === "right") state.movingRight = isPressed;
}

/* =========================
   PLAYER / CAMERA
========================= */
function updatePlayerDirection() {
  if (state.movingLeft && !state.movingRight) {
    state.direction = -1;
    player?.classList.add("is-facing-left");
  } else if (state.movingRight && !state.movingLeft) {
    state.direction = 1;
    player?.classList.remove("is-facing-left");
  }
}

function updatePlayerMovement(deltaFactor = 1) {
  if (quizState.active) return;
  if (!player) return;

  let moved = false;

  if (state.movingLeft && !state.movingRight) {
    state.playerX -= state.speed * deltaFactor;
    moved = true;
  }

  if (state.movingRight && !state.movingLeft) {
    state.playerX += state.speed * deltaFactor;
    moved = true;
  }

  state.playerX = clamp(state.playerX, state.minX, state.maxX);
  player.classList.toggle("is-moving", moved);
  updatePlayerDirection();
}

function updateCamera() {
  if (!world || !player) return;

  const targetCameraX = clamp(
    state.playerX - state.viewportWidth * 0.35,
    0,
    state.worldWidth - state.viewportWidth
  );

  world.style.transform = `translate3d(${-targetCameraX}px, 0, 0)`;
  player.style.left = `${state.playerX}px`;
}

function updateProgress() {
  if (!progressText) return;
  const progress =
    ((state.playerX - state.minX) / (state.maxX - state.minX)) * 100;
  progressText.textContent = `${Math.round(clamp(progress, 0, 100))}%`;
}

function revealCards() {
  floatingCards.forEach((card) => {
    const cardX = Number(card.dataset.x || 0);
    if (state.playerX > cardX - 180) {
      card.classList.add("is-visible");
    }
  });
}

/* =========================
   QUIZ PLAYER
========================= */
function updateQuizPlayer() {
  if (!quizPlayer) return;

  quizPlayer.style.left = `calc(50% + ${quizMoveState.x}px)`;

  if (state.movingLeft && !state.movingRight) {
    quizPlayer.classList.add("is-facing-left");
    quizPlayer.classList.add("is-moving");
  } else if (state.movingRight && !state.movingLeft) {
    quizPlayer.classList.remove("is-facing-left");
    quizPlayer.classList.add("is-moving");
  } else {
    quizPlayer.classList.remove("is-moving");
  }
}

function resetQuizPlayerPosition() {
  quizMoveState.x = 0;
  state.movingLeft = false;
  state.movingRight = false;

  answerA?.classList.remove("is-correct", "is-wrong", "is-awake");
  answerB?.classList.remove("is-correct", "is-wrong", "is-awake");

  updateQuizPlayer();
}

function armQuizQuestion() {
  quizTransitioning = true;
  quizMoveState.locked = true;
  quizMoveState.active = false;

  resetQuizPlayerPosition();

  requestAnimationFrame(() => {
    updateQuizMovementBounds();
    resetQuizPlayerPosition();

    requestAnimationFrame(() => {
      state.movingLeft = false;
      state.movingRight = false;
      quizMoveState.locked = false;
      quizMoveState.active = true;
      quizTransitioning = false;
      updateQuizPlayer();
    });
  });
}

function moveQuizPlayer() {
  if (!quizState.active || !quizMoveState.active || quizMoveState.locked) return;

  if (state.movingLeft && !state.movingRight) {
    quizMoveState.x -= quizMoveState.speed;
  }

  if (state.movingRight && !state.movingLeft) {
    quizMoveState.x += quizMoveState.speed;
  }

  quizMoveState.x = clamp(
    quizMoveState.x,
    quizMoveState.minX,
    quizMoveState.maxX
  );

  updateQuizPlayer();
  checkQuizDoorCollision();
}

function checkQuizDoorCollision() {
  if (
    !quizState.active ||
    !quizMoveState.active ||
    quizMoveState.locked ||
    quizTransitioning ||
    !quizPlayer ||
    !answerA ||
    !answerB
  ) {
    return;
  }

  const leftPortal = answerA.querySelector(".quiz-door__portal");
  const rightPortal = answerB.querySelector(".quiz-door__portal");

  if (!leftPortal || !rightPortal) return;

  const playerRect = quizPlayer.getBoundingClientRect();
  const leftRect = leftPortal.getBoundingClientRect();
  const rightRect = rightPortal.getBoundingClientRect();

  const playerCenterX = playerRect.left + playerRect.width / 2;
  const playerBottom = playerRect.bottom;

  const leftCenterX = leftRect.left + leftRect.width / 2;
  const rightCenterX = rightRect.left + rightRect.width / 2;

  const leftDistance = Math.abs(playerCenterX - leftCenterX);
  const rightDistance = Math.abs(playerCenterX - rightCenterX);

  const sameHeightLeft = playerBottom > leftRect.top + 12;
  const sameHeightRight = playerBottom > rightRect.top + 12;

  answerA.classList.toggle("is-awake", leftDistance < 44 && sameHeightLeft);
  answerB.classList.toggle("is-awake", rightDistance < 44 && sameHeightRight);

  if (leftDistance < 12 && sameHeightLeft) {
    quizMoveState.locked = true;
    handleAnswer(0);
    return;
  }

  if (rightDistance < 12 && sameHeightRight) {
    quizMoveState.locked = true;
    handleAnswer(1);
  }
}

/* =========================
   GAME FLOW
========================= */
function openChoiceScreen() {
  state.finished = true;
  state.movingLeft = false;
  state.movingRight = false;
  player?.classList.remove("is-moving");
  cancelAnimationFrame(state.rafId);

  if (choiceScreen) {
    choiceScreen.classList.remove("is-hidden-screen");
    choiceScreen.classList.add("is-visible");
    choiceScreen.setAttribute("aria-hidden", "false");
  }
}

function closeChoiceScreen() {
  if (choiceScreen) {
    choiceScreen.classList.remove("is-visible");
    choiceScreen.classList.add("is-hidden-screen");
    choiceScreen.setAttribute("aria-hidden", "true");
  }
}

function openQuiz() {
  closeChoiceScreen();
  clearQuizTimeout();

  quizState.active = true;
  quizState.lives = 3;
  quizState.current = 0;

  quizMoveState.x = 0;
  quizMoveState.active = false;
  quizMoveState.locked = true;

  if (quizScreen) {
    quizScreen.classList.remove("is-hidden-screen");
    quizScreen.classList.add("is-visible");
    quizScreen.setAttribute("aria-hidden", "false");
  }

  renderLives();
  renderQuestion();

  state.finished = false;
  startLoop();
}

function closeQuiz() {
  quizState.active = false;
  quizMoveState.active = false;
  quizMoveState.locked = false;
  quizTransitioning = false;
  clearQuizTimeout();

  if (quizScreen) {
    quizScreen.classList.remove("is-visible");
    quizScreen.classList.add("is-hidden-screen");
    quizScreen.setAttribute("aria-hidden", "true");
  }
}

function showOutroAfterQuiz() {
  closeQuiz();

  if (outroScreen) {
    outroScreen.classList.remove("is-hidden", "is-hidden-screen");
    outroScreen.classList.add("is-visible");
    outroScreen.setAttribute("aria-hidden", "false");
  }
}

function finishJourney() {
  state.finished = true;
  state.movingLeft = false;
  state.movingRight = false;
  player?.classList.remove("is-moving");
  cancelAnimationFrame(state.rafId);
  openChoiceScreen();
}

function startJourney() {
  state.started = true;
  state.finished = false;
  state.playerX = 120;
  state.movingLeft = false;
  state.movingRight = false;
  state.direction = 1;

  introScreen?.classList.add("is-hidden");
  introScreen?.setAttribute("aria-hidden", "true");

  outroScreen?.classList.remove("is-visible");
  outroScreen?.classList.add("is-hidden");
  outroScreen?.setAttribute("aria-hidden", "true");

  closeChoiceScreen();
  closeQuiz();

  floatingCards.forEach((card) => card.classList.remove("is-visible"));
  door?.classList.remove("is-awake");
  player?.classList.remove("is-moving", "is-facing-left");

  updateCamera();
  updateProgress();
  startLoop();
}

function resetJourney() {
  closeChoiceScreen();
  closeQuiz();

  state.started = true;
  state.finished = false;
  state.playerX = 120;
  state.movingLeft = false;
  state.movingRight = false;
  state.direction = 1;

  player?.classList.remove("is-moving", "is-facing-left");
  floatingCards.forEach((card) => card.classList.remove("is-visible"));
  door?.classList.remove("is-awake");

  outroScreen?.classList.remove("is-visible");
  outroScreen?.classList.add("is-hidden");
  outroScreen?.setAttribute("aria-hidden", "true");

  updateCamera();
  updateProgress();
  startLoop();
}

function checkDoorCollision() {
  const playerFront = state.playerX + state.playerWidth * 0.7;
  const doorStart = state.doorX;

  if (playerFront > doorStart - 260) {
    door?.classList.add("is-awake");
  } else {
    door?.classList.remove("is-awake");
  }

  if (!state.finished && playerFront >= doorStart) {
    finishJourney();
  }
}

/* =========================
   QUIZ
========================= */
function renderLives() {
  if (!quizLives) return;

  const full = "❤";
  const empty = "♡";
  quizLives.textContent = `${full.repeat(quizState.lives)}${
    quizState.lives < 3 ? " " + empty.repeat(3 - quizState.lives) : ""
  }`;
}

function renderQuestion() {
  const current = quizQuestions[quizState.current];
  if (!current) return;

  if (quizCounter) {
    quizCounter.textContent = `Question ${quizState.current + 1} / ${quizQuestions.length}`;
  }

  if (quizQuestion) {
    quizQuestion.textContent = current.question;
  }

  if (answerAText) {
    answerAText.textContent = current.answers[0];
  }

  if (answerBText) {
    answerBText.textContent = current.answers[1];
  }

  if (quizFeedback) {
    quizFeedback.textContent = "";
  }

  armQuizQuestion();
}

function resetQuiz() {
  clearQuizTimeout();

  quizState.active = true;
  quizState.lives = 3;
  quizState.current = 0;

  quizMoveState.x = 0;
  quizMoveState.active = false;
  quizMoveState.locked = true;

  state.movingLeft = false;
  state.movingRight = false;

  renderLives();
  renderQuestion();
}

function handleAnswer(selectedIndex) {
  if (!quizState.active || quizTransitioning) return;

  const current = quizQuestions[quizState.current];
  if (!current) return;

  const isCorrect = selectedIndex === current.correctIndex;

  quizTransitioning = true;
  quizMoveState.locked = true;
  quizMoveState.active = false;

  state.movingLeft = false;
  state.movingRight = false;
  updateQuizPlayer();

  answerA?.classList.remove("is-correct", "is-wrong");
  answerB?.classList.remove("is-correct", "is-wrong");

  const selectedDoor = selectedIndex === 0 ? answerA : answerB;
  const correctDoor = current.correctIndex === 0 ? answerA : answerB;

  if (isCorrect) {
    selectedDoor?.classList.add("is-correct");

    if (quizFeedback) {
      quizFeedback.textContent = "Benar. Melangkah ke pertanyaan berikutnya...";
    }

    quizTransitionTimeout = setTimeout(() => {
      quizTransitionTimeout = null;
      quizState.current += 1;

      if (quizState.current >= quizQuestions.length) {
        showOutroAfterQuiz();
        return;
      }

      renderQuestion();
    }, 900);

    return;
  }

  selectedDoor?.classList.add("is-wrong");
  correctDoor?.classList.add("is-correct");

  quizState.lives -= 1;
  renderLives();

  if (quizState.lives <= 0) {
    if (quizFeedback) {
      quizFeedback.textContent = "Nyawamu habis. Quiz akan diulang dari awal.";
    }

    quizTransitionTimeout = setTimeout(() => {
      quizTransitionTimeout = null;
      resetQuiz();
    }, 1200);

    return;
  }

  if (quizFeedback) {
    quizFeedback.textContent = "Kurang tepat. Tetap lanjut ke pertanyaan berikutnya.";
  }

  quizTransitionTimeout = setTimeout(() => {
    quizTransitionTimeout = null;
    quizState.current += 1;

    if (quizState.current >= quizQuestions.length) {
      showOutroAfterQuiz();
      return;
    }

    renderQuestion();
  }, 1000);
}

/* =========================
   LOOP
========================= */
function gameLoop(timestamp) {
  if (!state.started || state.finished) return;

  if (!state.lastTime) state.lastTime = timestamp;
  const delta = timestamp - state.lastTime;
  state.lastTime = timestamp;
  const deltaFactor = Math.min(delta / 16.67, 1.8);

  if (!quizState.active) {
    updatePlayerMovement(deltaFactor);
    updateCamera();
    updateProgress();
    revealCards();
    updateNPCs();
    checkDoorCollision();
  } else {
    moveQuizPlayer();
  }

  state.rafId = requestAnimationFrame(gameLoop);
}

function startLoop() {
  cancelAnimationFrame(state.rafId);
  state.lastTime = 0;
  state.rafId = requestAnimationFrame(gameLoop);
}

/* =========================
   INPUT
========================= */
function handleKey(event, isPressed) {
  const key = event.key.toLowerCase();

  if (["arrowleft", "a"].includes(key)) {
    event.preventDefault();
    setPressed("left", isPressed);
  }

  if (["arrowright", "d"].includes(key)) {
    event.preventDefault();
    setPressed("right", isPressed);
  }
}

function bindPressable(button, direction) {
  if (!button) return;

  const pressStart = (event) => {
    event.preventDefault();
    setPressed(direction, true);
  };

  const pressEnd = (event) => {
    event.preventDefault();
    setPressed(direction, false);
  };

  button.addEventListener("mousedown", pressStart);
  button.addEventListener("touchstart", pressStart, { passive: false });
  button.addEventListener("mouseup", pressEnd);
  button.addEventListener("mouseleave", pressEnd);
  button.addEventListener("touchend", pressEnd, { passive: false });
  button.addEventListener("touchcancel", pressEnd, { passive: false });
}

/* =========================
   MUSIC
========================= */
function setMusicIcon() {
  if (!musicIcon) return;

  if (isMuted) {
    musicIcon.src = ICON_MUTE;
    musicIcon.alt = "Music off";
    musicToggle?.setAttribute("aria-label", "Unmute music");
  } else {
    musicIcon.src = ICON_UNMUTE;
    musicIcon.alt = "Music on";
    musicToggle?.setAttribute("aria-label", "Mute music");
  }
}

function fadeAudio(to, duration = 2000, callback) {
  if (!bgMusic) return;

  if (fadeFrame) cancelAnimationFrame(fadeFrame);

  const from = bgMusic.volume;
  const start = performance.now();

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    bgMusic.volume = from + (to - from) * progress;

    if (progress < 1) {
      fadeFrame = requestAnimationFrame(step);
    } else {
      fadeFrame = null;
      if (callback) callback();
    }
  }

  fadeFrame = requestAnimationFrame(step);
}

async function startMusic() {
  if (!bgMusic) return;

  try {
    if (bgMusic.paused) {
      bgMusic.volume = 0;
      await bgMusic.play();
    }
    fadeAudio(MUSIC_VOLUME, 2000);
    isMuted = false;
    setMusicIcon();
  } catch (error) {
    console.log("Autoplay diblokir. Menunggu interaksi user.");
  }
}

function muteMusic() {
  if (!bgMusic) return;

  if (fadeFrame) {
    cancelAnimationFrame(fadeFrame);
    fadeFrame = null;
  }

  bgMusic.volume = 0;
  bgMusic.pause();
  isMuted = true;
  setMusicIcon();
}

async function unmuteMusic() {
  if (!bgMusic) return;

  try {
    if (fadeFrame) {
      cancelAnimationFrame(fadeFrame);
      fadeFrame = null;
    }

    bgMusic.volume = MUSIC_VOLUME;
    await bgMusic.play();
    isMuted = false;
    setMusicIcon();
  } catch (error) {
    console.log("Gagal memutar musik.");
  }
}

/* =========================
   EVENTS
========================= */
window.addEventListener("keydown", (event) => handleKey(event, true));
window.addEventListener("keyup", (event) => handleKey(event, false));

window.addEventListener("blur", () => {
  state.movingLeft = false;
  state.movingRight = false;
  player?.classList.remove("is-moving");
  quizPlayer?.classList.remove("is-moving");
});

window.addEventListener("resize", () => {
  updateMetrics();
  updateCamera();
  updateQuizPlayer();
});

bindPressable(leftBtn, "left");
bindPressable(rightBtn, "right");

startBtn?.addEventListener("click", startJourney);
repeatBtn?.addEventListener("click", resetJourney);

continueBtn?.addEventListener("click", openQuiz);
repeatJourneyBtn?.addEventListener("click", resetJourney);

if (bgMusic) {
  bgMusic.volume = 0;
  setMusicIcon();
  startMusic();

  document.addEventListener(
    "click",
    () => {
      if (bgMusic.paused && !isMuted) {
        startMusic();
      }
    },
    { once: true }
  );
}

if (musicToggle) {
  const handleMusicToggle = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    if (!bgMusic) return;

    if (isMuted || bgMusic.paused) {
      await unmuteMusic();
    } else {
      muteMusic();
    }
  };

  musicToggle.addEventListener("click", handleMusicToggle);
  musicToggle.addEventListener("touchend", handleMusicToggle, {
    passive: false,
  });

  musicToggle.addEventListener(
    "touchstart",
    (event) => {
      event.stopPropagation();
    },
    { passive: true }
  );

  musicToggle.addEventListener(
    "touchmove",
    (event) => {
      event.stopPropagation();
    },
    { passive: true }
  );
}

/* =========================
   INIT
========================= */
updateMetrics();
updateCamera();
updateProgress();
updateQuizPlayer();

if (choiceScreen) {
  choiceScreen.classList.add("is-hidden-screen");
  choiceScreen.classList.remove("is-visible");
  choiceScreen.setAttribute("aria-hidden", "true");
}

if (quizScreen) {
  quizScreen.classList.add("is-hidden-screen");
  quizScreen.classList.remove("is-visible");
  quizScreen.setAttribute("aria-hidden", "true");
}

if (outroScreen) {
  outroScreen.classList.add("is-hidden");
  outroScreen.classList.remove("is-visible");
  outroScreen.setAttribute("aria-hidden", "true");
}

setMusicIcon();

const npcs = [...document.querySelectorAll(".npc")];

function updateNPCs() {
  npcs.forEach((npc) => {
    const npcX = npc.offsetLeft;
    const distance = Math.abs(state.playerX - npcX);

    if (distance < 220) {
      npc.classList.add("is-active");
    } else {
      npc.classList.remove("is-active");
    }
  });
}