# Ghostwriter

A no-build Manifest V3 Chrome extension: a grumpy, dramatic ghost editor floating above Google Docs. It captures only text the user selects and copies, never scrapes the Docs canvas, and offers optional explicitly confirmed replacement through the Google Docs API.

## Project tree

```text
manifest.json
src/
  background/
    service-worker.js
  content/
    content.js
    ghost.js
    ghost.css
    widget.css
    features/
      cursed-words.js
  options/
    options.html
    options.js
  popup/
    popup.html
    popup.js
assets/
  README.md
  ghost/
    ghost-smug.png
    ghost-angry.png
    ghost-impressed.png
  effects/
ghost-demo.html
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
5. To start continuous flight on the active Doc, open the Ghostwriter toolbar popup and choose **Start continuous flight**. The popup closes and the ghost patrols the visible page along slow, varied curves. Reopen the popup and choose **Stop continuous flight** to return it home. The Doc must have been refreshed since the extension was loaded.
6. To summon it and capture a selection from the keyboard, use **Ctrl+Shift+Y** (macOS: **Command+Shift+Y**). Change the shortcut at `chrome://extensions/shortcuts`.
7. After editing extension files, reload Ghostwriter from `chrome://extensions` and refresh the Docs tab.

To preview the character without opening Google Docs, open `ghost-demo.html` in Chrome. It has a button for every mood, a cycle control, a speech-bubble test, and **Trick me!** to preview a fly-by, writing-spot hover, or peek. The complete art inventory and missing images are listed in [assets/README.md](./assets/README.md).

## Set up the optional LLM

The Cursed words scan and its built-in suggestions work locally without an API key. Optional context-aware word suggestions use the service worker and require a configured provider.

1. Open the extension popup and select **Adjust my temperament**, or open the extension's **Options** page.
2. In [src/background/service-worker.js](./src/background/service-worker.js), replace the marked `API_ENDPOINT` and `API_MODEL` TODO values with your provider's chat-completions endpoint and model. The adapter expects a response shaped like `choices[0].message.content`; change `callLLM` if your provider differs.
3. In [manifest.json](./manifest.json), change `https://api.example.com/*` in `host_permissions` to your provider's origin. Reload the extension after changing the manifest.
4. Enter your API key on the settings page and save. It is stored in `chrome.storage.sync`, never hardcoded in the project.

The endpoint is intentionally a placeholder, not a working provider. Without a key, local Cursed words detection and built-in suggestions remain available.

## Connect Google Docs for writing

Direct editing is optional; **Copy result** and ordinary paste continue to work without Google authorization.

1. In Google Cloud Console, enable the **Google Docs API** for your project and configure the OAuth consent screen. For personal testing, set the audience to **External**, keep the app in **Testing**, and add your Google account as a test user.
2. Create an OAuth client with application type **Chrome Extension**. In the client, enter the extension ID shown at `chrome://extensions` while Ghostwriter is loaded. If that ID changes, update the OAuth client and reload the extension.
3. The created client ID is configured in `manifest.json`; the extension requests the `https://www.googleapis.com/auth/documents` scope. Reload Ghostwriter at `chrome://extensions`, then open its toolbar popup and select **Connect Google Docs**. Sign in with the test account and approve the permission.
4. To replace a passage, capture a selection and choose a Cursed words suggestion, click **Exorcise filler words**, or edit the text in the box. Review the proposed revision and click **Replace in Doc** to confirm. Ghostwriter changes the captured passage only when it finds one unique match in ordinary paragraph text (whitespace differences are ignored); the service worker supplies the fetched revision ID so concurrent changes prevent the edit. If authorization is missing or the match is missing, ambiguous, or unsupported, the panel result remains available to copy/paste.

The Docs scope grants Ghostwriter read/write access to documents your Google account can access; it is broader than access to only the currently open document. The access token is managed by Chrome Identity and is never placed in the page, the extension settings, or source code. Disconnect/revoke access from your Google Account's third-party connections if you no longer want to use direct replacement.

## Test on a Google Doc

