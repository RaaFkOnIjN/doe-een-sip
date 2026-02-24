const setupScreen = document.getElementById("screen-setup");
const gameScreen = document.getElementById("screen-game");
const scoreScreen = document.getElementById("screen-score");

const categoryChooser = document.getElementById("categoryChooser");
const categoryButtons = document.getElementById("categoryButtons");

const playerNameInput = document.getElementById("playerNameInput");
const addPlayerBtn = document.getElementById("addPlayerBtn");
const playersList = document.getElementById("playersList");
const startGameBtn = document.getElementById("startGameBtn");
const enableChaos = document.getElementById("enableChaos");
const enableAdult = document.getElementById("enableAdult");

const modeLabel = document.getElementById("modeLabel");
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

/* (oude teamsetup refs mogen blijven staan; we gebruiken ze niet meer) */
const teamSetupScreen = document.getElementById("screen-teamsetup");
const backToSetupBtn = document.getElementById("backToSetupBtn");
const teamNamesWrap = document.getElementById("teamNamesWrap");
const teamPlayerAssignWrap = document.getElementById("teamPlayerAssignWrap");
const teamSetupError = document.getElementById("teamSetupError");
const confirmTeamsBtn = document.getElementById("confirmTeamsBtn");
const modeNextBtn = document.getElementById("modeNextBtn");

/* nieuwe mode + team entry */
const modeScreen = document.getElementById("screen-mode");
const modePvpBtn = document.getElementById("modePvpBtn");
const modeTvTBtn = document.getElementById("modeTvTBtn");

const teamEntryScreen = document.getElementById("screen-teamentry");
const backToModeBtn = document.getElementById("backToModeBtn");
const teamsWrap = document.getElementById("teamsWrap");
const addTeamBtn = document.getElementById("addTeamBtn");
const startTeamGameBtn = document.getElementById("startTeamGameBtn");
const teamEntryError = document.getElementById("teamEntryError");

const endScreen = document.getElementById("screen-end");
const endHighlights = document.getElementById("endHighlights");
const endScoreBtn = document.getElementById("endScoreBtn");
const endRematchBtn = document.getElementById("endRematchBtn");
const endBackBtn = document.getElementById("endBackBtn");

const QUESTIONS_PER_ACTOR = 10;

const SIP_BY_DIFFICULTY = { Easy: 1, Medium: 2, Hard: 3, Brutal: 5 };

let questions = [];
let activeQuestions = [];
let adultEnabled = false;

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
let pending = { nextPenaltyPlus: 0, rewardGive: 0 };

let askedCountPlayer = {}; // { [playerName]: number }
let askedCountTeam = {};   // { [teamLabel]: number }  // label zoals "A" / "Team 1" etc.

let scoreReturnScreen = null;

let selectedCategories = new Set();
const categoryWrap = document.getElementById("categoryWrap");

// categorieën die standaard UIT staan
const nicheCategories = ["Nerd / Techniek"]; // uitbreidbaar

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

// ------- helpers -------
function show(screen) {
  const all = [
    modeScreen,
    setupScreen,
    teamEntryScreen,
    gameScreen,
    scoreScreen,
    teamSetupScreen,
    endScreen
  ];

  all.forEach(s => s && s.classList.add("hidden"));

  // extra veiligheid (voorkomt crash als screen null is)
  if (!screen) return;

  screen.classList.remove("hidden");
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
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
    .filter(cat => cat !== "18+") // 👈 hier filteren
)];

  categoryWrap.innerHTML = "";

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

    btn.onclick = () => {
      btn.classList.toggle("active");

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
  questions = await res.json();
}

function rebuildActiveQuestions() {
  adultEnabled = !!enableAdult?.checked;
  activeQuestions = adultEnabled
    ? questions
    : questions.filter(q => q.category !== "18+ Party");
}

function renderPlayers() {
  playersList.innerHTML = "";
  players.forEach((p, idx) => {
    const li = document.createElement("li");
    li.innerHTML = `<span>${p.name}</span>`;
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
    stats[p.name] = { correct: 0, wrong: 0, sips: 0, wrongStreak: 0 };
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
    teamStats[teamLabel(t)] = { correct: 0, wrong: 0, sips: 0, wrongStreak: 0 };
  });
}

