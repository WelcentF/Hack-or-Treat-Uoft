// Validates feature messages and routes all external LLM requests through one swappable function.

const API_ENDPOINT = "https://api.example.com/v1/chat/completions"; // TODO: Replace with your provider endpoint.
const API_MODEL = "gpt-4o-mini";
const MESSAGE_TYPES = new Set(["CURSED_SYNONYMS", "SEANCE", "POSSESSION_SCORE", "EXORCISE"]);
const PERSONALITY_FLAVOR = {
  grumpy: "You are a grumpy, dramatic ghost editor: dry, judgmental, and secretly rooting for the writer.",
  sweet: "You are a sweet, encouraging ghost editor: gentle, warm, and supportive without being saccharine.",
  sarcastic: "You are a sarcastic ghost editor: witty, theatrical, and sharp, but still helpful."
};

/**
 * @typedef {"CURSED_SYNONYMS" | "SEANCE" | "POSSESSION_SCORE" | "EXORCISE"} GhostRequestType
 * @typedef {{type: "CURSED_SYNONYMS", requestId: string, payload: {word: string, sentence: string}}
 *   | {type: "SEANCE", requestId: string, payload: {text: string, style: string}}
 *   | {type: "POSSESSION_SCORE", requestId: string, payload: {sentence: string}}
 *   | {type: "EXORCISE", requestId: string, payload: {sentence: string}}} GhostRequest
 * @typedef {{system: string, prompt: string, json?: boolean}} LLMCall
 */

/**
 * Sends one prompt to the configured provider and extracts either text or strict JSON.
 * Change only this function's endpoint, payload, and response parsing to swap providers.
 * @param {{system: string, prompt: string, json?: boolean}} request
 * @returns {Promise<string|object>}
 */
async function callLLM({ system, prompt, json = false }) {
  const { apiKey, personality } = await chrome.storage.sync.get(["apiKey", "personality"]);
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error("My crystal ball is empty. Add an API key in Ghostwriter's settings.");
  }
  const personalityPrompt = PERSONALITY_FLAVOR[personality] || PERSONALITY_FLAVOR.grumpy;

  let response;
  try {
    response = await fetch(API_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey.trim()}`
      },
      body: JSON.stringify({
        model: API_MODEL,
        messages: [
          { role: "system", content: `${personalityPrompt} ${system}` },
          { role: "user", content: prompt }
        ],
        ...(json ? { response_format: { type: "json_object" } } : {})
      })
    });
  } catch {
    throw new Error("The veil to the LLM service is down. Check your connection and endpoint.");
  }

  if (response.status === 401 || response.status === 403) {
    throw new Error("The spirits rejected that API key. Check it in Ghostwriter's settings.");
  }
  if (response.status === 429) {
    throw new Error("The service is overwhelmed. Even the dead must wait their turn.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.error?.message;
    throw new Error(typeof detail === "string"
      ? `The LLM service returned ${response.status}: ${detail}`
      : `The LLM service returned HTTP ${response.status}. Check its settings.`);
  }
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string" || !content.trim()) {
    throw new Error("The LLM returned a vacant answer. A very ghostly failure.");
  }
  if (!json) return content.trim();

  const cleaned = content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    throw new Error("The LLM sent malformed JSON. The séance has been adjourned.");
  }
}

function isText(value, maxLength = 12000) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

async function routeRequest(type, payload) {
  if (type === "CURSED_SYNONYMS") {
    if (!isText(payload?.word, 100) || !isText(payload?.sentence, 2000)) {
      throw new Error("The cursed-word request was incomplete. Try selecting text again.");
    }
    const result = await callLLM({
      system: "Suggest concise, context-appropriate replacements. Return JSON only as {\"suggestions\":[\"...\",\"...\",\"...\"]}.",
      prompt: `Word or phrase: ${payload.word}\nSentence context: ${payload.sentence}\nGive exactly three replacement suggestions. If deletion is better, one may be \"remove it\".`,
      json: true
    });
    if (!Array.isArray(result?.suggestions) || result.suggestions.length < 3
      || result.suggestions.slice(0, 3).some((item) => typeof item !== "string")) {
      throw new Error("The suggestions arrived in an unfamiliar form. Use the local suggestions instead.");
    }
    return { suggestions: result.suggestions.slice(0, 3) };
  }

  if (type === "SEANCE") {
    if (!isText(payload?.text) || !isText(payload?.style, 1000)) {
      throw new Error("The séance needs selected text and a voice. Try again.");
    }
    const text = await callLLM({
      system: `You are a style-conscious writing editor. ${payload.style} Preserve the original meaning and facts. Change only the voice. Do not copy or quote any existing author's text. Return only the rewritten text.`,
      prompt: payload.text
    });
    return { text };
  }

  if (type === "POSSESSION_SCORE") {
    if (!isText(payload?.sentence, 3000)) {
      throw new Error("That sentence slipped through the veil. Try the scan again.");
    }
    const result = await callLLM({
      system: "Judge writing STYLE only: generic/robotic versus specific/human. Never infer or claim authorship. Return strict JSON only: {\"score\": number from 0 to 100, \"reason\": \"short explanation\"}.",
      prompt: `Rate the style of this sentence. A higher score means a more generic or robotic style, not evidence of AI authorship.\n\n${payload.sentence}`,
      json: true
    });
    const score = Number(result?.score);
    if (!Number.isFinite(score) || score < 0 || score > 100 || typeof result?.reason !== "string") {
      throw new Error("The style judgment was malformed. The local guess remains available.");
    }
    return { score: Math.round(score), reason: result.reason.slice(0, 500) };
  }

  if (type === "EXORCISE") {
    if (!isText(payload?.sentence, 3000)) {
      throw new Error("The sentence vanished before exorcism. Scan it again.");
    }
    const text = await callLLM({
      system: "Rewrite the sentence in a specific, natural human voice. Add concrete details only when supported by the source; do not invent facts. Vary rhythm and preserve meaning. Return only the rewritten sentence.",
      prompt: payload.sentence
    });
    return { text };
  }

  throw new Error("An unknown spell crossed the message channel.");
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!MESSAGE_TYPES.has(message?.type)) return false;
  const { type, payload, requestId } = message;
  if (typeof requestId !== "string" || !requestId) {
    sendResponse({
      type: `${type}_RESULT`,
      ok: false,
      error: "This spell has no request token. Try again."
    });
    return false;
  }
  routeRequest(type, payload)
    .then((data) => sendResponse({ type: `${type}_RESULT`, requestId, ok: true, data }))
    .catch((error) => sendResponse({
      type: `${type}_RESULT`,
      requestId,
      ok: false,
      error: error instanceof Error ? error.message : "The séance failed for reasons unknown."
    }));
  return true;
});

chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-writing-assistant") return;
  const [tab] = await chrome.tabs.query({ active: true, lastFocusedWindow: true });
  if (typeof tab?.id !== "number" || !tab.url?.startsWith("https://docs.google.com/document/")) return;
  try {
    await chrome.tabs.sendMessage(tab.id, { type: "OPEN_AND_CAPTURE" });
  } catch {
    // A Docs tab opened before installation needs a refresh to receive its content script.
  }
});
