const STORAGE_KEY = "kinyarwanda-lessons-v1";
const TOKEN_KEY = "kinyarwanda-github-token";
const GIST_ID_KEY = "kinyarwanda-gist-id";
const LAST_SYNCED_KEY = "kinyarwanda-last-synced";
const GIST_FILENAME = "kinyarwanda-lessons-data.json";

const state = {
  lessons: loadLessons(),
  activeLessonId: null,
  githubToken: localStorage.getItem(TOKEN_KEY) || "",
  syncBusy: false,
  activeMode: "build",
  activePracticeQuestionId: null,
  practice: {
    checked: false,
    correct: false,
    showHint: false,
    answer: "",
    score: 0,
    attempted: 0,
  },
};

const elements = {
  lessonForm: document.querySelector("#lesson-form"),
  lessonName: document.querySelector("#lesson-name"),
  lessonList: document.querySelector("#lesson-list"),
  activeTitle: document.querySelector("#active-title"),
  emptyState: document.querySelector("#empty-state"),
  lessonEditor: document.querySelector("#lesson-editor"),
  buildMode: document.querySelector("#build-mode"),
  practiceMode: document.querySelector("#practice-mode"),
  buildView: document.querySelector("#build-view"),
  practiceView: document.querySelector("#practice-view"),
  practiceNav: document.querySelector("#practice-nav"),
  practiceCard: document.querySelector("#practice-card"),
  renameLessonForm: document.querySelector("#rename-lesson-form"),
  renameLesson: document.querySelector("#rename-lesson"),
  deleteLesson: document.querySelector("#delete-lesson"),
  exerciseForm: document.querySelector("#exercise-form"),
  exerciseName: document.querySelector("#exercise-name"),
  exerciseList: document.querySelector("#exercise-list"),
  syncToggle: document.querySelector("#sync-toggle"),
  syncPanel: document.querySelector("#sync-panel"),
  syncConnect: document.querySelector("#sync-connect"),
  syncControls: document.querySelector("#sync-controls"),
  githubToken: document.querySelector("#github-token"),
  connectSync: document.querySelector("#connect-sync"),
  disconnectSync: document.querySelector("#disconnect-sync"),
  saveSync: document.querySelector("#save-sync"),
  loadSync: document.querySelector("#load-sync"),
  lastSynced: document.querySelector("#last-synced"),
  syncMessage: document.querySelector("#sync-message"),
  exportData: document.querySelector("#export-data"),
  importData: document.querySelector("#import-data"),
  exerciseTemplate: document.querySelector("#exercise-template"),
  questionTemplate: document.querySelector("#question-template"),
};

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function loadLessons() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLessons() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.lessons));
}

function makeSyncData() {
  return {
    app: "kinyarwanda-lessons",
    version: 1,
    lessons: state.lessons,
    lastSynced: new Date().toISOString(),
  };
}

function getActiveLesson() {
  return state.lessons.find((lesson) => lesson.id === state.activeLessonId) || null;
}

function setActiveLesson(id) {
  state.activeLessonId = id;
  state.activePracticeQuestionId = null;
  resetPracticeCard();
  render();
}

function addLesson(name) {
  const lesson = {
    id: makeId("lesson"),
    name: name.trim(),
    exercises: [],
  };

  state.lessons.push(lesson);
  saveLessons();
  setActiveLesson(lesson.id);
}

function removeLesson() {
  const lesson = getActiveLesson();
  if (!lesson) return;

  const confirmed = window.confirm(`Delete "${lesson.name}" and all exercises in it?`);
  if (!confirmed) return;

  state.lessons = state.lessons.filter((item) => item.id !== lesson.id);
  state.activeLessonId = state.lessons[0]?.id || null;
  state.activePracticeQuestionId = null;
  resetPracticeCard();
  saveLessons();
  render();
}

function addExercise(name) {
  const lesson = getActiveLesson();
  if (!lesson) return;

  lesson.exercises.push({
    id: makeId("exercise"),
    name: name.trim(),
    questions: [],
  });

  saveLessons();
  render();
}

