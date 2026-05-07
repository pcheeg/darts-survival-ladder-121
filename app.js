const RUNS_KEY = "121SurvivalLadderRuns";
const CURRENT_KEY = "121SurvivalLadderCurrentRun";
const START_SCORE = 121;
const END_SCORE = 170;
const MAX_LIVES = 3;
const SHIELD_STREAK_TARGET = 3;

let runs = loadRuns();
let currentRun = loadCurrentRun() || createRun();

const $ = (id) => document.getElementById(id);

const els = {
  headerBest: $("headerBest"),
  runsPlayed: $("runsPlayed"),
  todayBest: $("todayBest"),
  currentScore: $("currentScore"),
  lives: $("lives"),
  shieldPanel: $("shieldPanel"),
  shieldFill: $("shieldFill"),
  shieldLabel: $("shieldLabel"),
  shieldText: $("shieldText"),
  toast: $("toast"),
  statusMessage: $("statusMessage"),
  hit3Btn: $("hit3Btn"),
  hit6Btn: $("hit6Btn"),
  hit9Btn: $("hit9Btn"),
  missBtn: $("missBtn"),
  undoBtn: $("undoBtn"),
  newRunBtn: $("newRunBtn"),
  statRuns: $("statRuns"),
  statBest: $("statBest"),
  statToday: $("statToday"),
  statAverage: $("statAverage"),
  statCompleted: $("statCompleted"),
  statLivesEarned: $("statLivesEarned"),
  statLivesLost: $("statLivesLost"),
  statShieldSaves: $("statShieldSaves"),
  statsTable: $("statsTable"),
  resetBtn: $("resetBtn")
};

function createRun() {
  return {
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    startedAt: new Date().toISOString(),
    endedAt: null,
    completed: false,
    startScore: START_SCORE,
    endScore: START_SCORE,
    maxScoreReached: START_SCORE,
    livesAtEnd: 0,
    currentScore: START_SCORE,
    lives: 0,
    streak: 0,
    shieldActive: false,
    attempts: []
  };
}

function loadRuns() {
  try { return JSON.parse(localStorage.getItem(RUNS_KEY)) || []; }
  catch { return []; }
}

function loadCurrentRun() {
  try { return JSON.parse(localStorage.getItem(CURRENT_KEY)); }
  catch { return null; }
}

function saveRuns() { localStorage.setItem(RUNS_KEY, JSON.stringify(runs)); }
function saveCurrent() { localStorage.setItem(CURRENT_KEY, JSON.stringify(currentRun)); }
function clearCurrent() { localStorage.removeItem(CURRENT_KEY); }
function allRuns() { return [...runs, currentRun].filter(Boolean); }

function finishRun(completed = false) {
  currentRun.endedAt = new Date().toISOString();
  currentRun.completed = completed;
  currentRun.endScore = currentRun.currentScore;
  currentRun.livesAtEnd = currentRun.lives;
  runs.push(currentRun);
  saveRuns();
  clearCurrent();
}

function newRun(force = false) {
  if (!force && currentRun.attempts.length && !currentRun.endedAt) {
    const ok = confirm("Start a new run? Your current run will be saved as ended.");
    if (!ok) return;
    finishRun(false);
  }
  currentRun = createRun();
  saveCurrent();
  render("New run started. Begin on 121.");
}

function snapshotState() {
  return {
    endedAt: currentRun.endedAt,
    completed: currentRun.completed,
    currentScore: currentRun.currentScore,
    lives: currentRun.lives,
    streak: currentRun.streak,
    shieldActive: currentRun.shieldActive,
    endScore: currentRun.endScore,
    livesAtEnd: currentRun.livesAtEnd,
    maxScoreReached: currentRun.maxScoreReached
  };
}