function categories() {
  let cats = Array.from(new Set(activeQuestions.map(q => q.category)));

  // filter op geselecteerde categorieën
  if (selectedCategories.size > 0) {
    cats = cats.filter(cat => selectedCategories.has(cat));
  }

  return cats.sort();
}

function pickQuestion(category) {

  // Eerst filteren op geselecteerde categorieën
  let poolBase = activeQuestions;

  if (selectedCategories.size > 0) {
    poolBase = poolBase.filter(q => selectedCategories.has(q.category));
  }

  // Daarna eventueel specifieke categorie (comeback keuze)
  const poolAll = category
    ? poolBase.filter(q => q.category === category)
    : poolBase;

  let pool = poolAll.filter(q => !usedQuestionIds.has(q.id));

  if (pool.length === 0) {
    usedQuestionIds.clear();
    pool = poolAll;
  }

  const q = pool[Math.floor(Math.random() * pool.length)];
  usedQuestionIds.add(q.id);
  return q;
}

function actor() {
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
  if (!chaosEnabled) return null;
  if (Math.random() > 0.12) return null;
  const events = [
    { text: "🧨 Chaos: Iedereen drinkt 1 slok!", all: 1 },
    { text: "🔁 Chaos: Volgende fout = +1 slok.", plus: 1 },
    { text: "🎯 Chaos: Bij goed antwoord mag je 1 slok uitdelen!", give: 1 }
  ];
  return events[Math.floor(Math.random() * events.length)];
}

