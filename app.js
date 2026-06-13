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
  activePracticeExerciseId: null,
  practiceSession: null,
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
  exportChapter: document.querySelector("#export-chapter"),
  importChapter: document.querySelector("#import-chapter"),
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
  state.activePracticeExerciseId = null;
  resetPracticeSession();
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
  state.activePracticeExerciseId = null;
  resetPracticeSession();
  saveLessons();
  render();
}

function addExercise(name) {
  const lesson = getActiveLesson();
  if (!lesson) return;

  const exercise = {
    id: makeId("exercise"),
    name: name.trim(),
    questions: [],
    lastPracticed: "",
  };

  lesson.exercises.push(exercise);
  state.activePracticeExerciseId = exercise.id;

  saveLessons();
  render();
}

function removeExercise(exerciseId) {
  const lesson = getActiveLesson();
  if (!lesson) return;

  lesson.exercises = lesson.exercises.filter((exercise) => exercise.id !== exerciseId);
  if (state.activePracticeExerciseId === exerciseId) {
    state.activePracticeExerciseId = lesson.exercises[0]?.id || null;
  }
  resetPracticeSession();
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

  resetPracticeSession();
  saveLessons();
  render();
}

function removeQuestion(exerciseId, questionId) {
  const exercise = findExercise(exerciseId);
  if (!exercise) return;

  exercise.questions = exercise.questions.filter((question) => question.id !== questionId);
  resetPracticeSession();
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
  resetPracticeSession();
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
  const practiceMeta = node.querySelector(".exercise-practice-meta");
  const removeButton = node.querySelector(".remove-exercise");
  const questionForm = node.querySelector(".question-form");
  const questionList = node.querySelector(".question-list");

  titleInput.value = exercise.name;
  practiceMeta.textContent = formatPracticeDate(exercise.lastPracticed);
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
  resetPracticeSession();
  render();
}

function resetPracticeSession() {
  state.practiceSession = null;
}

function resetCurrentCard() {
  if (!state.practiceSession) return;
  state.practiceSession.answer = "";
  state.practiceSession.revealed = false;
  state.practiceSession.showHint = false;
}

function getPracticeExercises() {
  const lesson = getActiveLesson();
  if (!lesson) return [];

  return lesson.exercises.map((exercise, exerciseIndex) => ({
    exercise,
    exerciseIndex,
    label: `${exerciseIndex + 1}`,
  }));
}

function getActivePracticeExercise(items = getPracticeExercises()) {
  const available = items.filter((item) => item.exercise.questions.length > 0);
  if (available.length === 0) return items[0] || null;

  const selected = available.find((item) => item.exercise.id === state.activePracticeExerciseId);
  if (selected) return selected;

  state.activePracticeExerciseId = available[0].exercise.id;
  return available[0];
}

function selectPracticeExercise(exerciseId) {
  state.activePracticeExerciseId = exerciseId;
  resetPracticeSession();
  render();
}

function makePracticeSession(exercise) {
  return {
    exerciseId: exercise.id,
    phase: "initial",
    queue: exercise.questions.map((question) => question.id),
    index: 0,
    originalMissedIds: [],
    remainingReviewIds: [],
    currentDrillIds: [],
    drillCounts: {},
    completedInitialIds: [],
    answer: "",
    revealed: false,
    showHint: false,
    done: false,
  };
}

function getPracticeSession(exercise) {
  if (!state.practiceSession || state.practiceSession.exerciseId !== exercise.id) {
    state.practiceSession = makePracticeSession(exercise);
  }

  const questionIds = new Set(exercise.questions.map((question) => question.id));
  const session = state.practiceSession;
  session.queue = session.queue.filter((questionId) => questionIds.has(questionId));
  session.originalMissedIds = session.originalMissedIds.filter((questionId) => questionIds.has(questionId));
  session.remainingReviewIds = session.remainingReviewIds.filter((questionId) => questionIds.has(questionId));
  session.currentDrillIds = session.currentDrillIds.filter((questionId) => questionIds.has(questionId));
  session.completedInitialIds = session.completedInitialIds.filter((questionId) => questionIds.has(questionId));

  if (session.queue.length === 0 && !session.done) {
    advancePracticePhase(session, exercise);
  }

  return session;
}

function startDrillPhase(session, ids) {
  session.phase = "drill3";
  session.currentDrillIds = [...ids];
  session.queue = [...ids];
  session.index = 0;
  session.drillCounts = Object.fromEntries(ids.map((questionId) => [questionId, 0]));
  resetCurrentCard();
}

function startReviewPhase(session) {
  session.phase = "review";
  session.queue = [...session.remainingReviewIds];
  session.index = 0;
  resetCurrentCard();
}

