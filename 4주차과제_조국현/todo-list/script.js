"use strict";

/**
 * 3주차 피드백 반영 사항
 * 1) 전역 변수 난립 대신 하나의 state 객체로 관리
 * 2) Magic Number/String 대신 이름이 있는 상수 사용
 * 3) 목록의 삭제 버튼은 개별 리스너 대신 이벤트 위임(Event Delegation) 사용
 * 4) innerHTML 대신 createElement + textContent로 DOM을 구성해 XSS 위험 차단
 * 5) DOM 조회 시 Optional Chaining으로 존재 여부를 고려
 */

// ----- 상수 -----
const MAX_TODO_LENGTH = 100;
const MESSAGE_DURATION_MS = 2000;

// ----- 상태 -----
const state = {
  todos: [], // { id: string, text: string }
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

// ----- 렌더링: textContent 기반으로 DOM 생성 (innerHTML 미사용) -----
function renderTodos() {
  if (!listEl) return;

  // 목록 초기화
  listEl.replaceChildren();

  state.todos.forEach((todo) => {
    const li = document.createElement("li");
    li.className = "todo-item";
    li.dataset.id = todo.id;

    const textSpan = document.createElement("span");
    textSpan.className = "todo-item__text";
    textSpan.textContent = todo.text;

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "todo-item__delete";
    deleteBtn.dataset.action = "delete";
    deleteBtn.textContent = "삭제";

    li.append(textSpan, deleteBtn);
    listEl.append(li);
  });

  emptyEl?.classList.toggle("todo-empty--hidden", state.todos.length > 0);
}

// ----- FR1: 일정 추가 -----
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

  state.todos.push({ id: generateId(), text });
  renderTodos();
}

// ----- FR2: 일정 삭제 -----
function deleteTodo(id) {
  state.todos = state.todos.filter((todo) => todo.id !== id);
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

// 이벤트 위임: 삭제 버튼을 개별 등록하지 않고 목록(listEl) 하나에만 리스너 등록
listEl?.addEventListener("click", (event) => {
  const target = event.target;
  if (!(target instanceof HTMLElement)) return;

  const deleteBtn = target.closest('[data-action="delete"]');
  if (!deleteBtn) return;

  const itemEl = deleteBtn.closest(".todo-item");
  const id = itemEl?.dataset.id;
  if (id) {
    deleteTodo(id);
  }
});

// 초기 렌더링
renderTodos();
