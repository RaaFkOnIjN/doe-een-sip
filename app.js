const setupScreen = document.getElementById("screen-setup");
const gameScreen = document.getElementById("screen-game");
const scoreScreen = document.getElementById("screen-score");
const homeScreen = document.getElementById("screen-home");
const rulesScreen = document.getElementById("screen-rules");

const categoryChooser = document.getElementById("categoryChooser");
const categoryButtons = document.getElementById("categoryButtons");

const playerNameInput = document.getElementById("playerNameInput");
const addPlayerBtn = document.getElementById("addPlayerBtn");
const playersList = document.getElementById("playersList");
const startGameBtn = document.getElementById("startGameBtn");
const enableChaos = document.getElementById("enableChaos");
const enableSound = document.getElementById("enableSound");

const turnLabel = document.getElementById("turnLabel");
const helpBanner = document.getElementById("helpBanner");

const questionBox = document.getElementById("questionBox");
const categoryLabel = document.getElementById("categoryLabel");
const difficultyLabel = document.getElementById("difficultyLabel");
const questionText = document.getElementById("questionText");
const optionsEl = document.getElementById("options");

const resultBox = document.getElementById("resultBox");
const nextBtn = document.getElementById("nextBtn");

const scoreBtn = document.getElementById("scoreBtn");
const backToGameBtn = document.getElementById("backToGameBtn");
const scoreTable = document.getElementById("scoreTable");
const resetBtn = document.getElementById("resetBtn");
const endGameBtn = document.getElementById("endGameBtn");

const modeNextBtn = document.getElementById("modeNextBtn");

/* nieuwe mode + team entry */
const modeScreen = document.getElementById("screen-mode");
const modePvpBtn = document.getElementById("modePvpBtn");
const modeTvTBtn = document.getElementById("modeTvTBtn");

const teamEntryScreen = document.getElementById("screen-teamentry");
const backToModeBtn = document.getElementById("backToModeBtn");
const backToModeBtnPvp = document.getElementById("backToModeBtnPvp");
const teamsWrap = document.getElementById("teamsWrap");
const addTeamBtn = document.getElementById("addTeamBtn");
const startTeamGameBtn = document.getElementById("startTeamGameBtn");
const teamEntryError = document.getElementById("teamEntryError");

const endScreen = document.getElementById("screen-end");
const endHighlights = document.getElementById("endHighlights");
const endScoreBtn = document.getElementById("endScoreBtn");
const endRematchBtn = document.getElementById("endRematchBtn");
const endBackBtn = document.getElementById("endBackBtn");
const confirmDialog = document.getElementById("confirmDialog");
const confirmTitle = document.getElementById("confirmTitle");
const confirmMessage = document.getElementById("confirmMessage");
const confirmAcceptBtn = document.getElementById("confirmAcceptBtn");
const homeStartBtn = document.getElementById("homeStartBtn");
const resumeGameBtn = document.getElementById("resumeGameBtn");
const homeRulesBtn = document.getElementById("homeRulesBtn");
const rulesBackBtn = document.getElementById("rulesBackBtn");
const footerRulesBtn = document.getElementById("footerRulesBtn");
const privacyBtn = document.getElementById("privacyBtn");
const privacyDialog = document.getElementById("privacyDialog");
const lengthPills = document.getElementById("lengthPills");
const penaltyPills = document.getElementById("penaltyPills");
const customPenaltyWrap = document.getElementById("customPenaltyWrap");
const customPenaltyInput = document.getElementById("customPenaltyInput");
const progressText = document.getElementById("progressText");
const progressPercent = document.getElementById("progressPercent");
const progressFill = document.getElementById("progressFill");
const shareResultBtn = document.getElementById("shareResultBtn");
const toast = document.getElementById("toast");

const SAVE_KEY = "siparena-game-v2";

const POINTS_BY_DIFFICULTY = { Easy: 1, Medium: 2, Hard: 3, Brutal: 4 };

let questions = [];
let activeQuestions = [];
let totalQuestions = 20;
let selectedGameLength = 20;
let penaltyMode = "sips";
let customPenalty = "";
let soundEnabled = false;
let answeredTotal = 0;
let tieBreakerQueue = [];
let tieBreakerOffset = 0;

let players = []; // [{name}]
let mode = "solo"; // solo | team
let teams = []; // [[name,name,...], ...]
let teamNames = {}; // index => team name

let turnIndex = 0;
let selectedMode = null; // "pvp" | "tvt"

let stats = {};     // name => {correct, wrong, sips, wrongStreak}
let teamStats = {}; // label => {correct, wrong, sips, wrongStreak}

let current = null;
let usedQuestionIds = new Set();
let chaosEnabled = false;
let pending = { sipMultiplier: 1 };

let askedCountPlayer = {}; // { [playerName]: number }
let askedCountTeam = {};   // { [teamLabel]: number }  // label zoals "A" / "Team 1" etc.

let pendingChaosEvent = null;
let awaitingChaosConfirm = false;

let activeChaosBadge = null; // bv. "Double Sips"

let scoreReturnScreen = null;
let currentScreen = null;
let rulesReturnScreen = null;

let selectedCategories = new Set();
const categoryWrap = document.getElementById("categoryWrap");

// categorieën die standaard UIT staan
const nicheCategories = ["Nerd / Techniek", "Games"]; // uitbreidbaar

const MAX_PLAYERS_PVP = 5;
const MAX_TEAMS = 5;
const DEFAULT_TEAMS = 2;

// ------- timer -------
let timerSeconds = null;
let timerTotalMs = 10 * 1000;
let timerRemainingMs = 10 * 1000;
let timerInterval = null;
let timerPaused = false;

const timerPills = document.getElementById("timerPills");
const timerWrap = document.getElementById("timerWrap");
const timerText = document.getElementById("timerText");
const timerFill = document.getElementById("timerFill");
const chaosBadge = document.getElementById("chaosBadge");

// ------- helpers -------
function show(screen) {
  const all = [
    modeScreen,
    homeScreen,
    rulesScreen,
    setupScreen,
    teamEntryScreen,
    gameScreen,
    scoreScreen,
    endScreen
  ];

  all.forEach(s => s && s.classList.add("hidden"));

  // extra veiligheid (voorkomt crash als screen null is)
  if (!screen) return;

  screen.classList.remove("hidden");
  currentScreen = screen;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;",
    "'": "&#39;", '"': "&quot;"
  })[char]);
}

function questionKey(q) {
  return JSON.stringify([q.question, q.options, q.correctIndex]);
}

function isCategoryEnabled(category) {
  return selectedCategories.has(category);
}

function confirmAction({ title, message, confirmLabel }) {
  if (!confirmDialog || typeof confirmDialog.showModal !== "function") {
    return Promise.resolve(window.confirm(`${title}\n\n${message}`));
  }

  confirmTitle.textContent = title;
  confirmMessage.textContent = message;
  confirmAcceptBtn.textContent = confirmLabel;
  confirmDialog.returnValue = "cancel";
  confirmDialog.showModal();

  return new Promise(resolve => {
    confirmDialog.addEventListener("close", () => {
      resolve(confirmDialog.returnValue === "confirm");
    }, { once: true });
  });
}

let toastTimer = null;
function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 3200);
}

