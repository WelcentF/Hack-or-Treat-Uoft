// Mounts Ghostwriter in an isolated Shadow DOM; selection is clipboard-based and all erasing is visual.

(() => {
  const ROOT_ID = "ghostwriter-extension-root";
  const DEFAULT_SETTINGS = {
    enabled: true,
    personality: "grumpy",
    difficulty: "friendly",
    sound: false
  };
  const VOICE_OPTIONS = window.GhostwriterSeance.VOICES;
  const LOCAL_SUGGESTIONS = window.GhostwriterCursed;
  const POSSESSION = window.GhostwriterPossession;

  /**
   * @typedef {"CURSED_SYNONYMS" | "SEANCE" | "POSSESSION_SCORE" | "EXORCISE"} GhostRequestType
   * @typedef {{type: "CURSED_SYNONYMS", requestId: string, payload: {word: string, sentence: string}}
   *   | {type: "SEANCE", requestId: string, payload: {text: string, style: string}}
   *   | {type: "POSSESSION_SCORE", requestId: string, payload: {sentence: string}}
   *   | {type: "EXORCISE", requestId: string, payload: {sentence: string}}} GhostRequest
   * @typedef {{type: `${GhostRequestType}_RESULT`, requestId: string, ok: boolean, data?: object, error?: string}} GhostResponse
   */

  let settings = { ...DEFAULT_SETTINGS };
  let app = null;
  let openFog = new Set();
  let lastOutput = "";
  let lastActivity = Date.now();
  let currentEvaluatedMood = null;

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

  function makeGhostSvg() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 120 135");
    svg.setAttribute("class", "ghost-svg");
    svg.setAttribute("role", "img");
    svg.setAttribute("aria-label", "A dramatic writing-editor ghost");
    svg.innerHTML = `
      <defs>
        <linearGradient id="ghost-body" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stop-color="#fff"/>
          <stop offset="1" stop-color="#dcd9ff"/>
        </linearGradient>
        <filter id="ghost-shadow" x="-30%" y="-30%" width="160%" height="170%">
          <feDropShadow dx="0" dy="5" stdDeviation="4" flood-color="#4f3ab2" flood-opacity=".28"/>
        </filter>
      </defs>
      <g class="ghost-body" filter="url(#ghost-shadow)">
        <path d="M17 120V58C17 31 36 11 60 11s43 20 43 47v62l-14-10-14 11-15-11-15 11-14-11z"
          fill="url(#ghost-body)" stroke="#bdb5f4" stroke-width="3" stroke-linejoin="round"/>
        <g class="face brows">
          <path d="M34 47l17 5M69 52l17-5" fill="none" stroke="#514d70" stroke-width="5" stroke-linecap="round"/>
        </g>
        <g class="face eyes">
          <ellipse class="eye-left" cx="43" cy="63" rx="8" ry="11" fill="#28243c"/>
          <ellipse class="eye-right" cx="76" cy="63" rx="8" ry="11" fill="#28243c"/>
          <circle class="eye-glint" cx="46" cy="59" r="2.6" fill="#fff"/>
          <circle class="eye-glint" cx="79" cy="59" r="2.6" fill="#fff"/>
          <path class="closed-eyes" d="M35 64q8 8 16 0m17 0q8 8 16 0" fill="none" stroke="#28243c" stroke-width="4" stroke-linecap="round"/>
          <path class="star-eyes" d="M43 52l3 7 7 1-5 5 1 7-6-4-6 4 2-7-5-5 7-1zm33 0 3 7 7 1-5 5 1 7-6-4-6 4 2-7-5-5 7-1z" fill="#8a6cff"/>
          <path class="steam" d="M40 43q-6-8 0-13m17 13q-6-8 0-13m17 13q-6-8 0-13" fill="none" stroke="#ee8171" stroke-width="3" stroke-linecap="round"/>
          <path class="zzz" d="M82 34h12l-12 11h12" fill="none" stroke="#7464c4" stroke-width="3" stroke-linejoin="round"/>
        </g>
        <g class="face mouth">
          <path class="mouth-line" d="M47 84q13 8 26 0" fill="none" stroke="#514d70" stroke-width="4" stroke-linecap="round"/>
          <ellipse class="mouth-open" cx="60" cy="87" rx="8" ry="12" fill="#493b63"/>
          <path class="tongue" d="M55 94q5-7 10 0v7q-5 5-10 0z" fill="#ee7895"/>
          <path class="smirk" d="M47 88q16 4 28-8" fill="none" stroke="#514d70" stroke-width="4" stroke-linecap="round"/>
        </g>
        <path class="tear" d="M82 71q-7 10 0 13 7-3 0-13" fill="#83d8ff"/>
        <g class="sparkles" fill="#ffe071">
          <path d="M13 30l3 8 8 3-8 3-3 8-3-8-8-3 8-3zm96 16l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>
        </g>
        <g class="candle candle-left"><path d="M5 89h10v25H5z" fill="#7564c4"/><path d="M10 72q-8 12 0 17 8-5 0-17" fill="#ffc85c"/></g>
        <g class="candle candle-right"><path d="M105 89h10v25h-10z" fill="#7564c4"/><path d="M110 72q-8 12 0 17 8-5 0-17" fill="#ffc85c"/></g>
      </g>`;
    return svg;
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

    const root = element("div", "ghostwriter-root");
    const dimmer = element("div", "seance-dimmer");
    dimmer.setAttribute("aria-hidden", "true");
    const flyby = element("div", "trick-flyby");
    flyby.setAttribute("aria-hidden", "true");
    const ghost = element("div", "ghost mood-idle");
    ghost.append(makeGhostSvg());
    const bubble = element("div", "speech-bubble");
    bubble.hidden = true;
    const summon = button("", "summon-button", "Summon Ghostwriter");
    summon.append(ghost);
    const cobweb = element("div", "cobweb", "✳");
    cobweb.hidden = true;
    const panel = element("section", "ghost-panel");
    panel.setAttribute("aria-label", "Ghostwriter writing editor");
    panel.hidden = true;

    const header = element("header", "panel-header");
    const headingBlock = element("div");
    headingBlock.append(element("h2", "", "Ghostwriter"), element("p", "subtitle", "Writing editor. Recently deceased."));
    const close = button("×", "close-button", "Close panel");
    header.append(headingBlock, close);

    const moodRow = element("div", "mood-row");
    moodRow.append(element("span", "", "Ghostly disapproval"), element("div", "mood-track"));
    const meter = element("span", "mood-fill");
    moodRow.querySelector(".mood-track").append(meter);
    const nav = element("nav", "feature-tabs");
    nav.setAttribute("aria-label", "Editing features");
    const tabNames = [
      ["cursed", "Cursed words"],
      ["possession", "Robotic aura"],
      ["seance", "Séance"]
    ];
    const tabButtons = {};
    for (const [id, label] of tabNames) {
      const tab = button(label, "tab-button");
      tab.dataset.tab = id;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-selected", id === "cursed" ? "true" : "false");
      tabButtons[id] = tab;
      nav.append(tab);
    }

    const capture = button("Copy my selected text", "secondary-button capture-button");
    const textLabel = element("label", "field-label", "The evidence (edit freely)");
    textLabel.htmlFor = "ghostwriter-source";
    const source = element("textarea", "source-text");
    source.id = "ghostwriter-source";
    source.rows = 4;
    source.placeholder = "Paste text here if the ghost cannot capture it…";
    source.setAttribute("aria-label", "Selected text to edit");
    const status = element("p", "status-message");
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");

    const cursedSection = element("section", "feature-section");
    cursedSection.dataset.section = "cursed";
    const cursedToolbar = element("div", "section-toolbar");
    cursedToolbar.append(element("p", "section-intro", "Tap a fog cloud. I have hidden a better word there."));
    const exorcism = button("Exorcism: remove all", "secondary-button exorcism-button");
    cursedToolbar.append(exorcism);
    const cursedView = element("div", "cursed-view");
    cursedView.setAttribute("aria-label", "Text with locally detected filler words fogged");
    cursedSection.append(cursedToolbar, cursedView);

    const possessionSection = element("section", "feature-section");
    possessionSection.dataset.section = "possession";
    possessionSection.hidden = true;
    possessionSection.append(
      element("p", "section-intro", "A robotic aura check. Detection is a guess, not proof."),
      element("p", "honesty-disclaimer", "Style signals are unreliable and never establish who wrote this."),
      button("Scan for robotic aura", "primary-button scan-button")
    );
    const scanBeam = element("div", "scan-beam");
    possessionSection.append(scanBeam);
    const possessionResults = element("div", "possession-results");
    possessionSection.append(possessionResults);

    const seanceSection = element("section", "feature-section");
    seanceSection.dataset.section = "seance";
    seanceSection.hidden = true;
    seanceSection.append(element("p", "section-intro", "Borrow a voice. Keep your facts; the dead have enough of their own."));
    const voiceLabel = element("label", "field-label", "Choose a spirit");
    voiceLabel.htmlFor = "ghostwriter-voice";
    const voiceSelect = element("select", "voice-select");
    voiceSelect.id = "ghostwriter-voice";
    for (const voice of VOICE_OPTIONS) {
      const option = element("option", "", voice.label);
      option.value = voice.id;
      voiceSelect.append(option);
    }
    seanceSection.append(voiceLabel, voiceSelect, button("Begin séance", "primary-button seance-button"));

    const outputLabel = element("label", "field-label output-label", "The ghost's revision");
    outputLabel.htmlFor = "ghostwriter-output";
    const output = element("div", "output-text");
    output.id = "ghostwriter-output";
    output.setAttribute("aria-live", "polite");
    output.textContent = "The results of my judgment shall appear here.";
    const footer = element("footer", "panel-footer");
    const copy = button("Copy result", "primary-button copy-button");
    copy.disabled = true;
    footer.append(copy, button("Close", "text-button footer-close"));

    panel.append(header, moodRow, nav, capture, textLabel, source, status,
      cursedSection, possessionSection, seanceSection, outputLabel, output, footer);
    root.append(dimmer, flyby, cobweb, summon, bubble, panel);
    shadow.append(root);
    document.documentElement.append(host);
    app = {
      host, shadow, root, ghost, bubble, summon, panel, meter, tabButtons, source, status,
      cursedSection, cursedView, possessionSection, possessionResults, scanBeam, seanceSection,
      voiceSelect, output, copy, dimmer, flyby, cobweb, exorcism
    };

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
    app.meter.style.width = `${bounded}%`;
    app.meter.dataset.level = bounded > 68 ? "high" : bounded > 35 ? "medium" : "low";
  }

  function evaluateMood(cursedDensity, averagePossession = 0) {
    const combined = Math.min(100, cursedDensity * 280 + averagePossession * 0.55);
    setMeter(combined);
    const threshold = settings.difficulty === "poltergeist" ? 0.13 : 0.2;
    let targetMood;
    if (cursedDensity >= threshold * 1.65) {
      targetMood = settings.difficulty === "poltergeist" ? "furious" : "angry";
    } else if (cursedDensity >= threshold) {
      targetMood = "disgusted";
    } else if (averagePossession > 60) {
      targetMood = "suspicious";
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
      setMeter(0);
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
        const text = app.source.value;
        const start = Number(fog.dataset.start);
        const end = Number(fog.dataset.end);
        app.source.value = LOCAL_SUGGESTIONS.replaceRange(text, start, end, suggestion)
          .replace(/[ \t]{2,}/g, " ")
          .replace(/\s+([,.!?;:])/g, "$1");
        openFog.clear();
        lastOutput = "";
        app.copy.disabled = true;
        app.output.textContent = "The results of my judgment shall appear here.";
        container.classList.add("puff-out");
        window.setMood("smug");
        setStatus("The phrase has been exorcised from this panel. Paste the result into Docs.");
        window.setTimeout(renderCursed, 280);
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

  function exorciseAll() {
    const text = app.source.value;
    const matches = LOCAL_SUGGESTIONS.analyze(text).matches;
    if (!matches.length) {
      setStatus("Nothing cursed found. My work here is, tragically, done.");
      window.setMood("happy");
      return;
    }
    app.panel.classList.add("scratch-effect");
    for (const match of [...matches].reverse()) {
      app.source.value = LOCAL_SUGGESTIONS.replaceRange(app.source.value, match.start, match.end, "");
    }
    app.source.value = app.source.value.replace(/[ \t]{2,}/g, " ").replace(/\s+([,.!?;:])/g, "$1");
    openFog.clear();
    lastOutput = app.source.value;
    app.output.textContent = lastOutput;
    app.copy.disabled = !lastOutput;
    setStatus(`${matches.length} filler phrase${matches.length === 1 ? "" : "s"} visually erased from this panel. Nothing was deleted in Docs.`);
    window.setMood("smug");
    window.setTimeout(() => app.panel.classList.remove("scratch-effect"), 750);
    renderCursed();
  }

  function activateTab(id) {
    for (const [name, tab] of Object.entries(app.tabButtons)) {
      const active = name === id;
      tab.setAttribute("aria-selected", String(active));
      app.root.querySelector(`[data-section="${name}"]`).hidden = !active;
    }
    noteActivity();
  }

  async function scanPossession() {
    const text = app.source.value.trim();
    if (!text) {
      setStatus("Give me some text to inspect. I cannot haunt a blank page.");
      return;
    }
    const results = POSSESSION.scan(text, settings.difficulty);
    const threshold = settings.difficulty === "poltergeist" ? 48 : 60;
    app.possessionResults.replaceChildren();
    app.scanBeam.classList.remove("beam-active");
    void app.scanBeam.offsetWidth;
    app.scanBeam.classList.add("beam-active");
    window.setMood("suspicious", { duration: 0 });
    setStatus("Scanning style signals. This is a guess, not proof of authorship.");
    const cards = results.map((item, index) => {
      const card = element("article", `sentence-card${item.score > threshold ? " flagged" : ""}`);
      card.dataset.index = String(index);
      const sentence = element("p", "sentence-copy", item.sentence);
      const score = element("div", "possession-meter");
      const track = element("span", "possession-track");
      const fill = element("span", "possession-fill");
      fill.style.width = `${item.score}%`;
      track.append(fill);
      score.append(element("strong", "", `Robotic aura: ${item.score}%`), track);
      const reason = element("p", "reason-copy", item.reason);
      card.append(sentence, score, reason);
      if (item.score > threshold) {
        const exorcise = button("Exorcise sentence", "small-exorcise");
        exorcise.addEventListener("click", () => void exorciseSentence(index, card));
        card.append(exorcise);
      }
      app.possessionResults.append(card);
      return { item, card };
    });
    app.scanBeam.classList.remove("beam-active");
    const average = results.length
      ? results.reduce((sum, item) => sum + item.score, 0) / results.length
      : 0;
    const cursedDensity = LOCAL_SUGGESTIONS.analyze(text).density;
    evaluateMood(cursedDensity, average);
    const flaggedCount = results.filter((item) => item.score > threshold).length;
    setStatus(`${results.length} sentence${results.length === 1 ? "" : "s"} scanned; ${flaggedCount} style signal${flaggedCount === 1 ? "" : "s"} flagged. Detection is a guess, not proof.`);

    let refined = 0;
    for (const { item, card } of cards) {
      try {
        const judgment = await sendRequest("POSSESSION_SCORE", { sentence: item.sentence });
        const combined = Math.round(item.heuristicScore * 0.45 + judgment.score * 0.55);
        const thresholdScore = settings.difficulty === "poltergeist" ? 48 : 60;
        const meterStrong = card.querySelector(".possession-meter strong");
        const fill = card.querySelector(".possession-fill");
        const reason = card.querySelector(".reason-copy");
        meterStrong.textContent = `Robotic aura: ${combined}%`;
        fill.style.width = `${combined}%`;
        reason.textContent = `${item.reason}. LLM style note: ${judgment.reason}`;
        card.classList.toggle("flagged", combined > thresholdScore);
        const existing = card.querySelector(".small-exorcise");
        if (combined > thresholdScore && !existing) {
          const index = Number(card.dataset.index);
          const action = button("Exorcise sentence", "small-exorcise");
          action.addEventListener("click", () => void exorciseSentence(index, card));
          card.append(action);
        } else if (combined <= thresholdScore && existing) {
          existing.remove();
        }
        item.score = combined;
        item.reason = judgment.reason;
        refined += 1;
      } catch (error) {
        sayError(error instanceof Error
          ? `${error.message} The local scan remains.`
          : "The style spirits are absent. The local scan remains.");
        break;
      }
    }
    if (refined > 0) {
      const finalAverage = results.reduce((sum, item) => sum + item.score, 0) / results.length;
      evaluateMood(cursedDensity, finalAverage);
      setStatus("The local scan is shown; the available spirit refined its style guesses. Detection is not proof.");
    } else {
      setStatus("Local style scan complete. Add an API key for optional LLM refinement; these signals are not proof.");
    }
  }

  async function exorciseSentence(index, card) {
    const sentences = POSSESSION.splitSentences(app.source.value);
    const sentence = sentences[index];
    if (!sentence) return;
    card.classList.add("flash-exorcism");
    window.setMood("possessed", { duration: 0 });
    setStatus("Exorcising this sentence. The exorcism affects this panel only.");
    try {
      const result = await sendRequest("EXORCISE", { sentence });
      const position = app.source.value.indexOf(sentence);
      if (position < 0) throw new Error("The source changed during exorcism. Scan it again.");
      app.source.value = app.source.value.slice(0, position) + result.text
        + app.source.value.slice(position + sentence.length);
      lastOutput = result.text;
      app.output.textContent = result.text;
      app.copy.disabled = false;
      setStatus("Sentence exorcised in the panel. Copy it and paste it into Docs if you approve.");
      window.setMood("happy");
      renderCursed();
    } catch (error) {
      sayError(error instanceof Error ? error.message : "The exorcism failed. A very rude spirit.");
    } finally {
      window.setTimeout(() => card.classList.remove("flash-exorcism"), 650);
    }
  }

  async function runSeance() {
    const text = app.source.value.trim();
    if (!text) {
      setStatus("No text to channel. Even the dead need a source.");
      return;
    }
    const voice = VOICE_OPTIONS.find((item) => item.id === app.voiceSelect.value);
    if (!voice) return;
    app.panel.classList.add("channeling");
    app.ghost.classList.add("channeling");
    app.dimmer.classList.add("dimmer-on");
    app.output.textContent = "Channeling";
    lastOutput = "";
    app.copy.disabled = true;
    window.setMood("sleepy", { duration: 0 });
    setStatus("Channeling… preserve the facts; embellish only the voice.");
    try {
      const result = await sendRequest("SEANCE", { text, style: voice.style });
      app.panel.classList.remove("channeling");
      app.ghost.classList.remove("channeling");
      app.dimmer.classList.remove("dimmer-on");
      window.setMood("excited", { duration: 1800 });
      await typewriter(result.text);
      lastOutput = result.text;
      app.copy.disabled = false;
      setStatus("The spirit has spoken. Copy the revision, then paste it into Docs.");
      window.setMood("impressed", { duration: 4200 });
      app.ghost.classList.add("faint-back");
    } catch (error) {
      app.panel.classList.remove("channeling");
      app.ghost.classList.remove("channeling");
      app.dimmer.classList.remove("dimmer-on");
      sayError(error instanceof Error ? error.message : "The séance failed. A deeply inconvenient haunting.");
    }
  }

  function typewriter(text) {
    app.output.textContent = "";
    return new Promise((resolve) => {
      let index = 0;
      const tick = () => {
        if (!app) return resolve();
        app.output.textContent += text[index] || "";
        index += 1;
        if (index >= text.length) resolve();
        else window.setTimeout(tick, 12);
      };
      tick();
    });
  }

  async function copyOutput() {
    if (!lastOutput) {
      setStatus("There is nothing to copy. My judgment is not a clipboard.");
      return;
    }
    try {
      await navigator.clipboard.writeText(lastOutput);
      setStatus("Copied. Paste into Docs with Ctrl+V or Command+V. I will not touch your document.");
    } catch {
      sayError("Clipboard access failed. Select the result and copy it manually.");
    }
  }

  async function captureSelection() {
    let execCopySucceeded = false;
    try {
      execCopySucceeded = document.execCommand("copy");
    } catch {
      execCopySucceeded = false;
    }
    let clipboardPromise;
    try {
      clipboardPromise = navigator.clipboard.readText();
    } catch {
      clipboardPromise = Promise.reject(new Error("Clipboard unavailable"));
    }
    if (!execCopySucceeded) {
      app.source.focus();
      setStatus("The copy spell failed. Paste your selection in the box. I shall wait.");
      window.setMood("sad", { say: false });
      return;
    }
    try {
      const text = await clipboardPromise;
      if (!text.trim()) throw new Error("Empty selection");
      app.source.value = text;
      lastOutput = "";
      app.copy.disabled = true;
      app.output.textContent = "The results of my judgment shall appear here.";
      openFog.clear();
      renderCursed();
      setStatus("Selection captured. At last, evidence.");
      noteActivity();
    } catch {
      app.source.focus();
      setStatus("The clipboard stayed veiled. Paste text here instead. I will not scrape the canvas.");
      window.setMood("sad", { say: false });
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

  function setupTrick() {
    if (Math.random() > 0.1) return;
    const trick = Math.floor(Math.random() * 3);
    if (trick === 0) {
      app.flyby.textContent = "🦇";
      app.flyby.classList.add("bat-flight");
    } else if (trick === 1) {
      app.cobweb.hidden = false;
      window.setTimeout(() => { if (app) app.cobweb.hidden = true; }, 12000);
    } else {
      window.setTimeout(() => {
        if (!app) return;
        window.setMood("happy");
        app.status.textContent = "A surprise compliment: you showed up to write. That counts.";
      }, 1200);
    }
  }

  function bindEvents() {
    app.summon.addEventListener("click", () => {
      if (app.summon.dataset.dragged === "true") {
        app.summon.dataset.dragged = "false";
        return;
      }
      app.panel.hidden = !app.panel.hidden;
      if (!app.panel.hidden) {
        app.ghost.classList.remove("faint-back");
        window.setMood("idle");
        app.source.focus();
      }
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
    app.root.querySelector(".close-button").addEventListener("click", () => { app.panel.hidden = true; });
    app.root.querySelector(".footer-close").addEventListener("click", () => { app.panel.hidden = true; });
    app.root.querySelector(".capture-button").addEventListener("click", () => void captureSelection());
    app.source.addEventListener("input", () => {
      lastOutput = "";
      app.copy.disabled = true;
      app.possessionResults.replaceChildren();
      openFog.clear();
      renderCursed();
      noteActivity();
    });
    app.exorcism.addEventListener("click", exorciseAll);
    for (const [name, tab] of Object.entries(app.tabButtons)) {
      tab.addEventListener("click", () => activateTab(name));
    }
    app.root.querySelector(".scan-button").addEventListener("click", () => void scanPossession());
    app.root.querySelector(".seance-button").addEventListener("click", () => void runSeance());
    app.copy.addEventListener("click", () => void copyOutput());
    app.root.addEventListener("pointerdown", noteActivity, { passive: true });
  }

  async function loadSettings() {
    const stored = await chrome.storage.sync.get(DEFAULT_SETTINGS);
    settings = {
      enabled: stored.enabled !== false,
      personality: ["grumpy", "sweet", "sarcastic"].includes(stored.personality) ? stored.personality : "grumpy",
      difficulty: stored.difficulty === "poltergeist" ? "poltergeist" : "friendly",
      sound: stored.sound === true
    };
    if (settings.enabled) mount();
  }

  chrome.runtime.onMessage.addListener((message) => {
    if (message?.type !== "OPEN_AND_CAPTURE") return;
    if (!app && settings.enabled) mount();
    if (!app) return;
    app.panel.hidden = false;
    app.ghost.classList.remove("faint-back");
    window.setMood("mischievous");
    void captureSelection();
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area !== "sync") return;
    if (changes.enabled) {
      settings.enabled = changes.enabled.newValue !== false;
      if (settings.enabled) mount();
      else if (app) {
        app.host.remove();
        app = null;
      }
    }
    for (const key of ["personality", "difficulty", "sound"]) {
      if (changes[key]) settings[key] = changes[key].newValue;
    }
  });

  void loadSettings().catch(() => {
    settings = { ...DEFAULT_SETTINGS };
    mount();
    sayError("I could not read my preferences. The default haunting is in effect.");
  });
})();
