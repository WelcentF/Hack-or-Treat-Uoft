// Loads and saves Ghostwriter's provider key, personality, sound, and trick preferences.

const form = document.querySelector("#settings-form");
const keyInput = document.querySelector("#api-key");
const personalityInput = document.querySelector("#personality");
const soundInput = document.querySelector("#sound");
const tricksInput = document.querySelector("#tricks");
const trickFrequencyInput = document.querySelector("#trick-frequency");
const status = document.querySelector("#status");

async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get({
      apiKey: "",
      personality: "grumpy",
      sound: false,
      tricks: true,
      trickFrequency: "normal"
    });
    keyInput.value = typeof stored.apiKey === "string" ? stored.apiKey : "";
    personalityInput.value = ["grumpy", "sweet", "sarcastic"].includes(stored.personality)
      ? stored.personality
      : "grumpy";
    soundInput.checked = stored.sound === true;
    tricksInput.checked = stored.tricks !== false;
    trickFrequencyInput.value = ["rare", "normal", "chaotic"].includes(stored.trickFrequency)
      ? stored.trickFrequency
      : "normal";
  } catch {
    status.textContent = "The settings drawer is stuck. Reopen it and try again.";
  }
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  status.textContent = "Saving your preferences. I do enjoy paperwork.";
  try {
    await chrome.storage.sync.set({
      apiKey: keyInput.value.trim(),
      personality: personalityInput.value,
      sound: soundInput.checked,
      tricks: tricksInput.checked,
      trickFrequency: trickFrequencyInput.value
    });
    status.textContent = "Saved. My temperament has been adjusted (slightly).";
  } catch {
    status.textContent = "The settings refused to save. Check Chrome storage, then try again.";
  }
});

void loadSettings();