function playTone(kind) {
  if (!soundEnabled || !window.AudioContext) return;
  const ctx = new AudioContext();
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.frequency.value = kind === "correct" ? 660 : 180;
  oscillator.type = kind === "correct" ? "sine" : "triangle";
  gain.gain.setValueAtTime(.08, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(.001, ctx.currentTime + .25);
  oscillator.start();
  oscillator.stop(ctx.currentTime + .25);
}

function updateProgress() {
  const currentNumber = Math.min(answeredTotal + 1, totalQuestions);
  const pct = Math.round((answeredTotal / totalQuestions) * 100);
  progressText.textContent = `Vraag ${currentNumber} van ${totalQuestions}`;
  progressPercent.textContent = `${pct}%`;
  progressFill.style.width = `${pct}%`;
}

function saveGame() {
  if (!players.length || !Object.keys(stats).length) return;
  const snapshot = {
    version: 2, savedAt: Date.now(), players, mode, teams, teamNames, turnIndex,
    stats, teamStats, askedCountPlayer, askedCountTeam, answeredTotal, totalQuestions, selectedGameLength,
    timerSeconds, penaltyMode, customPenalty, soundEnabled, chaosEnabled,
    selectedCategories: [...selectedCategories], tieBreakerQueue, tieBreakerOffset
  };
  localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot));
  resumeGameBtn?.classList.remove("hidden");
}

function clearSavedGame() {
  localStorage.removeItem(SAVE_KEY);
  resumeGameBtn?.classList.add("hidden");
}

function getSavedGame() {
  try {
    const data = JSON.parse(localStorage.getItem(SAVE_KEY));
    return data?.version === 2 && Array.isArray(data.players) && data.players.length ? data : null;
  } catch {
    clearSavedGame();
    return null;
  }
}

function restoreGame() {
  const data = getSavedGame();
  if (!data) return showToast("Er is geen opgeslagen spel gevonden.");
  ({ players, mode, teams, teamNames, turnIndex, stats, teamStats,
    askedCountPlayer, askedCountTeam, answeredTotal, totalQuestions, selectedGameLength = 20,
    timerSeconds, penaltyMode, customPenalty, soundEnabled, chaosEnabled,
    tieBreakerQueue = [], tieBreakerOffset = 0 } = data);
  selectedCategories = new Set(data.selectedCategories || []);
  timerTotalMs = (timerSeconds || 0) * 1000;
  timerRemainingMs = timerTotalMs;
  rebuildActiveQuestions();
  usedQuestionIds.clear();
  show(gameScreen);
  updateProgress();
  startNextTurnFlow();
  showToast("Spel hervat");
}

const timerLabel = document.getElementById("timerLabel");

function requireTimerSelection() {
  if (timerSeconds === null) {
    if (timerLabel) {
      timerLabel.classList.remove("timer-shake");
      void timerLabel.offsetWidth; // force reflow om animatie te herstarten
      timerLabel.classList.add("timer-shake");
    }
    return false;
  }
  return true;
}

function renderCategorySelector() {
  if (!questions.length || !categoryWrap) return;

  const uniqueCategories = [...new Set(
    questions
      .map(q => q.category)
  )];

  categoryWrap.innerHTML = "";
  selectedCategories.clear();

  uniqueCategories.forEach(cat => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "category-pill";
    btn.textContent = cat;

    // standaard aan tenzij niche
    const isActive = !nicheCategories.includes(cat);
    if (isActive) {
      btn.classList.add("active");
      selectedCategories.add(cat);
    }
    btn.setAttribute("aria-pressed", String(isActive));

    btn.onclick = () => {
      btn.classList.toggle("active");
      btn.setAttribute("aria-pressed", String(btn.classList.contains("active")));

      if (selectedCategories.has(cat)) {
        selectedCategories.delete(cat);
      } else {
        selectedCategories.add(cat);
      }
    };

    categoryWrap.appendChild(btn);
  });
}

// ------- confetti -------
const confettiCanvas = document.getElementById("confettiCanvas");
let confettiCtx = null;
let confettiParts = [];
let confettiAnim = null;
let confettiStopAt = 0;

