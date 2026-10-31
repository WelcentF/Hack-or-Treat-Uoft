// Provides a transparent local robotic-style heuristic; scores are stylistic guesses, never authorship proof.

(() => {
  const STOCK_PHRASES = [
    /\bdelve(?:s|d|ing)?\b/i,
    /\btapestry\b/i,
    /\bit'?s important to note\b/i,
    /\bin today'?s fast-paced world\b/i,
    /\bnavigate the complexities\b/i,
    /\bin conclusion\b/i,
    /\bfurthermore\b/i,
    /\bmoreover\b/i
  ];

  function splitSentences(text) {
    return (text.match(/[^.!?]+[.!?]+["')\]]*|[^.!?]+$/g) || [])
      .map((sentence) => sentence.trim())
      .filter(Boolean);
  }

  function heuristic(sentence, neighbors = [], difficulty = "friendly") {
    let score = 0;
    const reasons = [];
    for (const phrase of STOCK_PHRASES) {
      if (phrase.test(sentence)) {
        score += 18;
        reasons.push("stock transition or polished phrase");
        break;
      }
    }
    const dashCount = (sentence.match(/[—–]/g) || []).length;
    if (dashCount >= 2) {
      score += Math.min(16, dashCount * 6);
      reasons.push("frequent em-dash rhythm");
    }
    if (/\bnot only\b[\s\S]*\bbut also\b/i.test(sentence)) {
      score += 12;
      reasons.push("balanced 'not only…but also' construction");
    }
    if (/(?:,| and )[^.!?]+(?:,| and )[^.!?]+(?:,| and )[^.!?]+/i.test(sentence)) {
      score += 9;
      reasons.push("neatly stacked rule-of-three list");
    }
    const words = sentence.match(/\b[\p{L}\p{N}'’-]+\b/gu) || [];
    const concrete = /\b\d+\b|[A-Z][a-z]+|\b(?:report|survey|street|date|company|person|study|budget|class|city|team|customer|experiment)\b/.test(sentence);
    if (words.length >= 9 && !concrete) {
      score += 14;
      reasons.push("few concrete names, numbers, or details");
    }
    if (neighbors.length) {
      const lengths = [sentence, ...neighbors].map((value) => (value.match(/\b[\p{L}\p{N}'’-]+\b/gu) || []).length);
      if (lengths.length >= 3 && Math.max(...lengths) - Math.min(...lengths) <= 4) {
        score += 12;
        reasons.push("neighboring sentences have unusually uniform length");
      }
    }
    if (words.length > 10 && !/[?!]/.test(sentence) && !/\b(I|we|my|our|you)\b/i.test(sentence)) {
      score += 7;
      reasons.push("formal, impersonal sentence shape");
    }

    const sensitivity = difficulty === "poltergeist" ? 1.25 : 0.78;
    const adjusted = Math.max(0, Math.min(100, Math.round(score * sensitivity)));
    if (!reasons.length) reasons.push("specificity and rhythm feel comparatively natural");
    return { score: adjusted, heuristicScore: adjusted, reason: reasons.join("; "), sentence };
  }

  function scan(text, difficulty = "friendly") {
    const sentences = splitSentences(text);
    return sentences.map((sentence, index) => {
      const neighbors = [sentences[index - 1], sentences[index + 1]].filter(Boolean);
      return heuristic(sentence, neighbors, difficulty);
    });
  }

  window.GhostwriterPossession = { splitSentences, heuristic, scan };
})();
