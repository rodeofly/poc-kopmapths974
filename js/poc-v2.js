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
function normalizeAnswerNode(node, collector) {
  if (!collector) {
    collector = { values: [], displays: [] };
  }

  if (node == null) {
    return collector;
  }

  const pushValue = (value, display = null) => {
    if (value != null && value !== "") {
      collector.values.push(String(value));
    }
    if (display != null && display !== "") {
      collector.displays.push(String(display));
    }
  };

  if (Array.isArray(node)) {
    node.forEach((item) => normalizeAnswerNode(item, collector));
    return collector;
  }

  if (typeof node === "object") {
    if ("value" in node && node.value !== node) {
      normalizeAnswerNode(node.value, collector);
    } else if ("valeur" in node && node.valeur !== node) {
      normalizeAnswerNode(node.valeur, collector);
    } else if ("texte" in node) {
      pushValue(node.texte, node.texte);
    } else if ("tex" in node) {
      pushValue(node.tex, node.tex);
    } else if ("texteCorr" in node) {
      pushValue(node.texteCorr, node.texteCorr);
    } else if ("display" in node && node.display !== node) {
      normalizeAnswerNode(node.display, collector);
    } else if ("min" in node || "max" in node) {
      const min = node.min ?? node.minValue ?? "";
      const max = node.max ?? node.maxValue ?? "";
      if (min !== "" || max !== "") {
        const rangeLabel = [min, max].filter((part) => part !== "").join(" – ");
        pushValue(rangeLabel, rangeLabel);
      }
    } else {
      try {
        const serialized = JSON.stringify(node);
        pushValue(serialized, serialized);
      } catch (error) {
        console.warn("⚠️ Réponse inattendue :", node, error);
      }
    }
    return collector;
  }

  pushValue(node);
  return collector;
}

function extractExpectedAnswer(corr) {
  if (!corr) {
    return { value: "", display: "" };
  }

  const collector = normalizeAnswerNode(corr.reponse ?? corr);
  const value = collector.values.join(" ; ").trim();
  const displaySource = collector.displays.join(" ; ");
  const display = (displaySource || value).trim();

  return {
    value,
    display
  };
}

function normalizeTextValue(value) {
  if (value == null) return "";
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/,/g, ".")
    .trim();
}

function setFieldValidationState(field, isCorrect) {
  if (!field) return;

  const baseClasses = ["border", "rounded", "px-2", "py-1"];
  const successClasses = ["border-green-500", "bg-green-50"]; // math-field support classList
  const errorClasses = ["border-red-500", "bg-red-50"];

  const classList = field.classList;
  if (classList) {
    baseClasses.forEach((cls) => classList.add(cls));
    successClasses.concat(errorClasses).forEach((cls) => classList.remove(cls));
    if (isCorrect) {
      successClasses.forEach((cls) => classList.add(cls));
      field.setAttribute("aria-invalid", "false");
    } else {
      errorClasses.forEach((cls) => classList.add(cls));
      field.setAttribute("aria-invalid", "true");
    }
  }
}

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
  const feedbackDetails = [];

  corrections.forEach((corr, i) => {
    if (!corr || !corr.reponse) return;

    const { value: expectedValue, display: expectedDisplay } = extractExpectedAnswer(corr);
    const champ = document.querySelector(`#champTexteExundefinedQ${i}`);
    if (!champ) return;

    total++;
    const userVal = champ.value?.trim() || champ.getValue?.()?.trim() || "";
    const normalizedUser = normalizeTextValue(userVal);
    const candidateExpected = normalizeTextValue(expectedValue) || normalizeTextValue(expectedDisplay);
    const isCorrect = candidateExpected !== "" && normalizedUser === candidateExpected;

    setFieldValidationState(champ, isCorrect);

    const resultEl = document.querySelector(`#resultatCheckExundefinedQ${i}`);
    if (resultEl) {
      resultEl.textContent = isCorrect ? "✅" : "❌";
      resultEl.className = isCorrect ? "text-green-600" : "text-red-600";
    }

    feedbackDetails.push(
      `<li class="${
        isCorrect ? "text-green-700" : "text-red-700"
      }">${isCorrect ? "✅" : "❌"} Question ${
        i + 1
      } – Votre réponse : <strong>${userVal || "(vide)"}</strong>, attendu : <strong>${expectedDisplay || "?"}</strong></li>`
    );

    if (isCorrect) score++;
  });

  const feedback = document.getElementById("feedbackContainerEl");
  if (feedback) {
    if (!total) {
      feedback.innerHTML = "⚠️ Aucune question évaluée.";
    } else {
      const detailList = feedbackDetails.length
        ? `<ul class="mt-2 space-y-1 text-base">${feedbackDetails.join("")}</ul>`
        : "";
      feedback.innerHTML = `🎯 Score : <strong>${score}/${total}</strong>${detailList}`;
      renderKaTeX(feedback);
    }
  }
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
