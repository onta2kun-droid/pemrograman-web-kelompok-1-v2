const introScreen = document.getElementById("introScreen");
const outroScreen = document.getElementById("outroScreen");
const gameScreen = document.getElementById("gameScreen");
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

const state = {
  started: false,
  finished: false,
  direction: 1,
  movingLeft: false,
  movingRight: false,
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

function updateMetrics() {
  state.viewportWidth = viewport?.clientWidth || window.innerWidth;
  state.worldWidth = world?.offsetWidth || 6600;
  state.playerWidth = player?.offsetWidth || 66;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function setPressed(direction, isPressed) {
  if (direction === "left") state.movingLeft = isPressed;
  if (direction === "right") state.movingRight = isPressed;
}

function updatePlayerDirection() {
  if (state.movingLeft && !state.movingRight) {
    state.direction = -1;
    player.classList.add("is-facing-left");
  } else if (state.movingRight && !state.movingLeft) {
    state.direction = 1;
    player.classList.remove("is-facing-left");
  }
}

function updatePlayerMovement(deltaFactor = 1) {
  const wasMoving = player.classList.contains("is-moving");
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

  if (moved !== wasMoving) {
    player.offsetHeight;
  }

  updatePlayerDirection();
}

function updateCamera() {
  const targetCameraX = clamp(
    state.playerX - state.viewportWidth * 0.35,
    0,
    state.worldWidth - state.viewportWidth
  );

  world.style.transform = `translate3d(${-targetCameraX}px, 0, 0)`;
  player.style.left = `${state.playerX}px`;
}

function updateProgress() {
  const progress = ((state.playerX - state.minX) / (state.maxX - state.minX)) * 100;
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

function checkDoorCollision() {
  const playerFront = state.playerX + state.playerWidth * 0.7;
  const doorStart = state.doorX;

  if (!state.finished && playerFront >= doorStart) {
    finishJourney();
  }
}

function gameLoop(timestamp) {
  if (!state.started || state.finished) return;

  if (!state.lastTime) state.lastTime = timestamp;
  const delta = timestamp - state.lastTime;
  state.lastTime = timestamp;
  const deltaFactor = Math.min(delta / 16.67, 1.8);

  updatePlayerMovement(deltaFactor);
  updateCamera();
  updateProgress();
  revealCards();
  checkDoorCollision();

  state.rafId = requestAnimationFrame(gameLoop);
}

function startLoop() {
  cancelAnimationFrame(state.rafId);
  state.lastTime = 0;
  state.rafId = requestAnimationFrame(gameLoop);
}

function startJourney() {
  state.started = true;
  state.finished = false;
  introScreen.classList.add("is-hidden");
  outroScreen.classList.remove("is-visible");
  outroScreen.classList.add("is-hidden");
  startLoop();
}

function finishJourney() {
  state.finished = true;
  state.movingLeft = false;
  state.movingRight = false;
  player.classList.remove("is-moving");
  cancelAnimationFrame(state.rafId);
  outroScreen.classList.remove("is-hidden");
  outroScreen.classList.add("is-visible");
}

function resetJourney() {
  state.started = true;
  state.finished = false;
  state.playerX = 120;
  state.movingLeft = false;
  state.movingRight = false;
  state.direction = 1;
  player.classList.remove("is-moving", "is-facing-left");
  floatingCards.forEach((card) => card.classList.remove("is-visible"));
  updateCamera();
  updateProgress();
  outroScreen.classList.remove("is-visible");
  outroScreen.classList.add("is-hidden");
  startLoop();
}

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

window.addEventListener("keydown", (event) => handleKey(event, true));
window.addEventListener("keyup", (event) => handleKey(event, false));
window.addEventListener("blur", () => {
  state.movingLeft = false;
  state.movingRight = false;
  player.classList.remove("is-moving");
});

window.addEventListener("resize", () => {
  updateMetrics();
  updateCamera();
});

bindPressable(leftBtn, "left");
bindPressable(rightBtn, "right");

startBtn?.addEventListener("click", startJourney);
repeatBtn?.addEventListener("click", resetJourney);

updateMetrics();
updateCamera();
updateProgress();

const bgMusic = document.getElementById("bgMusic");
const musicToggle = document.getElementById("musicToggle");
const musicIcon = document.getElementById("musicIcon");

const ICON_UNMUTE = "icons/unmute.png";
const ICON_MUTE = "icons/mute.png";
const MUSIC_VOLUME = window.matchMedia("(max-width: 768px)").matches ? 0.18 : 0.28;

let isMuted = false;
let fadeFrame = null;

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
  musicToggle.addEventListener("touchend", handleMusicToggle, { passive: false });

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