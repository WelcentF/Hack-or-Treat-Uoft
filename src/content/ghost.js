// Owns Ghostwriter's image-based character, mood state, optional effects, speech, and visibility-aware animation.
// To add a mood: add its name to MOODS, its image/fallback and effects below, then add a motion rule in ghost.css.

(() => {
  const MOODS = [
    "idle", "bored", "sleepy", "suspicious", "happy", "smug", "impressed", "disgusted",
    "angry", "furious", "sad", "scared", "possessed", "channeling", "excited", "mischievous"
  ];
  // Keep this set in sync with files added under assets/ghost; missing moods resolve through FALLBACKS.
  const AVAILABLE_MOODS = new Set(["smug", "angry", "impressed"]);
  // Add a name here only after adding its PNG under assets/effects. CSS artwork covers absent effects.
  const AVAILABLE_EFFECTS = new Set();
  const FALLBACKS = {
    idle: "smug",
    bored: "smug",
    sleepy: "smug",
    suspicious: "angry",
    happy: "impressed",
    disgusted: "angry",
    sad: "smug",
    scared: "impressed",
    possessed: "angry",
    channeling: "smug",
    mischievous: "smug",
    furious: "angry",
    excited: "impressed"
  };
  const EFFECTS = {
    idle: [],
    bored: [],
    sleepy: ["zzz"],
    suspicious: ["sweat"],
    happy: ["sparkle"],
    smug: ["sparkle"],
    impressed: ["sparkle"],
    disgusted: ["sweat"],
    angry: ["steam"],
    furious: ["steam"],
    sad: ["tear"],
    scared: ["sweat"],
    possessed: ["smoke"],
    channeling: ["candle"],
    excited: ["sparkle"],
    mischievous: ["sparkle", "bat"]
  };
  const QUIPS = {
    grumpy: {
      idle: ["Proceed. I have all eternity, apparently.", "Your sentence is making me haunt the margins."],
      bored: ["I died waiting for a stronger verb.", "Wake me when the point arrives."],
      sleepy: ["I died waiting for you to finish this sentence.", "Three minutes of silence. My specialty."],
      suspicious: ["That phrasing has suspiciously polished shoes.", "Something here smells freshly generated."],
      happy: ["Well. That sentence has a pulse.", "Acceptable prose. Don't make me repeat myself."],
      smug: ["You chose the stronger word. I noticed.", "A crisp edit. I shall pretend not to care."],
      impressed: ["Oh. That was… unexpectedly good.", "Fine. You may keep that sentence."],
      disgusted: ["I have seen tombstones with better phrasing.", "The cliché has returned. It never learns."],
      angry: ["This sentence has tested my patience beyond the grave.", "Enough filler. Even the dead have standards."],
      furious: ["THIS PROSE HAS SUMMONED MY FINAL FORM.", "I AM NOT HAUNTING THIS MANY FILLER WORDS."],
      sad: ["A tiny tear for a missed opportunity.", "I will be here, in the margins."],
      scared: ["That score is a guess. Still… unsettling.", "Something is off. Probably the sentence."],
      possessed: ["The sentence is wearing someone else's face.", "A robotic aura. No authorship verdict, naturally."],
      channeling: ["Channeling begins. Try not to interrupt the dead.", "The séance is ready. Mind the candles."],
      excited: ["A new voice! Finally, some theatrical ambition.", "Excellent. The séance has taste."],
      mischievous: ["The fog is hiding something. Tap it.", "Let's make this prose interesting. For once."]
    },
    sweet: {
      idle: ["I'm here whenever you're ready, dear.", "Your draft is safe with me."],
      bored: ["A little more sparkle, perhaps?", "This sentence could use a gentle nudge."],
      sleepy: ["I waited ever so patiently, dear.", "Wake me whenever you're ready."],
      suspicious: ["This sounds a little too polished, dear.", "A tiny robotic aura, not a verdict."],
      happy: ["Lovely work! That sentence is glowing.", "I knew you had a beautiful line in you."],
      smug: ["Nicely done! That word fits beautifully.", "There, much clearer. I'm proud of you."],
      impressed: ["Oh my, that is wonderful.", "I may faint from admiration."],
      disgusted: ["We can make this kinder to the reader.", "Let's gently release that cliché."],
      angry: ["Even a friendly ghost needs a pause.", "Let's take a breath and trim the clutter."],
      furious: ["OH DEAR, THAT IS A LOT OF FILLER.", "LET'S GIVE THIS SENTENCE A FRESH START."],
      sad: ["That's okay. We can try another way.", "I'll be here if you'd like another suggestion."],
      scared: ["It's only a style guess, dear. No proof.", "No need to worry; this is just a signal."],
      possessed: ["A little robotic aura, but we can soften it.", "Not a verdict, just a gentle style nudge."],
      channeling: ["Let's invite another voice, dear.", "The séance is ready. Take a breath."],
      excited: ["How exciting! Let's invite another voice.", "Let's make a little writing magic."],
      mischievous: ["Tap the fog. I promise it's mostly harmless.", "Shall we coax a better word out?"]
    },
    sarcastic: {
      idle: ["Take your time. I have no pulse.", "The suspense is absolutely unbearable."],
      bored: ["Thrilling. The verb is still asleep.", "I have been dead for centuries; this is worse."],
      sleepy: ["Three minutes. Not that I was counting.", "I have been dead less bored than this."],
      suspicious: ["Did a robot iron this sentence?", "Not an authorship test. Just a vibe check."],
      happy: ["Well, look at you. Competent prose.", "A good sentence. I'll alert the afterlife."],
      smug: ["I was right. A familiar sensation.", "There. Better. Was that so hard?"],
      impressed: ["I hate to admit this, but excellent.", "Well. I may faint. Again."],
      disgusted: ["Ah, another cliché. How refreshingly predictable.", "A phrase so tired it joined me."],
      angry: ["My patience has left the séance.", "I can't believe I died for this draft."],
      furious: ["CONGRATULATIONS. YOU ANNOYED A GHOST.", "THIS SENTENCE HAS ACHIEVED PEAK DRAMA."],
      sad: ["Rejected. Much like my old band.", "Ghosts have condensation. I am not crying."],
      scared: ["A high score. It is still not proof, obviously.", "That sentence is giving uncanny valley."],
      possessed: ["Robotic aura detected. Your toaster denies everything.", "This rhythm is suspiciously symmetrical."],
      channeling: ["A séance. This should end normally.", "Let's borrow a voice, not a whole book."],
      excited: ["Finally, an excuse to impersonate the dead.", "Let's see what the spirits can do."],
      mischievous: ["Tap the fog. What could possibly go wrong?", "I hid a better word in the cloud."]
    }
  };
  const TRICK_QUIPS = {
    grumpy: {
      flyby: ["Out of the way, mortal. I have places to haunt.", "Inspecting your prose. Continue pretending not to notice."],
      hover: ["Not bad, mortal.", "Is that a typo I smell?", "I shall nap here until the sentence improves."],
      peek: ["I saw that comma. We will discuss it.", "Just checking whether you were still writing."]
    },
    sweet: {
      flyby: ["Just passing by with a tiny bit of encouragement.", "Your draft is looking more alive already."],
      hover: ["Not bad, mortal. Truly!", "A little typo? No worries, dear.", "I'll rest here while you think."],
      peek: ["Hello, dear writer. Carry on!", "Just making sure you have company."]
    },
    sarcastic: {
      flyby: ["Inspection complete. The sentence survived.", "Flying by. Try to look productive."],
      hover: ["Not bad, mortal. I hate that.", "Is that a typo I smell, or lunch?", "I'll nap on this cursor. Riveting."],
      peek: ["I saw that punctuation. Bold choice.", "Peekaboo. The draft is still here."]
    }
  };
  const FILTERS = {
    idle: "none",
    bored: "saturate(.75) brightness(.92)",
    sleepy: "saturate(.65) brightness(.82)",
    suspicious: "saturate(1.05) contrast(1.04)",
    happy: "saturate(1.08) brightness(1.04)",
    smug: "none",
    impressed: "saturate(1.08)",
    disgusted: "hue-rotate(70deg) saturate(.8)",
    angry: "saturate(1.2)",
    furious: "saturate(1.45) contrast(1.12)",
    sad: "saturate(.5) brightness(.8)",
    scared: "hue-rotate(175deg) saturate(.72)",
    possessed: "hue-rotate(120deg) saturate(1.35)",
    channeling: "hue-rotate(250deg) saturate(.82)",
    excited: "saturate(1.3) brightness(1.08)",
    mischievous: "saturate(1.1) contrast(1.06)"
  };

  let ghost = null;
  let bubble = null;
  let getSettings = () => ({ personality: "grumpy", sound: false });
  let currentMood = "idle";
  let activeImage = 0;
  let moodTimer = 0;
  let idleTimer = 0;
  let bubbleTimer = 0;
  let blinkTimer = 0;
  let visibilityRoot = null;
  let activeTrick = null;

  function assetUrl(path) {
    return globalThis.chrome?.runtime?.getURL
      ? chrome.runtime.getURL(path)
      : path;
  }

  function imageForMood(mood) {
    const resolvedMood = AVAILABLE_MOODS.has(mood)
      ? mood
      : FALLBACKS[mood] || (mood === "furious" ? "angry" : mood === "excited" ? "impressed" : "smug");
    return `assets/ghost/ghost-${resolvedMood}.png`;
  }

  function fallbackImageForMood(mood) {
    const fallbackMood = FALLBACKS[mood]
      || (mood === "furious" ? "angry" : mood === "excited" ? "impressed" : "smug");
    const fallbackPath = imageForMood(fallbackMood);
    return fallbackPath === imageForMood(mood) ? imageForMood("smug") : fallbackPath;
  }

  function createEffectLayer(name) {
    const layer = document.createElement("span");
    layer.className = `effect-layer effect-${name} css-fallback`;
    layer.setAttribute("aria-hidden", "true");
    if (!AVAILABLE_EFFECTS.has(name)) return layer;
    const image = document.createElement("img");
    image.alt = "";
    image.src = assetUrl(`assets/effects/${name}.png`);
    image.addEventListener("load", () => layer.classList.add("has-image"), { once: true });
    image.addEventListener("error", () => {
      image.remove();
      layer.classList.add("css-fallback");
    }, { once: true });
    layer.append(image);
    return layer;
  }

  function buildCharacter() {
    const stack = document.createElement("span");
    stack.className = "ghost-face-stack";
    stack.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 2; index += 1) {
      const image = document.createElement("img");
      image.className = `ghost-face ghost-face-${index}`;
      image.alt = "";
      image.draggable = false;
      image.addEventListener("error", () => {
        if (image.dataset.fallbackTried === "true") {
          image.classList.add("image-unavailable");
          return;
        }
        image.dataset.fallbackTried = "true";
        image.src = assetUrl(fallbackImageForMood(image.dataset.mood || "idle"));
      });
      stack.append(image);
    }
    ghost.append(stack);

    const trails = document.createElement("span");
    trails.className = "trick-trails";
    trails.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 5; index += 1) {
      const trail = document.createElement("span");
      trail.className = `trick-trail trick-trail-${index}`;
      const image = document.createElement("img");
      image.alt = "";
      image.draggable = false;
      trail.append(image);
      trails.append(trail);
    }
    ghost.append(trails);

    const glitchOverlay = document.createElement("span");
    glitchOverlay.className = "ghost-glitch-overlay";
    glitchOverlay.setAttribute("aria-hidden", "true");
    for (const slice of ["top", "bottom"]) {
      const image = document.createElement("img");
      image.className = `glitch-slice glitch-slice-${slice}`;
      image.alt = "";
      image.draggable = false;
      image.addEventListener("error", () => {
        image.src = assetUrl("assets/ghost/ghost-smug.png");
      }, { once: true });
      glitchOverlay.append(image);
    }
    ghost.append(glitchOverlay);

    const eyelids = document.createElement("span");
    eyelids.className = "ghost-blink";
    eyelids.setAttribute("aria-hidden", "true");
    ghost.append(eyelids);

    const smoke = document.createElement("span");
    smoke.className = "pencil-smoke effect-layer effect-smoke css-fallback";
    smoke.setAttribute("aria-hidden", "true");
    for (let index = 0; index < 3; index += 1) {
      const wisp = document.createElement("i");
      wisp.className = `smoke-wisp smoke-wisp-${index}`;
      smoke.append(wisp);
    }
    if (AVAILABLE_EFFECTS.has("smoke")) {
      const smokeImage = document.createElement("img");
      smokeImage.alt = "";
      smokeImage.src = assetUrl("assets/effects/smoke.png");
      smokeImage.addEventListener("load", () => smoke.classList.add("has-image"), { once: true });
      smokeImage.addEventListener("error", () => {
        smokeImage.remove();
        smoke.classList.add("css-fallback");
      }, { once: true });
      smoke.append(smokeImage);
    }
    ghost.append(smoke);

    const effects = document.createElement("span");
    effects.className = "ghost-effects";
    effects.setAttribute("aria-hidden", "true");
    for (const name of ["sparkle", "steam", "zzz", "tear", "sweat", "candle", "bat"]) {
      effects.append(createEffectLayer(name));
    }
    ghost.append(effects);

    activeImage = 0;
    const initial = imageForMood("idle");
    stack.children[0].dataset.mood = "idle";
    stack.children[0].dataset.fallbackTried = "false";
    stack.children[1].dataset.mood = "idle";
    stack.children[1].dataset.fallbackTried = "false";
    stack.children[0].src = assetUrl(initial);
    stack.children[0].classList.add("is-visible");
    stack.children[1].src = assetUrl(initial);
  }

  function randomQuip(mood) {
    const bank = QUIPS[getSettings().personality] || QUIPS.grumpy;
    const options = bank[mood] || bank.idle;
    return options[Math.floor(Math.random() * options.length)];
  }

  function showBubble(message, mood) {
    if (!bubble || !message) return;
    window.clearTimeout(bubbleTimer);
    bubble.textContent = mood === "furious" ? message.toUpperCase() : message;
    bubble.className = `speech-bubble bubble-${mood}`;
    bubble.hidden = false;
    bubbleTimer = window.setTimeout(() => {
      if (bubble) bubble.hidden = true;
    }, 4200);
  }

  function playMoodSound(mood) {
    if (!getSettings().sound || !["happy", "excited", "scared", "mischievous", "angry", "furious"].includes(mood)) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const audio = new AudioContext();
      const notes = mood === "scared"
        ? [{ frequency: 250, endFrequency: 690, duration: 0.28, type: "sine" }]
        : mood === "mischievous"
          ? [470, 560, 390, 520, 360].map((frequency) => ({ frequency, duration: 0.075, type: "triangle" }))
          : mood === "angry" || mood === "furious"
            ? [190, 135].map((frequency) => ({ frequency, duration: 0.16, type: "sawtooth" }))
            : [620, 820].map((frequency) => ({ frequency, duration: 0.1, type: "sine" }));
      let offset = 0;
      notes.forEach((note, index) => {
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        const start = audio.currentTime + offset;
        const end = start + note.duration;
        oscillator.type = note.type;
        oscillator.frequency.setValueAtTime(note.frequency, start);
        if (note.endFrequency) oscillator.frequency.linearRampToValueAtTime(note.endFrequency, end);
        gain.gain.setValueAtTime(0.025, start);
        gain.gain.exponentialRampToValueAtTime(0.001, end);
        oscillator.connect(gain);
        gain.connect(audio.destination);
        oscillator.start(start);
        oscillator.stop(end);
        if (index === notes.length - 1) oscillator.onended = () => void audio.close();
        offset += note.duration * 0.8;
      });
    } catch {
      // Sound is decorative; browser audio restrictions must not interrupt writing.
    }
  }

  function setMood(mood, options = {}) {
    if (!ghost || !MOODS.includes(mood)) return;
    const { duration = null, say = null } = options || {};
    currentMood = mood;
    window.clearTimeout(moodTimer);
    const trickClass = activeTrick?.element === ghost ? " trick-in-progress" : "";
    const trailClass = ghost.classList.contains("trails-active") ? " trails-active" : "";
    ghost.className = `ghost mood-${mood}${trickClass}${trailClass}`;
    ghost.dataset.mood = mood;
    ghost.style.setProperty("--mood-filter", FILTERS[mood] || "none");

    const panel = ghost.getRootNode().querySelector(".ghost-panel");
    panel?.classList.toggle("furious-shake", mood === "furious");

    const images = ghost.querySelectorAll(".ghost-face");
    const nextImage = 1 - activeImage;
    const next = images[nextImage];
    if (next) {
      next.dataset.mood = mood;
      next.dataset.fallbackTried = "false";
      next.src = assetUrl(imageForMood(mood));
      next.classList.remove("is-visible");
      window.requestAnimationFrame(() => {
        if (!ghost || ghost.dataset.mood !== mood) return;
        next.classList.add("is-visible");
        images[activeImage]?.classList.remove("is-visible");
        activeImage = nextImage;
      });
    }
    for (const trailImage of ghost.querySelectorAll(".trick-trail img")) {
      trailImage.src = assetUrl(imageForMood(mood));
    }
    for (const slice of ghost.querySelectorAll(".glitch-slice")) {
      slice.src = assetUrl(imageForMood(mood));
    }

    for (const effect of ghost.querySelectorAll(".effect-layer")) effect.classList.remove("is-active");
    for (const name of EFFECTS[mood] || []) {
      ghost.querySelector(`.effect-${name}`)?.classList.add("is-active");
    }
    if (mood === "channeling") {
      ghost.querySelector(".effect-candle")?.classList.add("is-active");
    }

    if (say === false) {
      window.clearTimeout(bubbleTimer);
      if (bubble) bubble.hidden = true;
    } else {
      showBubble(typeof say === "string" ? say : randomQuip(mood), mood);
    }
    if (mood === "idle") scheduleBlink();
    else window.clearTimeout(blinkTimer);
    playMoodSound(mood);
    if (Number.isFinite(duration) && duration > 0) {
      moodTimer = window.setTimeout(() => setMood("idle", { say: false }), duration);
    }
  }

  function quipForTrick(kind, personality = getSettings().personality) {
    const bank = TRICK_QUIPS[personality] || TRICK_QUIPS.grumpy;
    const choices = bank[kind] || bank.flyby;
    return choices[Math.floor(Math.random() * choices.length)];
  }

  function animationFrames(from, to, { wave = 0, direction = 1, curve = null } = {}) {
    if (curve) {
      return Array.from({ length: 41 }, (_, index) => {
        const progress = index / 40;
        const inverse = 1 - progress;
        const x = inverse ** 3 * from.x
          + 3 * inverse ** 2 * progress * curve.first.x
          + 3 * inverse * progress ** 2 * curve.second.x
          + progress ** 3 * to.x;
        const y = inverse ** 3 * from.y
          + 3 * inverse ** 2 * progress * curve.first.y
          + 3 * inverse * progress ** 2 * curve.second.y
          + progress ** 3 * to.y;
        const tangentX = 3 * inverse ** 2 * (curve.first.x - from.x)
          + 6 * inverse * progress * (curve.second.x - curve.first.x)
          + 3 * progress ** 2 * (to.x - curve.second.x);
        const tangentY = 3 * inverse ** 2 * (curve.first.y - from.y)
          + 6 * inverse * progress * (curve.second.y - curve.first.y)
          + 3 * progress ** 2 * (to.y - curve.second.y);
        const tilt = Math.max(-18, Math.min(18, Math.atan2(tangentY, tangentX) * 180 / Math.PI * .45));
        const facing = to.x < from.x ? -1 : 1;
        const stretch = 1.04 + Math.sin(progress * Math.PI) * .04;
        return {
          offset: progress,
          opacity: .86,
          transform: `translate3d(${x - from.x}px, ${y - from.y}px, 0) rotate(${tilt}deg) scaleX(${facing * stretch})`
        };
      });
    }

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    return Array.from({ length: 11 }, (_, index) => {
      const progress = index / 10;
      const offsetY = Math.sin(progress * Math.PI) * wave;
      const tilt = direction * (10 + Math.sin(progress * Math.PI) * 2);
      const stretch = progress === 0 || progress === 1 ? 1 : 1.05;
      return {
        offset: progress,
        opacity: 0.86,
        transform: `translate3d(${dx * progress}px, ${dy * progress + offsetY}px, 0) rotate(${tilt}deg) scaleX(${direction < 0 ? -stretch : stretch})`
      };
    });
  }

  function animateTo(state, target, duration, { wave = 0, reducedMotion = false, curve = null } = {}) {
    if ((state.cancelled && !state.isReturning) || !state.element?.isConnected) return Promise.resolve(false);
    const rect = state.element.getBoundingClientRect();
    const from = { x: rect.left, y: rect.top };
    const direction = target.x < from.x ? -1 : 1;
    ghost?.style.setProperty("--trick-direction", String(direction));
    ghost?.style.setProperty("--smoke-back", `${direction * -5}px`);
    ghost?.querySelectorAll(".trick-trail").forEach((trail, index) => {
      const offset = direction * (10 + index * 9);
      trail.style.setProperty("--trail-start", `${offset}px`);
      trail.style.setProperty("--trail-end", `${offset * 2}px`);
    });
    const dx = target.x - from.x;
    const dy = target.y - from.y;
    if (reducedMotion) {
      const fadeOut = state.element.animate(
        [{ opacity: state.element.style.opacity || ".86" }, { opacity: 0 }],
        { duration: Math.min(duration, 380) / 2, easing: "ease-in", fill: "forwards" }
      );
      state.animation = fadeOut;
      if (document.hidden) fadeOut.pause();
      return fadeOut.finished.then(() => {
        if (state.cancelled && !state.isReturning) return false;
        state.element.style.left = `${from.x + dx}px`;
        state.element.style.top = `${from.y + dy}px`;
        fadeOut.cancel();
        state.element.style.opacity = "0";
        const fadeIn = state.element.animate(
          [{ opacity: 0 }, { opacity: ".86" }],
          { duration: Math.min(duration, 380) / 2, easing: "ease-out", fill: "forwards" }
        );
        state.animation = fadeIn;
        if (document.hidden) fadeIn.pause();
        return fadeIn.finished.then(() => {
          fadeIn.cancel();
          state.element.style.opacity = ".86";
          if (state.animation === fadeIn) state.animation = null;
          return !state.cancelled;
        });
      }).catch(() => {
        if (state.animation === fadeOut) state.animation = null;
        return false;
      });
    }
    const frames = animationFrames(from, target, { wave, direction, curve });
    const animation = state.element.animate(frames, {
      duration,
      easing: "linear",
      fill: "forwards"
    });
    state.animation = animation;
    if (document.hidden) animation.pause();
    return animation.finished.then(() => {
      state.element.style.left = `${from.x + dx}px`;
      state.element.style.top = `${from.y + dy}px`;
      animation.cancel();
      state.animation = null;
      return !state.cancelled;
    }).catch(() => {
      if (state.animation === animation) state.animation = null;
      return false;
    });
  }

  function trickWait(state, duration) {
    return new Promise((resolve) => {
      let remaining = duration;
      let startedAt = 0;
      const finish = (result) => {
        window.clearTimeout(state.waitTimer);
        state.waitTimer = 0;
        document.removeEventListener("visibilitychange", onVisibilityChange);
        state.waitVisibility = null;
        state.waitResolve = null;
        resolve(result);
      };
      const schedule = () => {
        if (state.cancelled) {
          finish(false);
          return;
        }
        if (document.hidden) return;
        startedAt = Date.now();
        state.waitTimer = window.setTimeout(() => finish(true), remaining);
      };
      const onVisibilityChange = () => {
        if (document.hidden && state.waitTimer) {
          remaining = Math.max(0, remaining - (Date.now() - startedAt));
          window.clearTimeout(state.waitTimer);
          state.waitTimer = 0;
        } else if (!document.hidden && !state.waitTimer) {
          schedule();
        }
      };
      state.waitResolve = resolve;
      state.waitVisibility = onVisibilityChange;
      document.addEventListener("visibilitychange", onVisibilityChange);
      schedule();
    });
  }

  function homePosition(element) {
    const rect = element.getBoundingClientRect();
    return { x: rect.left, y: rect.top, width: rect.width, height: rect.height };
  }

  function targetAboveSpot(spot, home) {
    const margin = 12;
    let x = spot.x + 24;
    let y = spot.y - home.height - 20;
    x = Math.max(margin, Math.min(window.innerWidth - home.width - margin, x));
    if (y < margin) y = Math.min(window.innerHeight - home.height - margin, spot.y + 24);
    return { x, y };
  }

  async function flyToHome(state, reducedMotion = false, duration = 950) {
    const { home } = state;
    return animateTo(state, { x: home.x, y: home.y }, duration, {
      wave: reducedMotion ? 0 : -18,
      reducedMotion
    });
  }

  function setupTrickElement(element) {
    const rect = homePosition(element);
    const original = {
      position: element.style.position,
      left: element.style.left,
      top: element.style.top,
      right: element.style.right,
      bottom: element.style.bottom,
      transform: element.style.transform,
      opacity: element.style.opacity,
      pointerEvents: element.style.pointerEvents,
      width: element.style.width,
      height: element.style.height,
      trickDirection: ghost?.style.getPropertyValue("--trick-direction") || "",
      smokeBack: ghost?.style.getPropertyValue("--smoke-back") || ""
    };
    const state = {
      element, home: rect, cancelled: false, animation: null, waitTimer: 0, waitResolve: null, original
    };
    activeTrick = state;
    element.style.position = "fixed";
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
    element.style.left = `${rect.x}px`;
    element.style.top = `${rect.y}px`;
    element.style.right = "auto";
    element.style.bottom = "auto";
    element.style.pointerEvents = "none";
    element.style.opacity = ".86";
    element.classList.add("trick-in-progress");
    ghost?.classList.add("trails-active");
    return state;
  }

  function randomFlightTarget(state, previousTarget) {
    const margin = 26;
    const maxX = Math.max(margin, window.innerWidth - state.home.width - margin);
    const maxY = Math.max(margin, window.innerHeight - state.home.height - margin);
    let target = { x: margin, y: margin };
    const minDistance = Math.min(window.innerWidth, window.innerHeight) * .24;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      target = {
        x: margin + Math.random() * Math.max(0, maxX - margin),
        y: margin + Math.random() * Math.max(0, maxY - margin)
      };
      if (Math.hypot(target.x - previousTarget.x, target.y - previousTarget.y) >= minDistance) break;
    }
    return target;
  }

  function randomFlightCurve(from, to, state) {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const distance = Math.hypot(dx, dy) || 1;
    const bend = (Math.random() < .5 ? -1 : 1) * Math.min(260, Math.max(90, distance * (.22 + Math.random() * .32)));
    const perpendicularX = -dy / distance;
    const perpendicularY = dx / distance;
    const margin = 18;
    const clampX = (value) => Math.max(margin, Math.min(window.innerWidth - state.home.width - margin, value));
    const clampY = (value) => Math.max(margin, Math.min(window.innerHeight - state.home.height - margin, value));
    return {
      first: {
        x: clampX(from.x + dx * (.28 + Math.random() * .12) + perpendicularX * bend),
        y: clampY(from.y + dy * (.28 + Math.random() * .12) + perpendicularY * bend)
      },
      second: {
        x: clampX(from.x + dx * (.62 + Math.random() * .12) + perpendicularX * bend * (.6 + Math.random() * .5)),
        y: clampY(from.y + dy * (.62 + Math.random() * .12) + perpendicularY * bend * (.6 + Math.random() * .5))
      }
    };
  }

  async function startFlight() {
    if (activeTrick) await cancelTrick(false);
    if (!ghost?.isConnected) return false;
    const element = ghost.parentElement?.matches(".summon-button") ? ghost.parentElement : ghost;
    if (!element?.isConnected) return false;
    const state = setupTrickElement(element);
    state.continuousFlight = true;
    setMood("mischievous", { duration: 0, say: "A leisurely patrol. Try to keep up." });
    let current = { x: state.home.x, y: state.home.y };
    while (!state.cancelled && element.isConnected) {
      const target = randomFlightTarget(state, current);
      const duration = 4800 + Math.random() * 4200;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const completed = await animateTo(state, target, duration, {
        reducedMotion,
        curve: reducedMotion ? null : randomFlightCurve(current, target, state)
      });
      if (!completed || state.cancelled) break;
      current = target;
    }
    if (state.cancelled) {
      if (state.returningPromise) await state.returningPromise;
      cleanupTrick(state);
      return false;
    }
    cleanupTrick(state);
    return true;
  }

  async function stopFlight() {
    if (!activeTrick?.continuousFlight) return false;
    await cancelTrick(false);
    return true;
  }

  async function cancelTrick(reason = true) {
    const state = activeTrick;
    if (!state || state.cancelled) return;
    state.cancelled = true;
    if (state.waitTimer) window.clearTimeout(state.waitTimer);
    state.waitTimer = 0;
    if (state.waitVisibility) document.removeEventListener("visibilitychange", state.waitVisibility);
    state.waitVisibility = null;
    state.waitResolve?.(false);
    state.waitResolve = null;
    const node = state.element;
    const interruptedRect = node?.isConnected ? node.getBoundingClientRect() : null;
    state.animation?.cancel();
    state.animation = null;
    if (node?.isConnected) {
      if (interruptedRect) {
        node.style.left = `${interruptedRect.left}px`;
        node.style.top = `${interruptedRect.top}px`;
      }
      node.style.pointerEvents = "none";
      if (reason) setMood("bored", { duration: 0, say: "Hmph. I was only inspecting." });
      state.isReturning = true;
      state.returningPromise = flyToHome(
        state,
        window.matchMedia("(prefers-reduced-motion: reduce)").matches,
        state.continuousFlight ? 850 : 250
      );
      await state.returningPromise;
    }
    cleanupTrick(state);
  }

  function cleanupTrick(state) {
    if (state.waitTimer) window.clearTimeout(state.waitTimer);
    if (state.waitVisibility) document.removeEventListener("visibilitychange", state.waitVisibility);
    state.animation?.cancel();
    if (state.element?.isConnected) {
      state.element.style.position = state.original.position;
      state.element.style.left = state.original.left;
      state.element.style.top = state.original.top;
      state.element.style.right = state.original.right;
      state.element.style.bottom = state.original.bottom;
      state.element.style.transform = state.original.transform;
      state.element.style.opacity = state.original.opacity;
      state.element.style.pointerEvents = state.original.pointerEvents;
      state.element.style.width = state.original.width;
      state.element.style.height = state.original.height;
      state.element.classList.remove("trick-in-progress");
    }
    if (ghost) {
      if (state.original.trickDirection) ghost.style.setProperty("--trick-direction", state.original.trickDirection);
      else ghost.style.removeProperty("--trick-direction");
      if (state.original.smokeBack) ghost.style.setProperty("--smoke-back", state.original.smokeBack);
      else ghost.style.removeProperty("--smoke-back");
      ghost.querySelectorAll(".trick-trail").forEach((trail) => {
        trail.style.removeProperty("--trail-start");
        trail.style.removeProperty("--trail-end");
      });
    }
    ghost?.classList.remove("trails-active");
    if (activeTrick === state) activeTrick = null;
  }

  async function playTrick(name = "fly-by", options = {}) {
    if (activeTrick) await cancelTrick(false);
    if (!ghost?.isConnected) return false;
    const element = ghost.parentElement?.matches(".summon-button") ? ghost.parentElement : ghost;
    if (!element || !element.isConnected) return false;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rect = homePosition(element);
    const state = {
      element,
      home: rect,
      cancelled: false,
      animation: null,
      waitTimer: 0,
      waitResolve: null,
      original: {
        position: element.style.position,
        left: element.style.left,
        top: element.style.top,
        right: element.style.right,
        bottom: element.style.bottom,
        transform: element.style.transform,
        opacity: element.style.opacity,
        pointerEvents: element.style.pointerEvents,
        width: element.style.width,
        height: element.style.height,
        trickDirection: ghost?.style.getPropertyValue("--trick-direction") || "",
        smokeBack: ghost?.style.getPropertyValue("--smoke-back") || ""
      }
    };
    activeTrick = state;
    element.style.position = "fixed";
    element.style.width = `${rect.width}px`;
    element.style.height = `${rect.height}px`;
    element.style.left = `${rect.x}px`;
    element.style.top = `${rect.y}px`;
    element.style.right = "auto";
    element.style.bottom = "auto";
    element.style.pointerEvents = "none";
    element.style.opacity = ".86";
    element.classList.add("trick-in-progress");
    const flyby = name === "fly-by" || name === "flyby";
    const hover = name === "hover" || name === "writing-spot";
    const peek = name === "peek";
    if (!flyby && !hover && !peek) {
      cleanupTrick(state);
      return false;
    }
    const kind = hover ? "hover" : peek ? "peek" : "flyby";
    const initialQuip = quipForTrick(kind);
    setMood("mischievous", { duration: 0, say: initialQuip });
    ghost.classList.add("trails-active");

    try {
      if (flyby) {
        const leftward = rect.x > window.innerWidth / 2;
        const target = {
          x: leftward ? -rect.width * 0.45 : window.innerWidth + rect.width * 0.45,
          y: Math.min(window.innerHeight - rect.height - 20, Math.max(12, rect.y - 110))
        };
        await animateTo(state, target, 1550, { wave: 64, reducedMotion });
      } else if (hover) {
        const spot = typeof options.getWritingSpot === "function"
          ? options.getWritingSpot()
          : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
        const target = targetAboveSpot(spot, rect);
        if (await animateTo(state, target, 1150, { wave: 28, reducedMotion }) && !state.cancelled) {
          ghost.classList.remove("trails-active");
          setMood("suspicious", { duration: 0, say: quipForTrick("hover") });
          await trickWait(state, 3000 + Math.random() * 2000);
          if (!state.cancelled) {
            const reactions = [
              ["happy", "Not bad, mortal."],
              ["disgusted", "Is that a typo I smell?"],
              ["bored", "I could nap here. I have done worse."],
              ["sleepy", "Zzz. Wake me when the cursor moves."]
            ];
            const [reaction, line] = reactions[Math.floor(Math.random() * reactions.length)];
            setMood(reaction, { duration: 0, say: line });
            await trickWait(state, 900);
          }
        }
      } else if (peek) {
        const edge = Math.floor(Math.random() * 3);
        const target = edge === 0
          ? { x: 8 - rect.width * 0.5, y: Math.max(12, window.innerHeight * 0.35) }
          : edge === 1
            ? { x: window.innerWidth - rect.width * 0.5, y: Math.max(12, window.innerHeight * 0.35) }
            : { x: Math.max(12, window.innerWidth * 0.5 - rect.width / 2), y: 8 - rect.height * 0.55 };
        await animateTo(state, target, 900, { wave: 14, reducedMotion });
        if (!state.cancelled) {
          ghost.classList.remove("trails-active");
          await trickWait(state, 450);
          if (!state.cancelled) await animateTo(state, { x: target.x + (edge === 0 ? -rect.width * .55 : edge === 1 ? rect.width * .55 : 0), y: target.y + (edge === 2 ? -rect.height * .55 : 0) }, 330, { reducedMotion });
        }
      } else {
        return false;
      }
      if (!state.cancelled) await flyToHome(state, reducedMotion);
      return !state.cancelled;
    } finally {
      if (state.returningPromise) await state.returningPromise;
      cleanupTrick(state);
    }
  }

  function scheduleBlink() {
    window.clearTimeout(blinkTimer);
    blinkTimer = window.setTimeout(() => {
      if (currentMood !== "idle" || !ghost || document.hidden) {
        if (currentMood === "idle") scheduleBlink();
        return;
      }
      ghost.classList.add("blink");
      window.setTimeout(() => ghost?.classList.remove("blink"), 180);
      scheduleBlink();
    }, 3000 + Math.random() * 3000);
  }

  function onVisibilityChange() {
    visibilityRoot?.classList.toggle("animations-paused", document.hidden);
    if (activeTrick?.animation) {
      if (document.hidden) activeTrick.animation.pause();
      else activeTrick.animation.play();
    }
    if (!document.hidden && currentMood === "idle") scheduleBlink();
  }

  function init(ghostElement, bubbleElement, settingsReader) {
    ghost = ghostElement;
    bubble = bubbleElement;
    getSettings = settingsReader || getSettings;
    buildCharacter();
    visibilityRoot = ghost.getRootNode().querySelector(".ghostwriter-root") || ghost.parentElement;
    document.removeEventListener("visibilitychange", onVisibilityChange);
    document.addEventListener("visibilitychange", onVisibilityChange);
    onVisibilityChange();
    window.setMood = setMood;
    window.getMood = () => currentMood;
    window.preloadAll = preloadAll;
    window.GhostwriterMood = {
      init, setMood, getMood: () => currentMood, preloadAll, resetIdle, playTrick, cancelTrick,
      startFlight, stopFlight,
      isTrickActive: () => Boolean(activeTrick),
      isFlightActive: () => Boolean(activeTrick?.continuousFlight && !activeTrick.cancelled)
    };
    setMood("idle", { say: false });
    void preloadAll();
  }

  function preloadAll() {
    const paths = new Set([
      ...MOODS.map((mood) => imageForMood(mood)),
      ...[...AVAILABLE_EFFECTS]
        .map((name) => `assets/effects/${name}.png`)
    ]);
    return Promise.all([...paths].map((path) => new Promise((resolve) => {
      const image = new Image();
      image.onload = () => resolve({ path, available: true });
      image.onerror = () => resolve({ path, available: false });
      image.src = assetUrl(path);
    })));
  }

  function resetIdle(onIdle) {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(onIdle, 180000);
  }

  window.GhostwriterMood = {
    init, setMood, getMood: () => currentMood, preloadAll, resetIdle, playTrick, cancelTrick,
    startFlight, stopFlight,
    isTrickActive: () => Boolean(activeTrick),
    isFlightActive: () => Boolean(activeTrick?.continuousFlight && !activeTrick.cancelled)
  };
  window.setMood = setMood;
  window.getMood = () => currentMood;
  window.preloadAll = preloadAll;
  window.playTrick = playTrick;
})();
