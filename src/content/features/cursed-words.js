// Finds editable weak-word spans locally and provides replacement suggestions without an API key.

(() => {
  const CURSED_WORDS = [
    "in order to", "at the end of the day", "think outside the box", "game changer",
    "very", "really", "just", "basically", "actually", "literally", "quite", "somewhat",
    "things", "stuff", "a lot", "thing is", "needless to say"
  ];

  const LOCAL_SUGGESTIONS = {
    very: ["remarkably", "deeply", "exceptionally"],
    really: ["genuinely", "clearly", "undeniably"],
    just: ["simply", "only", "remove it"],
    basically: ["in essence", "fundamentally", "remove it"],
    actually: ["in fact", "indeed", "remove it"],
    literally: ["truly", "exactly", "remove it"],
    quite: ["rather", "especially", "remove it"],
    somewhat: ["slightly", "partly", "remove it"],
    things: ["details", "elements", "specifics"],
    stuff: ["materials", "details", "content"],
    "a lot": ["many", "substantially", "frequently"],
    "in order to": ["to", "so as to", "remove it"],
    "at the end of the day": ["ultimately", "in the end", "remove it"],
    "think outside the box": ["rethink the approach", "explore alternatives", "challenge assumptions"],
    "game changer": ["major shift", "breakthrough", "turning point"],
    "thing is": ["the point is", "however", "remove it"],
    "needless to say": ["remove it", "clearly", "of course"]
  };

  function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  function analyze(text) {
    const matches = [];
    for (const word of CURSED_WORDS) {
      const regex = new RegExp(`\\b${escapeRegex(word)}\\b`, "gi");
      for (const match of text.matchAll(regex)) {
        matches.push({
          word: match[0],
          normalized: word,
          start: match.index,
          end: match.index + match[0].length
        });
      }
    }
    matches.sort((a, b) => a.start - b.start || b.end - a.end);
    const filtered = [];
    for (const match of matches) {
      if (filtered.length === 0 || match.start >= filtered[filtered.length - 1].end) filtered.push(match);
    }
    const wordCount = (text.match(/\b[\p{L}\p{N}'’-]+\b/gu) || []).length;
    return {
      matches: filtered,
      wordCount,
      density: wordCount ? Math.min(1, filtered.length / wordCount) : 0
    };
  }

  function suggestions(word) {
    return LOCAL_SUGGESTIONS[word.toLowerCase()] || ["remove it", "choose a precise verb", "name the specific detail"];
  }

  function replaceRange(text, start, end, replacement) {
    return text.slice(0, start) + (replacement === "remove it" ? "" : replacement) + text.slice(end);
  }

  window.GhostwriterCursed = { CURSED_WORDS, analyze, suggestions, replaceRange };
})();