function resizeConfetti() {
  if (!confettiCanvas) return;
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  confettiCanvas.width = Math.floor(window.innerWidth * dpr);
  confettiCanvas.height = Math.floor(window.innerHeight * dpr);
  confettiCanvas.style.width = "100vw";
  confettiCanvas.style.height = "100vh";
  confettiCtx = confettiCanvas.getContext("2d");
  confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

window.addEventListener("resize", resizeConfetti);

function launchConfetti(durationMs = 4000, count = 200) {
  if (!confettiCanvas) return;

  resizeConfetti();
  confettiCanvas.classList.remove("hidden");

  const W = window.innerWidth;
  const H = window.innerHeight;

  confettiParts = Array.from({ length: count }).map(() => {
    return {
      x: Math.random() * W,
      y: -20 - Math.random() * H * 0.5, // start boven scherm
      vx: -1 + Math.random() * 2,       // lichte zijwaartse drift
      vy: 1 + Math.random() * 2.5,      // naar beneden
      g: 0.02 + Math.random() * 0.03,   // lichte gravity
      w: 6 + Math.random() * 8,
      h: 8 + Math.random() * 12,
      rot: Math.random() * Math.PI,
      vr: (-0.05 + Math.random() * 0.1),
      color: ["#7c5cff", "#22c55e", "#ff4d6d", "#fbbf24", "#aab0d6"]
      [Math.floor(Math.random() * 5)],
      alpha: 0.9
    };
  });

  confettiStopAt = performance.now() + durationMs;

  if (confettiAnim) cancelAnimationFrame(confettiAnim);
  confettiAnim = requestAnimationFrame(tickConfetti);
}

function tickConfetti(t) {
  if (!confettiCanvas || !confettiCtx) return;

  const W = window.innerWidth;
  const H = window.innerHeight;

  confettiCtx.clearRect(0, 0, W, H);

  confettiParts.forEach(p => {
    p.vy += p.g;
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;

    confettiCtx.globalAlpha = p.alpha;
    confettiCtx.save();
    confettiCtx.translate(p.x, p.y);
    confettiCtx.rotate(p.rot);
    confettiCtx.fillStyle = p.color;
    confettiCtx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
    confettiCtx.restore();
  });

  // filter uit beeld
  confettiParts = confettiParts.filter(p => p.y < H + 40);

  if (t < confettiStopAt && confettiParts.length) {
    confettiAnim = requestAnimationFrame(tickConfetti);
  } else {
    stopConfetti();
  }
}

function stopConfetti() {
  if (confettiAnim) cancelAnimationFrame(confettiAnim);
  confettiAnim = null;
  confettiParts = [];
  if (confettiCanvas) confettiCanvas.classList.add("hidden");
}

function setTimerSeconds(sec) {
  timerSeconds = sec;

  // ⛔ Geen timer
  if (sec === 0) {
    timerTotalMs = 0;
    timerRemainingMs = 0;
    stopTimer();
    if (timerWrap) timerWrap.classList.add("hidden");
    return;
  }

  // ✅ Wel timer
  timerTotalMs = sec * 1000;
  timerRemainingMs = timerTotalMs;

  if (timerText) timerText.textContent = String(sec);
  if (timerFill) timerFill.style.width = "100%";
  if (timerWrap) timerWrap.classList.remove("panic");
}

function stopTimer() {
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerPaused = false;
  if (timerWrap) {
    timerWrap.classList.remove("panic");
    timerWrap.classList.add("hidden");
  }
}

function pauseTimer() {
  if (!timerInterval) return;
  clearInterval(timerInterval);
  timerInterval = null;
  timerPaused = true;
}

function resumeTimer() {
  if (!timerPaused) return;
  timerPaused = false;
  startTimer(false); // resume met remaining
}

function startTimer(reset = true) {
  stopTimer();
  // Timer uit
  if (timerSeconds === 0) {
    if (timerWrap) timerWrap.classList.add("hidden");
    return;
  }

  if (!timerWrap || !timerText || !timerFill) return;

  timerWrap.classList.remove("hidden");

  if (reset) {
    timerRemainingMs = timerTotalMs;
    timerFill.style.width = "100%";
    timerWrap.classList.remove("panic");
    timerText.textContent = String(Math.ceil(timerRemainingMs / 1000));
  }

  const tickMs = 100;
  timerInterval = setInterval(() => {
    timerRemainingMs -= tickMs;
    if (timerRemainingMs < 0) timerRemainingMs = 0;

    const secsLeft = Math.ceil(timerRemainingMs / 1000);
    timerText.textContent = String(secsLeft);

    const pct = (timerRemainingMs / timerTotalMs) * 100;
    timerFill.style.width = `${pct}%`;

    // panic mode laatste 3 seconden
    if (secsLeft <= 3 && secsLeft > 0) timerWrap.classList.add("panic");
    else timerWrap.classList.remove("panic");

    if (timerRemainingMs <= 0) {
      stopTimer();
      timeoutAnswer();
    }
  }, tickMs);
}

function timeoutAnswer() {
  // Alleen als er een actieve vraag is
  if (!current) return;

  const buttons = Array.from(optionsEl.querySelectorAll("button"));
  if (buttons.length === 0) return;

  // ✅ Als alles al disabled is, is de vraag al beantwoord/afgelopen → voorkom dubbel straffen
  const anyEnabled = buttons.some(b => !b.disabled);
  if (!anyEnabled) return;

  // Disable knoppen en highlight correct
  buttons.forEach((b, idx) => {
    b.disabled = true;
    if (idx === current.q.correctIndex) b.classList.add("correct");
  });

  // Forceer fout-afhandeling zonder "gekozen" antwoord
  applyWrongForActor(current.a, current.q, true);

  nextBtn.disabled = false;
}

async function loadQuestions() {
  const res = await fetch("questions.json");
  if (!res.ok) throw new Error(`Vragen laden mislukt (${res.status})`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error("De vragenlijst is leeg of ongeldig.");

  questions = data.filter(q => q && typeof q.question === "string" &&
    typeof q.category === "string" && Array.isArray(q.options) && q.options.length >= 2 &&
    Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex < q.options.length);

  if (!questions.length) throw new Error("Er zijn geen geldige vragen gevonden.");
}

function rebuildActiveQuestions() {
  activeQuestions = questions;
}

function renderPlayers() {
  playersList.innerHTML = "";
  players.forEach((p, idx) => {
    const li = document.createElement("li");
    const name = document.createElement("span");
    name.textContent = p.name;
    li.appendChild(name);
    const btn = document.createElement("button");
    btn.textContent = "Verwijder";
    btn.className = "smallbtn";
    btn.onclick = () => {
      players.splice(idx, 1);
      renderPlayers();
      startGameBtn.disabled = players.length < 2;
      addPlayerBtn.disabled = players.length >= MAX_PLAYERS_PVP;
    };
    li.appendChild(btn);
    playersList.appendChild(li);
  });

  startGameBtn.disabled = players.length < 2;
  addPlayerBtn.disabled = players.length >= MAX_PLAYERS_PVP;
}

function initStats() {
  stats = {};
  players.forEach(p => {
    stats[p.name] = { points: 0, correct: 0, wrong: 0, sips: 0, wrongStreak: 0 };
  });
}

function teamLabel(team) {
  const idx = teams.indexOf(team);
  if (idx >= 0 && teamNames[idx]) return teamNames[idx];
  // fallback: toon leden
  return team.join(" + ");
}

function initTeamStats() {
  teamStats = {};
  teams.forEach(t => {
    teamStats[teamLabel(t)] = { points: 0, correct: 0, wrong: 0, sips: 0, wrongStreak: 0 };
  });
}

function categories() {
  return Array.from(new Set(activeQuestions.map(q => q.category).filter(isCategoryEnabled))).sort();
}

function pickQuestion(category) {

  // Eerst filteren op geselecteerde categorieën
  let poolBase = activeQuestions;

  poolBase = poolBase.filter(q => isCategoryEnabled(q.category));

  // Daarna eventueel specifieke categorie (comeback keuze)
  const enabledCategories = [...new Set(poolBase.map(q => q.category))];
  const selectedCategory = category || enabledCategories[Math.floor(Math.random() * enabledCategories.length)];
  const poolAll = poolBase.filter(q => q.category === selectedCategory);

  const progress = answeredTotal / Math.max(1, totalQuestions);
  const allowedDifficulties = progress < .25
    ? ["Easy", "Medium"]
    : progress < .65
      ? ["Medium", "Hard"]
      : ["Hard", "Brutal"];
  const leveledPool = poolAll.filter(q => allowedDifficulties.includes(q.difficulty));
  const sourcePool = leveledPool.length ? leveledPool : poolAll;
  let pool = sourcePool.filter(q => !usedQuestionIds.has(questionKey(q)));

  if (pool.length === 0) {
    usedQuestionIds.clear();
    pool = sourcePool;
  }

  if (!pool.length) return null;
  const q = pool[Math.floor(Math.random() * pool.length)];
  usedQuestionIds.add(questionKey(q));
  return q;
}

function actor() {
  if (tieBreakerQueue.length) {
    const label = tieBreakerQueue[(answeredTotal - tieBreakerOffset) % tieBreakerQueue.length];
    if (mode === "solo") return { type: "player", name: label };
    const team = teams.find(candidate => teamLabel(candidate) === label) || teams[0];
    return { type: "team", team, label: teamLabel(team) };
  }
  if (mode === "solo") {
    return { type: "player", name: players[turnIndex % players.length].name };
  }
  const t = teams[turnIndex % teams.length];
  return { type: "team", team: t, label: teamLabel(t) };
}

function needsHelp(a) {
  if (a.type === "player") return stats[a.name].wrongStreak >= 3;
  return teamStats[a.label].wrongStreak >= 3;
}

function maybeChaos() {
  if (turnIndex === 0) return null;
  if (!chaosEnabled) return null;
  if (Math.random() > 0.1) return null;

  return { text: "⚡ Chaos! De volgende straf telt dubbel.", badge: "Dubbele straf", mult: 2 };
}

function applyChaos(evt) {
  helpBanner.classList.add("hidden");
  helpBanner.textContent = "";

  // reset default elke ronde
  pending.sipMultiplier = 1;
  activeChaosBadge = null;

  if (chaosBadge) {
    chaosBadge.textContent = "";
    chaosBadge.classList.add("hidden");
  }

  if (!evt) return;

  if (evt.mult) pending.sipMultiplier = evt.mult;
  activeChaosBadge = evt.badge || "Chaos"; // 👈 NEW

  helpBanner.textContent = evt.text;

  // reset animatie
  helpBanner.classList.remove("chaos-banner");
  void helpBanner.offsetWidth; // force reflow

  helpBanner.classList.remove("hidden");
  helpBanner.classList.add("chaos-banner");
}

// ------- render question -------
function renderQuestion() {
  // ⏱️ altijd eerst timer stoppen (belangrijk bij Next/Score/Stop etc.)
  stopTimer();

  nextBtn.disabled = true;
  resultBox.classList.add("hidden");
  resultBox.textContent = "";
  optionsEl.innerHTML = "";

  const a = actor();
  const help = needsHelp(a);

  let chosenCategory = null;

  if (help) {
    turnLabel.textContent =
      a.type === "player" ? `Aan de beurt: ${a.name}` : `Team aan de beurt: ${a.label}`;

    questionBox.classList.add("hidden");

    const cats = categories();
    categoryButtons.innerHTML = "";
    categoryChooser.classList.remove("hidden");

    // ⏱️ hier géén timer starten (want je kiest nog een categorie)
    cats.forEach(cat => {
      const b = document.createElement("button");
      b.className = "smallbtn";
      b.textContent = cat;
      b.onclick = () => {
        // comeback used: reset streak
        if (a.type === "player") stats[a.name].wrongStreak = 0;
        else teamStats[a.label].wrongStreak = 0;

        categoryChooser.classList.add("hidden");
        renderQuestionWithCategory(cat); // deze start straks z'n eigen timer
      };
      categoryButtons.appendChild(b);
    });

    return;
  } else {
    categoryChooser.classList.add("hidden");
    questionBox.classList.remove("hidden");
  }

  const q = pickQuestion(chosenCategory);
  if (!q) {
    resultBox.textContent = "Geen vragen beschikbaar voor deze categorieën.";
    resultBox.classList.remove("hidden");
    return;
  }
  current = { a, q };

  turnLabel.textContent =
    a.type === "player" ? `Aan de beurt: ${a.name}` : `Team aan de beurt: ${a.label}`;

  categoryLabel.textContent = `📚 ${q.category}`;
  const questionPoints = POINTS_BY_DIFFICULTY[q.difficulty] ?? 1;
  const mult = pending.sipMultiplier ?? 1;

  const diffText = `${q.difficulty} • ${questionPoints} punt${questionPoints === 1 ? "" : "en"}${mult > 1 ? " • dubbele straf" : ""}`;

  difficultyLabel.textContent = diffText;

  if (activeChaosBadge) {
    chaosBadge.textContent = `⚡ ${activeChaosBadge}`;
    chaosBadge.classList.remove("hidden");
  } else {
    chaosBadge.textContent = "";
    chaosBadge.classList.add("hidden");
  }

  questionText.textContent = q.question;

  // Shuffle antwoorden maar behoud correctIndex
  const shuffled = q.options
    .map((text, index) => ({
      text,
      isCorrect: index === q.correctIndex
    }));

  // gebruik je bestaande shuffle helper
  const shuffledOptions = shuffle(shuffled);

  // bepaal nieuwe correctIndex
  const newCorrectIndex = shuffledOptions.findIndex(o => o.isCorrect);

  // update current.q tijdelijk met nieuwe correctIndex
  current.q = {
    ...q,
    options: shuffledOptions.map(o => o.text),
    correctIndex: newCorrectIndex
  };

  // render buttons
  current.q.options.forEach((opt, idx) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.textContent = opt;
    b.onclick = () => answer(idx);
    optionsEl.appendChild(b);
  });

  // ⏱️ timer pas starten als de vraag + antwoorden er echt staan
  startTimer(true);
}

function renderQuestionNoChaos() {
  // zelfde als renderQuestion(), maar:
  // - GEEN applyChaos(maybeChaos())
  // - GEEN nieuwe chaos bepalen
  // - wél startTimer(true) op het einde

  stopTimer();

  nextBtn.disabled = true;
  resultBox.classList.add("hidden");
  resultBox.textContent = "";
  optionsEl.innerHTML = "";

  const a = actor();
  const help = needsHelp(a);

  let chosenCategory = null;

  if (help) {
    turnLabel.textContent =
      a.type === "player" ? `Aan de beurt: ${a.name}` : `Team aan de beurt: ${a.label}`;

    questionBox.classList.add("hidden");

    const cats = categories();
    categoryButtons.innerHTML = "";
    categoryChooser.classList.remove("hidden");

    cats.forEach(cat => {
      const b = document.createElement("button");
      b.className = "smallbtn";
      b.textContent = cat;
      b.onclick = () => {
        if (a.type === "player") stats[a.name].wrongStreak = 0;
        else teamStats[a.label].wrongStreak = 0;

        categoryChooser.classList.add("hidden");
        renderQuestionWithCategoryNoChaos(cat);
      };
      categoryButtons.appendChild(b);
    });

    return;
  } else {
    categoryChooser.classList.add("hidden");
    questionBox.classList.remove("hidden");
  }

  const q = pickQuestion(chosenCategory);
  current = { a, q };

  turnLabel.textContent =
    a.type === "player" ? `Aan de beurt: ${a.name}` : `Team aan de beurt: ${a.label}`;

  categoryLabel.textContent = `📚 ${q.category}`;

  const questionPoints = POINTS_BY_DIFFICULTY[q.difficulty] ?? 1;
  const mult = pending.sipMultiplier ?? 1;

  const diffText = `${q.difficulty} • ${questionPoints} punt${questionPoints === 1 ? "" : "en"}${mult > 1 ? " • dubbele straf" : ""}`;
  const chaosHtml = activeChaosBadge ? ` <span class="pill chaos-pill">⚡ ${activeChaosBadge}</span>` : "";

  difficultyLabel.textContent = diffText;

  if (activeChaosBadge) {
    chaosBadge.textContent = `⚡ ${activeChaosBadge}`;
    chaosBadge.classList.remove("hidden");
  } else {
    chaosBadge.textContent = "";
    chaosBadge.classList.add("hidden");
  }

  questionText.textContent = q.question;

  const shuffled = q.options.map((text, index) => ({ text, isCorrect: index === q.correctIndex }));
  const shuffledOptions = shuffle(shuffled);
  const newCorrectIndex = shuffledOptions.findIndex(o => o.isCorrect);

  current.q = {
    ...q,
    options: shuffledOptions.map(o => o.text),
    correctIndex: newCorrectIndex
  };

  current.q.options.forEach((opt, idx) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.textContent = opt;
    b.onclick = () => answer(idx);
    optionsEl.appendChild(b);
  });

  startTimer(true);
}

