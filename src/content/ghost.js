// Draws Ghostwriter's reusable inline-SVG character and owns all mood transitions and quips.

(() => {
  const quips = {
    grumpy: {
      idle: ["Proceed. I have all eternity, apparently.", "Your sentence is making me haunt the margins.", "I am listening. Regrettably."],
      happy: ["Well. That sentence has a pulse.", "Acceptable prose. Don't make me repeat myself.", "A rare improvement. I am moved."],
      bored: ["I died waiting for a stronger verb.", "Is this sentence going somewhere? I have a crypt to haunt.", "Wake me when the point arrives."],
      suspicious: ["That phrasing has suspiciously polished shoes.", "I distrust this sentence on principle.", "Something here smells freshly generated."],
      disgusted: ["I have seen tombstones with better phrasing.", "That filler is doing absolutely nothing.", "The cliché has returned. It never learns."],
      angry: ["This sentence has tested my patience beyond the grave.", "Enough filler. Even the dead have standards.", "I am becoming editorially unavailable."],
      furious: ["THIS PROSE HAS SUMMONED MY FINAL FORM.", "I AM NOT HAUNTING THIS MANY FILLER WORDS.", "THE DRAMA IS MINE. THE CLICHÉS ARE YOURS."],
      scared: ["That score is a guess. Still… unsettling.", "I am not saying robot. I am saying uncanny.", "Something is off. Probably the sentence."],
      possessed: ["The sentence is wearing someone else's face.", "A robotic aura. No authorship verdict, naturally.", "I sense a suspiciously smooth rhythm."],
      smug: ["You chose the stronger word. I noticed.", "The exorcism worked. Try not to look surprised.", "A crisp edit. I shall pretend not to care."],
      impressed: ["Oh. That was… unexpectedly good.", "I am impressed. This is deeply inconvenient.", "Fine. You may keep that sentence."],
      sad: ["You rejected every suggestion. I shall recover.", "A tiny tear for a missed opportunity.", "I will be here, in the margins."],
      excited: ["A new voice! Finally, some theatrical ambition.", "Channeling begins. Try not to interrupt the dead.", "Excellent. The séance has taste."],
      mischievous: ["I have a suggestion. It may improve your sentence.", "Let's make this prose interesting. For once.", "The fog is hiding something. Tap it."],
      sleepy: ["I died waiting for you to finish this sentence.", "Three minutes of silence. My specialty.", "Wake me when the draft is less eternal."]
    },
    sweet: {
      idle: ["I'm here whenever you're ready, dear.", "No rush. Even ghosts can be patient.", "Your draft is safe with me."],
      happy: ["Lovely work! That sentence is glowing.", "You found just the right words.", "I knew you had a beautiful line in you."],
      bored: ["A little more sparkle, perhaps?", "This sentence could use a gentle nudge.", "Let's wake this paragraph together."],
      suspicious: ["This sounds a little too polished, dear.", "Let's add a little more of your voice.", "A tiny robotic aura, not a verdict."],
      disgusted: ["We can make this kinder to the reader.", "A small edit could help this phrase bloom.", "Let's gently release that cliché."],
      angry: ["Even a friendly ghost needs a pause.", "Let's take a breath and trim the clutter.", "I believe in this sentence. Truly."],
      furious: ["OH DEAR, THAT IS A LOT OF FILLER.", "LET'S GIVE THIS SENTENCE A FRESH START.", "EVEN GHOSTS NEED A LITTLE SPACE."],
      scared: ["It's only a style guess, dear. No proof.", "A curious little score. Let's look closer.", "No need to worry; this is just a signal."],
      possessed: ["A little robotic aura, but we can soften it.", "Let's bring a little more human rhythm back.", "Not a verdict, just a gentle style nudge."],
      smug: ["Nicely done! That word fits beautifully.", "You made a thoughtful choice.", "There, much clearer. I'm proud of you."],
      impressed: ["Oh my, that is wonderful.", "I may faint from admiration.", "What a lovely turn of phrase!"],
      sad: ["That's okay. We can try another way.", "No pressure; your voice is yours.", "I'll be here if you'd like another suggestion."],
      excited: ["How exciting! Let's invite another voice.", "The séance is ready, dear.", "Let's make a little writing magic."],
      mischievous: ["A little fog makes editing more fun.", "Tap the cloud. I promise it's mostly harmless.", "Shall we coax a better word out?"],
      sleepy: ["I waited ever so patiently, dear.", "A little writing break? I understand.", "Wake me whenever you're ready."]
    },
    sarcastic: {
      idle: ["Take your time. I have no pulse.", "The suspense is absolutely unbearable.", "Another draft. How original."],
      happy: ["Well, look at you. Competent prose.", "A good sentence. I'll alert the afterlife.", "You did it. Try not to peak."],
      bored: ["Thrilling. The verb is still asleep.", "I have been dead for centuries; this is worse.", "That sentence needs a plot twist."],
      suspicious: ["Did a robot iron this sentence?", "Very polished. Almost suspiciously so.", "I have questions about that rhythm."],
      disgusted: ["Ah, another cliché. How refreshingly predictable.", "Those filler words are doing a group project badly.", "A phrase so tired it joined me."],
      angry: ["My patience has left the séance.", "This sentence has made the ghost sigh.", "I can't believe I died for this draft."],
      furious: ["CONGRATULATIONS. YOU ANNOYED A GHOST.", "THIS SENTENCE HAS ACHIEVED PEAK DRAMA.", "I AM SCREAMING. EDITORIALY SPEAKING."],
      scared: ["A high score. It is still not proof, obviously.", "That sentence is giving uncanny valley.", "I am concerned. And dead. Mostly dead."],
      possessed: ["Robotic aura detected. Your toaster denies everything.", "This rhythm is suspiciously symmetrical.", "Not an authorship test. Just a vibe check."],
      smug: ["I was right. A familiar sensation.", "That edit is almost annoyingly good.", "There. Better. Was that so hard?"],
      impressed: ["I hate to admit this, but excellent.", "Well. I may faint. Again.", "A sentence worthy of the living."],
      sad: ["Rejected. Much like my old band.", "Fine. Keep the filler. I won't judge. Much.", "I am not crying. Ghosts have condensation."],
      excited: ["Finally, an excuse to impersonate the dead.", "A séance. This should end normally.", "Let's borrow a voice, not a whole book."],
      mischievous: ["Tap the fog. What could possibly go wrong?", "I hid a better word in the cloud.", "Let's cause a tasteful little revision."],
      sleepy: ["Three minutes. Not that I was counting.", "I have been dead less bored than this.", "Wake me when the prose rises."]
    }
  };

  const validMoods = new Set([
    "idle", "happy", "bored", "suspicious", "disgusted", "angry", "furious",
    "scared", "possessed", "smug", "impressed", "sad", "excited", "mischievous", "sleepy"
  ]);
  let ghost = null;
  let bubble = null;
  let getSettings = () => ({ personality: "grumpy", sound: false });
  let idleTimer = 0;
  let idleAnimationTimer = 0;
  let moodTimer = 0;

  function chooseQuip(mood, personality) {
    const bank = quips[personality] || quips.grumpy;
    const choices = bank[mood] || bank.idle;
    return choices[Math.floor(Math.random() * choices.length)];
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
      for (const note of notes) {
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
        offset += note.duration * 0.8;
        if (offset >= notes.reduce((sum, item) => sum + item.duration, 0) * 0.8) {
          oscillator.onended = () => void audio.close();
        }
      }
    } catch {
      // Audio is decorative; browser autoplay restrictions should not interrupt editing.
    }
  }

  function setMood(mood, options = {}) {
    if (!ghost || !validMoods.has(mood)) return;
    const { duration = mood === "idle" ? 0 : 2800, say = true } = options;
    ghost.className = `ghost mood-${mood}`;
    const panel = ghost.getRootNode().querySelector(".ghost-panel");
    panel?.classList.toggle("furious-shake", mood === "furious");
    if (say && bubble) {
      const settings = getSettings();
      const line = chooseQuip(mood, settings.personality);
      bubble.textContent = mood === "furious" ? line.toUpperCase() : line;
      bubble.className = `speech-bubble bubble-${mood}`;
      bubble.hidden = false;
    } else if (mood === "idle" && bubble) {
      bubble.hidden = true;
    }
    if (mood === "idle") scheduleIdleAnimation();
    playMoodSound(mood);
    window.clearTimeout(moodTimer);
    if (duration > 0) {
      moodTimer = window.setTimeout(() => setMood("idle", { say: false }), duration);
    }
  }

  function scheduleIdleAnimation() {
    window.clearTimeout(idleAnimationTimer);
    idleAnimationTimer = window.setTimeout(() => {
      if (!ghost?.classList.contains("mood-idle")) return;
      const animation = Math.random() < 0.65 ? "blink" : (Math.random() < 0.5 ? "look-left" : "look-right");
      ghost.classList.add(animation);
      window.setTimeout(() => ghost?.classList.remove(animation), 380);
      scheduleIdleAnimation();
    }, 1700 + Math.random() * 3600);
  }

  function init(ghostElement, bubbleElement, settingsReader) {
    ghost = ghostElement;
    bubble = bubbleElement;
    getSettings = settingsReader || getSettings;
    window.setMood = setMood;
    setMood("idle", { say: false });
  }

  function resetIdle(onIdle) {
    window.clearTimeout(idleTimer);
    idleTimer = window.setTimeout(onIdle, 180000);
  }

  window.GhostwriterMood = { init, resetIdle };
})();
