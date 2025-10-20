// ==============================
// 🧩 poc-v2.js
// ==============================

import { renderKaTeX, createFloatingConsole, renderExerciseParameters } from "./exercise-utils.js";

let exerciseList = [];
let currentCode = null;
let currentExercise = null;
let floatingConsole = null;

// ==============================
// ⚙️ 1. Chargement du JSON
// ==============================
async function loadExerciseList() {
  try {
    const response = await fetch("mathalea_index_college.json");
    exerciseList = await response.json();
    console.log("📚 Index chargé :", exerciseList);
  } catch (err) {
    console.error("❌ Impossible de charger la liste d'exercices :", err);
  }
}

// ==============================
// 🎲 2. Génération d'un exercice
// ==============================
function generateNewExercise(code = null) {
  console.clear();
  console.log("🧩 Début de génération d’un exercice...");

  try {
    // si aucun code fourni → aléatoire
    const chosen =
      code || exerciseList[Math.floor(Math.random() * exerciseList.length)].code;
    currentCode = chosen;

    console.log("🎲 Exercice choisi :", chosen);

    const ExClass = MathALEA[chosen];
    if (!ExClass || !ExClass.default) {
      console.error("❌ Classe introuvable pour :", chosen);
      return;
    }

    // création de l'exercice
    const ex = new ExClass.default();
    ex.interactif = true;
    ex.interactifReady = true;
    ex.idExercice = chosen;
    window.contextExercice = ex;

    // gestion du seed
    const seed = ex.seed || Math.random().toString(36).substring(2, 6);
    ex.seed = seed;
    if (typeof ex.reinit === "function") ex.reinit(seed);
    if (typeof ex.applyNewSeed === "function") ex.applyNewSeed();

    ex.nouvelleVersion();

    console.log("📊 Debug génération exercice");
    console.log("🧩 idExercice :", ex.idExercice);
    console.log("🧮 Seed actuelle :", ex.seed);
    console.log("📦 Contenu brut :", ex.contenu);
    console.log("🧾 AutoCorrection :", ex.autoCorrection);
    console.log("🧱 Exercice complet :", ex);

    renderExercise(ex);

    floatingConsole.update(exerciseList, currentCode, ex.seed);
    renderExerciseParameters(ex);

  } catch (err) {
    console.error("Erreur de génération :", err);
  }
}

// ==============================
// 🧠 3. Validation des réponses
// ==============================
function validateAnswer() {
  console.log("🧠 validateAnswer() déclenchée !");

  const ex = window.contextExercice;
  if (!ex) {
    console.warn("Aucun exercice actif !");
    return;
  }

  const corrections = ex.autoCorrection || [];
  let score = 0;
  let total = 0;

  corrections.forEach((corr, i) => {
    if (!corr || !corr.reponse) return;

    const expected = corr.reponse.valeur?.value || corr.reponse.valeur || corr.reponse.value;
    const champ = document.querySelector(`#champTexteExundefinedQ${i}`);
    if (!champ) return;

    total++;
    const userVal = champ.value?.trim() || champ.getValue?.()?.trim() || "";
    const isCorrect = userVal === expected.toString();

    const resultEl = document.querySelector(`#resultatCheckExundefinedQ${i}`);
    if (resultEl) {
      resultEl.textContent = isCorrect
        ? `✅ (${expected})`
        : `❌ (${expected})`;
      resultEl.className = isCorrect ? "text-green-600" : "text-red-600";
    }

    if (isCorrect) score++;
  });

  const feedback = document.getElementById("feedbackContainerEl");
  if (feedback)
    feedback.innerHTML = `🎯 Score : <strong>${score}/${total}</strong>`;
}

// ==============================
// 🧾 4. Rendu de l'exercice
// ==============================
function renderExercise(ex) {
  const titleEl = document.getElementById("questionTitleEl");
  const contentEl = document.getElementById("questionContentEl");
  const feedbackEl = document.getElementById("feedbackContainerEl");

  if (!titleEl || !contentEl) return;

  titleEl.textContent = `Exercice ${ex.idExercice} (${ex.seed})`;
  contentEl.innerHTML =
    ex.contenu && ex.contenu.trim() !== ""
      ? ex.contenu
      : "<em>Aucun contenu généré</em>";
  feedbackEl.textContent = "";

  // Rendu KaTeX
  renderKaTeX(contentEl);

  // Focus sur le premier champ si existant
  const firstField = contentEl.querySelector("math-field, input");
  if (firstField) firstField.focus();
}

// ==============================
// ⚡ 5. Initialisation
// ==============================
document.addEventListener("DOMContentLoaded", async () => {
  await loadExerciseList();

  // création console flottante
  floatingConsole = createFloatingConsole((newCode) => {
    generateNewExercise(newCode);
  });

  // premier exercice
  generateNewExercise();

  // bouton Valider
  document
    .getElementById("validateButton")
    .addEventListener("click", validateAnswer);
});
