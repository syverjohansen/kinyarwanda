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
  practiceSessions: {},
};

const elements = {
  lessonForm: document.querySelector("#lesson-form"),
  lessonName: document.querySelector("#lesson-name"),
  lessonList: document.querySelector("#lesson-list"),
  activeTitle: document.querySelector("#active-title"),
  emptyState: document.querySelector("#empty-state"),
  lessonEditor: document.querySelector("#lesson-editor"),
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
  delete state.practiceSessions[exerciseId];
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

  saveLessons();
  render();
}

function removeQuestion(exerciseId, questionId) {
  const exercise = findExercise(exerciseId);
  if (!exercise) return;

  exercise.questions = exercise.questions.filter((question) => question.id !== questionId);
  resetPractice(exerciseId);
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
  resetPractice(exerciseId);
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
  elements.renameLesson.value = lesson.name;
  elements.exerciseList.replaceChildren();

  lesson.exercises.forEach((exercise) => {
    elements.exerciseList.append(renderExercise(exercise));
  });
}

function renderExercise(exercise) {
  const node = elements.exerciseTemplate.content.firstElementChild.cloneNode(true);
  const titleInput = node.querySelector(".exercise-title-input");
  const removeButton = node.querySelector(".remove-exercise");
  const questionForm = node.querySelector(".question-form");
  const practicePanel = node.querySelector(".practice-panel");
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

  renderPractice(practicePanel, exercise);

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

function getPracticeSession(exercise) {
  const existing = state.practiceSessions[exercise.id];
  if (existing && existing.total === exercise.questions.length) return existing;

  const session = {
    index: 0,
    checked: false,
    correct: false,
    showHint: false,
    score: 0,
    attempted: 0,
    total: exercise.questions.length,
  };

  state.practiceSessions[exercise.id] = session;
  return session;
}

function resetPractice(exerciseId) {
  delete state.practiceSessions[exerciseId];
}

function normalizeAnswer(value) {
  return value
    .trim()
    .toLocaleLowerCase()
    .replace(/[.!?。！？]+$/u, "")
    .replace(/\s+/g, " ");
}

function renderPractice(container, exercise) {
  container.replaceChildren();

  const title = document.createElement("div");
  title.className = "practice-heading";
  title.innerHTML = `
    <div>
      <p class="eyebrow">Practice</p>
      <h4>${escapeHtml(exercise.name)}</h4>
    </div>
  `;

  if (exercise.questions.length === 0) {
    const empty = document.createElement("p");
    empty.className = "practice-empty";
    empty.textContent = "Add questions to practice this exercise.";
    container.append(title, empty);
    return;
  }

  const session = getPracticeSession(exercise);
  const question = exercise.questions[session.index] || exercise.questions[0];
  const score = document.createElement("span");
  score.className = "practice-score";
  score.textContent = `${session.score}/${session.attempted} correct`;
  title.append(score);

  const form = document.createElement("form");
  form.className = "practice-form";
  form.innerHTML = `
    <div class="practice-prompt">
      <span>Question ${session.index + 1} of ${exercise.questions.length}</span>
      <p>${escapeHtml(question.prompt)}</p>
    </div>
    <label>
      Your answer
      <textarea name="practiceAnswer" rows="2" autocomplete="off" required ${session.checked ? "disabled" : ""}></textarea>
    </label>
    <p class="practice-hint" ${session.showHint && question.hint ? "" : "hidden"}>${escapeHtml(question.hint || "")}</p>
    <p class="practice-result" role="status"></p>
    <div class="practice-actions">
      <button class="check-answer" type="submit" ${session.checked ? "disabled" : ""}>Check</button>
      <button class="show-hint" type="button" ${question.hint ? "" : "disabled"}>Hint</button>
      <button class="next-question" type="button">${session.index === exercise.questions.length - 1 ? "Start over" : "Next"}</button>
      <button class="reset-practice" type="button">Reset</button>
    </div>
  `;

  const answerInput = form.querySelector("[name='practiceAnswer']");
  const result = form.querySelector(".practice-result");

  if (session.checked) {
    answerInput.value = session.answer || "";
    result.className = `practice-result ${session.correct ? "correct" : "incorrect"}`;
    result.textContent = session.correct ? "Correct." : `Not quite. Correct answer: ${question.answer}`;
  }

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const answer = answerInput.value;
    const correct = normalizeAnswer(answer) === normalizeAnswer(question.answer);

    session.answer = answer;
    session.checked = true;
    session.correct = correct;
    session.attempted += 1;
    if (correct) session.score += 1;
    render();
  });

  form.querySelector(".show-hint").addEventListener("click", () => {
    session.showHint = true;
    render();
  });

  form.querySelector(".next-question").addEventListener("click", () => {
    session.index = session.index === exercise.questions.length - 1 ? 0 : session.index + 1;
    session.checked = false;
    session.correct = false;
    session.showHint = false;
    session.answer = "";
    render();
  });

  form.querySelector(".reset-practice").addEventListener("click", () => {
    resetPractice(exercise.id);
    render();
  });

  container.append(title, form);
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
