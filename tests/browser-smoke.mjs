const endpoint = process.env.CDP_URL || "http://localhost:9222";
const pages = await fetch(`${endpoint}/json`).then(response => response.json());
const page = pages.find(item => item.type === "page");
if (!page) throw new Error("Geen browserpagina gevonden");

const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => { socket.addEventListener("open", resolve); socket.addEventListener("error", reject); });
let id = 0;
const pending = new Map();
socket.addEventListener("message", event => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const { resolve, reject } = pending.get(message.id);
  pending.delete(message.id);
  message.error ? reject(message.error) : resolve(message.result);
});
const command = (method, params = {}) => new Promise((resolve, reject) => {
  const commandId = ++id;
  pending.set(commandId, { resolve, reject });
  socket.send(JSON.stringify({ id: commandId, method, params }));
});
const evaluate = async expression => {
  const result = await command("Runtime.evaluate", { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

await wait(700);
await evaluate(`localStorage.clear()`);
await evaluate(`document.querySelector('#homeStartBtn').click()`);
await evaluate(`document.querySelector('#modePvpBtn').click(); document.querySelector('[data-timer="0"]').click(); document.querySelector('#modeNextBtn').click()`);
for (const name of ["Alex", "Sam"]) {
  await evaluate(`playerNameInput.value=${JSON.stringify(name)}; addPlayerBtn.click()`);
}
await evaluate(`startGameBtn.click()`);
await wait(200);
await evaluate(`document.querySelector('#options .opt').click()`);
await evaluate(`nextBtn.click()`);
const result = await evaluate(`({ gameVisible: !gameScreen.classList.contains('hidden'), options: optionsEl.children.length, progress: progressText.textContent, saved: !!localStorage.getItem(SAVE_KEY) })`);
await command("Page.reload", { ignoreCache: true });
await wait(800);
await evaluate(`resumeGameBtn.click()`);
await wait(150);
const restored = await evaluate(`({ gameVisible: !gameScreen.classList.contains('hidden'), players: players.length, progress: progressText.textContent })`);
await evaluate(`localStorage.clear(); show(homeScreen); homeStartBtn.click(); modeTvTBtn.click(); document.querySelector('[data-timer="0"]').click(); modeNextBtn.click()`);
await evaluate(`
  document.querySelector('#teamName_0').value='Team Noord';
  document.querySelector('#teamName_1').value='Team Zuid';
  [...document.querySelectorAll('[data-team-card]')].forEach((card, teamIndex) => {
    [...card.querySelectorAll('[data-team-player]')].forEach((input, playerIndex) => {
      input.value = 'T' + teamIndex + ' speler ' + playerIndex;
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
  });
  startTeamGameBtn.click();
`);
await wait(150);
const teamGame = await evaluate(`({ gameVisible: !gameScreen.classList.contains('hidden'), mode, teams: teams.length, options: optionsEl.children.length })`);
socket.close();
if (!result.gameVisible || result.options !== 4 || !result.saved) throw new Error(`Browsertest mislukt: ${JSON.stringify(result)}`);
if (!restored.gameVisible || restored.players !== 2) throw new Error(`Hervattest mislukt: ${JSON.stringify(restored)}`);
if (!teamGame.gameVisible || teamGame.mode !== "team" || teamGame.teams !== 2 || teamGame.options !== 4) throw new Error(`Teamtest mislukt: ${JSON.stringify(teamGame)}`);
console.log("Browsertest geslaagd:", { ...result, restored, teamGame });