function completePracticeSession(exercise) {
  const now = new Date().toISOString();
  exercise.lastPracticed = now;
  state.practiceSession.done = true;
  state.practiceSession.phase = "complete";
  state.practiceSession.queue = [];
  saveLessons();
}

function advancePracticePhase(session, exercise) {
  if (session.phase === "initial") {
    if (session.originalMissedIds.length === 0) {
      completePracticeSession(exercise);
      return;
    }

    session.remainingReviewIds = [...session.originalMissedIds];
    startDrillPhase(session, session.remainingReviewIds);
    return;
  }

  if (session.phase === "drill3") {
    startReviewPhase(session);
    return;
  }

  if (session.phase === "review") {
    if (session.remainingReviewIds.length === 0) {
      completePracticeSession(exercise);
      return;
    }

    startDrillPhase(session, session.remainingReviewIds);
  }
}

function getQuestionById(exercise, questionId) {
  return exercise.questions.find((question) => question.id === questionId) || null;
}

function getQuestionLabel(exercise, questionId) {
  const questionIndex = exercise.questions.findIndex((question) => question.id === questionId);
  return questionIndex >= 0 ? questionIndex + 1 : "";
}

function getPhaseTitle(session) {
  if (session.phase === "initial") return "First pass";
  if (session.phase === "drill3") return "3x drill";
  if (session.phase === "review") return "1x review";
  return "Complete";
}

function getPhaseDescription(session) {
  if (session.phase === "initial") return "Go through this exercise in order. Correct cards are done for the day.";
  if (session.phase === "drill3") return "Practice first-pass misses until each one is correct 3 times.";
  if (session.phase === "review") return "One final pass on first-pass misses. Only this round clears a card.";
  return "This exercise is complete for today.";
}

function getDrillRequiredCount(session) {
  if (session.phase === "drill3") return 3;
  return 1;
}

function moveToNextQueuedCard(session, exercise) {
  session.index += 1;

  if (session.index >= session.queue.length) {
    session.queue = [];
    session.index = 0;
    advancePracticePhase(session, exercise);
  }

  resetCurrentCard();
}

function gradeCurrentCard(isCorrect, exercise) {
  const session = getPracticeSession(exercise);
  const questionId = session.queue[session.index];
  if (!questionId || session.done || !session.revealed) return;

  if (session.phase === "initial") {
    if (isCorrect) {
      session.completedInitialIds.push(questionId);
    } else if (!session.originalMissedIds.includes(questionId)) {
      session.originalMissedIds.push(questionId);
    }
    moveToNextQueuedCard(session, exercise);
    render();
    return;
  }

  if (session.phase === "drill3") {
    const required = getDrillRequiredCount(session);

    if (isCorrect) {
      session.drillCounts[questionId] = (session.drillCounts[questionId] || 0) + 1;
    }

    if (session.drillCounts[questionId] >= required) {
      session.queue = session.queue.filter((item) => item !== questionId);
      if (session.index >= session.queue.length) {
        session.index = 0;
      }
    } else if (session.queue.length > 0) {
      session.index = (session.index + 1) % session.queue.length;
    }

    if (session.queue.length === 0) {
      advancePracticePhase(session, exercise);
    }

    resetCurrentCard();
    render();
    return;
  }

  if (session.phase === "review") {
    if (isCorrect) {
      session.remainingReviewIds = session.remainingReviewIds.filter((item) => item !== questionId);
    }
    moveToNextQueuedCard(session, exercise);
    render();
  }
}

