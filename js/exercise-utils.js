// ==============================
// 📘 exercise-utils.js
// ==============================

// 🧮 --- Rendu KaTeX propre ---
export function renderKaTeX(container, attempt = 0) {
  if (!container) {
    console.warn("⚠️ Container KaTeX manquant.");
    return;
  }

  const katexReady =
    typeof window !== "undefined" &&
    window.katex &&
    typeof window.renderMathInElement === "function";

  if (!katexReady) {
    if (attempt < 10) {
      window.setTimeout(() => renderKaTeX(container, attempt + 1), 100);
    } else {
      console.warn("⚠️ KaTeX n'est pas prêt après plusieurs tentatives.");
    }
    return;
  }

  try {
    window.renderMathInElement(container, {
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
// 🔤 Normalisation du LaTeX résiduel
// ==============================
export function normalizeLegacyLatex(content = "", depth = 0) {
  if (!content) return "";
  if (depth > 10) return content;

  const normalizeNested = (value) =>
    value && value.trim() !== "" ? normalizeLegacyLatex(value, depth + 1) : "";

  const applyInlineReplacements = (source) => {
    let result = source;

    const inlineMap = [
      { regex: /\\textbf\{([^}]*)\}/gi, replace: "<strong>$1</strong>" },
      { regex: /\\textit\{([^}]*)\}/gi, replace: "<em>$1</em>" },
      { regex: /\\emph\{([^}]*)\}/gi, replace: "<em>$1</em>" }
    ];

    inlineMap.forEach(({ regex, replace }) => {
      result = result.replace(regex, replace);
    });

    return result;
  };

  const convertListEnv = (source, env, tag, className) =>
    source.replace(
      new RegExp(`\\\\begin\\{${env}\\}([\\s\\S]*?)\\\\end\\{${env}\\}`, "gi"),
      (_, inner) => {
        const cleaned = inner
          .replace(/\\\\begin\\{spacing\\}\\{[^}]*\\}/gi, "")
          .replace(/\\\\end\\{spacing\\}/gi, "")
          .trim();
        const items = cleaned
          .split(/\\\\item\s*/gi)
          .map((item) => item.trim())
          .filter(Boolean);
        if (!items.length) {
          return `<${tag} class="${className}"></${tag}>`;
        }
        const listItems = items
          .map((item) => `<li>${normalizeNested(item)}</li>`)
          .join("");
        return `<${tag} class="${className}">${listItems}</${tag}>`;
      }
    );

  const convertMultiColumns = (source) =>
    source.replace(
      /\\begin\{multicols\}\{(\d+)\}([\s\S]*?)\\end\{multicols\}/gi,
      (_, count, inner) => {
        const cols = Math.max(1, parseInt(count, 10) || 1);
        const normalizedInner = normalizeNested(inner.trim());
        return `<div class="legacy-multicols legacy-cols-${cols}">${normalizedInner}</div>`;
      }
    );
  
    const convertSpacingEnv = (source) =>
    source.replace(
      /\\begin\{spacing\}\{([^}]*)\}([\s\S]*?)\\end\{spacing\}/gi,
      (_, ratio, inner) => {
        const sanitizedRatio = String(ratio ?? "")
          .trim()
          .replace(/[^0-9.,-]/g, "")
          .replace(",", ".");
        const numericRatio = parseFloat(sanitizedRatio);
        const attrParts = [];
        if (sanitizedRatio) attrParts.push(`data-spacing="${sanitizedRatio}"`);
        if (Number.isFinite(numericRatio) && numericRatio > 0) {
          attrParts.push(`style="line-height:${numericRatio};"`);
        }
        const attrString = attrParts.length ? ` ${attrParts.join(" ")}` : "";

        const segments = inner.split(/\\item\s*/gi);
        const prelude = segments.shift()?.trim() ?? "";
        const items = segments
          .map((segment) => segment.trim())
          .filter(Boolean)
          .map((segment) => `<li>${normalizeNested(segment)}</li>`);

        if (items.length) {
          const listMarkup = `<ul class="legacy-spacing legacy-spacing-list"${attrString}>${items.join(
            ""
          )}</ul>`;

          if (prelude) {
            const normalizedPrelude = normalizeNested(prelude);
            return `<div class="legacy-spacing"${attrString}><div class="legacy-spacing-intro">${normalizedPrelude}</div>${listMarkup}</div>`;
          }

          return listMarkup;
        }

        const normalizedInner = normalizeNested(inner.trim());
        return `<div class="legacy-spacing"${attrString}>${normalizedInner}</div>`;
      }
    );

  let html = content;
  html = applyInlineReplacements(html);
  html = convertMultiColumns(html);
  html = convertListEnv(html, "enumerate", "ol", "list-decimal ml-6 space-y-1");
  html = convertListEnv(html, "itemize", "ul", "list-disc ml-6 space-y-1");

  html = convertSpacingEnv(html);

  const skipTokens = [
    { regex: /\\medskip/gi, replace: '<div class="legacy-skip legacy-skip-medium"></div>' },
    { regex: /\\smallskip/gi, replace: '<div class="legacy-skip legacy-skip-small"></div>' },
    { regex: /\\bigskip/gi, replace: '<div class="legacy-skip legacy-skip-large"></div>' }
  ];

  skipTokens.forEach(({ regex, replace }) => {
    html = html.replace(regex, replace);
  });

  html = html.replace(/\\marginpar\{([\\s\\S]*?)\}/gi, (_, inner) => {
    const cleaned = inner.replace(/\\footnotesize\s*/gi, "").trim();
    if (!cleaned) return "";
    const normalizedNote = normalizeNested(cleaned);
    return `<span class="legacy-margin-note">${normalizedNote}</span>`;
  });

  html = html.replace(/\\newline/gi, "<br>");
  html = html.replace(/\\newpage/gi, '<hr class="legacy-page-break">');
  html = html.replace(/\\noindent\s*/gi, "");
  html = html.replace(/\\hfill/gi, '<span class="legacy-hfill"></span>');

  html = html.replace(/\\footnotesize\s*/gi, "");

  html = html.replace(/\\\\item\s*/gi, '<br><span class="legacy-item-bullet">•</span> ');

  html = html.replace(/\\columnbreak/gi, '<span class="legacy-column-break"></span>');

  html = html.replace(
    /\\\\(?!begin|end|item|\[|\(|frac|dfrac|text|mathrm|mathbf|mathbb|left|right|overline|underline|hat|bar|cdot|times)/gi,
    "<br>"
  );

  return html;
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
            .map((e) => {
              const resolvedCode = e.resolvedCode || e.code || "";
              const originalCode = e.code;
              const labelCode = resolvedCode || originalCode || "?";
              const legacyInfo =
                originalCode && originalCode !== resolvedCode
                  ? ` (ancien : ${originalCode})`
                  : "";
              const titre = e.titre || "Sans titre";
              const isSelected = resolvedCode === currentCode || originalCode === currentCode;
              const selectedAttr = isSelected ? "selected" : "";
              return `<option value="${resolvedCode}" ${selectedAttr}>${labelCode}${legacyInfo} - ${titre}</option>`;
            })
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
export function renderExerciseParameters(ex, { onApply } = {}) {
  const container = document.getElementById("exerciseParameters");
  if (!container) return;

  const parameterKeys = Object.keys(ex || {})
    .filter((key) => key.startsWith("besoinFormulaire") && ex[key])
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  const escapeHtml = (value) =>
    String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");

  const formatText = (value) => escapeHtml(value).replace(/\n/g, "<br>");

  const fields = parameterKeys.map((key) => {
    const match = key.match(/^besoinFormulaire(\d*)(Texte|Numerique|CaseACocher)/i);
    const indexRaw = match ? match[1] : "";
    const displayIndex = indexRaw || "1";
    const type = match ? match[2] : "Texte";
    const rawValue = ex[key];

    const supKey = match ? (indexRaw ? `sup${indexRaw}` : "sup") : null;
    const hasSup = supKey ? Object.prototype.hasOwnProperty.call(ex, supKey) : false;
    const supValue = hasSup ? ex[supKey] : undefined;

    let value = "";
    let helper = "";
    let label = `Paramètre ${displayIndex || ""}`.trim();

    if (Array.isArray(rawValue)) {
      if (/CaseACocher$/i.test(key)) {
        label = typeof rawValue[0] === "string" ? rawValue[0] : label;
        const boolEntry = rawValue.find((entry) => typeof entry === "boolean");
        const defaultBool = typeof boolEntry === "boolean" ? boolEntry : Boolean(rawValue[1]);
        value = hasSup && typeof supValue === "boolean" ? supValue : defaultBool;
        helper = rawValue.find((entry, idx) => idx > 0 && typeof entry === "string") || "";
      } else {
        const defaultValue = rawValue[0] ?? "";
        helper = typeof rawValue[1] === "string" ? rawValue[1] : "";
        value = hasSup && supValue !== undefined && supValue !== null ? supValue : defaultValue;
      }
    } else if (typeof rawValue === "boolean") {
      value = hasSup && typeof supValue === "boolean" ? supValue : rawValue;
    } else {
      value = hasSup && supValue !== undefined && supValue !== null ? supValue : rawValue ?? "";
    }

    const targetKey = supKey || key;
    
    return {
      key,
      type,
      value,
      helper,
      label,
      match,
      supKey,
      targetKey: supKey || key,
      supKey,
      targetKey,
      defaultValue: Array.isArray(rawValue) ? rawValue[0] : rawValue
    };
  });

  const formFieldsHtml = fields
    .map((field) => {
      const baseName = escapeHtml(field.key);
      const helperHtml = field.helper
        ? `<p class="text-xs text-gray-500 mt-1">${formatText(field.helper)}</p>`
        : "";

      if (/CaseACocher$/i.test(field.key)) {
        const checkedAttr = field.value ? "checked" : "";
        return `
          <label class="flex items-start gap-2 text-sm font-medium text-gray-700">
            <input
              type="checkbox"
              name="${baseName}"
              class="mt-1 h-4 w-4 text-blue-600 border-gray-300 rounded"
              ${checkedAttr}
            />
            <span class="flex-1">
              ${formatText(field.label)}
              ${helperHtml}
            </span>
          </label>
        `;
      }

      const inputType = /Numerique$/i.test(field.key) ? "number" : "text";
      const placeholderSource = field.helper
        ? field.helper
        : typeof field.defaultValue === "string" && (field.value === "" || field.value === null)
        ? field.defaultValue
        : "";
      const placeholderAttr = placeholderSource
        ? `placeholder="${escapeHtml(placeholderSource)}"`
        : "";
      const valueAttr =
        field.value === undefined || field.value === null || field.value === ""
          ? ""
          : `value="${escapeHtml(field.value)}"`;
      return `
        <label class="block text-sm">
          <span class="font-medium text-gray-700">${formatText(field.label)}</span>
          <input
            type="${inputType}"
            name="${baseName}"
            ${valueAttr}
            ${placeholderAttr}
            class="mt-1 w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          ${helperHtml}
        </label>
      `;
    })
    .join("\n");

  const commentHtml = ex.comment
    ? `<p class="text-xs text-gray-500 italic">${formatText(ex.comment)}</p>`
    : "";
  const seedHtml = ex.seed
    ? `<p class="text-[11px] text-gray-400">Seed actuel : <code>${escapeHtml(ex.seed)}</code></p>`
    : "";

  const hasParameters = fields.length > 0;

  container.innerHTML = `
    <div class="bg-white border border-gray-200 rounded-lg shadow-sm p-4 space-y-3">
      <div class="flex items-center justify-between">
        <h3 class="text-base font-semibold text-gray-800">Paramètres de l’exercice</h3>
        ${seedHtml}
      </div>
      ${commentHtml}
      ${hasParameters
        ? `<form id="exerciseParametersForm" class="space-y-3">
            ${formFieldsHtml}
            <div class="pt-2 border-t border-gray-200 flex justify-end">
              <button
                type="submit"
                class="inline-flex items-center gap-2 rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
              >
                🔄 Recharger avec ces paramètres
              </button>
            </div>
          </form>`
        : `<p class="text-sm text-gray-500">Aucun paramètre configurable pour cet exercice.</p>`}
    </div>
  `;

  if (hasParameters && typeof onApply === "function") {
    const form = container.querySelector("#exerciseParametersForm");
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const overrides = {};

      fields.forEach((field) => {
        const namedItem = form.elements.namedItem(field.key);
        const input =
          namedItem instanceof RadioNodeList ? namedItem[0] : namedItem;
        if (!(input instanceof HTMLInputElement)) return;

        const overrideKey = field.targetKey;

        if (/CaseACocher$/i.test(field.key)) {
          overrides[overrideKey] = input.checked;
        } else if (/Numerique$/i.test(field.key)) {
          const numericValue = input.value.trim();
          const parsed = Number(numericValue);
          overrides[overrideKey] = numericValue === "" ? "" : Number.isFinite(parsed) ? parsed : numericValue;
        } else {
          overrides[overrideKey] = input.value;
        }
      });

      onApply(overrides);
    });
  }
}
