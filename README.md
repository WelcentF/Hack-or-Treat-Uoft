# Ghostwriter

Ghostwriter is a Manifest V3 Chrome extension that adds a floating writing assistant to Google Docs. Paste or type text into the widget to find common filler words, review suggestions, and prepare a revision. The extension does not scrape document text from Google Docs' canvas. With Google authorization, users can explicitly apply a revision when the selected passage has one unique match in the document.

The widget features a draggable ghost, animated moods, a Ghost approval color indicator, cyan-highlighted revision changes, and a sound effect when applying edits.

## Tech stack

- Chrome Extensions Manifest V3
- Vanilla JavaScript, HTML, and CSS; no build step
- Shadow DOM for isolating the Docs widget
- Google Docs API and Chrome Identity for authorized document edits
- `chrome.storage.sync` for extension preferences
- CSS animations and a bundled MP3 sound effect

## How it works

Ghostwriter is a Manifest V3 extension with no build step and no framework. It runs as
three cooperating pieces: a set of content scripts injected into Google Docs, a background
service worker that owns every network call, and the popup/options pages that write
preferences into `chrome.storage.sync`.

Content scripts are injected only on `https://docs.google.com/document/*`, in this order:

    src/content/ghost.js              character, moods, speech, animation, tricks
    src/content/features/cursed-words.js   local filler-word detection and suggestions
    src/content/content.js            the widget, panel UI, and all orchestration

The first two scripts attach themselves to `window` (`GhostwriterMood`, `GhostwriterCursed`)
and `content.js` consumes them.

### Repository layout

    manifest.json                     permissions, content scripts, OAuth client, hotkey
    src/background/service-worker.js  LLM calls + all Google Docs API writes
    src/content/content.js            widget mount, panel, capture/revise/apply flow
    src/content/ghost.js              mood engine, speech bubbles, flight and tricks
    src/content/ghost.css             ghost artwork, mood motion, flight trail
    src/content/widget.css            panel, fog chips, approval meter, smoke effects
    src/content/features/             filler-word list; two dormant feature modules
    src/popup/                        connect Google Docs, summon/dismiss, flight toggle
    src/options/                      API key, personality, sound, trick frequency
    ghost-demo.html                   standalone mood/trick preview, no extension needed

### The widget

`content.js` mounts a single host `<div id="ghostwriter-extension-root">` on
`document.documentElement` and attaches an open Shadow DOM to it. Both stylesheets are
loaded inside that shadow root as `<link>` elements pointing at web-accessible resources,
so Docs' own CSS and the widget's CSS cannot affect each other.

Inside the shadow root are three things: a draggable summon button containing the ghost, a
speech bubble, and the editing panel. The summon button tracks pointer drags via pointer
capture and distinguishes a drag from a click, so dragging the ghost around the screen
never opens the panel.

**Text never comes from the Doc itself.** The extension does not read Google Docs' canvas.
You paste or type into the panel's textarea. When a paste replaces the whole passage, that
text is stored as the *captured passage* — the anchor later used to locate the original in
the document. The `Ctrl+Shift+Y` / `Cmd+Shift+Y` hotkey opens the panel and focuses the
textarea so you can paste immediately.

### Finding filler words

`features/cursed-words.js` holds a hardcoded list of 17 filler words and phrases plus a
table of replacement suggestions for each. `analyze()` runs a case-insensitive,
word-boundary regex for every entry, collects all matches, then resolves overlaps by
sorting on start position (longest wins ties) and greedily keeping non-overlapping hits.
It returns the matches, a word count, and a `density` of filler words to total words.

Every match renders in the panel as a `☁ Fogged` chip. Clicking one extracts the
surrounding sentence and asks the service worker for context-aware alternatives. If there
is no API key, the network fails, or the response is malformed, it silently falls back to
the built-in suggestion table — the feature works fully offline. Accepting a suggestion
rewrites the textarea, tidies up doubled spaces and spaces before punctuation, and
re-scans.

### The approval meter and the ghost's mood

Both are driven by the same filler density. Density is converted to a disapproval score,
inverted into an approval percentage, and mapped onto a continuous HSL hue ramp from red
through amber to green, so the bar shifts color as you clean up the text. The same density
picks the ghost's reaction: happy below the threshold, disgusted above it, angry well
above.

### Showing what changed

The revision pane does a token-level diff between the captured passage and the current
text. It builds a longest-common-subsequence table over tokens (words, whitespace, and
punctuation kept separate) and wraps inserted or altered tokens in a highlight span. For
very large passages, where the table would exceed 400,000 cells, it falls back to trimming
the common prefix and suffix and marking everything between them.