1. In a Doc, select a paragraph containing weak words such as “very”, “really”, or “basically”.
2. Press **Ctrl+Shift+Y** (or **Command+Shift+Y** on Mac). Ghostwriter opens and tries to copy the active selection, then reads the clipboard.
3. If clipboard capture is blocked or empty, paste the text into the editable box. The extension does not inspect the rendered page.
4. Use **Cursed words** to find common filler phrases. Click a fog cloud to reveal local alternatives or optional context-aware suggestions. Select a suggestion to update the preview in the extension panel.
5. Click **Exorcise filler words** to remove all locally detected filler phrases from the preview.
6. Review the proposed text and click **Replace in Doc** to confirm the change. Ghostwriter updates its captured-text baseline after a successful replacement, so you can edit and replace the same passage again. To work on a different passage, select and copy it from Docs or select all text in the widget before pasting the new passage; the paste becomes the new replacement target. Direct edits require one unique match (whitespace differences are ignored); **Copy result** and ordinary paste remain the fallback.

Personality, optional synthesized sounds, and the Tricks toggle/frequency are configurable in Options. Tricks are enabled by default; their normal schedule is 45–120 seconds. Sound is muted by default.

## Known limitations

- **Canvas rendering:** Google Docs renders document text on a canvas. Ghostwriter does not query page elements to recover the document text.
- **Clipboard capture:** Selection capture relies on Docs responding to a copy command and the browser allowing clipboard read access. If that fails, paste the selection into the editable text box.
- **Direct editing is optional and guarded:** Google Docs authorization uses a broad Docs read/write scope. Clicking **Replace in Doc** shows a brief smoke-puff animation near the captured selection when the browser exposes its position, briefly strikes through the matched passage, restores its original strikethrough formatting, then applies the proposed replacement. The visual puff is best-effort because Docs renders text on a canvas. Direct replacement supports only a unique match in regular paragraph text; matching ignores whitespace differences but remains case-sensitive. Tables, complex embedded content, missing matches, repeated text, and selections including the final paragraph mark are not edited; use copy/paste instead.
- **Clipboard capture:** Selection capture relies on Docs responding to a copy command and the browser allowing clipboard read access. If that fails, paste the text into the editable box. For direct replacement, the pasted text must still match exactly once in the Doc.
- **Provider setup:** The LLM endpoint and model are TODOs until configured for a provider; the matching provider origin must be allowed in `host_permissions`.
- **Ghost tricks:** Automatic fly-bys, writing-spot hovers, and edge peeks are visual only. Docs cursor selectors are undocumented, so the ghost falls back to the current selection, last pointer location, or editor/viewport center. Automatic tricks cancel on input; manually started continuous flight stays active until stopped from the popup. Reduced-motion mode uses fades instead of flight.
- **Trick timing:** Automatic tricks run only while the widget is enabled and closed, and pause while typing or when the tab is hidden. Frequency can be set to Rare, Normal, or Chaotic in Options. Manual continuous flight is an explicit override and can be stopped from the popup.

## 30–45 second demo script

**0:00–0:12 — Summon and capture.** In a Google Doc, select a deliberately rough paragraph and press **Ctrl+Shift+Y** (Mac: **Command+Shift+Y**). Say: “The ghost editor has arrived. It copies only what I select; it cannot read the Docs canvas.”

**0:12–0:25 — Find filler words.** Show the local Cursed words scan. Say: “Apparently ‘very’ and ‘basically’ have offended the afterlife.” Tap a fog cloud and choose a replacement, then use **Exorcise filler words** to remove all recognized phrases.

**0:25–0:45 — Apply the revision.** Choose a suggestion or click **Exorcise filler words**, review the preview, and select **Replace in Doc** to apply it when authorized and uniquely matched. Otherwise, copy the result and paste it into Docs. Close with: “No document text was scraped from the page.”

## Ideas to extend

- Add writing sprints with a timer and gentle ghost nudges.
- Track editing streaks across sessions.
- Add a pumpkin word-goal tracker for daily writing targets.
- Add quizzes that teach concise, concrete writing.
- Add a summary spirit for long selected passages.
- Build a Google Apps Script version that can edit a document directly with explicit user authorization.
