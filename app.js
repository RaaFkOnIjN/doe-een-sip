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

const MAX_PLAYERS_PVP = 5;
const MAX_TEAMS = 5;
const DEFAULT_TEAMS = 2;

// ------- helpers -------
function show(screen) {
  const all = [modeScreen, setupScreen, teamEntryScreen, gameScreen, scoreScreen, teamSetupScreen];
  all.forEach(s => s && s.classList.add("hidden"));
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

    cats.forEach(cat => {
      const b = document.createElement("button");
      b.className = "smallbtn";
      b.textContent = cat;
      b.onclick = () => {
        // comeback used: reset streak
        if (a.type === "player") stats[a.name].wrongStreak = 0;
        else teamStats[a.label].wrongStreak = 0;

        categoryChooser.classList.add("hidden");
        renderQuestionWithCategory(cat);
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

  q.options.forEach((opt, idx) => {
    const b = document.createElement("button");
    b.className = "opt";
    b.textContent = opt;
    b.onclick = () => answer(idx);
    optionsEl.appendChild(b);
  });
}

function renderQuestionWithCategory(cat) {
  nextBtn.disabled = true;
  resultBox.classList.add("hidden");
  resultBox.textContent = "";
  optionsEl.innerHTML = "";

  questionBox.classList.remove("hidden");

  const a = actor();
  applyChaos(maybeChaos());

  const q = pickQuestion(cat);
  current = { a, q };

  modeLabel.textContent = mode === "solo" ? "Solo mode" : "Team mode";
  turnLabel.textContent =
    a.type === "player" ? `Aan de beurt: ${a.name}` : `Team aan de beurt: ${a.label}`;

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
    if (correct) {
      stats[a.name].correct++;
      stats[a.name].wrongStreak = 0;
    } else {
      stats[a.name].wrong++;
      stats[a.name].wrongStreak++;
      stats[a.name].sips += penalty;
    }
  } else {
    if (correct) {
      teamStats[a.label].correct++;
      teamStats[a.label].wrongStreak = 0;
    } else {
      teamStats[a.label].wrong++;
      teamStats[a.label].wrongStreak++;
      teamStats[a.label].sips += penalty;
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

// ------- score -------
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

// ------- reset / end -------
resetBtn.onclick = () => {
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

endGameBtn.onclick = () => show(modeScreen);

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

// ------- start PvP game -------
startGameBtn.onclick = async () => {
  usedQuestionIds.clear();
  chaosEnabled = !!enableChaos?.checked;

  if (!questions.length) await loadQuestions();
  rebuildActiveQuestions();

  initStats();
  teams = [];
  teamNames = {};
  mode = "solo";
  turnIndex = 0;

  show(gameScreen);
  renderQuestion();
};

// ------- MODE SCREEN -------
modePvpBtn.onclick = () => {
  selectedMode = "pvp";
  // reset PVP setup state
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

  show(setupScreen);
};

modeTvTBtn.onclick = () => {
  selectedMode = "tvt";
  // reset TVT state
  players = [];
  teams = [];
  teamNames = {};
  stats = {};
  teamStats = {};
  turnIndex = 0;

  show(teamEntryScreen);
  initTeamEntryUI();
};

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
    <input class="input" id="teamName_${i}" value="Team ${i + 1}" />

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

  // teamname input -> live validate
  const teamNameEl = card.querySelector(`#teamName_${i}`);
  teamNameEl.addEventListener("input", validateTeamEntryLive);

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
  let teamOk = true;

  // teamnaam verplicht
  if (!teamName) {
    teamOk = false;
    if (teamNameEl) {
      teamNameEl.style.outline = "2px solid rgba(255, 77, 77, .85)";
      teamNameEl.style.outlineOffset = "2px";
    }
  }

  // minimaal 2 spelersnamen: markeer lege inputs rood als er nog te weinig namen zijn
  if (names.length < 2) {
    teamOk = false;
    inputs.forEach(inp => {
      if (!inp.value.trim()) {
        inp.style.outline = "2px solid rgba(255, 77, 77, .85)";
        inp.style.outlineOffset = "2px";
      }
    });
  }

  // team kaart ook rood als team niet ok is (extra duidelijk)
  if (!teamOk) {
    valid = false;
    card.style.outline = "2px solid rgba(255, 77, 77, .55)";
    card.style.outlineOffset = "4px";
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

  const teamCards = Array.from(teamsWrap.querySelectorAll("[data-team-card]"));

  const builtTeams = [];
  const allPlayers = [];

  for (const card of teamCards) {
    const idx = Number(card.getAttribute("data-team-id"));

    const teamNameEl = document.getElementById(`teamName_${idx}`);
    const teamName = (teamNameEl?.value || "").trim() || `Team ${idx + 1}`;

    const memberNames = [];
    const playerInputs = card.querySelectorAll("input[data-team-player][data-team-id]");
playerInputs.forEach(input => {
  const nm = input.value.trim();
  if (nm) memberNames.push(nm);
});

    if (memberNames.length === 0) continue; // leeg team negeren
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
  show(gameScreen);
  renderQuestion();
};

// initial
renderPlayers();
startGameBtn.disabled = true;
show(modeScreen);