function record(result) {
  if (currentRun.endedAt) currentRun = createRun();

  const before = snapshotState();
  const scoreBefore = currentRun.currentScore;
  const livesBefore = currentRun.lives;
  const streakBefore = currentRun.streak;
  const shieldBefore = currentRun.shieldActive;

  let scoreAfter = scoreBefore;
  let livesAfter = livesBefore;
  let streakAfter = streakBefore;
  let shieldAfter = shieldBefore;
  let shieldEarned = false;
  let shieldUsed = false;
  let lifeEarned = false;
  let lifeLost = false;
  let ended = false;
  let completed = false;

  if (["hit3", "hit6", "hit9"].includes(result)) {
    if (result === "hit3" && livesBefore < MAX_LIVES) {
      livesAfter = livesBefore + 1;
      lifeEarned = true;
    }

    if (!shieldBefore) {
      streakAfter = Math.min(SHIELD_STREAK_TARGET, streakBefore + 1);
      if (streakAfter >= SHIELD_STREAK_TARGET) {
        shieldAfter = true;
        shieldEarned = true;
        streakAfter = 0;
      }
    }

    if (scoreBefore === END_SCORE) {
      ended = true;
      completed = true;
    } else {
      scoreAfter = scoreBefore + 1;
    }
  }

  if (result === "miss") {
    streakAfter = 0;

    if (livesBefore > 0) {
      livesAfter = livesBefore - 1;
      lifeLost = true;
      scoreAfter = scoreBefore;
    } else if (shieldBefore) {
      shieldAfter = false;
      shieldUsed = true;
      scoreAfter = scoreBefore;
    } else {
      ended = true;
      scoreAfter = scoreBefore;
    }
  }

  currentRun.attempts.push({
    score: scoreBefore,
    result,
    livesBefore,
    livesAfter,
    streakBefore,
    streakAfter,
    shieldBefore,
    shieldAfter,
    scoreBefore,
    scoreAfter,
    lifeEarned,
    lifeLost,
    shieldEarned,
    shieldUsed,
    endedAfter: ended,
    completedAfter: completed,
    previousState: before,
    timestamp: new Date().toISOString()
  });

  currentRun.currentScore = scoreAfter;
  currentRun.lives = livesAfter;
  currentRun.streak = streakAfter;
  currentRun.shieldActive = shieldAfter;
  currentRun.maxScoreReached = Math.max(currentRun.maxScoreReached, scoreBefore, scoreAfter);
  currentRun.endScore = scoreBefore;
  currentRun.livesAtEnd = livesAfter;

  if (ended) {
    finishRun(completed);
    const message = completed ? "🏆 Ladder complete! You checked out 170." : `Run over. You reached ${scoreBefore}.`;
    currentRun = createRun();
    render(message, result, { shieldEarned, shieldUsed, lifeEarned, lifeLost });
    return;
  }

  saveCurrent();

  let message = "";
  if (result === "hit3") message = lifeEarned ? "Hit in 3. +1 life." : "Hit in 3. Lives already full.";
  if (result === "hit6") message = "Hit in 6. Shield charged.";
  if (result === "hit9") message = "Hit in 9. Shield charged.";
  if (result === "miss" && lifeLost) message = "Missed. Life lost. Shield reset.";
  if (result === "miss" && shieldUsed) message = "Shield saved you. Try again.";
  if (shieldEarned) message = "Shield active!";

  render(message, result, { shieldEarned, shieldUsed, lifeEarned, lifeLost });
}

function undo() {
  let sourceRun = currentRun;

  if (!currentRun.attempts.length && runs.length) {
    const lastSaved = runs[runs.length - 1];
    if (lastSaved.attempts.length) {
      sourceRun = runs.pop();
      saveRuns();
    }
  }

  if (!sourceRun.attempts.length) {
    render("Nothing to undo.");
    return;
  }

  const last = sourceRun.attempts.pop();
  const prev = last.previousState || {
    endedAt: null,
    completed: false,
    currentScore: last.scoreBefore,
    lives: last.livesBefore,
    streak: last.streakBefore || 0,
    shieldActive: last.shieldBefore || false,
    endScore: last.scoreBefore,
    livesAtEnd: last.livesBefore,
    maxScoreReached: START_SCORE
  };

  Object.assign(sourceRun, prev);
  sourceRun.endedAt = null;
  sourceRun.completed = false;

  currentRun = sourceRun;
  saveRuns();
  saveCurrent();
  render("Last action undone.");
}

function pct(n, d) {
  if (!d) return "0%";
  return `${Math.round((n / d) * 100)}%`;
}

function getStats() {
  const completedRuns = runs;
  const combined = allRuns();
  const totalRuns = completedRuns.length;
  const best = combined.reduce((m, r) => Math.max(m, r.maxScoreReached || START_SCORE), START_SCORE);
  const today = new Date().toISOString().slice(0, 10);
  const todayBest = combined
    .filter(r => (r.startedAt || "").slice(0, 10) === today)
    .reduce((m, r) => Math.max(m, r.maxScoreReached || START_SCORE), START_SCORE);

  const avg = completedRuns.length
    ? completedRuns.reduce((sum, r) => sum + (r.maxScoreReached || START_SCORE), 0) / completedRuns.length
    : START_SCORE;

  const attempts = combined.flatMap(r => r.attempts || []);

  return {
    totalRuns,
    best,
    todayBest,
    avg,
    completed: completedRuns.filter(r => r.completed).length,
    livesEarned: attempts.filter(a => a.lifeEarned).length,
    livesLost: attempts.filter(a => a.lifeLost).length,
    shieldSaves: attempts.filter(a => a.shieldUsed).length,
    attempts
  };
}

function renderStatsTable(attempts) {
  const rows = [];
  for (let score = START_SCORE; score <= END_SCORE; score++) {
    const scoreAttempts = attempts.filter(a => a.score === score);
    const total = scoreAttempts.length;
    const hit3 = scoreAttempts.filter(a => a.result === "hit3").length;
    const hit6 = scoreAttempts.filter(a => a.result === "hit6").length;
    const hit9 = scoreAttempts.filter(a => a.result === "hit9").length;
    const misses = scoreAttempts.filter(a => a.result === "miss").length;
    rows.push(`
      <tr>
        <td>${score}</td>
        <td>${total}</td>
        <td>${hit3}</td>
        <td>${hit6}</td>
        <td>${hit9}</td>
        <td>${misses}</td>
        <td>${pct(hit3 + hit6 + hit9, total)}</td>
      </tr>
    `);
  }
  els.statsTable.innerHTML = rows.join("");
}

