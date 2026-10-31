// Connects Google Docs and controls the widget and its continuous-flight trick.

const toggleButton = document.querySelector("#toggle");
const trickButton = document.querySelector("#trick");
const connectButton = document.querySelector("#connect");
const status = document.querySelector("#status");
let enabled = true;
let tricksEnabled = true;
let flightRunning = false;
let docAvailable = false;
let connectionMessage = "";

function render() {
  toggleButton.textContent = enabled ? "Dismiss the haunting" : "Summon the ghost";
  trickButton.disabled = !enabled || !tricksEnabled || !docAvailable;
  trickButton.textContent = flightRunning ? "Stop continuous flight" : "Start continuous flight";
  const baseMessage = !docAvailable
    ? "Open or refresh a Google Doc to summon my flight control."
    : enabled
    ? flightRunning
      ? "I am touring the Doc. Click stop when my performance becomes tiresome."
      : "I am haunting eligible Google Docs tabs. Start flight for a continuous patrol."
    : "The ghost is resting. For now.";
  status.textContent = connectionMessage || baseMessage;
}

async function loadState() {
  try {
    const stored = await chrome.storage.sync.get({ enabled: true, tricks: true });
    enabled = stored.enabled !== false;
    tricksEnabled = stored.tricks !== false;
    try {
      const state = await chrome.runtime.sendMessage({ type: "GET_FLIGHT_STATUS" });
      docAvailable = state?.ok === true;
      flightRunning = state?.ok === true && state.running === true;
      if (docAvailable) {
        enabled = state.enabled === true;
        tricksEnabled = state.tricksEnabled === true;
      }
    } catch {
      docAvailable = false;
      flightRunning = false;
    }
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

trickButton.addEventListener("click", async () => {
  trickButton.disabled = true;
  status.textContent = flightRunning ? "Returning to my corner. Do try to cope." : "Taking the scenic route. This may take a while.";
  try {
    const response = await chrome.runtime.sendMessage({ type: "TOGGLE_CONTINUOUS_FLIGHT" });
    if (!response?.ok) throw new Error(response?.error || "My flight plan was rejected.");
    flightRunning = response.running === true;
    render();
    window.close();
  } catch (error) {
    status.textContent = error instanceof Error
      ? error.message
      : "I cannot reach the Doc. Refresh it and try again.";
  } finally {
    render();
  }
});

connectButton.addEventListener("click", () => {
  connectButton.disabled = true;
  connectionMessage = "Opening Google's authorization window…";
  render();
  chrome.identity.getAuthToken({ interactive: true }, (token) => {
    const error = chrome.runtime.lastError;
    if (error || !token) {
      connectionMessage = error?.message
        ? `Google Docs connection failed: ${error.message}`
        : "Google Docs connection was not completed. Try again or use Copy result.";
    } else {
      connectionMessage = "Google Docs connected. Direct replacement is available from the writing panel.";
    }
    connectButton.disabled = false;
    render();
  });
});

void loadState();
