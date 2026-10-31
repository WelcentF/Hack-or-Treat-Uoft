// Mounts the Cursed words editor in an isolated Shadow DOM; text is provided by paste or typing.

(() => {
  const ROOT_ID = "ghostwriter-extension-root";
  const DEFAULT_SETTINGS = {
    enabled: true,
    personality: "grumpy",
    sound: false,
    tricks: true,
    trickFrequency: "normal"
  };
  const LOCAL_SUGGESTIONS = window.GhostwriterCursed;

  /**
   * @typedef {"CURSED_SYNONYMS"} GhostRequestType
   * @typedef {{type: "CURSED_SYNONYMS", requestId: string, payload: {word: string, sentence: string}}} GhostRequest
   * @typedef {{type: `${GhostRequestType}_RESULT`, requestId: string, ok: boolean, data?: object, error?: string}} GhostResponse
   */

  let settings = { ...DEFAULT_SETTINGS };
  let app = null;
  let openFog = new Set();
  let lastOutput = "";
  let capturedText = "";
  let replaceResult = "";
  let hasReplaceResult = false;
  let replacementRunning = false;
  let lastActivity = Date.now();
  let currentEvaluatedMood = null;
  let trickTimer = 0;
  let trickRunning = false;
  let lastKeystrokeAt = 0;
  let lastDocumentMouse = null;
  let trickListenersAttached = false;

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(label, className = "ghost-button", title = label) {
    const node = element("button", className, label);
    node.type = "button";
    node.title = title;
    return node;
  }

  function playSmokeEffect() {
    const rect = app.output.getBoundingClientRect();
    const anchor = { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    const effect = element("div", "smoke-effect");
    effect.setAttribute("aria-hidden", "true");
    const width = Math.min(Math.max(anchor.width, 120), Math.min(360, window.innerWidth - 24));
    effect.style.left = `${Math.max(8, Math.min(window.innerWidth - width - 8, anchor.left + (anchor.width - width) / 2))}px`;
    effect.style.top = `${Math.max(8, anchor.top + anchor.height / 2 - 35)}px`;
    effect.style.width = `${width}px`;
    for (let index = 0; index < 7; index += 1) {
      const puff = element("span", "smoke-puff");
      puff.style.setProperty("--smoke-x", `${8 + ((index * 37) % 84)}%`);
      puff.style.setProperty("--smoke-y", `${30 + ((index * 23) % 45)}%`);
      puff.style.setProperty("--smoke-delay", `${index * 55}ms`);
      puff.style.setProperty("--smoke-size", `${28 + ((index * 11) % 24)}px`);
      puff.style.setProperty("--smoke-drift", `${((index % 3) - 1) * 16}px`);
      effect.append(puff);
    }
    app.root.append(effect);
    window.setTimeout(() => effect.remove(), 1400);
  }

  function mount() {
    if (app) return;
    const host = element("div");
    host.id = ROOT_ID;
    const shadow = host.attachShadow({ mode: "open" });
    const styleLink = element("link");
    styleLink.rel = "stylesheet";
    styleLink.href = chrome.runtime.getURL("src/content/widget.css");
    shadow.append(styleLink);
    const ghostStyleLink = element("link");
    ghostStyleLink.rel = "stylesheet";
    ghostStyleLink.href = chrome.runtime.getURL("src/content/ghost.css");
    shadow.append(ghostStyleLink);

    const root = element("div", "ghostwriter-root");
    const ghost = element("div", "ghost mood-idle");
    ghost.setAttribute("role", "img");
    ghost.setAttribute("aria-label", "Ghostwriter, a grumpy writing editor");
    const bubble = element("div", "speech-bubble");
    bubble.hidden = true;
    const summon = button("", "summon-button", "Summon Ghostwriter");
    summon.append(ghost);
    const panel = element("section", "ghost-panel");
    panel.setAttribute("aria-label", "Ghostwriter writing editor");
    panel.hidden = true;

    const header = element("header", "panel-header");
    const headingBlock = element("div");
    headingBlock.append(element("h2", "", "Ghostwriter"), element("p", "subtitle", "Writing editor. Recently deceased."));
    const close = button("×", "close-button", "Close panel");
    header.append(headingBlock, close);

    const moodRow = element("div", "mood-row");
    moodRow.append(element("span", "", "Ghost approval"), element("div", "mood-track"));
    const meter = element("span", "mood-fill");
    meter.setAttribute("role", "meter");
    meter.setAttribute("aria-label", "Ghost approval");
    meter.setAttribute("aria-valuemin", "0");
    meter.setAttribute("aria-valuemax", "100");
    moodRow.querySelector(".mood-track").append(meter);
    const textLabel = element("label", "field-label", "Text to check or edit");
    textLabel.htmlFor = "ghostwriter-source";
    const source = element("textarea", "source-text");
    source.id = "ghostwriter-source";
    source.rows = 4;
    source.placeholder = "Paste or type text here…";
    source.setAttribute("aria-label", "Selected text to edit");
    const status = element("p", "status-message");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const cursedSection = element("section", "feature-section");
    cursedSection.dataset.section = "cursed";
    const cursedToolbar = element("div", "section-toolbar");
    cursedToolbar.append(element(
      "p",
      "section-intro",
      "Fog clouds mark filler words. Choose a suggestion or edit the passage, then send your revision to the Doc."
    ));
    const cursedView = element("div", "cursed-view");
    cursedView.setAttribute("aria-label", "Text with locally detected filler words fogged");
    cursedSection.append(cursedToolbar, cursedView);

    const outputLabel = element("label", "field-label output-label", "The ghost's revision");
    outputLabel.htmlFor = "ghostwriter-output";
    const output = element("div", "output-text");
    output.id = "ghostwriter-output";
    output.setAttribute("aria-live", "polite");
    output.textContent = "The results of my judgment shall appear here.";
    const editDisclaimer = element(
      "p",
      "edit-disclaimer",
      "Review the revision, then choose Exorcise words to update the captured passage. Replacement requires one unique match."
    );
    const footer = element("footer", "panel-footer");
    const copy = button("Copy result", "primary-button copy-button");
    copy.disabled = true;
    const replace = button("Exorcise words", "secondary-button replace-button");
    replace.disabled = true;
    footer.append(copy, button("Close", "text-button footer-close"), replace);

    panel.append(header, moodRow, textLabel, source, status,
      cursedSection, outputLabel, output, editDisclaimer, footer);
    root.append(summon, bubble, panel);
    shadow.append(root);
    document.documentElement.append(host);
    app = {
      host, shadow, root, ghost, bubble, summon, panel, meter, source, status,
      cursedSection, cursedView, output, copy, replace
    };
    app.replaceSound = new Audio(chrome.runtime.getURL("assets/sounds/ghost-woo.mp3"));
    app.replaceSound.preload = "auto";
    window.GhostwriterMood.init(ghost, bubble, () => settings);
    bindEvents();
    setupTrick();
    resetIdle();
    renderCursed();
  }

  function sayError(message) {
    app.status.textContent = message;
    window.setMood("sad", { say: false });
    app.bubble.textContent = message;
    app.bubble.className = "speech-bubble bubble-sad";
    app.bubble.hidden = false;
  }

  function setStatus(message) {
    app.status.textContent = message;
  }

  function renderRevision(text) {
    const outputTokens = text.match(/\s+|[\p{L}\p{N}'’-]+|[^\s\p{L}\p{N}'’-]+/gu) || [];
    const originalTokens = capturedText.match(/\s+|[\p{L}\p{N}'’-]+|[^\s\p{L}\p{N}'’-]+/gu) || [];
    const columns = outputTokens.length + 1;
    const cellCount = (originalTokens.length + 1) * columns;
    const changed = new Uint8Array(outputTokens.length);

    if (cellCount <= 400_000) {
      const lcs = new Uint32Array(cellCount);
      for (let originalIndex = originalTokens.length - 1; originalIndex >= 0; originalIndex -= 1) {
        const row = originalIndex * columns;
        const nextRow = row + columns;
        for (let outputIndex = outputTokens.length - 1; outputIndex >= 0; outputIndex -= 1) {
          lcs[row + outputIndex] = originalTokens[originalIndex] === outputTokens[outputIndex]
            ? lcs[nextRow + outputIndex + 1] + 1
            : Math.max(lcs[nextRow + outputIndex], lcs[row + outputIndex + 1]);
        }
      }

      let originalIndex = 0;
      let outputIndex = 0;
      while (outputIndex < outputTokens.length) {
        if (originalIndex < originalTokens.length
          && originalTokens[originalIndex] === outputTokens[outputIndex]) {
          originalIndex += 1;
          outputIndex += 1;
        } else if (originalIndex < originalTokens.length
          && (outputIndex === outputTokens.length
            || lcs[(originalIndex + 1) * columns + outputIndex] >= lcs[originalIndex * columns + outputIndex + 1])) {
          originalIndex += 1;
        } else {
          changed[outputIndex] = 1;
          outputIndex += 1;
        }
      }
    } else {
      let prefix = 0;
      while (prefix < originalTokens.length && prefix < outputTokens.length
        && originalTokens[prefix] === outputTokens[prefix]) prefix += 1;
      let suffix = 0;
      while (suffix < originalTokens.length - prefix && suffix < outputTokens.length - prefix
        && originalTokens[originalTokens.length - suffix - 1] === outputTokens[outputTokens.length - suffix - 1]) suffix += 1;
      for (let index = prefix; index < outputTokens.length - suffix; index += 1) changed[index] = 1;
    }

    app.output.replaceChildren();
    let index = 0;
    while (index < outputTokens.length) {
      const isChanged = changed[index] === 1;
      let end = index + 1;
      while (end < outputTokens.length && (changed[end] === 1) === isChanged) end += 1;
      const textNode = outputTokens.slice(index, end).join("");
      if (isChanged) app.output.append(element("span", "revision-changed", textNode));
      else app.output.append(document.createTextNode(textNode));
      index = end;
    }
  }

  function playReplaceSound() {
    try {
      app.replaceSound.currentTime = 0;
      void app.replaceSound.play().catch((error) => {
        console.warn("Ghostwriter could not play the replacement sound.", error);
      });
    } catch (error) {
      console.warn("Ghostwriter could not start the replacement sound.", error);
    }
  }

  function noteActivity() {
    lastActivity = Date.now();
    resetIdle();
  }

  function resetIdle() {
    window.GhostwriterMood.resetIdle(() => {
      if (!app) return;
      const mood = Date.now() - lastActivity >= 360000 ? "sleepy" : "bored";
      window.setMood(mood, { duration: 0 });
      resetIdle();
    });
  }

  function setMeter(score) {
    const bounded = Math.max(0, Math.min(100, Math.round(score)));
    const ratio = bounded / 100;
    const hue = Math.round(5 + 115 * ratio);
    const saturation = Math.round(45 + 26 * ratio);
    const lightness = Math.round(45 + 15 * ratio);
    app.meter.style.setProperty("--mood-color", `hsl(${hue} ${saturation}% ${lightness}%)`);
    app.meter.setAttribute("aria-valuenow", String(bounded));
  }

  function evaluateMood(cursedDensity) {
    const disapproval = Math.min(100, cursedDensity * 2500);
    setMeter(100 - disapproval);
    const threshold = 0.2;
    let targetMood;
    if (cursedDensity >= threshold * 1.65) {
      targetMood = "angry";
    } else if (cursedDensity >= threshold) {
      targetMood = "disgusted";
    } else {
      targetMood = "happy";
    }
    if (targetMood !== currentEvaluatedMood) {
      currentEvaluatedMood = targetMood;
      window.setMood(targetMood);
    }
  }

  function renderCursed() {
    if (!app) return;
    const text = app.source.value;
    const analysis = LOCAL_SUGGESTIONS.analyze(text);
    app.cursedView.replaceChildren();
    if (!text.trim()) {
      app.cursedView.append(element("p", "empty-state", "No text to haunt yet. Select a passage or paste it above."));
      setMeter(100);
      return;
    }
    let cursor = 0;
    for (const match of analysis.matches) {
      if (match.start > cursor) app.cursedView.append(document.createTextNode(text.slice(cursor, match.start)));
      const phrase = button("☁ Fogged", "fog-chip", `Reveal suggestion for “${match.word}”`);
      phrase.dataset.start = String(match.start);
      phrase.dataset.end = String(match.end);
      phrase.dataset.word = match.word;
      const key = `${match.start}:${match.end}`;
      if (openFog.has(key)) phrase.classList.add("revealed");
      app.cursedView.append(phrase);
      cursor = match.end;
    }
    if (cursor < text.length) app.cursedView.append(document.createTextNode(text.slice(cursor)));
    app.cursedView.querySelectorAll(".fog-chip").forEach((fog) => {
      fog.addEventListener("click", () => void revealFog(fog));
    });
    evaluateMood(analysis.density);
    setStatus(`${analysis.matches.length} cursed phrase${analysis.matches.length === 1 ? "" : "s"} found. Local scan; no key required.`);
  }

  function findSentence(text, start, end) {
    let left = start;
    while (left > 0 && !/[.!?\n]/.test(text[left - 1])) left -= 1;
    let right = end;
    while (right < text.length && !/[.!?\n]/.test(text[right])) right += 1;
    if (right < text.length && /[.!?]/.test(text[right])) right += 1;
    return text.slice(left, right).trim();
  }

  function renderSuggestions(container, suggestions, fog) {
    const suggestionBar = element("span", "suggestion-list");
    for (const suggestion of suggestions.slice(0, 3)) {
      const choice = button(suggestion, "suggestion-chip", `Replace with ${suggestion}`);
      choice.addEventListener("click", () => {
        if (replacementRunning) return;
        const text = app.source.value;
        const start = Number(fog.dataset.start);
        const end = Number(fog.dataset.end);
        app.source.value = LOCAL_SUGGESTIONS.replaceRange(text, start, end, suggestion)
          .replace(/[ \t]{2,}/g, " ")
          .replace(/\s+([,.!?;:])/g, "$1");
        openFog.clear();
        lastOutput = app.source.value;
        replaceResult = capturedText.trim() ? app.source.value : "";
        hasReplaceResult = true;
        app.copy.disabled = !lastOutput;
        renderRevision(lastOutput);
        container.classList.add("puff-out");
        window.setMood("smug");
        setStatus("Suggestion preview updated. Review it, then choose Exorcise words to apply it in Docs.");
        window.setTimeout(renderCursed, 280);
        updateReplaceButton();
      });
      suggestionBar.append(choice);
    }
    const reject = button("No, thanks", "reject-button");
    reject.addEventListener("click", () => {
      window.setMood("sad");
      setStatus("Your prose, your haunting. The suggestion is dismissed.");
      suggestionBar.remove();
    });
    suggestionBar.append(reject);
    container.after(suggestionBar);
  }

  async function revealFog(fog) {
    noteActivity();
    const key = `${fog.dataset.start}:${fog.dataset.end}`;
    if (openFog.has(key)) {
      window.setMood("suspicious");
      return;
    }
    const word = fog.dataset.word;
    const sentence = findSentence(app.source.value, Number(fog.dataset.start), Number(fog.dataset.end));
    openFog.add(key);
    fog.classList.add("revealed", "puff-out");
    window.setMood("suspicious");
    const waiting = element("span", "suggestion-list", "Conjuring alternatives…");
    fog.after(waiting);
    try {
      const result = await sendRequest("CURSED_SYNONYMS", { word, sentence });
      waiting.remove();
      renderSuggestions(fog, result.suggestions, fog);
    } catch (error) {
      waiting.remove();
      renderSuggestions(fog, LOCAL_SUGGESTIONS.suggestions(word), fog);
      sayError(error instanceof Error
        ? `${error.message} I have local suggestions, naturally.`
        : "The spirits are unavailable. I have local suggestions, naturally.");
    }
  }

  async function copyOutput() {
    if (!lastOutput) {
      setStatus("There is nothing to copy. My judgment is not a clipboard.");
      return;
    }
    try {
      await navigator.clipboard.writeText(lastOutput);
      setStatus("Copied. Paste into Docs with Ctrl+V or Command+V.");
    } catch {
      sayError("Clipboard access failed. Select the result and copy it manually.");
    }
  }

  function updateReplaceButton() {
    if (!app) return;
    const hasOriginal = Boolean(capturedText.trim());
    const hasReplacement = hasReplaceResult;
    const unchanged = hasOriginal && hasReplacement && capturedText === replaceResult;
    app.replace.disabled = replacementRunning || !hasOriginal || !hasReplacement || unchanged;
    app.replace.title = !hasOriginal
      ? "Capture the original passage from Docs first."
      : !hasReplacement
        ? "Choose a suggestion or edit the captured text first."
        : unchanged
          ? "The proposed text is unchanged."
          : "Exorcise the captured passage in Docs. Requires authorization and one unique match.";
  }

  async function applyRevisionToDoc() {
    if (replacementRunning) return false;
    if (!capturedText.trim() || !hasReplaceResult) {
      setStatus("The revision is ready in the panel, but I need the original captured passage to update the Doc. Copy the result and paste it manually.");
      return false;
    }
    if (capturedText === replaceResult) {
      setStatus("The text is unchanged, so there is nothing to replace.");
      return false;
    }

    replacementRunning = true;
    app.source.disabled = true;
    updateReplaceButton();
    playSmokeEffect();
    setStatus("Replacing the captured passage if it has one unique match in the Doc…");
    try {
      const result = await sendRequest("REPLACE_DOC_SELECTION", {
        selectedText: capturedText,
        replacement: replaceResult
      });
      capturedText = replaceResult;
      app.source.value = capturedText;
      lastOutput = capturedText;
      renderRevision(lastOutput);
      replaceResult = "";
      hasReplaceResult = false;
      updateReplaceButton();
      setStatus(result.message || "The selected text was replaced in Google Docs. You can keep editing this passage.");
      window.setMood("happy", { say: "A rare case of useful meddling." });
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The Doc replacement failed. Nothing was changed.";
      sayError(`${message} Copy the result and paste it manually if needed.`);
      return false;
    } finally {
      replacementRunning = false;
      app.source.disabled = false;
      updateReplaceButton();
    }
  }

  function sendRequest(type, payload) {
    const requestId = crypto.randomUUID();
    return chrome.runtime.sendMessage({ type, requestId, payload }).then((response) => {
      if (response?.type !== `${type}_RESULT` || response.requestId && response.requestId !== requestId) {
        throw new Error("The spirit sent an unfamiliar reply. Reload the extension and try again.");
      }
      if (!response.ok) throw new Error(response.error || "The spirit refused to answer.");
      return response.data;
    });
  }

  function getWritingSpot() {
    for (const selector of [".kix-cursor", ".kix-cursor-caret"]) {
      try {
        const rect = document.querySelector(selector)?.getBoundingClientRect();
        if (rect && (rect.width > 0 || rect.height > 0)) {
          return { x: rect.left + rect.width / 2, y: rect.top };
        }
      } catch { /* Docs' private cursor markup can change; continue to the next fallback. */ }
    }

    try {
      const selection = window.getSelection();
      if (selection?.rangeCount) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        if (rect && rect.width > 0 && rect.height > 0) {
          return { x: rect.left + rect.width / 2, y: rect.top };
        }
      }
    } catch { /* Google Docs may not expose a usable DOM selection. */ }

    if (lastDocumentMouse) return { ...lastDocumentMouse };

    try {
      const editor = document.querySelector(".kix-appview-editor");
      const rect = editor?.getBoundingClientRect();
      if (rect && rect.width > 0 && rect.height > 0) {
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      }
    } catch { /* Fall through to the viewport center. */ }
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  function trickAllowed() {
    return Boolean(
      app
      && settings.enabled
      && settings.tricks
      && app.panel.hidden
      && !document.hidden
    );
  }

  function clearTrickTimer() {
    window.clearTimeout(trickTimer);
    trickTimer = 0;
  }

  function scheduleTrickTimer(delayOverride = null) {
    clearTrickTimer();
    if (!trickAllowed() || trickRunning) return;
    const ranges = {
      rare: [90000, 120000],
      normal: [45000, 120000],
      chaotic: [45000, 70000]
    };
    const [minimum, maximum] = ranges[settings.trickFrequency] || ranges.normal;
    const delay = delayOverride ?? minimum + Math.random() * (maximum - minimum);
    trickTimer = window.setTimeout(() => {
      trickTimer = 0;
      if (!trickAllowed()) {
        scheduleTrickTimer();
        return;
      }
      const quietTime = Date.now() - lastKeystrokeAt;
      if (quietTime < 10000) {
        scheduleTrickTimer(10000 - quietTime + 1200 + Math.random() * 2500);
        return;
      }
      const kinds = ["fly-by", "hover", "peek"];
      const trick = Math.random() < 0.55 ? "hover" : kinds[Math.floor(Math.random() * kinds.length)];
      trickRunning = true;
      void window.GhostwriterMood.playTrick(trick, { getWritingSpot })
        .catch(() => sayError("My trick misfired. A most embarrassing haunting."))
        .finally(() => {
          trickRunning = false;
          scheduleTrickTimer();
        });
    }, delay);
  }

  function cancelRunningTrick(force = false) {
    if (!force && window.GhostwriterMood.isFlightActive()) return;
    if (!trickRunning && !window.GhostwriterMood.isTrickActive()) return;
    void window.GhostwriterMood.cancelTrick(true);
  }

  function onTrickKeydown() {
    lastKeystrokeAt = Date.now();
    cancelRunningTrick();
  }

  function onTrickPointerdown() {
    cancelRunningTrick();
  }

  function onDocumentMousemove(event) {
    try {
      const editor = document.querySelector(".kix-appview-editor");
      if (editor?.contains(event.target)) {
        lastDocumentMouse = { x: event.clientX, y: event.clientY };
      }
    } catch { /* Ignore Docs markup changes; other position fallbacks remain available. */ }
  }

  function setupTrick() {
    if (!trickListenersAttached) {
      document.addEventListener("keydown", onTrickKeydown, true);
      document.addEventListener("pointerdown", onTrickPointerdown, true);
      document.addEventListener("mousemove", onDocumentMousemove, { passive: true });
      document.addEventListener("visibilitychange", onTrickVisibilityChange);
      window.getWritingSpot = getWritingSpot;
      trickListenersAttached = true;
    }
    scheduleTrickTimer();
  }

  function onTrickVisibilityChange() {
    if (document.hidden) clearTrickTimer();
    else scheduleTrickTimer();
  }

  function setPanelOpen(open) {
    app.panel.hidden = !open;
    if (open) {
      clearTrickTimer();
      if (window.GhostwriterMood.isFlightActive()) void window.GhostwriterMood.stopFlight();
      window.setMood("idle");
      app.source.focus();
    } else {
      scheduleTrickTimer();
    }
  }

  function bindEvents() {
    app.summon.addEventListener("click", () => {
      if (app.summon.dataset.dragged === "true") {
        app.summon.dataset.dragged = "false";
        return;
      }
      setPanelOpen(app.panel.hidden);
      noteActivity();
    });
    app.summon.addEventListener("pointerdown", (event) => {
      if (event.button !== 0) return;
      const rect = app.summon.getBoundingClientRect();
      app.summon.dataset.dragX = String(event.clientX - rect.left);
      app.summon.dataset.dragY = String(event.clientY - rect.top);
      app.summon.dataset.moved = "false";
      app.summon.setPointerCapture(event.pointerId);
    });
    app.summon.addEventListener("pointermove", (event) => {
      if (!app.summon.hasPointerCapture(event.pointerId) || !app.summon.dataset.dragX) return;
      const x = event.clientX - Number(app.summon.dataset.dragX);
      const y = event.clientY - Number(app.summon.dataset.dragY);
      if (Math.abs(event.movementX) + Math.abs(event.movementY) > 2) app.summon.dataset.moved = "true";
      if (app.summon.dataset.moved === "true") {
        app.summon.style.left = `${Math.max(4, Math.min(innerWidth - 80, x))}px`;
        app.summon.style.top = `${Math.max(4, Math.min(innerHeight - 100, y))}px`;
        app.summon.style.right = "auto";
        app.summon.style.bottom = "auto";
      }
    });
    app.summon.addEventListener("pointerup", () => {
      if (app.summon.dataset.moved === "true") app.summon.dataset.dragged = "true";
      app.summon.dataset.dragX = "";
      app.summon.dataset.dragY = "";
    });
    app.root.querySelector(".close-button").addEventListener("click", () => setPanelOpen(false));
    app.root.querySelector(".footer-close").addEventListener("click", () => setPanelOpen(false));
    app.source.addEventListener("input", () => {
      if (capturedText.trim()) {
        replaceResult = app.source.value;
        hasReplaceResult = true;
        lastOutput = replaceResult;
        if (replaceResult) renderRevision(replaceResult);
        else app.output.textContent = "The results of my judgment shall appear here.";
        app.copy.disabled = !lastOutput;
      } else {
        lastOutput = "";
        replaceResult = "";
        hasReplaceResult = false;
        app.copy.disabled = true;
      }
      openFog.clear();
      renderCursed();
      updateReplaceButton();
      noteActivity();
    });
    app.source.addEventListener("paste", () => {
      const previousText = app.source.value;
      const selectionStart = app.source.selectionStart;
      const selectionEnd = app.source.selectionEnd;
      const replacesWholePassage = !previousText.trim()
        || (selectionStart === 0 && selectionEnd === previousText.length);
      window.setTimeout(() => {
        if (!replacesWholePassage || !app.source.value.trim()) return;
        capturedText = app.source.value;
        replaceResult = "";
        hasReplaceResult = false;
        lastOutput = "";
        app.output.textContent = "The results of my judgment shall appear here.";
        app.copy.disabled = true;
        updateReplaceButton();
        openFog.clear();
        renderCursed();
        setStatus("Pasted passage set as the new source. Edit it or choose a Cursed words action, then choose Exorcise words.");
      }, 0);
    });
    app.copy.addEventListener("click", () => void copyOutput());
    app.replace.addEventListener("click", () => {
      playReplaceSound();
      void applyRevisionToDoc();
    });
    app.root.addEventListener("pointerdown", noteActivity, { passive: true });
  }

  async function loadSettings() {
    const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    settings = {
      enabled: stored.enabled !== false,
      personality: ["grumpy", "sweet", "sarcastic"].includes(stored.personality) ? stored.personality : "grumpy",
      sound: stored.sound === true,
      tricks: stored.tricks !== false,
      trickFrequency: ["rare", "normal", "chaotic"].includes(stored.trickFrequency)
        ? stored.trickFrequency
        : "normal"
    };
    if (settings.enabled) mount();
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message?.type === "GET_FLIGHT_STATUS") {
      sendResponse({
        ok: true,
        enabled: settings.enabled,
        tricksEnabled: settings.tricks,
        running: window.GhostwriterMood.isFlightActive()
      });
      return false;
    }

    if (message?.type === "TOGGLE_CONTINUOUS_FLIGHT") {
      if (!settings.enabled || !settings.tricks) {
        sendResponse({ ok: false, error: "I am dismissed or Tricks are off. Enable me in the settings lair." });
        return false;
      }
      if (window.GhostwriterMood.isFlightActive()) {
        void window.GhostwriterMood.stopFlight().then(() => {
          trickRunning = false;
          sendResponse({ ok: true, running: false });
          scheduleTrickTimer();
        }).catch(() => {
          sendResponse({ ok: false, error: "I could not return to my corner. Refresh the Doc and try again." });
        });
        return true;
      }
      if (trickRunning) {
        sendResponse({ ok: false, error: "I am occupied with another haunting. Try again in a moment." });
        return false;
      }
      if (!app) mount();
      if (!app) {
        sendResponse({ ok: false, error: "I could not find my Doc-side apparition. Refresh the document." });
        return false;
      }
      setPanelOpen(false);
      clearTrickTimer();
      trickRunning = true;
      void window.GhostwriterMood.startFlight()
        .catch(() => sayError("My flight path collapsed. Refresh the Doc and try again."))
        .finally(() => {
          trickRunning = false;
          scheduleTrickTimer();
        });
      sendResponse({ ok: true, running: true });
      return false;
    }

    if (message?.type !== "OPEN_AND_CAPTURE") return false;
    if (!app && settings.enabled) mount();
    if (!app) return false;
    app.panel.hidden = false;
    clearTrickTimer();
    window.setMood("mischievous");
    setStatus("Paste your selected text here to begin.");
    app.source.focus();
    return false;
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.enabled) {
      settings.enabled = changes.enabled.newValue !== false;
      if (settings.enabled) mount();
      else if (app) {
        clearTrickTimer();
        cancelRunningTrick(true);
        document.removeEventListener("keydown", onTrickKeydown, true);
        document.removeEventListener("pointerdown", onTrickPointerdown, true);
        document.removeEventListener("mousemove", onDocumentMousemove);
        document.removeEventListener("visibilitychange", onTrickVisibilityChange);
        trickListenersAttached = false;
        app.host.remove();
        app = null;
      }
    }
    for (const key of ["personality", "sound", "tricks", "trickFrequency"]) {
      if (changes[key]) settings[key] = changes[key].newValue;
    }
    if (changes.tricks || changes.trickFrequency) {
      if (!settings.tricks) {
        clearTrickTimer();
        cancelRunningTrick(true);
      } else {
        scheduleTrickTimer();
      }
    }
  });

  void loadSettings().catch(() => {
    settings = { ...DEFAULT_SETTINGS };
    mount();
    sayError("I could not read my preferences. The default haunting is in effect.");
  });
})();