function heartSvg(full) {
  const className = full ? "life-heart full" : "life-heart empty";
  const fill = full ? "currentColor" : "none";

  return `
    <span class="heart-slot">
      <svg class="${className}" viewBox="0 0 24 24" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <path
          d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5C2 5.42 4.42 3 7.5 3c1.74 0 3.41 0.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3C19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          fill="${fill}"
          stroke="currentColor"
          stroke-width="1.9"
          stroke-linejoin="round"
        />
      </svg>
    </span>
  `;
}

function renderLives() {
  els.lives.innerHTML = Array.from({ length: MAX_LIVES }, (_, i) =>
    heartSvg(i < currentRun.lives)
  ).join("");
}

function renderShield() {
  els.shieldPanel.classList.toggle("active", currentRun.shieldActive);

  if (currentRun.shieldActive) {
    els.shieldLabel.textContent = "Shield Active";
    els.shieldText.textContent = "FULL";
    els.shieldFill.style.width = "100%";
    return;
  }

  els.shieldLabel.textContent = "Shield";
  els.shieldText.textContent = `${currentRun.streak}/3`;
  els.shieldFill.style.width = `${(currentRun.streak / SHIELD_STREAK_TARGET) * 100}%`;
}

function vibrate(pattern) {
  if ("vibrate" in navigator) navigator.vibrate(pattern);
}

function render(message = "", result = "", flags = {}) {
  const s = getStats();

  els.headerBest.textContent = s.best;
  els.runsPlayed.textContent = s.totalRuns;
  els.todayBest.textContent = s.todayBest;
  els.currentScore.textContent = currentRun.currentScore;

  renderLives();
  renderShield();

  els.statusMessage.textContent = message || "Start on 121. Three checkouts in a row charges your shield.";

  els.statRuns.textContent = s.totalRuns;
  els.statBest.textContent = s.best;
  els.statToday.textContent = s.todayBest;
  els.statAverage.textContent = s.avg.toFixed(1);
  els.statCompleted.textContent = s.completed;
  els.statLivesEarned.textContent = s.livesEarned;
  els.statLivesLost.textContent = s.livesLost;
  els.statShieldSaves.textContent = s.shieldSaves;
  renderStatsTable(s.attempts);

  animate(els.currentScore, "bump");

  els.lives.classList.remove("gain", "lose");
  els.shieldPanel.classList.remove("earned", "used");

  if (flags.lifeEarned) {
    animate(els.lives, "gain");
    vibrate(25);
  }
  if (flags.lifeLost) {
    animate(els.lives, "lose");
    vibrate([35, 25, 35]);
  }
  if (flags.shieldEarned) {
    animate(els.shieldPanel, "earned");
    showToast("Shield Active!");
    vibrate([30, 20, 50]);
  }
  if (flags.shieldUsed) {
    animate(els.shieldPanel, "used");
    showToast("Shield Save!");
    vibrate([60, 30, 60]);
  }

  maybeShowNewBest(result);
}

function animate(el, className) {
  el.classList.remove(className);
  void el.offsetWidth;
  el.classList.add(className);
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.classList.remove("hidden");
  setTimeout(() => els.toast.classList.add("hidden"), 1400);
}

function maybeShowNewBest(result) {
  if (!result || result === "miss") return;
  const savedBest = runs.reduce((m, r) => Math.max(m, r.maxScoreReached || START_SCORE), START_SCORE);
  if (currentRun.maxScoreReached > savedBest && currentRun.maxScoreReached > START_SCORE) {
    showToast("New Best!");
  }
}

function switchView(viewId) {
  document.querySelectorAll(".view").forEach(v => v.classList.remove("active"));
  document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("active"));
  $(viewId).classList.add("active");
  document.querySelector(`[data-view="${viewId}"]`).classList.add("active");
  render();
}

els.hit3Btn.addEventListener("click", () => record("hit3"));
els.hit6Btn.addEventListener("click", () => record("hit6"));
els.hit9Btn.addEventListener("click", () => record("hit9"));
els.missBtn.addEventListener("click", () => record("miss"));
els.undoBtn.addEventListener("click", undo);
els.newRunBtn.addEventListener("click", () => newRun(false));

els.resetBtn.addEventListener("click", () => {
  const ok = confirm("Delete all 121 Survival Ladder data from this device?");
  if (!ok) return;
  localStorage.removeItem(RUNS_KEY);
  localStorage.removeItem(CURRENT_KEY);
  runs = [];
  currentRun = createRun();
  saveCurrent();
  render("All data reset.");
});

document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => switchView(btn.dataset.view));
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}

saveCurrent();
render();