function renderQuestionWithCategoryNoChaos(cat) {
  stopTimer();

  nextBtn.disabled = true;
  resultBox.classList.add("hidden");
  resultBox.textContent = "";
  optionsEl.innerHTML = "";
  questionBox.classList.remove("hidden");

  const a = actor();

  const q = pickQuestion(cat);
  if (!q) { renderQuestionNoChaos(); return; }

  current = { a, q };

  turnLabel.textContent =
    a.type === "player" ? `Aan de beurt: ${a.name}` : `Team aan de beurt: ${a.label}`;

  categoryLabel.textContent = `📚 ${q.category}`;

  const questionPoints = POINTS_BY_DIFFICULTY[q.difficulty] ?? 1;
  const mult = pending.sipMultiplier ?? 1;

  const diffText = `${q.difficulty} • ${questionPoints} punt${questionPoints === 1 ? "" : "en"}${mult > 1 ? " • dubbele straf" : ""}`;
  const chaosHtml = activeChaosBadge ? ` <span class="pill chaos-pill">⚡ ${activeChaosBadge}</span>` : "";

  difficultyLabel.textContent = diffText;

  if (activeChaosBadge) {
    chaosBadge.textContent = `⚡ ${activeChaosBadge}`;
    chaosBadge.classList.remove("hidden");
  } else {
    chaosBadge.textContent = "";
    chaosBadge.classList.add("hidden");
  }

  questionText.textContent = q.question;

  const shuffled = q.options.map((text, index) => ({ text, isCorrect: index === q.correctIndex }));
  const shuffledOptions = shuffle(shuffled);
  const newCorrectIndex = shuffledOptions.findIndex(o => o.isCorrect);

  current.q = {
    ...q,
    options: shuffledOptions.map(o => o.text),
    correctIndex: newCorrectIndex
  };

  current.q.options.forEach((opt, idx) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.textContent = opt;
    b.onclick = () => answer(idx);
    optionsEl.appendChild(b);
  });

  startTimer(true);
}

