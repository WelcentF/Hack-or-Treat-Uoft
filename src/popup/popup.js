// Toggles the Docs widget and opens its personality/settings page.

const toggleButton = document.querySelector("#toggle");
const optionsButton = document.querySelector("#options");
const status = document.querySelector("#status");
let enabled = true;

function render() {
  toggleButton.textContent = enabled ? "Dismiss the haunting" : "Summon the ghost";
  status.textContent = enabled
    ? "I am haunting eligible Google Docs tabs."
    : "The ghost is resting. For now.";
}

async function loadState() {
  try {
    const stored = await chrome.storage.sync.get({ enabled: true });
    enabled = stored.enabled !== false;
    render();
  } catch {
    toggleButton.disabled = true;
    status.textContent = "The spirit settings are unreachable. Try again later.";
  }
}

toggleButton.addEventListener("click", async () => {
  toggleButton.disabled = true;
  const previous = enabled;
  enabled = !enabled;
  try {
    await chrome.storage.sync.set({ enabled });
    render();
  } catch {
    enabled = previous;
    status.textContent = "The haunting could not change. Chrome storage has displeased me.";
  } finally {
    toggleButton.disabled = false;
  }
});

optionsButton.addEventListener("click", () => {
  void chrome.runtime.openOptionsPage().catch(() => {
    status.textContent = "The settings lair will not open. Try the extension's Options menu.";
  });
});

void loadState();