function removeExercise(exerciseId) {
  const lesson = getActiveLesson();
  if (!lesson) return;

  lesson.exercises = lesson.exercises.filter((exercise) => exercise.id !== exerciseId);
  state.activePracticeQuestionId = null;
  resetPracticeCard();
  saveLessons();
  render();
}

function addQuestion(exerciseId, formData) {
  const exercise = findExercise(exerciseId);
  if (!exercise) return;

  exercise.questions.push({
    id: makeId("question"),
    prompt: formData.get("prompt").trim(),
    answer: formData.get("answer").trim(),
    hint: formData.get("hint").trim(),
  });

  resetPracticeCard();
  saveLessons();
  render();
}

function removeQuestion(exerciseId, questionId) {
  const exercise = findExercise(exerciseId);
  if (!exercise) return;

  exercise.questions = exercise.questions.filter((question) => question.id !== questionId);
  if (state.activePracticeQuestionId === questionId) {
    state.activePracticeQuestionId = null;
  }
  resetPracticeCard();
  saveLessons();
  render();
}

function editQuestion(exerciseId, questionId) {
  const question = findExercise(exerciseId)?.questions.find((item) => item.id === questionId);
  if (!question) return;

  const prompt = window.prompt("Question prompt", question.prompt);
  if (prompt === null) return;

  const answer = window.prompt("Correct answer", question.answer);
  if (answer === null) return;

  const hint = window.prompt("Optional hint", question.hint || "");
  if (hint === null) return;

  question.prompt = prompt.trim();
  question.answer = answer.trim();
  question.hint = hint.trim();
  resetPracticeCard();
  saveLessons();
  render();
}

function findExercise(exerciseId) {
  const lesson = getActiveLesson();
  return lesson?.exercises.find((exercise) => exercise.id === exerciseId) || null;
}

function render() {
  renderLessonList();
  renderLessonEditor();
  renderSync();
}

function renderLessonList() {
  elements.lessonList.replaceChildren();

  state.lessons.forEach((lesson) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `lesson-tab${lesson.id === state.activeLessonId ? " active" : ""}`;
    button.innerHTML = `<span>${escapeHtml(lesson.name)}</span><span class="lesson-count">${lesson.exercises.length}</span>`;
    button.addEventListener("click", () => setActiveLesson(lesson.id));
    elements.lessonList.append(button);
  });
}

function renderLessonEditor() {
  const lesson = getActiveLesson();
  const hasLesson = Boolean(lesson);

  elements.emptyState.hidden = hasLesson;
  elements.lessonEditor.hidden = !hasLesson;

  if (!lesson) {
    elements.activeTitle.textContent = "Add a lesson to begin";
    return;
  }

  elements.activeTitle.textContent = lesson.name;
  elements.buildMode.classList.toggle("active", state.activeMode === "build");
  elements.practiceMode.classList.toggle("active", state.activeMode === "practice");
  elements.buildView.hidden = state.activeMode !== "build";
  elements.practiceView.hidden = state.activeMode !== "practice";

  elements.renameLesson.value = lesson.name;
  elements.exerciseList.replaceChildren();

  lesson.exercises.forEach((exercise) => {
    elements.exerciseList.append(renderExercise(exercise));
  });

  renderPracticeView();
}

function renderExercise(exercise) {
  const node = elements.exerciseTemplate.content.firstElementChild.cloneNode(true);
  const titleInput = node.querySelector(".exercise-title-input");
  const removeButton = node.querySelector(".remove-exercise");
  const questionForm = node.querySelector(".question-form");
  const questionList = node.querySelector(".question-list");

  titleInput.value = exercise.name;
  titleInput.addEventListener("change", () => {
    exercise.name = titleInput.value.trim() || "Untitled exercise";
    saveLessons();
    render();
  });

  removeButton.addEventListener("click", () => removeExercise(exercise.id));
  questionForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addQuestion(exercise.id, new FormData(questionForm));
  });

  exercise.questions.forEach((question) => {
    questionList.append(renderQuestion(exercise.id, question));
  });

  return node;
}

