// ==============================
// 🧩 poc-v2.js
// ==============================

import {
  renderKaTeX,
  createFloatingConsole,
  renderExerciseParameters,
  normalizeLegacyLatex
} from "./exercise-utils.js";

let exerciseList = [];
let currentIndex = 0;
let currentCode = null;
let currentExercise = null;
let floatingConsole = null;
const exerciseOverrides = {};

// ==============================
// 🧭 Utilitaires de normalisation de codes
// ==============================
const availableMathaleaCodes = new Set();

function registerExistingMathaleaCodes() {
  if (typeof MathALEA !== "object" || MathALEA === null) return;

  try {
    Object.keys(MathALEA).forEach((key) => {
      const entry = MathALEA[key];
      if (entry && typeof entry === "object" && "default" in entry) {
        availableMathaleaCodes.add(key);
      }
    });
  } catch (error) {
    console.warn("⚠️ Impossible d'inspecter les codes MathALEA :", error);
  }
}

function hasMathaleaCode(code) {
  if (!code) return false;

  if (!availableMathaleaCodes.size) {
    registerExistingMathaleaCodes();
  }

  if (availableMathaleaCodes.has(code)) {
    return true;
  }

  if (typeof MathALEA === "object" && MathALEA !== null) {
    const candidate = MathALEA[code];
    if (candidate && typeof candidate === "object" && "default" in candidate) {
      availableMathaleaCodes.add(code);
      return true;
    }
  }

  return false;
}

function resolveExerciseCode(meta = {}) {
  const rawCode = typeof meta.code === "string" ? meta.code.trim() : "";
  if (!rawCode) return rawCode;

  if (hasMathaleaCode(rawCode)) {
    return rawCode;
  }

  const niveauText = typeof meta.niveau === "string" ? meta.niveau : "";
  const niveauDigitMatch = niveauText.match(/(\d)/);
  const niveauDigit = niveauDigitMatch ? niveauDigitMatch[1] : null;

  if (niveauDigit && /^e[A-Za-z0-9]/.test(rawCode)) {
    const corrected = `${niveauDigit}${rawCode.slice(1)}`;
    if (hasMathaleaCode(corrected)) {
      console.info(
        `🔧 Code corrigé automatiquement : ${rawCode} → ${corrected}`
      );
      return corrected;
    }
  }

  return rawCode;
}

// ==============================
// ⚙️ 1. Chargement du JSON
// ==============================
async function loadExerciseList() {
  try {
    const response = await fetch("mathalea_index_college.json");
    const rawList = await response.json();
    exerciseList = Array.isArray(rawList)
      ? rawList.map((meta) => ({
          ...meta,
          resolvedCode: resolveExerciseCode(meta)
        }))
      : [];
    currentIndex = 0;
    console.log("📚 Index chargé :", exerciseList);
  } catch (err) {
    console.error("❌ Impossible de charger la liste d'exercices :", err);
  }
}

// ==============================
// 🎲 2. Génération d'un exercice
// ==============================
function generateNewExercise(arg = null) {
  console.clear();
  console.log("🧩 Début de génération d’un exercice...");

  try {
    // si aucun code fourni → aléatoire
    if (!exerciseList.length) {
      console.warn("⚠️ Aucune liste d'exercices chargée.");
      return;
    }

    let requestedCode = null;
    let providedOverrides = null;
    let preserveIndex = false;

    if (typeof arg === "string") {
      requestedCode = arg;
    } else if (arg && typeof arg === "object") {
      requestedCode = arg.code ?? null;
      providedOverrides = arg.overrides ?? null;
      preserveIndex = Boolean(arg.preserveIndex);
    }

    if (currentIndex < 0 || currentIndex >= exerciseList.length) {
      currentIndex = 0;
    }

    const pointerBefore = currentIndex;
    let targetIndex = pointerBefore;

    if (requestedCode) {
      const foundIndex = exerciseList.findIndex(
        (ex) => ex.resolvedCode === requestedCode || ex.code === requestedCode
      );
      if (foundIndex === -1) {
        console.warn("⚠️ Code d'exercice inconnu :", requestedCode);
        return;
      }
      targetIndex = foundIndex;
    }

    const exerciseMeta = exerciseList[targetIndex];
    if (!exerciseMeta?.resolvedCode && !exerciseMeta?.code) {
      console.warn("⚠️ Entrée d'exercice invalide à l'index", currentIndex);
      return;
    }

    const chosen = exerciseMeta.resolvedCode || exerciseMeta.code;
    currentCode = chosen;

    console.log("🎲 Exercice choisi :", chosen);
    if (exerciseMeta.code && exerciseMeta.code !== chosen) {
      console.log("ℹ️ Code original :", exerciseMeta.code);
    }

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
    
    currentExercise = ex;

    if (providedOverrides && typeof providedOverrides === "object") {
      exerciseOverrides[chosen] = { ...providedOverrides };
    }

    const storedOverrides = exerciseOverrides[chosen];
    if (storedOverrides && typeof storedOverrides === "object") {
      Object.entries(storedOverrides).forEach(([key, value]) => {
        ex[key] = value;
      });
    }

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

    if (floatingConsole) {
      floatingConsole.update(exerciseList, currentCode, ex.seed);
    }
    renderExerciseParameters(ex, {
      onApply: (overrides) => {
        exerciseOverrides[chosen] = { ...overrides };
        generateNewExercise({
          code: chosen,
          overrides,
          preserveIndex: true
        });
      }
    });

    if (!preserveIndex) {
      currentIndex = (targetIndex + 1) % exerciseList.length;
    } else {
      currentIndex = pointerBefore;
    }

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
  const rawContent = ex.contenu && ex.contenu.trim() !== "" ? ex.contenu : "";
  const normalizedContent =
    rawContent !== "" ? normalizeLegacyLatex(rawContent) : "<em>Aucun contenu généré</em>";

  contentEl.innerHTML = normalizedContent;
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
  registerExistingMathaleaCodes();
  await loadExerciseList();

  // création console flottante
  floatingConsole = createFloatingConsole((newCode) => {
    generateNewExercise({ code: newCode });
  });

  // premier exercice
  generateNewExercise();

  // bouton Valider
  document
    .getElementById("validateButton")
    .addEventListener("click", validateAnswer);
});