function applyChaos(evt) {
  helpBanner.classList.add("hidden");
  helpBanner.textContent = "";
  if (!evt) return;

  if (evt.all) Object.keys(stats).forEach(n => stats[n].sips += evt.all);
  if (evt.plus) pending.nextPenaltyPlus += evt.plus;
  if (evt.give) pending.rewardGive += evt.give;

  helpBanner.textContent = evt.text;
  helpBanner.classList.remove("hidden");
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
    modeLabel.textContent = mode === "solo" ? "Solo mode" : "Team mode";
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

  applyChaos(maybeChaos());

  const q = pickQuestion(chosenCategory);
  current = { a, q };

  modeLabel.textContent = mode === "solo" ? "Solo mode" : "Team mode";
  turnLabel.textContent =
    a.type === "player" ? `Aan de beurt: ${a.name}` : `Team aan de beurt: ${a.label}`;

  categoryLabel.textContent = `📚 ${q.category}`;
  difficultyLabel.textContent = `${q.difficulty} • ${SIP_BY_DIFFICULTY[q.difficulty] ?? 1} slok(ken)`;
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

function renderQuestionWithCategory(cat) {
  // ⏱️ altijd eerst timer stoppen/resetten
  stopTimer();

  nextBtn.disabled = true;
  resultBox.classList.add("hidden");
  resultBox.textContent = "";
  optionsEl.innerHTML = "";

  questionBox.classList.remove("hidden");

  const a = actor();
  applyChaos(maybeChaos());

  const q = pickQuestion(cat);
  // 🔒 Safety: als er geen vraag is (lege pool)
  if (!q) {
    renderQuestion(); // fallback naar normale vraag
  return;
  }
  current = { a, q };

  modeLabel.textContent = mode === "solo" ? "Solo mode" : "Team mode";
  turnLabel.textContent =
    a.type === "player" ? `Aan de beurt: ${a.name}` : `Team aan de beurt: ${a.label}`;

  categoryLabel.textContent = `📚 ${q.category}`;
  difficultyLabel.textContent = `${q.difficulty} • ${SIP_BY_DIFFICULTY[q.difficulty] ?? 1} slok(ken)`;
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
  const base = SIP_BY_DIFFICULTY[q.difficulty] ?? 1;
  const penalty = base + pending.nextPenaltyPlus;

  // reset pending
  pending.nextPenaltyPlus = 0;
  pending.rewardGive = 0;

  if (a.type === "player") {
    stats[a.name].wrong++;
    stats[a.name].wrongStreak++;
    stats[a.name].sips += penalty;
  } else {
    teamStats[a.label].wrong++;
    teamStats[a.label].wrongStreak++;
    teamStats[a.label].sips += penalty;
    a.team.forEach(n => stats[n].sips += penalty);
  }

  resultBox.classList.remove("hidden");
  resultBox.classList.remove("good");
  resultBox.classList.add("bad");
  resultBox.textContent = isTimeout
    ? `⏱️ Tijd op! ${a.type === "player" ? a.name : `Team ${a.label}`} drinkt ${penalty} slok(ken).`
    : (a.type === "player"
      ? `❌ Fout! ${a.name} drinkt ${penalty} slok(ken).`
      : `❌ Fout! Team drinkt ${penalty} slok(ken).`);
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

  const give = correct ? pending.rewardGive : 0;

  // reset pending rewardGive altijd na antwoord
  pending.rewardGive = 0;

  if (correct) {
    pending.nextPenaltyPlus = 0;

    if (a.type === "player") {
      stats[a.name].correct++;
      stats[a.name].wrongStreak = 0;
    } else {
      teamStats[a.label].correct++;
      teamStats[a.label].wrongStreak = 0;
    }

    resultBox.classList.remove("hidden");
    resultBox.classList.add("good");
    resultBox.classList.remove("bad");
    resultBox.textContent = `✅ Correct! Safe. ${give ? `Je mag ${give} slok uitdelen!` : ""}`;

    nextBtn.disabled = false;
    return;
  }

  // fout pad
  applyWrongForActor(a, q, false);
  nextBtn.disabled = false;
}

nextBtn.onclick = () => {
  // Tel de vraag die net gespeeld is voor de huidige actor
  if (current?.a) {
    if (current.a.type === "player") {
      askedCountPlayer[current.a.name] = (askedCountPlayer[current.a.name] ?? 0) + 1;
    } else {
      askedCountTeam[current.a.label] = (askedCountTeam[current.a.label] ?? 0) + 1;
    }
  }

  // Als iedereen z'n 10 beurten heeft gehad: einde
  if (isGameComplete()) {
    stopTimer();
    showEndScreen();
    return;
  }

  // Anders volgende beurt
  turnIndex++;
  renderQuestion();
};

// ------- score -------
function openScoreboard(returnTo) {
  scoreReturnScreen = returnTo || gameScreen; // fallback
  pauseTimer();

  const rows = Object.entries(stats).map(([name, s]) => ({ name, ...s }))
    .sort((a, b) => b.sips - a.sips);

  scoreTable.innerHTML = `
    <div style="overflow:auto">
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr>
            <th style="text-align:left;padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">Speler</th>
            <th style="text-align:right;padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">✅</th>
            <th style="text-align:right;padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">❌</th>
            <th style="text-align:right;padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">🍺</th>
            <th style="text-align:right;padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">streak</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(r => `
            <tr>
              <td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08)">${r.name}</td>
              <td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right">${r.correct}</td>
              <td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right">${r.wrong}</td>
              <td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right">${r.sips}</td>
              <td style="padding:10px;border-bottom:1px solid rgba(255,255,255,.08);text-align:right">${r.wrongStreak}</td>
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

  const mostSips = topBy(stats, "sips", "max");
  const mostCorrect = topBy(stats, "correct", "max");
  const mostWrong = topBy(stats, "wrong", "max");

  const lines = [];
  if (mostSips) lines.push(`🍺 <b>${mostSips.name}</b> heeft de meeste slokken: <b>${mostSips.sips}</b>`);
  if (mostCorrect) lines.push(`✅ <b>${mostCorrect.name}</b> had de meeste goed: <b>${mostCorrect.correct}</b>`);
  if (mostWrong) lines.push(`❌ <b>${mostWrong.name}</b> had de meeste fout: <b>${mostWrong.wrong}</b>`);

  // Team highlight (alleen in team mode)
  if (mode === "team" && teamStats && Object.keys(teamStats).length) {
    const bestTeam = topBy(teamStats, "correct", "max");
    const mostTeamSips = topBy(teamStats, "sips", "max");
    if (bestTeam) lines.push(`🏆 Beste team (meeste goed): <b>${bestTeam.name}</b> met <b>${bestTeam.correct}</b>`);
    if (mostTeamSips) lines.push(`🥴 Team met meeste slokken: <b>${mostTeamSips.name}</b> met <b>${mostTeamSips.sips}</b>`);
  }

  lines.forEach(html => {
    const div = document.createElement("div");
    div.className = "help";
    div.innerHTML = html;
    endHighlights.appendChild(div);
  });
}