function formatPracticeDate(value) {
  if (!value) return "Never practiced";
  return `Last practiced ${new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function renderPracticeView() {
  const items = getPracticeExercises();
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

  const active = getActivePracticeExercise(items);

  items.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `practice-question-link${item.exercise.id === active?.exercise.id ? " active" : ""}`;
    button.innerHTML = `
      <span>${item.label}</span>
      <span>
        <strong>${escapeHtml(item.exercise.name)}</strong>
        <small>${item.exercise.questions.length} questions · ${escapeHtml(formatPracticeDate(item.exercise.lastPracticed))}</small>
      </span>
    `;
    button.addEventListener("click", () => selectPracticeExercise(item.exercise.id));
    elements.practiceNav.append(button);
  });

  if (!active || active.exercise.questions.length === 0) {
    elements.practiceCard.innerHTML = `
      <div class="flashcard-empty">
        <h3>No questions in this exercise</h3>
        <p>Add questions in Build mode before practicing this exercise.</p>
      </div>
    `;
    return;
  }

  const exercise = active.exercise;
  const session = getPracticeSession(exercise);

  if (session.done) {
    elements.practiceCard.innerHTML = `
      <div class="flashcard-empty complete">
        <h3>Exercise complete</h3>
        <p>${escapeHtml(formatPracticeDate(exercise.lastPracticed))}</p>
        <button id="restart-practice" type="button">Practice again</button>
      </div>
    `;
    elements.practiceCard.querySelector("#restart-practice").addEventListener("click", () => {
      resetPracticeSession();
      render();
    });
    return;
  }

  const questionId = session.queue[session.index];
  const question = getQuestionById(exercise, questionId);

  if (!question) {
    resetPracticeSession();
    render();
    return;
  }

  const required = getDrillRequiredCount(session);
  const drillCount = session.drillCounts[questionId] || 0;
  const progress = session.phase === "drill3" ? `${drillCount}/${required} correct` : `${session.index + 1}/${session.queue.length}`;

  const card = document.createElement("form");
  card.className = "flashcard";
  card.innerHTML = `
    <div class="flashcard-topline">
      <span>${active.label}.${getQuestionLabel(exercise, questionId)}</span>
      <span>${escapeHtml(progress)}</span>
    </div>
    <div class="practice-phase">
      <p class="eyebrow">${escapeHtml(getPhaseTitle(session))}</p>
      <p>${escapeHtml(getPhaseDescription(session))}</p>
      <p class="practice-last-date">${escapeHtml(formatPracticeDate(exercise.lastPracticed))}</p>
    </div>
    <div class="flashcard-prompt">
      <p>${escapeHtml(exercise.name)}</p>
      <h3>${escapeHtml(question.prompt)}</h3>
    </div>
    <label>
      Your answer
      <textarea name="practiceAnswer" rows="3" autocomplete="off" ${session.revealed ? "disabled" : ""}></textarea>
    </label>
    <p class="practice-hint" ${session.showHint && question.hint ? "" : "hidden"}>${escapeHtml(question.hint || "")}</p>
    <div class="answer-compare" ${session.revealed ? "" : "hidden"}>
      <div>
        <span>Your answer</span>
        <p>${escapeHtml(session.answer || "No answer entered.")}</p>
      </div>
      <div>
        <span>Expected answer</span>
        <p>${escapeHtml(question.answer)}</p>
      </div>
    </div>
    <div class="flashcard-actions">
      <button class="reveal-answer" type="submit" ${session.revealed ? "disabled" : ""}>Show answer</button>
      <button class="mark-correct" type="button" ${session.revealed ? "" : "disabled"}>Correct 1</button>
      <button class="mark-wrong danger-button" type="button" ${session.revealed ? "" : "disabled"}>Wrong 2</button>
      <button class="show-hint secondary-button" type="button" ${question.hint && !session.revealed ? "" : "disabled"}>Hint 3</button>
      <button class="restart-section secondary-button" type="button">Restart exercise</button>
    </div>
  `;

  const answerInput = card.querySelector("[name='practiceAnswer']");
  answerInput.value = session.answer;

  card.addEventListener("submit", (event) => {
    event.preventDefault();
    session.answer = answerInput.value.trim();
    session.revealed = true;
    render();
  });

  answerInput.addEventListener("input", () => {
    session.answer = answerInput.value;
  });

  answerInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" || event.shiftKey || session.revealed) return;

    event.preventDefault();
    session.answer = answerInput.value.trim();
    session.revealed = true;
    render();
  });

  card.querySelector(".show-hint").addEventListener("click", () => {
    session.showHint = true;
    render();
  });

  card.querySelector(".mark-correct").addEventListener("click", () => gradeCurrentCard(true, exercise));
  card.querySelector(".mark-wrong").addEventListener("click", () => gradeCurrentCard(false, exercise));
  card.querySelector(".restart-section").addEventListener("click", () => {
    resetPracticeSession();
    render();
  });

  elements.practiceCard.append(card);

  if (!session.revealed) {
    requestAnimationFrame(() => {
      answerInput.focus();
      answerInput.setSelectionRange(answerInput.value.length, answerInput.value.length);
    });
  }
}

function handlePracticeShortcut(event) {
  if (state.activeMode !== "practice" || event.metaKey || event.ctrlKey || event.altKey) return;

  const key = getShortcutKey(event);
  if (!key) return;

  const active = getActivePracticeExercise();
  if (!active || active.exercise.questions.length === 0) return;

  const session = getPracticeSession(active.exercise);
  if (session.done) return;

  const questionId = session.queue[session.index];
  const question = getQuestionById(active.exercise, questionId);
  if (!question) return;

  if (key === "3" && question.hint && !session.showHint && !session.revealed) {
    event.preventDefault();
    session.showHint = true;
    render();
    return;
  }

  if (!session.revealed) return;

  if (key === "1") {
    event.preventDefault();
    gradeCurrentCard(true, active.exercise);
  }

  if (key === "2") {
    event.preventDefault();
    gradeCurrentCard(false, active.exercise);
  }
}

function getShortcutKey(event) {
  if (event.key === "1" || event.code === "Digit1" || event.code === "Numpad1") return "1";
  if (event.key === "2" || event.code === "Digit2" || event.code === "Numpad2") return "2";
  if (event.key === "3" || event.code === "Digit3" || event.code === "Numpad3") return "3";
  return "";
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

function exportChapter() {
  const lesson = getActiveLesson();
  if (!lesson) {
    window.alert("Select a chapter before exporting.");
    return;
  }

  const file = new Blob(
    [
      JSON.stringify(
        {
          type: "kinyarwanda-chapter",
          version: 1,
          chapter: lesson,
        },
        null,
        2,
      ),
    ],
    { type: "application/json" },
  );
  const url = URL.createObjectURL(file);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(lesson.name)}.json`;
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

function importChapter(file) {
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const data = JSON.parse(reader.result);
      const chapter = normalizeImportedChapter(data);
      const existingIndex = state.lessons.findIndex((lesson) => lesson.name.toLocaleLowerCase() === chapter.name.toLocaleLowerCase());

      if (existingIndex >= 0) {
        const replace = window.confirm(`"${chapter.name}" already exists. Replace it? Press Cancel to import as a duplicate.`);
        if (replace) {
          chapter.id = state.lessons[existingIndex].id;
          state.lessons[existingIndex] = chapter;
        } else {
          chapter.name = makeDuplicateLessonName(chapter.name);
          state.lessons.push(chapter);
        }
      } else {
        state.lessons.push(chapter);
      }

      state.activeLessonId = chapter.id;
      state.activeMode = "build";
      state.activePracticeExerciseId = null;
      resetPracticeSession();
      saveLessons();
      render();
    } catch (error) {
      window.alert(`Could not import chapter: ${error.message}`);
    }
  });
  reader.readAsText(file);
}