function announceChaosThenWait() {
  // reset banner altijd
  helpBanner.classList.add("hidden");
  helpBanner.textContent = "";

  // 🔥 Reset oude resultaat tekst volledig
  resultBox.classList.add("hidden");
  resultBox.classList.remove("good", "bad");
  resultBox.textContent = "";

  // reset multiplier standaard
  pending.sipMultiplier = 1;

  pendingChaosEvent = maybeChaos();
  if (!pendingChaosEvent) {
    activeChaosBadge = null;
    if (chaosBadge) {
      chaosBadge.textContent = "";
      chaosBadge.classList.add("hidden");
    }
    return false;
  }

  // 🔥 Verberg turn label ALLEEN tijdens chaos aankondiging
  turnLabel.classList.add("hidden");

  // effect alvast klaarzetten, maar nog geen vraag starten
  applyChaos(pendingChaosEvent);

  // verberg vraag UI zodat niemand alvast leest / timer-pressured is
  questionBox.classList.add("hidden");
  categoryChooser.classList.add("hidden");
  stopTimer();

  awaitingChaosConfirm = true;

  nextBtn.disabled = false;
  nextBtn.textContent = "Start vraag →";
  return true;
}

function renderQuestionWithCategory(cat) {
  // ⏱️ altijd eerst timer stoppen/resetten
  stopTimer();

  nextBtn.disabled = true;
  resultBox.classList.add("hidden");
  resultBox.textContent = "";
  optionsEl.innerHTML = "";

  questionBox.classList.remove("hidden");

  const a = actor();

  const q = pickQuestion(cat);
  // 🔒 Safety: als er geen vraag is (lege pool)
  if (!q) {
    renderQuestion(); // fallback naar normale vraag
    return;
  }
  current = { a, q };

  turnLabel.textContent =
    a.type === "player" ? `Aan de beurt: ${a.name}` : `Team aan de beurt: ${a.label}`;

  categoryLabel.textContent = `📚 ${q.category}`;
  const questionPoints = POINTS_BY_DIFFICULTY[q.difficulty] ?? 1;
  const mult = pending.sipMultiplier ?? 1;

  const diffText = `${q.difficulty} • ${questionPoints} punt${questionPoints === 1 ? "" : "en"}${mult > 1 ? " • dubbele straf" : ""}`;
  const chaosHtml = activeChaosBadge ? ` <span class="pill chaos-pill">⚡ ${activeChaosBadge}</span>` : "";

  difficultyLabel.textContent = diffText;

  if (activeChaosBadge) {
    chaosBadge.textContent = `⚡ ${activeChaosBadge}`;
    chaosBadge.classList.remove("hidden");
  } else {
    chaosBadge.textContent = "";
    chaosBadge.classList.add("hidden");
  }

  questionText.textContent = q.question;

  // Shuffle antwoorden maar behoud correctIndex
  const shuffled = q.options
    .map((text, index) => ({
      text,
      isCorrect: index === q.correctIndex
    }));

  // gebruik je bestaande shuffle helper
  const shuffledOptions = shuffle(shuffled);

  // bepaal nieuwe correctIndex
  const newCorrectIndex = shuffledOptions.findIndex(o => o.isCorrect);

  // update current.q tijdelijk met nieuwe correctIndex
  current.q = {
    ...q,
    options: shuffledOptions.map(o => o.text),
    correctIndex: newCorrectIndex
  };

  // render buttons
  current.q.options.forEach((opt, idx) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.textContent = opt;
    b.onclick = () => answer(idx);
    optionsEl.appendChild(b);
  });

  // ⏱️ timer pas starten als alles gerenderd is
  startTimer(true);
}

function applyWrongForActor(a, q, isTimeout = false) {
  const penalty = pending.sipMultiplier ?? 1;

  // reset na gebruik
  pending.sipMultiplier = 1;


  if (a.type === "player") {
    stats[a.name].wrong++;
    stats[a.name].wrongStreak++;
    if (penaltyMode === "sips") stats[a.name].sips += penalty;
    if (penaltyMode === "points") stats[a.name].points -= penalty;
  } else {
    teamStats[a.label].wrong++;
    teamStats[a.label].wrongStreak++;
    if (penaltyMode === "sips") {
      teamStats[a.label].sips += penalty;
      a.team.forEach(n => stats[n].sips += penalty);
    }
    if (penaltyMode === "points") teamStats[a.label].points -= penalty;
  }

  resultBox.classList.remove("hidden");
  resultBox.classList.remove("good");
  resultBox.classList.add("bad");
  const actorName = a.type === "player" ? a.name : `Team ${a.label}`;
  const consequence = penaltyMode === "sips"
    ? `${penalty} slok${penalty === 1 ? "" : "ken"}`
    : penaltyMode === "points"
      ? `${penalty} strafpunt${penalty === 1 ? "" : "en"}`
      : `${customPenalty}${penalty > 1 ? " (2×)" : ""}`;
  const correctAnswer = q.options[q.correctIndex];
  resultBox.textContent = `${isTimeout ? "⏱️ Tijd op!" : "❌ Fout!"} ${actorName}: ${consequence}. Het juiste antwoord was: ${correctAnswer}.`;
  playTone("wrong");
}

function answer(choiceIdx) {
  stopTimer();

  const { a, q } = current;
  const correct = choiceIdx === q.correctIndex;

  const buttons = Array.from(optionsEl.querySelectorAll("button"));
  buttons.forEach((b, idx) => {
    b.disabled = true;
    if (idx === q.correctIndex) b.classList.add("correct");
    if (choiceIdx !== null && choiceIdx !== undefined && idx === choiceIdx && !correct) {
      b.classList.add("wrong");
    }
  });

  if (correct) {
    const earned = POINTS_BY_DIFFICULTY[q.difficulty] ?? 1;

    if (a.type === "player") {
      stats[a.name].correct++;
      stats[a.name].points += earned;
      stats[a.name].wrongStreak = 0;
    } else {
      teamStats[a.label].correct++;
      teamStats[a.label].points += earned;
      teamStats[a.label].wrongStreak = 0;
    }

    resultBox.classList.remove("hidden");
    resultBox.classList.add("good");
    resultBox.classList.remove("bad");
    resultBox.textContent = `✅ Correct! +${earned} punt${earned === 1 ? "" : "en"}.${q.explanation ? ` ${q.explanation}` : ""}`;
    playTone("correct");

    nextBtn.disabled = false;
    return;
  }

  // fout pad
  applyWrongForActor(a, q, false);
  nextBtn.disabled = false;
}

nextBtn.onclick = () => {
  // 1) Als we in chaos-confirm fase zitten → start nu pas de vraag
  if (awaitingChaosConfirm) {
    awaitingChaosConfirm = false;

    helpBanner.classList.remove("chaos-banner");
    helpBanner.classList.add("hidden");

    turnLabel.classList.remove("hidden");

    nextBtn.textContent = "Volgende →";
    renderQuestionNoChaos();
    return;
  }

  // 2) Normale flow: tel beurt, check end, turnIndex++, en dan:
  if (current?.a) {
    if (current.a.type === "player") {
      askedCountPlayer[current.a.name] = (askedCountPlayer[current.a.name] ?? 0) + 1;
    } else {
      askedCountTeam[current.a.label] = (askedCountTeam[current.a.label] ?? 0) + 1;
    }
    answeredTotal++;
    updateProgress();
    saveGame();
  }

  if (isGameComplete()) {
    if (!prepareTieBreaker()) {
      stopTimer();
      showEndScreen();
      return;
    }
  }

  turnIndex++;
  saveGame();

  // 👇 Eerst chaos aankondigen (zonder timer), anders direct vraag
  const announced = announceChaosThenWait();
  if (!announced) {
    renderQuestionNoChaos();
  }
};

