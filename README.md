# Ghostwriter

A no-build Manifest V3 Chrome extension: a grumpy, dramatic ghost editor floating above Google Docs. It captures only text the user selects and copies; it never scrapes the Docs canvas or edits the document directly.

## Project tree

```text
manifest.json
src/
  background/
    service-worker.js
  content/
    content.js
    ghost.js
    widget.css
    features/
      cursed-words.js
      possession.js
      seance.js
  options/
    options.html
    options.js
  popup/
    popup.html
    popup.js
icons/
  icon16.png
  icon48.png
  icon128.png
README.md
```

## Load unpacked

1. Open `chrome://extensions` and enable **Developer mode**.
2. Select **Load unpacked** and choose this project folder.
3. Open or refresh a Google Doc at `https://docs.google.com/document/...`.
4. The ghost floats in the bottom-right. Drag the ghost to move it; click it to open the editor.
5. To summon it and capture a selection from the keyboard, use **Ctrl+Shift+Y** (macOS: **Command+Shift+Y**). Change the shortcut at `chrome://extensions/shortcuts`.
6. After editing extension files, reload Ghostwriter from `chrome://extensions` and refresh the Docs tab.

## Set up the optional LLM

Cursed-word detection and the initial robotic-aura scan run locally without an API key. Séance rewriting, sentence exorcism, word suggestions from the LLM, and possession-score refinement use the service worker and require a configured provider.

1. Open the extension popup and select **Adjust my temperament**, or open the extension's **Options** page.
2. In [src/background/service-worker.js](./src/background/service-worker.js), replace the marked `API_ENDPOINT` and `API_MODEL` TODO values with your provider's chat-completions endpoint and model. The adapter expects a response shaped like `choices[0].message.content`; change `callLLM` if your provider differs.
3. In [manifest.json](./manifest.json), change `https://api.example.com/*` in `host_permissions` to your provider's origin. Reload the extension after changing the manifest.
4. Enter your API key on the settings page and save. It is stored in `chrome.storage.sync`, never hardcoded in the project.

The endpoint is intentionally a placeholder, not a working provider. With no key, local features remain available and provider-only features explain that the spirits are unavailable.

## Test on a Google Doc

1. In a Doc, select a paragraph containing weak words such as “very”, “really”, or “basically”.
2. Press **Ctrl+Shift+Y** (or **Command+Shift+Y** on Mac). Ghostwriter opens and tries to copy the active selection, then reads the clipboard.
3. If clipboard capture is blocked or empty, paste the text into the editable box. The extension does not inspect the rendered page.
4. Open **Cursed words**. The local scan covers weak phrases with fog. Tap a cloud to reveal replacement ideas; without an API key, it uses the local synonym map. Select a suggestion to revise the text in the extension panel. **Exorcism: remove all** removes detected phrases from that panel's editable copy.
5. Open **Robotic aura** and select **Scan for robotic aura**. Local heuristic scores appear immediately. If configured, the LLM refines the style scores. Select **Exorcise sentence** on a flagged sentence to rewrite it.
6. Open **Séance**, choose a voice, and begin the séance. When the provider is configured, the rewrite appears with a typewriter effect.
7. Select **Copy result**, then paste it into Google Docs with **Ctrl+V** or **Command+V**. Ghostwriter never deletes or inserts document content itself.

Personality, difficulty, and optional synthesized sounds are configurable in Options. Sound is muted by default.

## Known limitations

- **Canvas rendering:** Google Docs renders document text on a canvas. Ghostwriter does not query page elements to recover the document text.
- **Clipboard capture:** Selection capture relies on Docs responding to a copy command and the browser allowing clipboard read access. If that fails, paste the selection into the editable text box.
- **Visual-only erasing:** Cursed-word exorcism and sentence rewrites change only the extension's editable copy. They do not delete, replace, or insert text in the document. Copy and paste the result yourself.
- **AI detection is a guess:** The possession detector checks stylistic signals, not authorship. Sentence-level scores are unreliable and are never proof that text was written by AI.
- **Provider setup:** The LLM endpoint and model are TODOs until configured for a provider; the matching provider origin must be allowed in `host_permissions`.
- **Voice styles:** Séance voices describe broad stylistic traits, not long passages or direct imitation.
- **Session tricks:** The bat, cobweb, and surprise compliment are intentionally occasional, so a trick may not appear in every session.

## 60–90 second demo script

**0:00–0:12 — Summon and capture.** In a Google Doc, select a deliberately rough paragraph and press **Ctrl+Shift+Y** (Mac: **Command+Shift+Y**). Say: “The ghost editor has arrived. It copies only what I select; it cannot read the Docs canvas.”

**0:12–0:25 — Let the ghost judge.** Show the mood tint and the local Cursed words scan. Say: “Apparently ‘very’ and ‘basically’ have offended the afterlife.” Tap a fog cloud and choose a replacement. Run **Exorcism: remove all** to show the visual scratch effect; point out that this edits only the panel copy.

**0:25–0:42 — Catch the robotic aura.** Switch to **Robotic aura** and scan a sentence like “In today’s fast-paced world, it is important to note that innovation can navigate the complexities of modern life.” Show the instant heuristic result, the disclaimer, and the optional LLM refinement. Say: “A style guess, not proof of authorship.” Exorcise the flagged sentence.

**0:42–1:05 — Call a spirit.** Switch to **Séance**, choose **Victorian gothic narrator**, and begin. Let the candles flicker and the typewriter reveal the rewritten passage. Say: “Meaning and facts stay; only the voice is borrowed.”

**1:05–1:15 — Copy, paste, and faint.** Show the ghost's impressed faint, select **Copy result**, then paste into Docs with **Ctrl+V** or **Command+V**. Close with: “No document text was scraped, and nothing was erased behind your back.”

## Ideas to extend

- Add writing sprints with a timer and gentle ghost nudges.
- Track editing streaks across sessions.
- Add a pumpkin word-goal tracker for daily writing targets.
- Add quizzes that teach concise, concrete writing.
- Add a summary spirit for long selected passages.
- Build a Google Apps Script version that can edit a document directly with explicit user authorization.
