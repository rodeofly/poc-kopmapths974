// ==============================
// 📘 exercise-utils.js
// ==============================

// 🧮 --- Rendu KaTeX propre ---
export function renderKaTeX(container) {
  if (!window.katex || !container) {
    console.warn("⚠️ KaTeX non prêt ou container manquant.");
    return;
  }

  try {
    renderMathInElement(container, {
      delimiters: [
        { left: "$$", right: "$$", display: true },
        { left: "\\[", right: "\\]", display: true },
        { left: "$", right: "$", display: false },
        { left: "\\(", right: "\\)", display: false }
      ],
      throwOnError: false
    });
  } catch (e) {
    console.error("Erreur KaTeX :", e);
  }
}

// ==============================
// 🧰 Génération du panneau flottant
// ==============================
export function createFloatingConsole(onExerciseChange) {
  const consoleDiv = document.createElement("div");
  consoleDiv.id = "floatingConsole";
  consoleDiv.className = `
    fixed bottom-4 right-4 bg-white shadow-xl rounded-lg border border-gray-300
    w-64 p-3 text-sm z-50 select-none
  `;
  consoleDiv.innerHTML = `
    <div class="flex justify-between items-center mb-2 cursor-move">
      <strong>🧠 MathALEA Debug</strong>
      <button id="closeConsole" class="text-gray-500 hover:text-red-500">✖</button>
    </div>
    <div id="consoleContent" class="text-xs text-gray-700 space-y-1">
      <div>Chargement...</div>
    </div>
  `;
  document.body.appendChild(consoleDiv);

  // rendre draggable
  let isDragging = false;
  let offsetX, offsetY;
  const header = consoleDiv.querySelector(".cursor-move");

  header.addEventListener("mousedown", (e) => {
    isDragging = true;
    offsetX = e.clientX - consoleDiv.offsetLeft;
    offsetY = e.clientY - consoleDiv.offsetTop;
    document.addEventListener("mousemove", move);
    document.addEventListener("mouseup", stop);
  });

  function move(e) {
    if (!isDragging) return;
    consoleDiv.style.left = e.clientX - offsetX + "px";
    consoleDiv.style.top = e.clientY - offsetY + "px";
  }

  function stop() {
    isDragging = false;
    document.removeEventListener("mousemove", move);
    document.removeEventListener("mouseup", stop);
  }

  consoleDiv.querySelector("#closeConsole").addEventListener("click", () => {
    consoleDiv.remove();
  });

  // expose une fonction pour mettre à jour le contenu
  return {
    update(exerciseList, currentCode, seed) {
      const content = consoleDiv.querySelector("#consoleContent");
      if (!exerciseList?.length) {
        content.innerHTML = "<em>Aucun exercice trouvé.</em>";
        return;
      }

      let html = `
        <div class="mb-2">
          <strong>Exercice :</strong> ${currentCode}<br/>
          <strong>Seed :</strong> ${seed || "?"}
        </div>
        <label class="text-xs text-gray-600 mb-1 block">Changer d’exercice :</label>
        <select id="exoSelect" class="border border-gray-300 rounded px-1 py-0.5 w-full">
          ${exerciseList
            .map(
              (e) =>
                `<option value="${e.code}" ${
                  e.code === currentCode ? "selected" : ""
                }>${e.code} - ${e.titre}</option>`
            )
            .join("")}
        </select>
      `;

      content.innerHTML = html;

      const select = content.querySelector("#exoSelect");
      select.addEventListener("change", (ev) => {
        const val = ev.target.value;
        if (typeof onExerciseChange === "function") onExerciseChange(val);
      });
    }
  };
}

// ==============================
// 🧾 Rendu des paramètres dynamiques
// ==============================
export function renderExerciseParameters(ex) {
  const container = document.getElementById("exerciseParameters");
  if (!container) return;
  container.innerHTML = "";

  let html = "";

  // afficher les besoins dynamiquement
  for (let i = 1; i <= 5; i++) {
    const base = i === 1 ? "" : i;
    const textKey = `besoinFormulaire${base}Texte`;
    const numericKey = `besoinFormulaire${base}Numerique`;
    const checkKey = `besoinFormulaire${base}CaseACocher`;

    if (ex[textKey]) {
      html += `<div class="mt-1 p-1 bg-gray-50 border rounded">
        <strong>${textKey}</strong> : ${ex[textKey]}
      </div>`;
    } else if (ex[numericKey]) {
      html += `<div class="mt-1 p-1 bg-gray-50 border rounded">
        <strong>${numericKey}</strong> : ${ex[numericKey]}
      </div>`;
    } else if (ex[checkKey]) {
      html += `<div class="mt-1 p-1 bg-gray-50 border rounded">
        <strong>${checkKey}</strong> : ${ex[checkKey]}
      </div>`;
    }
  }

  // afficher le commentaire et le seed
  if (ex.comment) html += `<div class="italic text-gray-600">${ex.comment}</div>`;
  if (ex.seed) html += `<div class="text-xs text-gray-500">Seed : ${ex.seed}</div>`;

  container.innerHTML = `<h3 class="text-sm font-bold mb-1">Paramètres de l’exercice</h3>${html}`;
}