// ------- score -------
function openScoreboard(returnTo) {
  scoreReturnScreen = returnTo || gameScreen; // fallback
  pauseTimer();

  const ranking = mode === "team" ? teamStats : stats;
  const rows = Object.entries(ranking).map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.points - a.points || b.correct - a.correct);

  scoreTable.innerHTML = `
    <div style="overflow:auto">
      <table class="score-table">
        <thead>
          <tr>
            <th>${mode === "team" ? "Team" : "Speler"}</th>
            <th>Punten</th><th>Goed</th><th>Fout</th>
            ${penaltyMode === "sips" ? "<th>Slokken</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${rows.map((r, index) => `
            <tr>
              <td><span class="rank">${index + 1}</span>${escapeHtml(r.name)}</td>
              <td><strong>${r.points}</strong></td><td>${r.correct}</td><td>${r.wrong}</td>
              ${penaltyMode === "sips" ? `<td>${r.sips}</td>` : ""}
            </tr>
          `).join("")}
        </tbody>
      </table>
    </div>
  `;

  show(scoreScreen);
}

scoreBtn.onclick = () => openScoreboard(gameScreen);

function topBy(obj, key, dir = "max") {
  const entries = Object.entries(obj);
  if (!entries.length) return null;

  let best = entries[0];
  for (const e of entries) {
    const v = e[1][key] ?? 0;
    const bestV = best[1][key] ?? 0;
    if (dir === "max" ? v > bestV : v < bestV) best = e;
  }
  return { name: best[0], ...best[1] };
}

function renderEndHighlights() {
  if (!endHighlights) return;

  endHighlights.innerHTML = "";

  const ranking = mode === "team" ? teamStats : stats;
  const mostSips = topBy(ranking, "sips", "max");
  const mostCorrect = topBy(ranking, "correct", "max");
  const mostWrong = topBy(ranking, "wrong", "max");
  const winner = topBy(ranking, "points", "max");
  const winners = winner
    ? Object.entries(ranking).filter(([, value]) => value.points === winner.points).map(([name]) => name)
    : [];

  const lines = [];
  if (winners.length === 1) lines.push(`🏆 <b>${escapeHtml(winners[0])}</b> wint met <b>${winner.points} punten</b>`);
  else if (winners.length > 1) lines.push(`🤝 Gedeelde winst voor <b>${winners.map(escapeHtml).join(" en ")}</b> met <b>${winner.points} punten</b>`);
  if (penaltyMode === "sips" && mostSips) lines.push(`🍺 <b>${escapeHtml(mostSips.name)}</b> heeft de meeste slokken: <b>${mostSips.sips}</b>`);
  if (mostCorrect) lines.push(`✅ <b>${escapeHtml(mostCorrect.name)}</b> had de meeste goed: <b>${mostCorrect.correct}</b>`);
  if (mostWrong) lines.push(`❌ <b>${escapeHtml(mostWrong.name)}</b> had de meeste fout: <b>${mostWrong.wrong}</b>`);

  lines.forEach(html => {
    const div = document.createElement("div");
    div.className = "help";
    div.innerHTML = html;
    endHighlights.appendChild(div);
  });
}

function showEndScreen() {
  renderEndHighlights();
  clearSavedGame();

  if (!endScreen) {
    console.error('End screen ontbreekt: id="screen-end" niet gevonden in index.html');
    show(homeScreen);
    return;
  }

  show(endScreen);
  launchConfetti(); // 🎉
}

if (endScoreBtn) {
  endScoreBtn.onclick = () => openScoreboard(endScreen);
}

if (endBackBtn) {
  endBackBtn.onclick = () => {
    stopConfetti();
    stopTimer();
    show(homeScreen);
  };
};

if (endRematchBtn) {
  endRematchBtn.onclick = async () => {
    stopConfetti();
    stopTimer();

    // nieuwe pot met dezelfde spelers/teams (setup blijft)
    usedQuestionIds.clear();

    if (!questions.length) await loadQuestions();
    rebuildActiveQuestions();

    initStats();
    if (mode === "team") initTeamStats();

    turnIndex = 0;
    answeredTotal = 0;
    totalQuestions = selectedGameLength;
    tieBreakerQueue = [];
    tieBreakerOffset = 0;

    askedCountPlayer = {};
    Object.keys(stats).forEach(name => askedCountPlayer[name] = 0);

    askedCountTeam = {};
    if (mode === "team") Object.keys(teamStats).forEach(label => askedCountTeam[label] = 0);

    show(gameScreen);
    updateProgress();
    saveGame();
    startNextTurnFlow();
  };
};

backToGameBtn.onclick = () => {
  const target = scoreReturnScreen || gameScreen;
  scoreReturnScreen = null;

  if (target === endScreen) {
    show(endScreen);
    // geen resumeTimer hier, want game is voorbij
  } else {
    show(gameScreen);
    resumeTimer();
  }
};

// ------- reset / end -------
resetBtn.onclick = async () => {
  const confirmed = await confirmAction({
    title: "Nieuw spel starten?",
    message: "Alle spelers, teams, scores en de huidige voortgang worden definitief gewist.",
    confirmLabel: "Ja, nieuw spel"
  });
  if (!confirmed) return;

  stopConfetti();
  stopTimer();
  players = [];
  teams = [];
  teamNames = {};
  stats = {};
  teamStats = {};
  turnIndex = 0;
  answeredTotal = 0;
  totalQuestions = selectedGameLength;
  tieBreakerQueue = [];
  tieBreakerOffset = 0;
  clearSavedGame();

  playerNameInput.value = "";
  renderPlayers();
  startGameBtn.disabled = true;
  addPlayerBtn.disabled = false;

  show(modeScreen);
};

endGameBtn.onclick = async () => {
  pauseTimer();
  const confirmed = await confirmAction({
    title: "Spel beëindigen?",
    message: "De huidige ronde en scores worden niet bewaard. Je gaat terug naar het beginscherm.",
    confirmLabel: "Ja, beëindigen"
  });

  if (!confirmed) {
    resumeTimer();
    return;
  }

  stopTimer();
  clearSavedGame();
  show(homeScreen);
};

// ------- setup: add players (PvP) -------
addPlayerBtn.onclick = () => {
  const name = playerNameInput.value.trim();
  if (!name) return;

  if (players.length >= MAX_PLAYERS_PVP) {
    showToast(`Je kunt maximaal ${MAX_PLAYERS_PVP} spelers toevoegen.`);
    return;
  }

  if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    showToast("Deze naam is al toegevoegd.");
    return;
  }

  players.push({ name });
  playerNameInput.value = "";
  renderPlayers();
  playerNameInput.focus();
};

playerNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addPlayerBtn.click();
});

function startNextTurnFlow() {
  // reset knoptekst standaard
  if (nextBtn) nextBtn.textContent = "Volgende →";

  const announced = announceChaosThenWait();
  if (!announced) renderQuestionNoChaos();
}

// ------- start Player/Team setup -------
startGameBtn.onclick = async () => {
  usedQuestionIds.clear();
  chaosEnabled = !!enableChaos?.checked;
  soundEnabled = !!enableSound?.checked;
  customPenalty = customPenaltyInput?.value.trim() || "Voer de afgesproken opdracht uit";

  if (!questions.length) await loadQuestions();
  rebuildActiveQuestions();

  initStats();
  teams = [];
  teamNames = {};
  mode = "solo";
  turnIndex = 0;
  answeredTotal = 0;
  totalQuestions = selectedGameLength;
  tieBreakerQueue = [];
  tieBreakerOffset = 0;
  askedCountPlayer = {};
  players.forEach(p => askedCountPlayer[p.name] = 0);
  askedCountTeam = {};

  show(gameScreen);
  updateProgress();
  saveGame();
  startNextTurnFlow();
};