function renderQuestion(exerciseId, question) {
  const node = elements.questionTemplate.content.firstElementChild.cloneNode(true);
  node.querySelector(".question-prompt").textContent = question.prompt;
  node.querySelector(".question-answer").textContent = question.answer;
  node.querySelector(".question-hint").textContent = question.hint;
  node.querySelector(".edit-question").addEventListener("click", () => editQuestion(exerciseId, question.id));
  node.querySelector(".remove-question").addEventListener("click", () => removeQuestion(exerciseId, question.id));
  return node;
}

function setMode(mode) {
  state.activeMode = mode;
  resetPracticeCard();
  render();
}

function resetPracticeCard() {
  state.practice.checked = false;
  state.practice.correct = false;
  state.practice.showHint = false;
  state.practice.answer = "";
}

function normalizeAnswer(value) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[.!?。！？]+$/u, "")
    .replace(/\s+/g, " ");
}

function getPracticeItems() {
  const lesson = getActiveLesson();
  if (!lesson) return [];

  return lesson.exercises.flatMap((exercise, exerciseIndex) =>
    exercise.questions.map((question, questionIndex) => ({
      exercise,
      question,
      exerciseIndex,
      questionIndex,
      label: `${exerciseIndex + 1}.${questionIndex + 1}`,
    })),
  );
}

function getActivePracticeItem(items = getPracticeItems()) {
  if (items.length === 0) return null;

  const selected = items.find((item) => item.question.id === state.activePracticeQuestionId);
  if (selected) return selected;

  state.activePracticeQuestionId = items[0].question.id;
  return items[0];
}

function selectPracticeQuestion(questionId) {
  state.activePracticeQuestionId = questionId;
  resetPracticeCard();
  render();
}

function goToAdjacentPracticeQuestion(direction) {
  const items = getPracticeItems();
  const current = getActivePracticeItem(items);
  if (!current) return;

  const currentIndex = items.findIndex((item) => item.question.id === current.question.id);
  const nextIndex = (currentIndex + direction + items.length) % items.length;
  selectPracticeQuestion(items[nextIndex].question.id);
}

function renderPracticeView() {
  const items = getPracticeItems();
  elements.practiceNav.replaceChildren();
  elements.practiceCard.replaceChildren();

  if (items.length === 0) {
    elements.practiceCard.innerHTML = `
      <div class="flashcard-empty">
        <h3>No questions yet</h3>
        <p>Add exercises and questions in Build mode, then come back to practice.</p>
      </div>
    `;
    return;
  }

  const active = getActivePracticeItem(items);
  let lastExerciseId = "";

  items.forEach((item) => {
    if (item.exercise.id !== lastExerciseId) {
      const heading = document.createElement("p");
      heading.className = "practice-nav-heading";
      heading.textContent = `${item.exerciseIndex + 1}. ${item.exercise.name}`;
      elements.practiceNav.append(heading);
      lastExerciseId = item.exercise.id;
    }

    const button = document.createElement("button");
    button.type = "button";
    button.className = `practice-question-link${item.question.id === active.question.id ? " active" : ""}`;
    button.innerHTML = `<span>${item.label}</span><span>${escapeHtml(item.question.prompt)}</span>`;
    button.addEventListener("click", () => selectPracticeQuestion(item.question.id));
    elements.practiceNav.append(button);
  });

  const card = document.createElement("form");
  card.className = "flashcard";
  card.innerHTML = `
    <div class="flashcard-topline">
      <span>${active.label}</span>
      <span>${state.practice.score}/${state.practice.attempted} correct</span>
    </div>
    <div class="flashcard-prompt">
      <p>${escapeHtml(active.exercise.name)}</p>
      <h3>${escapeHtml(active.question.prompt)}</h3>
    </div>
    <label>
      Your answer
      <textarea name="practiceAnswer" rows="3" autocomplete="off" required ${state.practice.checked ? "disabled" : ""}></textarea>
    </label>
    <p class="practice-hint" ${state.practice.showHint && active.question.hint ? "" : "hidden"}>${escapeHtml(active.question.hint || "")}</p>
    <p class="practice-result" role="status"></p>
    <div class="flashcard-actions">
      <button type="submit" ${state.practice.checked ? "disabled" : ""}>Check</button>
      <button class="show-hint secondary-button" type="button" ${active.question.hint ? "" : "disabled"}>Hint</button>
      <button class="previous-question secondary-button" type="button">Previous</button>
      <button class="next-question secondary-button" type="button">Next</button>
      <button class="reset-score secondary-button" type="button">Reset score</button>
    </div>
  `;

  const answerInput = card.querySelector("[name='practiceAnswer']");
  const result = card.querySelector(".practice-result");
  answerInput.value = state.practice.answer;

  if (state.practice.checked) {
    result.className = `practice-result ${state.practice.correct ? "correct" : "incorrect"}`;
    result.textContent = state.practice.correct ? `Correct: ${active.question.answer}` : `Not quite. Correct answer: ${active.question.answer}`;
  }

  card.addEventListener("submit", (event) => {
    event.preventDefault();
    const answer = answerInput.value;
    const correct = normalizeAnswer(answer) === normalizeAnswer(active.question.answer);

    state.practice.answer = answer;
    state.practice.checked = true;
    state.practice.correct = correct;
    state.practice.attempted += 1;
    if (correct) state.practice.score += 1;
    render();
  });

  answerInput.addEventListener("input", () => {
    state.practice.answer = answerInput.value;
  });

  card.querySelector(".show-hint").addEventListener("click", () => {
    state.practice.showHint = true;
    render();
  });

  card.querySelector(".previous-question").addEventListener("click", () => goToAdjacentPracticeQuestion(-1));
  card.querySelector(".next-question").addEventListener("click", () => goToAdjacentPracticeQuestion(1));
  card.querySelector(".reset-score").addEventListener("click", () => {
    state.practice.score = 0;
    state.practice.attempted = 0;
    resetPracticeCard();
    render();
  });

  elements.practiceCard.append(card);
}