function showEndScreen() {
  renderEndHighlights();

  if (!endScreen) {
    console.error('End screen ontbreekt: id="screen-end" niet gevonden in index.html');
    show(modeScreen);
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
    show(modeScreen);
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
    renderCategorySelector();

    initStats();
    if (mode === "team") initTeamStats();

    pending.nextPenaltyPlus = 0;
    pending.rewardGive = 0;

    turnIndex = 0;

    askedCountPlayer = {};
    Object.keys(stats).forEach(name => askedCountPlayer[name] = 0);

    askedCountTeam = {};
    if (mode === "team") Object.keys(teamStats).forEach(label => askedCountTeam[label] = 0);

    show(gameScreen);
    renderQuestion();
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
resetBtn.onclick = () => {
  stopConfetti();
  stopTimer();
  players = [];
  teams = [];
  teamNames = {};
  stats = {};
  teamStats = {};
  turnIndex = 0;

  playerNameInput.value = "";
  renderPlayers();
  startGameBtn.disabled = true;
  addPlayerBtn.disabled = false;

  show(modeScreen);
};

endGameBtn.onclick = () => {
  stopTimer();
  show(modeScreen);
};

// ------- setup: add players (PvP) -------
addPlayerBtn.onclick = () => {
  const name = playerNameInput.value.trim();
  if (!name) return;

  if (players.length >= MAX_PLAYERS_PVP) {
    alert(`Maximaal ${MAX_PLAYERS_PVP} spelers in Speler vs Speler.`);
    return;
  }

  if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    alert("Die naam bestaat al 🙂");
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

// ------- start Player/Team setup -------
startGameBtn.onclick = async () => {
  usedQuestionIds.clear();
  chaosEnabled = !!enableChaos?.checked;

  if (!questions.length) await loadQuestions();
  rebuildActiveQuestions();
  renderCategorySelector();

  initStats();
  teams = [];
  teamNames = {};
  mode = "solo";
  turnIndex = 0;
  askedCountPlayer = {};
  players.forEach(p => askedCountPlayer[p.name] = 0);
  askedCountTeam = {};

  show(gameScreen);
  renderQuestion();
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

  mode = selectedMode;

  if (mode === "solo") {
    show(setupScreen);
  } else {
    show(teamEntryScreen);
  }
};

// ------- MODE SCREEN -------
[modePvpBtn, modeTvTBtn].forEach(btn => {
  btn.onclick = () => {
    selectedMode = btn.getAttribute("data-mode");

    document.querySelectorAll(".mode-btn")
      .forEach(b => b.classList.remove("active"));

    btn.classList.add("active");
  };
});

backToModeBtn.onclick = () => show(modeScreen);

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

  if (!questions.length) await loadQuestions();
  rebuildActiveQuestions();
  renderCategorySelector();

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

  askedCountTeam = {};
  Object.keys(teamStats).forEach(label => askedCountTeam[label] = 0); // teamStats bestaat na initTeamStats()
  askedCountPlayer = {}; // mag leeg, of ook initialiseren als je wilt
  show(gameScreen);
  renderQuestion();
};

if (timerPills) {
  timerPills.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-timer]");
    if (!btn) return;

    const raw = btn.getAttribute("data-timer");
    const sec = Number(raw);
    setTimerSeconds(Number.isNaN(sec) ? 10 : sec);

    Array.from(timerPills.querySelectorAll("button[data-timer]"))
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
  });
}

function isGameComplete() {
  if (mode === "solo") {
    const names = Object.keys(stats);
    return names.length > 0 && names.every(n => (askedCountPlayer[n] ?? 0) >= QUESTIONS_PER_ACTOR);
  }
  // team mode
  const labels = Object.keys(teamStats);
  return labels.length > 0 && labels.every(l => (askedCountTeam[l] ?? 0) >= QUESTIONS_PER_ACTOR);
}

// initial
(async function init() {
  await loadQuestions();       // 👈 vragen meteen laden
  renderCategorySelector();    // 👈 categorieën direct renderen

  renderPlayers();
  startGameBtn.disabled = true;
  show(modeScreen);
})();