modeNextBtn.onclick = () => {
  if (!selectedMode || timerSeconds === null) {
    if (!selectedMode) {
      // kleine shake op Kies een mode
      const modeTitle = document.getElementById("modeTitle");

      if (modeTitle) {
        modeTitle.classList.remove("timer-shake");
        void modeTitle.offsetWidth;
        modeTitle.classList.add("timer-shake");
      }
    }

    if (timerSeconds === null) {
      requireTimerSelection();
    }

    return;
  }

  if (selectedCategories.size === 0) {
    showToast("Kies minimaal één categorie.");
    return;
  }

  if (penaltyMode === "custom" && !customPenaltyInput.value.trim()) {
    customPenaltyInput.focus();
    showToast("Vul eerst jullie eigen opdracht in.");
    return;
  }

  mode = selectedMode;

  if (mode === "solo") {
    show(setupScreen);
  } else {
    show(teamEntryScreen);
    initTeamEntryUI(); // ✅ standaard 2 teams laden
  }
};

// ------- MODE SCREEN -------
[modePvpBtn, modeTvTBtn].forEach(btn => {
  btn.onclick = () => {
    selectedMode = btn.getAttribute("data-mode");
    modeNextBtn.textContent = selectedMode === "solo"
      ? "Spelers instellen →"
      : "Teams instellen →";

    document.querySelectorAll(".mode-btn")
      .forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });

    btn.classList.add("active");
    btn.setAttribute("aria-pressed", "true");
  };
});

backToModeBtn.onclick = () => show(modeScreen);

if (backToModeBtnPvp) {
  backToModeBtnPvp.onclick = () => show(modeScreen);
}

// ------- TEAM ENTRY UI (Team vs Team) -------
let teamCardCount = 0;

function initTeamEntryUI() {
  teamEntryError.classList.add("hidden");
  teamEntryError.textContent = "";
  teamsWrap.innerHTML = "";
  teamCardCount = 0;

  for (let i = 0; i < DEFAULT_TEAMS; i++) addTeamCard();
  refreshAddTeamBtn();

  startTeamGameBtn.disabled = true;
  validateTeamEntryLive();
}

function refreshAddTeamBtn() {
  addTeamBtn.disabled = teamCardCount >= MAX_TEAMS;
}

function addTeamCard() {
  if (teamCardCount >= MAX_TEAMS) return;

  const i = teamCardCount;
  teamCardCount++;

  const card = document.createElement("div");
  card.className = "card";
  card.setAttribute("data-team-card", "1");
  card.setAttribute("data-team-id", String(i));

  card.innerHTML = `
    <div class="row row-between" style="margin-bottom:10px;">
      <div style="font-weight:700;">Team ${i + 1}</div>
      ${i >= 2 ? `<button class="ghost" type="button" data-remove-team="${i}">Verwijder team</button>` : ``}
    </div>

    <label style="display:block; font-size:13px; opacity:.85; margin-bottom:4px;">Teamnaam</label>
    <input class="input" id="teamName_${i}" value="" placeholder="Teamnaam..." autocomplete="off" />

    <div style="height:12px;"></div>

    <label style="display:block; font-size:13px; opacity:.85; margin-bottom:4px;">Spelers</label>
    <div id="team_${i}_players" style="display:grid; gap:8px;"></div>

    <div style="margin-top:8px;">
      <button class="ghost" type="button" data-add-player="${i}">+ Speler</button>
    </div>
  `;

  teamsWrap.appendChild(card);

  const playersContainer = card.querySelector(`#team_${i}_players`);

  // standaard 2 spelers
  addPlayerField(i, playersContainer);
  addPlayerField(i, playersContainer);

  // teamnaam input -> placeholder + live validate
  const teamNameEl = card.querySelector(`#teamName_${i}`);
  teamNameEl.maxLength = 24;
  teamNameEl.addEventListener("input", validateTeamEntryLive);

  // UX: focus meteen op teamnaam (alleen bij nieuwe teams)
  teamNameEl.focus();

  // remove team
  const removeBtn = card.querySelector(`[data-remove-team="${i}"]`);
  if (removeBtn) {
    removeBtn.onclick = () => {
      card.remove();
      refreshAddTeamBtn();
      validateTeamEntryLive();
    };
  }

  // add player button + disable bij 5
  const addBtn = card.querySelector(`[data-add-player="${i}"]`);
  addBtn.onclick = () => {
    if (playersContainer.children.length >= 5) return;

    addPlayerField(i, playersContainer);

    if (playersContainer.children.length >= 5) addBtn.disabled = true;
    validateTeamEntryLive();
  };

  // initial state
  if (playersContainer.children.length >= 5) addBtn.disabled = true;

  refreshAddTeamBtn();
  validateTeamEntryLive();
}

function addPlayerField(teamIndex, container) {
  const count = container.children.length + 1;

  const row = document.createElement("div");
  row.className = "row";
  row.style.gap = "6px";

  const input = document.createElement("input");
  input.type = "text";
  input.className = "input";
  input.placeholder = `Speler ${count}`;
  input.maxLength = 18;

  // BELANGRIJK: expliciet attribute zetten (super betrouwbaar)
  input.setAttribute("data-team-player", "1");
  input.setAttribute("data-team-id", String(teamIndex));

  // live validate bij typen
  input.addEventListener("input", validateTeamEntryLive);

  const removeBtn = document.createElement("button");
  removeBtn.type = "button";
  removeBtn.className = "ghost";
  removeBtn.textContent = "✕";

  removeBtn.onclick = () => {
    if (container.children.length <= 2) return; // minimaal 2 spelers
    row.remove();

    // + Speler knop weer activeren
    const addBtn = container.parentElement.querySelector(`[data-add-player="${teamIndex}"]`);
    if (addBtn) addBtn.disabled = false;

    validateTeamEntryLive();
  };

  row.appendChild(input);
  row.appendChild(removeBtn);
  container.appendChild(row);

  validateTeamEntryLive();
}

addTeamBtn.onclick = () => addTeamCard();

function validateTeamEntryLive() {
  // guards (voorkomt stille crashes)
  if (!teamsWrap || !startTeamGameBtn) return;

  const teamCards = Array.from(teamsWrap.querySelectorAll("[data-team-card]"));
  let valid = true;
  const allNames = [];

  // als er minder dan 2 teams zichtbaar zijn: niet starten
  if (teamCards.length < 2) valid = false;

  teamCards.forEach(card => {
    // reset visuals
    card.style.outline = "";
    card.style.outlineOffset = "";

    const idx = Number(card.getAttribute("data-team-id"));
    const teamNameEl = document.getElementById(`teamName_${idx}`);
    const teamName = (teamNameEl?.value || "").trim();

    // inputs binnen dit team
    const inputs = Array.from(card.querySelectorAll('input[data-team-player][data-team-id]'));

    // reset input styling
    if (teamNameEl) {
      teamNameEl.style.outline = "";
      teamNameEl.style.outlineOffset = "";
    }
    inputs.forEach(inp => {
      inp.style.outline = "";
      inp.style.outlineOffset = "";
    });

    const names = inputs.map(inp => inp.value.trim()).filter(Boolean);

    // --- per veld markeren ---
    let teamOk = true

    if (!teamName || names.length < 2) {
      teamOk = false;
    }

    // team kaart ook rood als team niet ok is (extra duidelijk)
    // eerst altijd resetten
    card.classList.remove("team-error");

    // als team niet ok is → kaart rood maken
    if (!teamOk) {
      valid = false;
      card.classList.add("team-error");
    }

    allNames.push(...names);
  });

  // duplicates check (case-insensitive)
  const lower = allNames.map(n => n.toLowerCase());
  const hasDuplicates = new Set(lower).size !== lower.length;
  if (hasDuplicates) valid = false;

  startTeamGameBtn.disabled = !valid;

  if (hasDuplicates) {
    teamEntryError?.classList.remove("hidden");
    if (teamEntryError) teamEntryError.textContent = "Er zijn dubbele namen. Maak alle spelersnamen uniek.";
  } else {
    // geen spammy errors; rood highlight is genoeg
    teamEntryError?.classList.add("hidden");
    if (teamEntryError) teamEntryError.textContent = "";
  }
}

