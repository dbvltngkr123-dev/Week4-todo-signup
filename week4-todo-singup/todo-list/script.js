"use strict";

/**
 * 3주차 피드백 반영 사항
 * 1) 전역 변수 난립 대신 하나의 state 객체로 관리
 * 2) Magic Number/String 대신 이름이 있는 상수 사용
 * 3) 목록의 버튼들은 개별 리스너 대신 이벤트 위임(Event Delegation) 사용
 * 4) innerHTML 대신 createElement + textContent로 DOM을 구성해 XSS 위험 차단
 * 5) DOM 조회 시 Optional Chaining으로 존재 여부를 고려
 *
 * 추가 기능 (FR1/FR2 외 보완)
 * - 완료 체크(토글): 체크박스로 완료 여부를 표시
 * - 할 일 수정: 텍스트를 인라인으로 수정
 * - 중복 일정 등록 방지: 동일한 텍스트(공백/대소문자 무시)는 다시 등록 불가
 */

// ----- 상수 -----
const MAX_TODO_LENGTH = 100;
const MESSAGE_DURATION_MS = 2000;

// ----- 상태 -----
const state = {
  todos: [], // { id: string, text: string, done: boolean }
  editingId: null, // 현재 인라인 수정 중인 항목 id
};

// ----- DOM 참조 -----
const formEl = document.querySelector("#todo-form");
const inputEl = document.querySelector("#todo-input");
const listEl = document.querySelector("#todo-list");
const emptyEl = document.querySelector("#todo-empty");
const messageEl = document.querySelector("#todo-message");

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

// ----- 렌더링: textContent 기반으로 DOM 생성 (innerHTML 미사용) -----
function renderTodos() {
  if (!listEl) return;

  listEl.replaceChildren();

  state.todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.dataset.id = todo.id;

    if (todo.id === state.editingId) {
      li.append(...buildEditRow(todo));
    } else {
      li.append(...buildViewRow(todo));
    }

    listEl.append(li);
  });

  emptyEl?.classList.toggle("todo-empty--hidden", state.todos.length > 0);
}

// 일반 보기 모드: 체크박스 + 텍스트 + 수정/삭제 버튼
function buildViewRow(todo) {
  const checkbox = document.createElement("input");
  checkbox.type = "checkbox";
  checkbox.className = "todo-item__checkbox";
  checkbox.checked = todo.done;
  checkbox.dataset.action = "toggle";

  const textSpan = document.createElement("span");
  textSpan.className = "todo-item__text";
  textSpan.classList.toggle("todo-item__text--done", todo.done);
  textSpan.textContent = todo.text;

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

  return [checkbox, textSpan, editBtn, deleteBtn];
}

// 수정 모드: 입력창 + 저장/취소 버튼
function buildEditRow(todo) {
  const editInput = document.createElement("input");
  editInput.type = "text";
  editInput.className = "todo-item__edit-input";
  editInput.value = todo.text;
  editInput.maxLength = MAX_TODO_LENGTH;
  editInput.dataset.role = "edit-input";

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

  return [editInput, saveBtn, cancelBtn];
}

// ----- FR1: 일정 추가 (+ 중복 방지) -----
function addTodo(rawText) {
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

  state.todos.push({ id: generateId(), text, done: false });
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

// ----- 추가 기능: 완료 체크 토글 -----
function toggleTodo(id) {
  const todo = state.todos.find((item) => item.id === id);
  if (!todo) return;
  todo.done = !todo.done;
  renderTodos();
}

// ----- 추가 기능: 할 일 수정 -----
function startEdit(id) {
  state.editingId = id;
  renderTodos();
  document.querySelector('[data-role="edit-input"]')?.focus();
}

function cancelEdit() {
  state.editingId = null;
  renderTodos();
}

function saveEdit(id, rawText) {
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
  }

  state.editingId = null;
  renderTodos();
}

// ----- 이벤트 바인딩 -----
formEl?.addEventListener("submit", (event) => {
  event.preventDefault();
  addTodo(inputEl?.value ?? "");
  if (inputEl) {
    inputEl.value = "";
    inputEl.focus();
  }
});

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
    saveEdit(id, editInput?.value ?? "");
  }
});

// 체크박스는 change 이벤트로도 토글되도록 위임 처리 (키보드 접근성 대응)
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
    saveEdit(id, target.value);
  } else if (event.key === "Escape") {
    event.preventDefault();
    cancelEdit();
  }
});

// 초기 렌더링
renderTodos();
