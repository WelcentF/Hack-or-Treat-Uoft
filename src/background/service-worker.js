// Validates feature messages and routes all external LLM requests through one swappable function.

const API_ENDPOINT = "https://api.example.com/v1/chat/completions"; // TODO: Replace with your provider endpoint.
const API_MODEL = "gpt-4o-mini";
const MESSAGE_TYPES = new Set(["CURSED_SYNONYMS"]);
const MAX_REPLACEMENT_LENGTH = 20000;
const MAX_DOC_WRITE_LENGTH = 2360;
const DOC_WRITE_CHUNK_SIZE = 40;
const DOC_WRITE_INTERVAL_MS = 1100;
const activeDocWrites = new Map();
const PERSONALITY_FLAVOR = {
  grumpy: "You are a grumpy, dramatic ghost editor: dry, judgmental, and secretly rooting for the writer.",
  sweet: "You are a sweet, encouraging ghost editor: gentle, warm, and supportive without being saccharine.",
  sarcastic: "You are a sarcastic ghost editor: witty, theatrical, and sharp, but still helpful."
};

/**
 * @typedef {"CURSED_SYNONYMS"} GhostRequestType
 * @typedef {{type: "CURSED_SYNONYMS", requestId: string, payload: {word: string, sentence: string}}} GhostRequest
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
        Authorization: "Bearer " + apiKey.trim(),
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

  throw new Error("An unknown spell crossed the message channel.");
}

function getCachedGoogleToken() {
  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken({ interactive: false }, (token) => {
      const error = chrome.runtime.lastError;
      if (error) {
        reject(new Error("Connect Google Docs first: open the Ghostwriter popup and choose “Connect Google Docs”."));
        return;
      }
      if (!token) {
        reject(new Error("Connect Google Docs first: open the Ghostwriter popup and choose “Connect Google Docs”."));
        return;
      }
      resolve(token);
    });
  });
}

function collectDocumentBodies(documentData) {
  const bodies = [];
  function visitTabs(tabs) {
    for (const tab of tabs || []) {
      const tabId = tab.tabProperties?.tabId;
      const body = tab.documentTab?.body;
      if (body) bodies.push({ body, tabId, tabTitle: tab.tabProperties?.title || "Untitled tab" });
      visitTabs(tab.childTabs);
    }
  }
  visitTabs(documentData.tabs);
  if (!bodies.length && documentData.body) {
    bodies.push({ body: documentData.body, tabId: null, tabTitle: "Document body" });
  }
  return bodies;
}

// Keep a UTF-16-offset-to-Docs-index map so text split across styling runs still matches safely.
function flattenBody(body, tabId) {
  let text = "";
  const indexes = [];
  let cursor = body.content?.[0]?.startIndex ?? 1;

  function appendGap() {
    text += "\u0000";
    indexes.push(null);
  }

  for (const structuralElement of body.content || []) {
    if (!structuralElement.paragraph) {
      appendGap();
      cursor = structuralElement.endIndex ?? cursor + 1;
      continue;
    }

    let paragraphCursor = structuralElement.startIndex ?? cursor;
    for (const item of structuralElement.paragraph.elements || []) {
      const itemStart = item.startIndex ?? paragraphCursor;
      if (typeof item.textRun?.content === "string") {
        const content = item.textRun.content;
        text += content;
        for (let offset = 0; offset < content.length; offset += 1) {
          indexes.push(itemStart + offset);
        }
        paragraphCursor = item.endIndex ?? itemStart + content.length;
      } else {
        appendGap();
        paragraphCursor = item.endIndex ?? itemStart + 1;
      }
    }
    cursor = structuralElement.endIndex ?? paragraphCursor;
  }

  return { text, indexes, tabId, bodyEndIndex: body.content?.at(-1)?.endIndex ?? null };
}

function normalizeWhitespace(text) {
  let normalized = "";
  const spans = [];
  let offset = 0;

  while (offset < text.length) {
    if (/\s/.test(text[offset])) {
      const start = offset;
      while (offset < text.length && /\s/.test(text[offset])) offset += 1;
      normalized += " ";
      spans.push({ start, end: offset });
    } else {
      normalized += text[offset];
      spans.push({ start: offset, end: offset + 1 });
      offset += 1;
    }
  }

  return { text: normalized, spans };
}

function findUniqueTextRange(documentData, selectedText) {
  const normalizedSelection = selectedText.replace(/\r\n/g, "\n").replace(/\s+/g, " ").trim();
  if (!normalizedSelection) {
    throw new Error("The copied selection contains no searchable text. Nothing was changed.");
  }
  const bodies = collectDocumentBodies(documentData).map(({ body, tabId, tabTitle }) => {
    const flattened = flattenBody(body, tabId);
    return {
      ...flattened,
      tabTitle,
      normalized: normalizeWhitespace(flattened.text)
    };
  });
  const matches = [];

  for (const body of bodies) {
    let offset = 0;
    while ((offset = body.normalized.text.indexOf(normalizedSelection, offset)) !== -1) {
      const firstSpan = body.normalized.spans[offset];
      const lastSpan = body.normalized.spans[offset + normalizedSelection.length - 1];
      const rawIndexes = body.indexes.slice(firstSpan.start, lastSpan.end);
      const startIndex = rawIndexes[0];
      const contiguous = startIndex !== null
        && startIndex !== undefined
        && rawIndexes.every((index, indexOffset) => index === startIndex + indexOffset);
      if (contiguous) {
        const finalIndex = rawIndexes.at(-1);
        matches.push({
          startIndex,
          endIndex: finalIndex + 1,
          tabId: body.tabId,
          tabTitle: body.tabTitle,
          bodyEndIndex: body.bodyEndIndex
        });
      }
      offset += 1;
    }
  }

  if (matches.length !== 1) {
    if (matches.length) {
      const tabCounts = new Map();
      for (const match of matches) {
        tabCounts.set(match.tabTitle, (tabCounts.get(match.tabTitle) || 0) + 1);
      }
      const locationSummary = [...tabCounts.entries()]
        .map(([title, count]) => `${title} (${count})`)
        .join(", ");
      throw new Error(
        `Google Docs found ${matches.length} matching passages across the document (ignoring whitespace differences): ${locationSummary}. Nothing was changed. Select a longer, unique passage.`
      );
    }
    throw new Error("I could not find the copied text in this Doc, even allowing whitespace differences. Nothing was changed. Recapture the current selection and try again.");
  }
  const match = matches[0];
  if (match.bodyEndIndex !== null && match.endIndex > match.bodyEndIndex - 1) {
    throw new Error("That selection includes the Doc's final paragraph mark. Nothing was changed; copy and paste the result instead.");
  }
  return match;
}

function getStrikethroughStyleRanges(documentData, targetRange) {
  const ranges = [];
  for (const { body, tabId } of collectDocumentBodies(documentData)) {
    if (targetRange.tabId && tabId !== targetRange.tabId) continue;
    for (const structuralElement of body.content || []) {
      for (const item of structuralElement.paragraph?.elements || []) {
        if (typeof item.textRun?.content !== "string") continue;
        const startIndex = Math.max(targetRange.startIndex, item.startIndex ?? targetRange.startIndex);
        const endIndex = Math.min(targetRange.endIndex, item.endIndex ?? startIndex + item.textRun.content.length);
        if (startIndex >= endIndex) continue;
        ranges.push({
          startIndex,
          endIndex,
          strikethrough: item.textRun.textStyle?.strikethrough === true
        });
      }
    }
  }
  return ranges;
}

async function updateDocument(documentId, token, revisionId, requests, action) {
  let response;
  try {
    response = await fetch(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          writeControl: { requiredRevisionId: revisionId },
          requests
        })
      }
    );
  } catch {
    throw new Error(`Google Docs could not ${action}. Check your connection.`);
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = data?.error?.message;
    throw new Error(typeof detail === "string"
      ? `Google Docs could not ${action}: ${detail}`
      : `Google Docs could not ${action} (HTTP ${response.status}).`);
  }
  if (typeof data?.writeControl?.requiredRevisionId !== "string") {
    throw new Error(`Google Docs did not return a revision check after it tried to ${action}.`);
  }
  return data.writeControl.requiredRevisionId;
}

async function replaceDocumentSelection(payload, sender) {
  const url = sender.url || sender.tab?.url || "";
  const documentId = url.match(/^https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (!documentId) throw new Error("Open a Google Doc and try again.");
  if (!isText(payload?.selectedText, MAX_REPLACEMENT_LENGTH)
    || typeof payload?.replacement !== "string"
    || payload.replacement.length > MAX_REPLACEMENT_LENGTH) {
    throw new Error("The selected text or replacement is empty or too long. Nothing was changed.");
  }

  const token = await getCachedGoogleToken();
  let documentResponse;
  try {
    documentResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}?includeTabsContent=true`,
      { headers: { Authorization: "Bearer " + token } }
    );
  } catch {
    throw new Error("Google Docs could not be reached. Check your connection; the document was not changed.");
  }
  const documentData = await documentResponse.json().catch(() => null);
  if (!documentResponse.ok) {
    const detail = documentData?.error?.message;
    if (documentResponse.status === 401 || documentResponse.status === 403) {
      throw new Error(`Google did not authorize this edit${detail ? `: ${detail}` : ""}. Reconnect Google Docs in the popup and confirm the Docs permission.`);
    }
    throw new Error(typeof detail === "string"
      ? `Google Docs returned an error: ${detail}`
      : `Google Docs returned HTTP ${documentResponse.status}. Nothing was changed.`);
  }
  if (typeof documentData?.revisionId !== "string") {
    throw new Error("Google Docs did not provide a revision check. Nothing was changed; copy and paste the result instead.");
  }

  const range = findUniqueTextRange(documentData, payload.selectedText);
  const tabRange = range.tabId ? { tabId: range.tabId } : {};
  const replacement = payload.replacement.replace(/\r\n/g, "\n");
  const strikethroughStyles = getStrikethroughStyleRanges(documentData, range);
  let revisionId = documentData.revisionId;
  try {
    revisionId = await updateDocument(
      documentId,
      token,
      revisionId,
      [{
        updateTextStyle: {
          range: { startIndex: range.startIndex, endIndex: range.endIndex, ...tabRange },
          textStyle: { strikethrough: true },
          fields: "strikethrough"
        }
      }],
      "strike through the passage"
    );
    await new Promise((resolve) => setTimeout(resolve, 320));
    revisionId = await updateDocument(
      documentId,
      token,
      revisionId,
      strikethroughStyles.map((style) => ({
        updateTextStyle: {
          range: {
            startIndex: style.startIndex,
            endIndex: style.endIndex,
            ...tabRange
          },
          textStyle: { strikethrough: style.strikethrough },
          fields: "strikethrough"
        }
      })),
      "restore the passage strikethrough formatting"
    );
  } catch (error) {
    const detail = error instanceof Error ? error.message : "The Docs update failed.";
    throw new Error(`${detail} The passage may still be struck through; check it before retrying.`);
  }

  let updateResponse;
  try {
    updateResponse = await fetch(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          writeControl: { requiredRevisionId: revisionId },
          requests: [
            { deleteContentRange: { range: { startIndex: range.startIndex, endIndex: range.endIndex, ...tabRange } } },
            ...(replacement ? [{
              insertText: { location: { index: range.startIndex, ...tabRange }, text: replacement }
            }] : [])
          ]
        })
      }
    );
  } catch {
    throw new Error("Google Docs could not apply the replacement. The document may be unchanged; verify it before retrying.");
  }
  const updateData = await updateResponse.json().catch(() => null);
  if (!updateResponse.ok) {
    const detail = updateData?.error?.message;
    throw new Error(typeof detail === "string"
      ? `Google Docs rejected the replacement: ${detail}`
      : `Google Docs rejected the replacement (HTTP ${updateResponse.status}). Nothing was changed.`);
  }
  return { message: "The uniquely matched selection was replaced in Google Docs." };
}

async function fetchGoogleDocument(documentId, token) {
  let response;
  try {
    response = await fetch(
      `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}?includeTabsContent=true`,
      { headers: { Authorization: "Bearer " + token } }
    );
  } catch {
    throw new Error("Google Docs could not be reached. Check your connection; nothing was written.");
  }
  const documentData = await response.json().catch(() => null);
  if (!response.ok) {
    const detail = documentData?.error?.message;
    if (response.status === 401 || response.status === 403) {
      throw new Error(`Google did not authorize this write${detail ? `: ${detail}` : ""}. Connect Google Docs from the extension popup.`);
    }
    throw new Error(typeof detail === "string"
      ? `Google Docs returned an error: ${detail}`
      : `Google Docs returned HTTP ${response.status}. Nothing was written.`);
  }
  if (typeof documentData?.revisionId !== "string") {
    throw new Error("Google Docs did not provide a revision check. Nothing was written.");
  }
  return documentData;
}

function sendDocWriteProgress(tabId, operationId, inserted, total, tabTitle) {
  void chrome.tabs.sendMessage(tabId, {
    type: "DOC_WRITE_PROGRESS",
    operationId,
    inserted,
    total,
    tabTitle
  }).catch(() => {});
}

async function typeTextAtDocumentEnd(payload, sender, operationId) {
  const tabId = sender.tab?.id;
  const url = sender.url || sender.tab?.url || "";
  const documentId = url.match(/^https:\/\/docs\.google\.com\/document\/d\/([a-zA-Z0-9_-]+)/)?.[1];
  if (typeof tabId !== "number" || !documentId) throw new Error("Open a Google Doc and try again.");
  if (!isText(payload?.text, MAX_DOC_WRITE_LENGTH)) {
    throw new Error(`Enter text between 1 and ${MAX_DOC_WRITE_LENGTH} characters to type into the Doc.`);
  }

  const operation = { tabId, cancelled: false };
  activeDocWrites.set(operationId, operation);
  try {
    const token = await getCachedGoogleToken();
    const documentData = await fetchGoogleDocument(documentId, token);
    const bodies = collectDocumentBodies(documentData);
    const target = bodies.at(-1);
    if (!target?.body) throw new Error("I could not find a writable document body. Nothing was written.");

    const flattened = flattenBody(target.body, target.tabId);
    if (!Number.isInteger(flattened.bodyEndIndex) || flattened.bodyEndIndex < 2) {
      throw new Error("Google Docs did not provide a valid insertion point. Nothing was written.");
    }
    let insertIndex = flattened.bodyEndIndex - 1;
    const text = payload.text.replace(/\r\n/g, "\n");
    const hasExistingText = flattened.text.replace(/[\s\u0000]/g, "").length > 0;
    const textToWrite = `${hasExistingText ? "\n" : ""}${text}`;
    const characters = Array.from(textToWrite);
    const chunks = [];
    for (let offset = 0; offset < characters.length; offset += DOC_WRITE_CHUNK_SIZE) {
      chunks.push(characters.slice(offset, offset + DOC_WRITE_CHUNK_SIZE).join(""));
    }

    let revisionId = documentData.revisionId;
    let insertedUtf16 = 0;
    const separatorLength = textToWrite.length - text.length;
    const visibleInserted = () => Math.min(text.length, Math.max(0, insertedUtf16 - separatorLength));
    let lastRequestAt = 0;
    const tabLocation = target.tabId ? { tabId: target.tabId } : {};
    sendDocWriteProgress(tabId, operationId, 0, text.length, target.tabTitle);

    for (const chunk of chunks) {
      if (operation.cancelled) break;
      const waitMs = DOC_WRITE_INTERVAL_MS - (Date.now() - lastRequestAt);
      if (lastRequestAt && waitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, waitMs));
      }
      if (operation.cancelled) break;

      let response;
      try {
        lastRequestAt = Date.now();
        response = await fetch(
          `https://docs.googleapis.com/v1/documents/${encodeURIComponent(documentId)}:batchUpdate`,
          {
            method: "POST",
            headers: {
              Authorization: "Bearer " + token,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              writeControl: { requiredRevisionId: revisionId },
              requests: [{
                insertText: {
                  location: { index: insertIndex, ...tabLocation },
                  text: chunk
                }
              }]
            })
          }
        );
      } catch {
        throw new Error(visibleInserted()
          ? `Writing stopped after ${visibleInserted()} characters because Google Docs could not be reached. The text already inserted remains in the Doc.`
          : "Google Docs could not be reached. Nothing was written.");
      }
      const updateData = await response.json().catch(() => null);
      if (!response.ok) {
        const detail = updateData?.error?.message;
        throw new Error(visibleInserted()
          ? `Writing stopped after ${visibleInserted()} characters: ${detail || `Google Docs returned HTTP ${response.status}`}. Text already inserted remains in the Doc.`
          : typeof detail === "string"
            ? `Google Docs rejected the write: ${detail}`
            : `Google Docs rejected the write (HTTP ${response.status}). Nothing was written.`);
      }
      insertedUtf16 += chunk.length;
      insertIndex += chunk.length;
      if (typeof updateData?.writeControl?.requiredRevisionId !== "string") {
        throw new Error(visibleInserted()
          ? `Writing stopped after ${visibleInserted()} characters because Docs did not return a revision check. The text already inserted remains in the Doc.`
          : "Google Docs did not return a revision check. Nothing further was written.");
      }

      revisionId = updateData.writeControl.requiredRevisionId;
      sendDocWriteProgress(tabId, operationId, visibleInserted(), text.length, target.tabTitle);
    }

    return {
      inserted: visibleInserted(),
      total: text.length,
      cancelled: operation.cancelled,
      tabTitle: target.tabTitle
    };
  } finally {
    activeDocWrites.delete(operationId);
  }
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_FLIGHT_STATUS" || message?.type === "TOGGLE_CONTINUOUS_FLIGHT") {
    chrome.tabs.query({ active: true, lastFocusedWindow: true })
      .then(([tab]) => {
        if (typeof tab?.id !== "number" || !tab.url?.startsWith("https://docs.google.com/document/")) {
          throw new Error("Open a Google Doc first. I refuse to haunt an empty tab.");
        }
        return chrome.tabs.sendMessage(tab.id, { type: message.type });
      })
      .then((response) => sendResponse(response))
      .catch((error) => sendResponse({
        ok: false,
        error: error instanceof Error
          ? error.message
          : "The Doc did not answer. Refresh it and summon me again."
      }));
    return true;
  }

  if (message?.type === "REPLACE_DOC_SELECTION") {
    if (typeof message.requestId !== "string" || !message.requestId) {
      sendResponse({
        type: "REPLACE_DOC_SELECTION_RESULT",
        ok: false,
        error: "This replacement request has no request token. Nothing was changed."
      });
      return false;
    }
    replaceDocumentSelection(message.payload, _sender)
      .then((data) => sendResponse({ type: "REPLACE_DOC_SELECTION_RESULT", requestId: message.requestId, ok: true, data }))
      .catch((error) => sendResponse({
        type: "REPLACE_DOC_SELECTION_RESULT",
        requestId: message.requestId,
        ok: false,
        error: error instanceof Error ? error.message : "The Doc replacement failed. Verify the document before retrying."
      }));
    return true;
  }

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
