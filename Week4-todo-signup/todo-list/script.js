"use strict";

/**
 * 3주차 피드백 반영 사항
 * 1) 전역 변수 난립 대신 하나의 state 객체로 관리
 * 2) Magic Number/String 대신 이름이 있는 상수 사용
 * 3) 목록의 버튼들은 개별 리스너 대신 이벤트 위임(Event Delegation) 사용
 * 4) innerHTML 대신 createElement + textContent로 DOM을 구성해 XSS 위험 차단
 * 5) DOM 조회 시 Optional Chaining으로 존재 여부를 고려
 *
 * 추가 구현 기능
 * - 완료 체크(토글), 할 일 수정, 중복 일정 등록 방지
 * - 필터(전체/진행중/완료), 남은 개수 표시
 * - 마감일 / 우선순위 설정
 * - 드래그로 순서 변경
 * - 다크모드 토글 (CSS 변수 기반 테마 전환 - 3주차 알람시계 피드백에서 배운 방식 적용)
 */

// ----- 상수 -----
const MAX_TODO_LENGTH = 100;
const MESSAGE_DURATION_MS = 2000;

const PRIORITY_LABELS = { low: "낮음", medium: "보통", high: "높음" };
const DEFAULT_PRIORITY = "medium";

const FILTER_ALL = "all";
const FILTER_ACTIVE = "active";
const FILTER_DONE = "done";

const THEME_LIGHT = "light";
const THEME_DARK = "dark";

const DROP_BEFORE = "before";
const DROP_AFTER = "after";

// ----- 상태 -----
const state = {
  todos: [], // { id, text, done, dueDate: "YYYY-MM-DD"|"", priority: "low"|"medium"|"high" }
  editingId: null,
  filter: FILTER_ALL,
  theme: THEME_LIGHT,
};

// 드래그 진행 상태는 렌더링 대상이 아니므로 state 객체 밖에서 별도 관리
let draggedId = null;
let dropTargetId = null;
let dropPosition = null;

// ----- DOM 참조 -----
const formEl = document.querySelector("#todo-form");
const inputEl = document.querySelector("#todo-input");
const priorityInputEl = document.querySelector("#todo-priority");
const dueDateInputEl = document.querySelector("#todo-due-date");
const listEl = document.querySelector("#todo-list");
const emptyEl = document.querySelector("#todo-empty");
const messageEl = document.querySelector("#todo-message");
const filtersEl = document.querySelector("#todo-filters");
const remainingEl = document.querySelector("#todo-remaining");
const themeToggleBtnEl = document.querySelector("#theme-toggle-btn");

let messageTimerId = null;

