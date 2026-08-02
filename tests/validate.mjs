import fs from "node:fs";

const html = fs.readFileSync("index.html", "utf8");
const js = fs.readFileSync("app.js", "utf8");
const questions = JSON.parse(fs.readFileSync("questions.json", "utf8"));
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
const refs = [...js.matchAll(/getElementById\("([^"]+)"\)/g)].map(match => match[1]);
const errors = [];

if (new Set(ids).size !== ids.length) errors.push("Dubbele HTML-id gevonden");
for (const ref of new Set(refs)) if (!ids.includes(ref)) errors.push(`Ontbrekend HTML-element: ${ref}`);

const questionKeys = new Set();
for (const [index, question] of questions.entries()) {
  if (!question.id || !question.category || !question.difficulty || !question.question) errors.push(`Vraag ${index} mist verplichte velden`);
  if (!Array.isArray(question.options) || question.options.length !== 4) errors.push(`Vraag ${question.id} heeft niet vier antwoorden`);
  if (!Number.isInteger(question.correctIndex) || question.correctIndex < 0 || question.correctIndex > 3) errors.push(`Vraag ${question.id} heeft een ongeldige correctIndex`);
  const key = JSON.stringify([question.question.trim().toLowerCase(), question.options, question.correctIndex]);
  if (questionKeys.has(key)) errors.push(`Dubbele vraaginhoud: ${question.id}`);
  questionKeys.add(key);
}

if (errors.length) {
  console.error(errors.join("\n"));
  process.exit(1);
}
console.log(`SipArena-controle geslaagd: ${questions.length} unieke, geldige vragen.`);
