const setupScreen = document.getElementById("screen-setup");
const gameScreen = document.getElementById("screen-game");
const scoreScreen = document.getElementById("screen-score");

const playerNameInput = document.getElementById("playerNameInput");
const addPlayerBtn = document.getElementById("addPlayerBtn");
const playersList = document.getElementById("playersList");
const startGameBtn = document.getElementById("startGameBtn");
const enableChaos = document.getElementById("enableChaos");
const enableAdult = document.getElementById("enableAdult");

const modeLabel = document.getElementById("modeLabel");
const turnLabel = document.getElementById("turnLabel");
const helpBanner = document.getElementById("helpBanner");

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

const SIP_BY_DIFFICULTY = { Easy: 1, Medium: 2, Hard: 3, Brutal: 5 };

let questions = [];
let activeQuestions = [];
let adultEnabled = false;
let players = []; // [{name}]
let mode = "solo"; // solo | team
let teams = []; // [[a,b], ...]
let turnIndex = 0;

let stats = {};     // name => {correct, wrong, sips, wrongStreak}
let teamStats = {}; // label => {correct, wrong, sips, wrongStreak}

let current = null;
let usedQuestionIds = new Set();
let chaosEnabled = false;
let pending = { nextPenaltyPlus: 0, rewardGive: 0 };

function show(screen) {
  setupScreen.classList.add("hidden");
  gameScreen.classList.add("hidden");
  scoreScreen.classList.add("hidden");
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

async function loadQuestions() {
  const res = await fetch("questions.json");
  questions = await res.json();
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
    };
    li.appendChild(btn);
    playersList.appendChild(li);
  });
}

addPlayerBtn.onclick = () => {
  const name = playerNameInput.value.trim();
  if (!name) return;
  if (players.some(p => p.name.toLowerCase() === name.toLowerCase())) {
    alert("Die naam bestaat al 🙂");
    return;
  }
  players.push({ name });
  playerNameInput.value = "";
  renderPlayers();
  startGameBtn.disabled = players.length < 2;
  playerNameInput.focus();
};

playerNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") addPlayerBtn.click();
});

function initStats() {
  stats = {};
  players.forEach(p => {
    stats[p.name] = { correct: 0, wrong: 0, sips: 0, wrongStreak: 0 };
  });
}

function teamLabel(team) {
  return `${team[0]} + ${team[1]}`;
}

function makeTeams() {
  const names = shuffle(players.map(p => p.name));
  const t = [];
  for (let i = 0; i < names.length; i += 2) {
    t.push([names[i], names[i + 1]]);
  }
  return t;
}

function initTeamStats() {
  teamStats = {};
  teams.forEach(t => {
    teamStats[teamLabel(t)] = { correct: 0, wrong: 0, sips: 0, wrongStreak: 0 };
  });
}

function categories() {
    return Array.from(new Set(activeQuestions.map(q => q.category))).sort();
  }

  function pickQuestion(category) {
    const poolAll = category
      ? activeQuestions.filter(q => q.category === category)
      : activeQuestions;
  
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
  if (mode === "solo") return { type: "player", name: players[turnIndex % players.length].name };
  const t = teams[turnIndex % teams.length];
  return { type: "team", team: t, label: teamLabel(t) };
}

function needsHelp(a) {
  if (a.type === "player") return stats[a.name].wrongStreak >= 2;
  return teamStats[a.label].wrongStreak >= 2;
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

function renderQuestion() {
  nextBtn.disabled = true;
  resultBox.classList.add("hidden");
  optionsEl.innerHTML = "";

  const a = actor();
  const help = needsHelp(a);

  let chosenCategory = null;
  if (help) {
    const cats = categories();
    const choice = prompt(`Je speelt even slecht 😅\nKies categorie:\n- ${cats.join("\n- ")}`);
    if (cats.includes((choice || "").trim())) chosenCategory = choice.trim();
  }

  applyChaos(maybeChaos());

  const q = pickQuestion(chosenCategory);
  current = { a, q };

  modeLabel.textContent = mode === "solo" ? "Solo mode" : "Team mode";
  turnLabel.textContent = a.type === "player" ? `Aan de beurt: ${a.name}` : `Team aan de beurt: ${a.label}`;

  categoryLabel.textContent = `📚 ${q.category}`;
  difficultyLabel.textContent = `${q.difficulty} • ${SIP_BY_DIFFICULTY[q.difficulty] ?? 1} slok(ken)`;
  questionText.textContent = q.question;

  q.options.forEach((opt, idx) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.textContent = opt;
    b.onclick = () => answer(idx);
    optionsEl.appendChild(b);
  });
}

function answer(choiceIdx) {
  const { a, q } = current;
  const correct = choiceIdx === q.correctIndex;

  const buttons = Array.from(optionsEl.querySelectorAll("button"));
  buttons.forEach((b, idx) => {
    b.disabled = true;
    if (idx === q.correctIndex) b.classList.add("correct");
    if (idx === choiceIdx && !correct) b.classList.add("wrong");
  });

  const base = SIP_BY_DIFFICULTY[q.difficulty] ?? 1;
  const penalty = correct ? 0 : base + pending.nextPenaltyPlus;
  const give = correct ? pending.rewardGive : 0;
  pending.nextPenaltyPlus = 0;
  pending.rewardGive = 0;

  if (a.type === "player") {
    if (correct) { stats[a.name].correct++; stats[a.name].wrongStreak = 0; }
    else { stats[a.name].wrong++; stats[a.name].wrongStreak++; stats[a.name].sips += penalty; }
  } else {
    if (correct) { teamStats[a.label].correct++; teamStats[a.label].wrongStreak = 0; }
    else {
      teamStats[a.label].wrong++; teamStats[a.label].wrongStreak++; teamStats[a.label].sips += penalty;
      a.team.forEach(n => stats[n].sips += penalty);
    }
  }

  resultBox.classList.remove("hidden");
  resultBox.classList.toggle("good", correct);
  resultBox.classList.toggle("bad", !correct);
  resultBox.textContent = correct
    ? `✅ Correct! Safe. ${give ? `Je mag ${give} slok uitdelen!` : ""}`
    : (a.type === "player"
      ? `❌ Fout! ${a.name} drinkt ${penalty} slok(ken).`
      : `❌ Fout! Team drinkt ${penalty} slok(ken).`);

  nextBtn.disabled = false;
}

nextBtn.onclick = () => { turnIndex++; renderQuestion(); };

scoreBtn.onclick = () => {
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
};

backToGameBtn.onclick = () => show(gameScreen);

resetBtn.onclick = () => {
  players = [];
  teams = [];
  stats = {};
  teamStats = {};
  turnIndex = 0;
  renderPlayers();
  startGameBtn.disabled = true;
  show(setupScreen);
};

endGameBtn.onclick = () => show(setupScreen);

startGameBtn.onclick = async () => {
    usedQuestionIds.clear();
  
    chaosEnabled = enableChaos.checked;
    if (!questions.length) await loadQuestions();
  
    adultEnabled = enableAdult.checked;
    activeQuestions = adultEnabled
      ? questions
      : questions.filter(q => q.category !== "18+ Party");
  
    initStats();
    mode = players.length >= 6 ? "team" : "solo";
    teams = [];
    if (mode === "team") {
      teams = makeTeams();
      initTeamStats();
    }
    turnIndex = 0;
    show(gameScreen);
    renderQuestion();
  };

renderPlayers();
startGameBtn.disabled = true;