### Applying a revision to the document

"Exorcise words" is enabled only when there is a captured original, a proposed revision,
and the two differ. It sends the original and replacement to the service worker, which does
the real work:

1. Extracts the document ID from the sender tab's URL.
2. Requests a cached OAuth token non-interactively — you must click **Connect Google Docs**
   in the popup once; the extension never pops up an auth window on its own.
3. Fetches the document with `includeTabsContent=true` and walks all tabs recursively.
4. Flattens each body into plain text alongside a parallel array mapping every UTF-16
   offset back to its Google Docs index, with gaps marked for non-text elements. This is
   what lets a passage split across several styling runs still be located correctly.
5. Collapses whitespace runs on both sides so the search tolerates formatting differences,
   then searches for the captured passage.
6. **Requires exactly one contiguous match.** Zero matches or several both abort without
   touching the document; the multiple-match error names each tab and how many hits it
   contained. A range that includes the document's final paragraph mark is also refused.
7. Strikes the passage through, restores each run's original strikethrough state, then
   deletes the range and inserts the replacement.

Every write passes `writeControl.requiredRevisionId`, so if the document changed underneath
you the API rejects the edit rather than clobbering it. Error messages distinguish "nothing
was changed" from partial states so you always know whether to retry.

### The ghost character

`ghost.js` owns 16 moods. Only three ghost images actually ship, so a fallback table maps
every other mood onto the closest available artwork, and a per-image error handler retries
the fallback before giving up. Two stacked `<img>` elements crossfade so mood changes don't
flash. Mood-specific CSS filters, effect layers (sparkles, steam, tears, sweat, candles,
bats) drawn entirely in CSS, and an idle blink timer round out the character.

Speech bubbles pull from a quip bank indexed by personality (grumpy, sweet, sarcastic) and
mood, so the same event reads differently depending on the configured temperament.

**Tricks.** On a randomized timer the ghost performs one of three moves: a `fly-by` across
the screen, a `hover` above where you are typing, or a `peek` in from a screen edge. The
scheduler suppresses tricks while the panel is open, while the tab is hidden, and within
ten seconds of your last keystroke; any keypress or click cancels one in progress. Locating
the cursor for `hover` degrades through several fallbacks: Docs' private caret elements, the
DOM selection rectangle, the last mouse position inside the editor, the editor's center,
and finally the viewport center.

Motion uses the Web Animations API. Flight paths are sampled from a cubic Bézier curve, with
the ghost tilted along its tangent and flipped horizontally to face its direction of travel.
A continuous flight mode, toggled from the popup, loops randomly chosen targets until
stopped. While flying, the ghost leaves a tapering cyan ectoplasm trail built from five
staggered afterimage segments. Animations pause when the tab is hidden, and
`prefers-reduced-motion` disables the trail and reduces motion throughout.

### Background service worker

Every outbound request lives here; content scripts never call the network directly.
Messages are validated against an allowlist of types, must carry a request ID, and have
length caps on their payloads.

All LLM traffic goes through a single `callLLM` function — swapping providers means
changing only its endpoint constant, request body, and response parsing. It reads the API
key and personality from sync storage, prepends a personality-flavored system prompt, and
translates HTTP 401/403, 429, and malformed JSON into in-character error messages. The
endpoint ships as a placeholder and must be pointed at a real provider.

### Settings

The options page writes the API key, personality, sound toggle, trick toggle, and trick
frequency to `chrome.storage.sync`. The content script subscribes to storage changes and
reacts live: disabling the extension tears down the widget and removes its listeners,
re-enabling remounts it, and changing trick settings reschedules or cancels the timer
without a page reload. The popup separately handles connecting Google Docs, summoning or
dismissing the ghost, and toggling continuous flight.

### Not currently wired up

Three pieces exist in the source but are not reachable:

- `src/content/features/possession.js` — a local heuristic that scores sentences for
  "robotic" style using stock-phrase, em-dash, rule-of-three, and uniform-length signals.
  Not listed in the manifest and not referenced anywhere.
- `src/content/features/seance.js` — a table of writing-voice styles (Victorian, noir,
  Shakespearean, and so on). Also unreferenced.
- `typeTextAtDocumentEnd` in the service worker — a rate-limited, chunked writer that would
  type text into the end of a document and report progress. Fully implemented but never
  called by any message handler.