// ----- 유틸 -----
function generateId() {
  return `todo-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function normalize(text) {
  return text.trim().replace(/\s+/g, " ").toLowerCase();
}

function showMessage(text) {
  if (!messageEl) return;
  messageEl.textContent = text;

  if (messageTimerId) {
    clearTimeout(messageTimerId);
  }
  messageTimerId = setTimeout(() => {
    messageEl.textContent = "";
  }, MESSAGE_DURATION_MS);
}

function isDuplicateText(text, excludeId) {
  const target = normalize(text);
  return state.todos.some(
    (todo) => todo.id !== excludeId && normalize(todo.text) === target
  );
}

function todayString() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function formatDueDate(dateStr) {
  const [, month, day] = dateStr.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function isOverdue(todo) {
  return Boolean(todo.dueDate) && !todo.done && todo.dueDate < todayString();
}

function normalizePriority(rawPriority) {
  return PRIORITY_LABELS[rawPriority] ? rawPriority : DEFAULT_PRIORITY;
}

// ----- 필터링 -----
function getFilteredTodos() {
  if (state.filter === FILTER_ACTIVE) {
    return state.todos.filter((todo) => !todo.done);
  }
  if (state.filter === FILTER_DONE) {
    return state.todos.filter((todo) => todo.done);
  }
  return state.todos;
}

function setFilter(filter) {
  state.filter = filter;
  filtersEl?.querySelectorAll(".todo-filters__btn").forEach((btn) => {
    btn.classList.toggle("is-active", btn.dataset.filter === filter);
  });
  renderTodos();
}

function updateRemainingCount() {
  if (!remainingEl) return;
  const remaining = state.todos.filter((todo) => !todo.done).length;
  remainingEl.textContent = `${remaining}개 남음`;
}

// ----- 렌더링: textContent 기반으로 DOM 생성 (innerHTML 미사용) -----
function renderTodos() {
  if (!listEl) return;

  listEl.replaceChildren();

  const filtered = getFilteredTodos();

  filtered.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.dataset.id = todo.id;

    if (todo.id !== state.editingId) {
      li.draggable = true;
    }

    if (todo.id === state.editingId) {
      li.append(...buildEditRow(todo));
    } else {
      li.append(...buildViewRow(todo));
    }

    listEl.append(li);
  });

  if (state.todos.length === 0) {
    emptyEl?.classList.remove("todo-empty--hidden");
    if (emptyEl) emptyEl.textContent = "등록된 일정이 없습니다.";
  } else if (filtered.length === 0) {
    emptyEl?.classList.remove("todo-empty--hidden");
    if (emptyEl) emptyEl.textContent = "해당 조건의 일정이 없습니다.";
  } else {
    emptyEl?.classList.add("todo-empty--hidden");
  }

  updateRemainingCount();
}

// 일반 보기 모드
function buildViewRow(todo) {
  const dragHandle = document.createElement("span");
  dragHandle.className = "todo-item__drag-handle";
  dragHandle.dataset.role = "drag-handle";
  dragHandle.draggable = true;
  dragHandle.textContent = "⋮⋮";
  dragHandle.setAttribute("aria-hidden", "true");

  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "todo-item__checkbox";
  checkbox.checked = todo.done;
  checkbox.dataset.action = "toggle";

  const body = document.createElement("div");
  body.className = "todo-item__body";

  const textSpan = document.createElement("span");
  textSpan.className = "todo-item__text";
  textSpan.classList.toggle("todo-item__text--done", todo.done);
  textSpan.textContent = todo.text;
  body.append(textSpan);

  const meta = document.createElement("div");
  meta.className = "todo-item__meta";

  const priorityBadge = document.createElement("span");
  priorityBadge.className = `badge badge--priority-${todo.priority}`;
  priorityBadge.textContent = PRIORITY_LABELS[todo.priority];
  meta.append(priorityBadge);

  if (todo.dueDate) {
    const dueBadge = document.createElement("span");
    dueBadge.className = isOverdue(todo) ? "badge badge--overdue" : "badge badge--due";
    dueBadge.textContent = isOverdue(todo)
      ? `지남 ${formatDueDate(todo.dueDate)}`
      : formatDueDate(todo.dueDate);
    meta.append(dueBadge);
  }

  body.append(meta);

  const editBtn = document.createElement("button");
  editBtn.type = "button";
  editBtn.className = "todo-item__edit";
  editBtn.dataset.action = "edit";
  editBtn.textContent = "수정";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "todo-item__delete";
  deleteBtn.dataset.action = "delete";
  deleteBtn.textContent = "삭제";

  return [dragHandle, checkbox, body, editBtn, deleteBtn];
}

// 수정 모드
function buildEditRow(todo) {
  const wrapper = document.createElement("div");
  wrapper.className = "todo-item__edit-row";

  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.className = "todo-item__edit-input";
  editInput.value = todo.text;
  editInput.maxLength = MAX_TODO_LENGTH;
  editInput.dataset.role = "edit-input";

  const optionsRow = document.createElement("div");
  optionsRow.className = "todo-item__edit-options";

  const prioritySelect = document.createElement("select");
  prioritySelect.className = "todo-item__edit-select";
  prioritySelect.dataset.role = "edit-priority";
  Object.entries(PRIORITY_LABELS).forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === todo.priority;
    prioritySelect.append(option);
  });

  const dateInput = document.createElement("input");
  dateInput.type = "date";
  dateInput.className = "todo-item__edit-date";
  dateInput.dataset.role = "edit-date";
  dateInput.value = todo.dueDate ?? "";

  optionsRow.append(prioritySelect, dateInput);

  const actionsRow = document.createElement("div");
  actionsRow.className = "todo-item__edit-actions";

  const saveBtn = document.createElement("button");
  saveBtn.type = "button";
  saveBtn.className = "todo-item__save";
  saveBtn.dataset.action = "save";
  saveBtn.textContent = "저장";

  const cancelBtn = document.createElement("button");
  cancelBtn.type = "button";
  cancelBtn.className = "todo-item__cancel";
  cancelBtn.dataset.action = "cancel";
  cancelBtn.textContent = "취소";

  actionsRow.append(saveBtn, cancelBtn);
  wrapper.append(editInput, optionsRow, actionsRow);

  return [wrapper];
}

// ----- FR1: 일정 추가 (+ 중복 방지, 마감일/우선순위) -----
function addTodo(rawText, dueDate, rawPriority) {
  const text = rawText.trim();

  if (!text) {
    showMessage("할 일을 입력해주세요.");
    return;
  }

  if (text.length > MAX_TODO_LENGTH) {
    showMessage(`할 일은 ${MAX_TODO_LENGTH}자 이내로 입력해주세요.`);
    return;
  }

  if (isDuplicateText(text)) {
    showMessage("이미 등록된 일정입니다.");
    return;
  }

  state.todos.push({
    id: generateId(),
    text,
    done: false,
    dueDate: dueDate || "",
    priority: normalizePriority(rawPriority),
  });
  renderTodos();
}

// ----- FR2: 일정 삭제 -----
function deleteTodo(id) {
  state.todos = state.todos.filter((todo) => todo.id !== id);
  if (state.editingId === id) {
    state.editingId = null;
  }
  renderTodos();
}

// ----- 완료 체크 토글 -----
function toggleTodo(id) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo) return;
  todo.done = !todo.done;
  renderTodos();
}

// ----- 할 일 수정 -----
function startEdit(id) {
  state.editingId = id;
  renderTodos();
  document.querySelector('[data-role="edit-input"]')?.focus();
}

function cancelEdit() {
  state.editingId = null;
  renderTodos();
}

function saveEdit(id, rawText, dueDate, rawPriority) {
  const text = rawText.trim();

  if (!text) {
    showMessage("할 일을 입력해주세요.");
    return;
  }

  if (text.length > MAX_TODO_LENGTH) {
    showMessage(`할 일은 ${MAX_TODO_LENGTH}자 이내로 입력해주세요.`);
    return;
  }

  if (isDuplicateText(text, id)) {
    showMessage("이미 등록된 일정입니다.");
    return;
  }

  const todo = state.todos.find((item) => item.id === id);
  if (todo) {
    todo.text = text;
    todo.dueDate = dueDate || "";
    todo.priority = normalizePriority(rawPriority);
  }

  state.editingId = null;
  renderTodos();
}

// ----- 드래그로 순서 변경 -----
function reorderTodos(sourceId, targetId, position) {
  const sourceIndex = state.todos.findIndex((todo) => todo.id === sourceId);
  if (sourceIndex === -1) return;

  const [movedTodo] = state.todos.splice(sourceIndex, 1);

  const targetIndex = state.todos.findIndex((todo) => todo.id === targetId);
  if (targetIndex === -1) {
    // 대상을 찾지 못하면 원래 자리로 복구
    state.todos.splice(sourceIndex, 0, movedTodo);
    return;
  }

  const insertIndex = position === DROP_AFTER ? targetIndex + 1 : targetIndex;
  state.todos.splice(insertIndex, 0, movedTodo);
  renderTodos();
}

function clearDropIndicators() {
  listEl
    ?.querySelectorAll(".todo-item--drop-before, .todo-item--drop-after")
    .forEach((el) => el.classList.remove("todo-item--drop-before", "todo-item--drop-after"));
}

// ----- 다크모드 토글 -----
function applyTheme(theme) {
  state.theme = theme;
  document.documentElement.setAttribute("data-theme", theme);
  if (themeToggleBtnEl) {
    themeToggleBtnEl.textContent = theme === THEME_DARK ? "☀️" : "🌙";
  }
}

function toggleTheme() {
  applyTheme(state.theme === THEME_DARK ? THEME_LIGHT : THEME_DARK);
}

// ----- 이벤트 바인딩 -----
formEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  addTodo(inputEl?.value ?? "", dueDateInputEl?.value ?? "", priorityInputEl?.value ?? DEFAULT_PRIORITY);
  if (inputEl) {
    inputEl.value = "";
    inputEl.focus();
  }
  if (dueDateInputEl) dueDateInputEl.value = "";
  if (priorityInputEl) priorityInputEl.value = DEFAULT_PRIORITY;
});

filtersEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  const btn = target.closest("[data-filter]");
  if (!btn) return;
  setFilter(btn.dataset.filter);
});

themeToggleBtnEl?.addEventListener("click", toggleTheme);

// 이벤트 위임: 체크박스/수정/저장/취소/삭제를 목록(listEl) 하나에만 등록
listEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const actionEl = target.closest("[data-action]");
  if (!actionEl) return;

  const itemEl = actionEl.closest(".todo-item");
  const id = itemEl?.dataset.id;
  if (!id) return;

  const action = actionEl.dataset.action;

  if (action === "delete") {
    deleteTodo(id);
  } else if (action === "edit") {
    startEdit(id);
  } else if (action === "cancel") {
    cancelEdit();
  } else if (action === "save") {
    const editInput = itemEl.querySelector('[data-role="edit-input"]');
    const editPriority = itemEl.querySelector('[data-role="edit-priority"]');
    const editDate = itemEl.querySelector('[data-role="edit-date"]');
    saveEdit(id, editInput?.value ?? "", editDate?.value ?? "", editPriority?.value ?? DEFAULT_PRIORITY);
  }
});

// 체크박스는 change 이벤트로 토글 (키보드 접근성 대응)
listEl?.addEventListener("change", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.dataset.action !== "toggle") return;

  const itemEl = target.closest(".todo-item");
  const id = itemEl?.dataset.id;
  if (id) {
    toggleTodo(id);
  }
});

// 수정 입력창에서 Enter=저장, Escape=취소
listEl?.addEventListener("keydown", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;
  if (target.dataset.role !== "edit-input") return;

  const itemEl = target.closest(".todo-item");
  const id = itemEl?.dataset.id;
  if (!id) return;

  if (event.key === "Enter") {
    event.preventDefault();
    const editPriority = itemEl.querySelector('[data-role="edit-priority"]');
    const editDate = itemEl.querySelector('[data-role="edit-date"]');
    saveEdit(id, target.value, editDate?.value ?? "", editPriority?.value ?? DEFAULT_PRIORITY);
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancelEdit();
  }
});

// 드래그 시작: 드래그 핸들에서 시작한 경우에만 허용
listEl?.addEventListener("dragstart", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const handle = target.closest('[data-role="drag-handle"]');
  if (!handle) {
    event.preventDefault();
    return;
  }

  const itemEl = handle.closest(".todo-item");
  const id = itemEl?.dataset.id;
  if (!id) return;

  draggedId = id;
  itemEl.classList.add("todo-item--dragging");
  event.dataTransfer?.setData("text/plain", id);
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = "move";
  }
});

listEl?.addEventListener("dragover", (event) => {
  if (!draggedId) return;

  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const itemEl = target.closest(".todo-item");
  if (!itemEl || itemEl.dataset.id === draggedId) return;

  event.preventDefault();

  const rect = itemEl.getBoundingClientRect();
  const offset = event.clientY - rect.top;
  const position = offset < rect.height / 2 ? DROP_BEFORE : DROP_AFTER;

  clearDropIndicators();
  itemEl.classList.add(position === DROP_BEFORE ? "todo-item--drop-before" : "todo-item--drop-after");

  dropTargetId = itemEl.dataset.id;
  dropPosition = position;
});

listEl?.addEventListener("drop", (event) => {
  if (!draggedId) return;
  event.preventDefault();

  if (dropTargetId && dropTargetId !== draggedId) {
    reorderTodos(draggedId, dropTargetId, dropPosition);
  }
});

listEl?.addEventListener("dragend", () => {
  listEl.querySelectorAll(".todo-item--dragging").forEach((el) => el.classList.remove("todo-item--dragging"));
  clearDropIndicators();
  draggedId = null;
  dropTargetId = null;
  dropPosition = null;
});

// 초기 렌더링
applyTheme(state.theme);
renderTodos();
