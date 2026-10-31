// Loads and saves Ghostwriter's optional provider key, personality, difficulty, and sound preference.

const form = document.querySelector("#settings-form");
const keyInput = document.querySelector("#api-key");
const personalityInput = document.querySelector("#personality");
const difficultyInput = document.querySelector("#difficulty");
const soundInput = document.querySelector("#sound");
const status = document.querySelector("#status");

async function loadSettings() {
  try {
    const stored = await chrome.storage.sync.get({
      apiKey: "",
      personality: "grumpy",
      difficulty: "friendly",
      sound: false
    });
    keyInput.value = typeof stored.apiKey === "string" ? stored.apiKey : "";
    personalityInput.value = ["grumpy", "sweet", "sarcastic"].includes(stored.personality)
      ? stored.personality
      : "grumpy";
    difficultyInput.value = stored.difficulty === "poltergeist" ? "poltergeist" : "friendly";
    soundInput.checked = stored.sound === true;
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
      difficulty: difficultyInput.value,
      sound: soundInput.checked
    });
    status.textContent = "Saved. My temperament has been adjusted (slightly).";
  } catch {
    status.textContent = "The settings refused to save. Check Chrome storage, then try again.";
  }
});

void loadSettings();
