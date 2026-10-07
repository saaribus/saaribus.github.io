const EXERCISES = ["G1", "G3", "G5", "G2", "G4", "G6", "G7", "G8"];
const STORAGE_KEY = "gymCardsData_v1";
const CARD_KEY = "gymCardsCurrentExercise_v1";

let data = loadData();
let currentIndex = Number(localStorage.getItem(CARD_KEY) || 0);

const $ = (id) => document.getElementById(id);

function loadData() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved && typeof saved === "object") {
      for (const name of EXERCISES) {
        if (!Array.isArray(saved[name])) saved[name] = [];
      }
      return saved;
    }
  } catch (error) {
    console.error("Could not load data:", error);
  }

  return Object.fromEntries(EXERCISES.map(name => [name, []]));
}

function saveData() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function today() {
  const d = new Date();
  return d.toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit"
  });
}

function getTodayIteration(exerciseName) {
  const history = data[exerciseName] || [];
  const todayString = today();

  const entriesToday = history.filter(row => row.date === todayString);

  return (entriesToday.length % 3) + 1;
}

function currentExercise() {
  return EXERCISES[currentIndex];
}

function render() {
  const name = currentExercise();
 const history = data[name] || [];
const nextIteration = getTodayIteration(name);
  
  $("exerciseName").textContent = name;
  $("progressText").textContent = `${name} of ${EXERCISES.length}`;
  $("currentDate").textContent = today();
  $("currentIteration").textContent = nextIteration;

  const rows = history.slice(-2).reverse();

  if (rows.length === 0) {
    $("historyRows").innerHTML = `
      <div class="empty-history">No previous workout yet.</div>
    `;
  } else {
    $("historyRows").innerHTML = rows.map(row => `
      <div class="history-row">
        <span>${escapeHtml(row.date)}</span>
        <span>${escapeHtml(String(row.iteration))}</span>
        <span>${escapeHtml(row.resistance)}</span>
        <span>${escapeHtml(String(row.repetitions))}</span>
      </div>
    `).join("");
  }

  $("resistance").value = "";
  $("repetitions").value = "";
  localStorage.setItem(CARD_KEY, currentIndex);
}

function saveCurrentAndNext() {
  const resistance = $("resistance").value.trim();
  const repetitions = $("repetitions").value.trim();

  if (!resistance || !repetitions) {
    alert("Please enter resistance and repetitions.");
    return;
  }

  const name = currentExercise();

  data[name].push({
    date: today(),
    timestamp: new Date().toISOString(),
   iteration: getTodayIteration(name),
    resistance,
    repetitions: Number(repetitions)
  });

  saveData();

  currentIndex = (currentIndex + 1) % EXERCISES.length;
  render();

  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showPreviousCard() {
  currentIndex = (currentIndex - 1 + EXERCISES.length) % EXERCISES.length;
  render();
}

function showNextCardWithoutSaving() {
  currentIndex = (currentIndex + 1) % EXERCISES.length;
  render();
}

function renderFullHistory() {
  const container = $("fullHistory");

  container.innerHTML = EXERCISES.map(name => {
    const history = data[name] || [];

    if (history.length === 0) {
      return `
        <div class="history-exercise">
          <h3>${name}</h3>
          <div class="empty-history">No entries.</div>
        </div>
      `;
    }

    return `
      <div class="history-exercise">
        <h3>${name}</h3>
        ${history.map(row => `
          <div class="full-row">
            <span>${escapeHtml(row.date)}</span>
            <span>${escapeHtml(String(row.iteration))}</span>
            <span>${escapeHtml(row.resistance)}</span>
            <span>${escapeHtml(String(row.repetitions))}</span>
          </div>
        `).join("")}
      </div>
    `;
  }).join("");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

$("saveNext").addEventListener("click", saveCurrentAndNext);
$("previousCard").addEventListener("click", showPreviousCard);
$("nextCard").addEventListener("click", showNextCardWithoutSaving);

$("historyButton").addEventListener("click", () => {
  renderFullHistory();
  $("historyDialog").showModal();
});

$("closeHistory").addEventListener("click", () => {
  $("historyDialog").close();
});

$("settingsButton").addEventListener("click", () => {
  $("settingsDialog").showModal();
});

$("closeSettings").addEventListener("click", () => {
  $("settingsDialog").close();
});

$("clearButton").addEventListener("click", () => {
  const confirmed = confirm(
    "Delete ALL workout data? This cannot be undone unless you exported a backup."
  );

  if (!confirmed) return;

  data = Object.fromEntries(EXERCISES.map(name => [name, []]));
  saveData();
  render();
  $("settingsDialog").close();
});

$("exportButton").addEventListener("click", () => {
  const exportObject = {
    app: "Gym Cards",
    version: 1,
    exportedAt: new Date().toISOString(),
    exercises: data
  };

  const blob = new Blob(
    [JSON.stringify(exportObject, null, 2)],
    { type: "application/json" }
  );

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `gym-cards-backup-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  URL.revokeObjectURL(url);
});

$("importFile").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;

  try {
    const imported = JSON.parse(await file.text());
    const importedExercises = imported.exercises || imported;

    for (const name of EXERCISES) {
      if (Array.isArray(importedExercises[name])) {
        data[name] = importedExercises[name];
      }
    }

    saveData();
    render();
    alert("Workout data imported successfully.");
  } catch (error) {
    alert("Could not import this file.");
    console.error(error);
  }

  event.target.value = "";
});

let deferredInstallPrompt = null;

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  $("installButton").classList.remove("hidden");
});

$("installButton").addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;

  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;

  deferredInstallPrompt = null;
  $("installButton").classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js")
      .catch(error => console.error("Service worker registration failed:", error));
  });
}

const welcomeScreen = document.getElementById("welcomeScreen");
const gymApp = document.getElementById("gymApp");
const startTraining = document.getElementById("startTraining");

startTraining.addEventListener("click", () => {
  welcomeScreen.classList.add("hidden");
  gymApp.classList.remove("hidden");

  // Always start a training session with G1
  currentIndex = 0;
  render();
});