function findDuplicate(arr) {
  const seen = new Set();
  for (const x of arr) {
    const key = x.toLowerCase();
    if (seen.has(key)) return x;
    seen.add(key);
  }
  return null;
}

// ------- start Team vs Team game -------
startTeamGameBtn.onclick = async () => {
  teamEntryError.classList.add("hidden");
  teamEntryError.textContent = "";

  usedQuestionIds.clear();
  chaosEnabled = !!enableChaos?.checked;
  soundEnabled = !!enableSound?.checked;
  customPenalty = customPenaltyInput?.value.trim() || "Voer de afgesproken opdracht uit";

  if (!questions.length) await loadQuestions();
  rebuildActiveQuestions();

  const teamCards = Array.from(teamsWrap.querySelectorAll("[data-team-card]"));

  const builtTeams = [];
  const allPlayers = [];

  for (const card of teamCards) {
    const idx = Number(card.getAttribute("data-team-id"));

    const teamNameEl = document.getElementById(`teamName_${idx}`);
    const teamName = (teamNameEl?.value || "").trim();

    const memberNames = [];
    const playerInputs = card.querySelectorAll("input[data-team-player][data-team-id]");
    playerInputs.forEach(input => {
      const nm = input.value.trim();
      if (nm) memberNames.push(nm);
    });

    if (memberNames.length === 0) continue;
    if (!teamName) {
      teamEntryError.classList.remove("hidden");
      teamEntryError.textContent = "Alle teams moeten een naam hebben.";
      return;
    }
    if (memberNames.length === 1) {
      teamEntryError.classList.remove("hidden");
      teamEntryError.textContent = `Team "${teamName}" heeft maar 1 speler. Maak er minimaal 2.`;
      return;
    }

    builtTeams.push({ teamName, members: memberNames });
    allPlayers.push(...memberNames);
  }

  if (builtTeams.length < 2) {
    teamEntryError.classList.remove("hidden");
    teamEntryError.textContent = "Je hebt minimaal 2 teams nodig.";
    return;
  }
  if (builtTeams.length > MAX_TEAMS) {
    teamEntryError.classList.remove("hidden");
    teamEntryError.textContent = `Maximaal ${MAX_TEAMS} teams.`;
    return;
  }

  const dupe = findDuplicate(allPlayers);
  if (dupe) {
    teamEntryError.classList.remove("hidden");
    teamEntryError.textContent = `Naam dubbel gevonden: "${dupe}". Maak alle namen uniek.`;
    return;
  }

  // Set game state
  players = allPlayers.map(n => ({ name: n }));
  initStats();

  teams = builtTeams.map(t => t.members); // [[names...], ...]
  teamNames = {};
  builtTeams.forEach((t, i) => (teamNames[i] = t.teamName));

  mode = "team";
  initTeamStats();

  turnIndex = 0;
  answeredTotal = 0;
  totalQuestions = selectedGameLength;
  tieBreakerQueue = [];
  tieBreakerOffset = 0;

  askedCountTeam = {};
  Object.keys(teamStats).forEach(label => askedCountTeam[label] = 0); // teamStats bestaat na initTeamStats()
  askedCountPlayer = {}; // mag leeg, of ook initialiseren als je wilt
  show(gameScreen);
  updateProgress();
  saveGame();
  startNextTurnFlow();
};

if (timerPills) {
  timerPills.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-timer]");
    if (!btn) return;

    const raw = btn.getAttribute("data-timer");
    const sec = Number(raw);
    setTimerSeconds(Number.isNaN(sec) ? 10 : sec);

    Array.from(timerPills.querySelectorAll("button[data-timer]"))
      .forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-pressed", "false");
      });
    btn.classList.add("active");
    btn.setAttribute("aria-pressed", "true");
  });
}

function isGameComplete() {
  return answeredTotal >= totalQuestions;
}

function prepareTieBreaker() {
  const ranking = mode === "team" ? teamStats : stats;
  const entries = Object.entries(ranking);
  const best = Math.max(...entries.map(([, value]) => value.points));
  const leaders = entries.filter(([, value]) => value.points === best).map(([name]) => name);
  if (leaders.length < 2) {
    tieBreakerQueue = [];
    return false;
  }
  tieBreakerQueue = leaders;
  tieBreakerOffset = answeredTotal;
  totalQuestions += leaders.length;
  updateProgress();
  showToast(`Gelijke stand! ${leaders.length} beslissingsvragen.`);
  return true;
}

function activatePillGroup(container, activeButton) {
  container.querySelectorAll("button").forEach(button => {
    const active = button === activeButton;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  });
}

lengthPills?.addEventListener("click", event => {
  const button = event.target.closest("button[data-length]");
  if (!button) return;
  selectedGameLength = Number(button.dataset.length) || 20;
  totalQuestions = selectedGameLength;
  activatePillGroup(lengthPills, button);
});

penaltyPills?.addEventListener("click", event => {
  const button = event.target.closest("button[data-penalty]");
  if (!button) return;
  penaltyMode = button.dataset.penalty;
  activatePillGroup(penaltyPills, button);
  customPenaltyWrap.classList.toggle("hidden", penaltyMode !== "custom");
  if (penaltyMode === "custom") customPenaltyInput.focus();
});

function openRules(returnScreen = homeScreen) {
  rulesReturnScreen = returnScreen;
  if (returnScreen === gameScreen) pauseTimer();
  show(rulesScreen);
}

homeStartBtn?.addEventListener("click", async () => {
  if (getSavedGame()) {
    const confirmed = await confirmAction({
      title: "Nieuw spel starten?",
      message: "Je opgeslagen spel wordt vervangen zodra het nieuwe spel begint.",
      confirmLabel: "Nieuw spel"
    });
    if (!confirmed) return;
    clearSavedGame();
  }
  show(modeScreen);
});
resumeGameBtn?.addEventListener("click", restoreGame);
homeRulesBtn?.addEventListener("click", () => openRules(homeScreen));
footerRulesBtn?.addEventListener("click", () => openRules(currentScreen || homeScreen));
rulesBackBtn?.addEventListener("click", () => {
  const target = rulesReturnScreen || homeScreen;
  show(target);
  if (target === gameScreen) resumeTimer();
});
privacyBtn?.addEventListener("click", () => privacyDialog?.showModal());

shareResultBtn?.addEventListener("click", async () => {
  const ranking = mode === "team" ? teamStats : stats;
  const winner = topBy(ranking, "points", "max");
  const text = winner
    ? `${winner.name} won SipArena met ${winner.points} punten! Speel mee op https://siparena.io/`
    : "Speel SipArena op https://siparena.io/";
  try {
    if (navigator.share) await navigator.share({ title: "SipArena", text, url: "https://siparena.io/" });
    else {
      await navigator.clipboard.writeText(text);
      showToast("Resultaat gekopieerd");
    }
  } catch (error) {
    if (error.name !== "AbortError") showToast("Delen is niet gelukt.");
  }
});

// initial
(async function init() {
  try {
    await loadQuestions();
    renderCategorySelector();
    renderPlayers();
    startGameBtn.disabled = true;
    show(homeScreen);
    resumeGameBtn?.classList.toggle("hidden", !getSavedGame());
  } catch (error) {
    console.error(error);
    show(homeScreen);
    modeNextBtn.disabled = true;
    categoryWrap.classList.add("help");
    categoryWrap.textContent = "De vragen konden niet worden geladen. Vernieuw de pagina en probeer het opnieuw.";
  }
})();

if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("/sw.js").catch(console.error));
}
