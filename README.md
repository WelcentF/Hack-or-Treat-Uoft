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