function normalizeImportedChapter(data) {
  const chapter = data?.chapter || data?.lesson || data;
  if (!chapter || typeof chapter !== "object" || Array.isArray(chapter)) {
    throw new Error("Expected a chapter object.");
  }

  const name = String(chapter.name || "").trim();
  if (!name) throw new Error("The chapter needs a name.");

  if (!Array.isArray(chapter.exercises)) {
    throw new Error("The chapter needs an exercises array.");
  }

  return {
    id: makeId("lesson"),
    name,
    exercises: chapter.exercises.map(normalizeImportedExercise),
  };
}

function normalizeImportedExercise(exercise, index) {
  if (!exercise || typeof exercise !== "object" || Array.isArray(exercise)) {
    throw new Error(`Exercise ${index + 1} is not valid.`);
  }

  if (!Array.isArray(exercise.questions)) {
    throw new Error(`Exercise ${index + 1} needs a questions array.`);
  }

  const name = String(exercise.name || "").trim() || `Exercise ${index + 1}`;

  return {
    id: makeId("exercise"),
    name,
    lastPracticed: typeof exercise.lastPracticed === "string" ? exercise.lastPracticed : "",
    questions: exercise.questions.map(normalizeImportedQuestion),
  };
}

function normalizeImportedQuestion(question, index) {
  if (!question || typeof question !== "object" || Array.isArray(question)) {
    throw new Error(`Question ${index + 1} is not valid.`);
  }

  const prompt = String(question.prompt || "").trim();
  const answer = String(question.answer || "").trim();
  if (!prompt || !answer) {
    throw new Error(`Question ${index + 1} needs both prompt and answer.`);
  }

  return {
    id: makeId("question"),
    prompt,
    answer,
    hint: String(question.hint || "").trim(),
  };
}

function makeDuplicateLessonName(name) {
  let counter = 2;
  let candidate = `${name} (${counter})`;

  while (state.lessons.some((lesson) => lesson.name === candidate)) {
    counter += 1;
    candidate = `${name} (${counter})`;
  }

  return candidate;
}

function slugify(value) {
  return (
    value
      .trim()
      .toLocaleLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "chapter"
  );
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
document.addEventListener("keydown", handlePracticeShortcut, true);

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

elements.exportChapter.addEventListener("click", exportChapter);
elements.importChapter.addEventListener("change", () => {
  const file = elements.importChapter.files[0];
  if (file) importChapter(file);
  elements.importChapter.value = "";
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
