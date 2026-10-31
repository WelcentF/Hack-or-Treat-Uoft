# Ghostwriter art assets

Place transparent PNGs in the folders below. Ghostwriter loads them with `chrome.runtime.getURL()`; missing files are handled with mood-image fallbacks and CSS/inline effect shapes.

## Ghost images

Existing images:

- `ghost/ghost-smug.png` — supplied default/smug reaper editor.
- `ghost/ghost-angry.png` — supplied angry reaper editor.
- `ghost/ghost-impressed.png` — supplied excited/star-eyed reaper editor.

Still to add:

- `ghost/ghost-idle.png`
- `ghost/ghost-bored.png`
- `ghost/ghost-sleepy.png`
- `ghost/ghost-suspicious.png`
- `ghost/ghost-happy.png`
- `ghost/ghost-disgusted.png`
- `ghost/ghost-sad.png`
- `ghost/ghost-scared.png`
- `ghost/ghost-possessed.png`
- `ghost/ghost-channeling.png`
- `ghost/ghost-mischievous.png`

`furious` reuses `ghost-angry.png` with a larger scale and stronger red glow. `excited` reuses `ghost-impressed.png` with a spin and purple glow.

## Optional effects

Add these transparent PNGs under `effects/` to replace the built-in CSS/inline-art fallbacks:

- `effects/smoke.png`
- `effects/sparkle.png`
- `effects/steam.png`
- `effects/zzz.png`
- `effects/tear.png`
- `effects/sweat.png`
- `effects/candle.png`
- `effects/bat.png`

Keep the smoke asset cropped to the pencil-tip wisp, since it is layered over the pencil on every mood.

When adding artwork, add the new mood name to `AVAILABLE_MOODS` or effect name to `AVAILABLE_EFFECTS` in `src/content/ghost.js`. The CSS fallback stays available if the listed file later fails to load.

## Sound

- `sounds/ghost-woo.mp3` — plays when **Replace in Doc** is clicked.