function exportLessons() {
  const file = new Blob([JSON.stringify(state.lessons, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = "kinyarwanda-lessons.json";
  link.click();
  URL.revokeObjectURL(url);
}

function importLessons(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const lessons = JSON.parse(reader.result);
      if (!Array.isArray(lessons)) throw new Error("Expected an array of lessons.");

      state.lessons = lessons;
      state.activeLessonId = lessons[0]?.id || null;
      saveLessons();
      render();
    } catch (error) {
      window.alert(`Could not import lessons: ${error.message}`);
    }
  });
  reader.readAsText(file);
}

function renderSync() {
  const connected = Boolean(state.githubToken);
  elements.syncConnect.hidden = connected;
  elements.syncControls.hidden = !connected;
  elements.disconnectSync.hidden = !connected;
  elements.lastSynced.textContent = localStorage.getItem(LAST_SYNCED_KEY)
    ? `Last synced: ${new Date(localStorage.getItem(LAST_SYNCED_KEY)).toLocaleString()}`
    : "Not synced yet.";
}

function setSyncMessage(message, status = "") {
  elements.syncMessage.textContent = message;
  elements.syncMessage.className = `sync-message ${status}`.trim();
}

async function githubRequest(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${state.githubToken}`,
      Accept: "application/vnd.github+json",
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    let message = `GitHub request failed with ${response.status}.`;
    try {
      const error = await response.json();
      message = error.message || message;
    } catch {
      // Keep the status-based message.
    }
    throw new Error(message);
  }

  if (response.status === 204) return null;
  return response.json();
}

async function validateToken() {
  await githubRequest("/gists");
}

async function findExistingGist() {
  const gists = await githubRequest("/gists");
  return gists.find((gist) => gist.files && gist.files[GIST_FILENAME]) || null;
}

async function createGist() {
  return githubRequest("/gists", {
    method: "POST",
    body: JSON.stringify({
      description: "Kinyarwanda Lessons Data",
      public: false,
      files: {
        [GIST_FILENAME]: {
          content: JSON.stringify(makeSyncData(), null, 2),
        },
      },
    }),
  });
}

async function saveToGist() {
  if (state.syncBusy) return;
  state.syncBusy = true;
  setSyncMessage("Saving lessons to GitHub...");

  try {
    let gistId = localStorage.getItem(GIST_ID_KEY);
    if (!gistId) {
      const existing = await findExistingGist();
      const gist = existing || (await createGist());
      gistId = gist.id;
      localStorage.setItem(GIST_ID_KEY, gistId);
    }

    await githubRequest(`/gists/${gistId}`, {
      method: "PATCH",
      body: JSON.stringify({
        files: {
          [GIST_FILENAME]: {
            content: JSON.stringify(makeSyncData(), null, 2),
          },
        },
      }),
    });

    localStorage.setItem(LAST_SYNCED_KEY, new Date().toISOString());
    setSyncMessage("Saved to GitHub.", "success");
    renderSync();
  } catch (error) {
    setSyncMessage(error.message, "error");
  } finally {
    state.syncBusy = false;
  }
}

async function loadFromGist() {
  if (state.syncBusy) return;
  state.syncBusy = true;
  setSyncMessage("Loading lessons from GitHub...");

  try {
    let gistId = localStorage.getItem(GIST_ID_KEY);
    if (!gistId) {
      const existing = await findExistingGist();
      if (!existing) {
        setSyncMessage("No Kinyarwanda lesson Gist found. Save from one device first.", "error");
        return;
      }
      gistId = existing.id;
      localStorage.setItem(GIST_ID_KEY, gistId);
    }

    const gist = await githubRequest(`/gists/${gistId}`);
    const file = gist.files[GIST_FILENAME];
    if (!file) throw new Error("The sync Gist does not contain Kinyarwanda lesson data.");

    const data = JSON.parse(file.content);
    if (!Array.isArray(data.lessons)) throw new Error("The sync data is not a valid lesson file.");

    state.lessons = data.lessons;
    state.activeLessonId = state.lessons[0]?.id || null;
    saveLessons();
    localStorage.setItem(LAST_SYNCED_KEY, data.lastSynced || new Date().toISOString());
    setSyncMessage("Loaded from GitHub.", "success");
    render();
  } catch (error) {
    setSyncMessage(error.message, "error");
  } finally {
    state.syncBusy = false;
  }
}

async function connectSync() {
  const token = elements.githubToken.value.trim();
  if (!token) return;

  state.githubToken = token;
  setSyncMessage("Checking GitHub token...");

  try {
    await validateToken();
    localStorage.setItem(TOKEN_KEY, token);
    elements.githubToken.value = "";
    setSyncMessage("Connected. You can save or load lesson data now.", "success");
    renderSync();
  } catch (error) {
    state.githubToken = "";
    localStorage.removeItem(TOKEN_KEY);
    setSyncMessage(`Could not connect: ${error.message}`, "error");
  }
}

function disconnectSync() {
  const confirmed = window.confirm("Disconnect GitHub sync on this device? Your local lessons will stay here.");
  if (!confirmed) return;

  state.githubToken = "";
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(GIST_ID_KEY);
  localStorage.removeItem(LAST_SYNCED_KEY);
  setSyncMessage("Disconnected.");
  renderSync();
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

elements.lessonForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addLesson(elements.lessonName.value);
  elements.lessonForm.reset();
});

elements.renameLessonForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const lesson = getActiveLesson();
  if (!lesson) return;

  lesson.name = elements.renameLesson.value.trim();
  saveLessons();
  render();
});

elements.deleteLesson.addEventListener("click", removeLesson);
elements.buildMode.addEventListener("click", () => setMode("build"));
elements.practiceMode.addEventListener("click", () => setMode("practice"));

elements.syncToggle.addEventListener("click", () => {
  elements.syncPanel.hidden = !elements.syncPanel.hidden;
});

elements.connectSync.addEventListener("click", connectSync);
elements.disconnectSync.addEventListener("click", disconnectSync);
elements.saveSync.addEventListener("click", saveToGist);
elements.loadSync.addEventListener("click", loadFromGist);

elements.exerciseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addExercise(elements.exerciseName.value);
  elements.exerciseForm.reset();
});

elements.exportData.addEventListener("click", exportLessons);
elements.importData.addEventListener("change", () => {
  const file = elements.importData.files[0];
  if (file) importLessons(file);
  elements.importData.value = "";
});

if (!state.activeLessonId && state.lessons.length > 0) {
  state.activeLessonId = state.lessons[0].id;
}

render();
