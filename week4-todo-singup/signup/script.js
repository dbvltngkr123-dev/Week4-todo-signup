"use strict";

/**
 * 3주차 피드백 반영 사항
 * 1) 여러 플래그를 흩어두지 않고 하나의 state 객체로 관리
 * 2) 아이디/비밀번호 규칙(길이, 정규식 등)은 Magic Number 대신 이름 있는 상수로 선언
 * 3) 메시지 출력은 innerHTML이 아닌 textContent 사용 (XSS 방지)
 * 4) DOM 조회는 Optional Chaining으로 존재 여부를 고려
 * 5) 역할별 함수 분리(SRP): 검증 / 상태 갱신 / 화면 출력 함수를 분리
 */

// ----- 상수 -----
const ID_MIN_LENGTH = 4;
const ID_MAX_LENGTH = 12;
const ID_PATTERN = /^[a-zA-Z0-9]+$/; // 영문/숫자만 허용

const PASSWORD_MIN_LENGTH = 8;
const PASSWORD_MAX_LENGTH = 20;
// 나만의 비밀번호 규칙: 영문, 숫자, 특수문자(!@#$%^&*)를 각각 1개 이상 포함
const PASSWORD_PATTERN =
  /^(?=.*[a-zA-Z])(?=.*[0-9])(?=.*[!@#$%^&*])[a-zA-Z0-9!@#$%^&*]+$/;

// 서버 없이 동작을 확인하기 위한 가입된 아이디 목록(mock DB)
const MOCK_EXISTING_IDS = ["mentor01", "cocento", "admin"];

// ----- 상태 -----
const state = {
  isIdChecked: false, // 중복 확인을 완료했는지 여부
  isIdAvailable: false, // 사용 가능한 아이디인지 여부
  checkedId: "", // 마지막으로 중복 확인을 통과한 아이디
};

// ----- DOM 참조 -----
const formEl = document.querySelector("#signup-form");
const idInputEl = document.querySelector("#user-id");
const checkIdBtnEl = document.querySelector("#check-id-btn");
const idMessageEl = document.querySelector("#id-message");
const passwordInputEl = document.querySelector("#password");
const passwordMessageEl = document.querySelector("#password-message");
const passwordConfirmInputEl = document.querySelector("#password-confirm");
const passwordConfirmMessageEl = document.querySelector(
  "#password-confirm-message"
);
const resultMessageEl = document.querySelector("#result-message");

// ----- 공통 유틸: 메시지 출력 (textContent만 사용) -----
function setFieldMessage(el, text, isSuccess) {
  if (!el) return;
  el.textContent = text;
  el.classList.toggle("field__message--success", isSuccess === true);
  el.classList.toggle("field__message--error", isSuccess === false);
}

// ----- FR1: 아이디 중복 체크 -----
function validateIdFormat(id) {
  if (id.length < ID_MIN_LENGTH || id.length > ID_MAX_LENGTH) {
    return `아이디는 ${ID_MIN_LENGTH}~${ID_MAX_LENGTH}자로 입력해주세요.`;
  }
  if (!ID_PATTERN.test(id)) {
    return "아이디는 영문과 숫자만 사용할 수 있습니다.";
  }
  return null;
}

function checkIdDuplicate() {
  const id = idInputEl?.value.trim() ?? "";

  const formatError = validateIdFormat(id);
  if (formatError) {
    setFieldMessage(idMessageEl, formatError, false);
    state.isIdChecked = false;
    state.isIdAvailable = false;
    return;
  }

  const isDuplicate = MOCK_EXISTING_IDS.includes(id.toLowerCase());

  if (isDuplicate) {
    setFieldMessage(idMessageEl, "이미 사용 중인 아이디입니다.", false);
    state.isIdChecked = false;
    state.isIdAvailable = false;
    return;
  }

  setFieldMessage(idMessageEl, "사용 가능한 아이디입니다.", true);
  state.isIdChecked = true;
  state.isIdAvailable = true;
  state.checkedId = id;
}

// 아이디를 다시 수정하면 이전 중복 확인 결과는 무효화
function invalidateIdCheck() {
  if (!state.isIdChecked) return;
  state.isIdChecked = false;
  state.isIdAvailable = false;
  setFieldMessage(idMessageEl, "아이디를 변경했다면 다시 확인해주세요.", false);
}

// ----- FR2: 비밀번호 정합성 체크 -----
function validatePassword(password) {
  if (
    password.length < PASSWORD_MIN_LENGTH ||
    password.length > PASSWORD_MAX_LENGTH
  ) {
    return `비밀번호는 ${PASSWORD_MIN_LENGTH}~${PASSWORD_MAX_LENGTH}자로 입력해주세요.`;
  }
  if (!PASSWORD_PATTERN.test(password)) {
    return "영문, 숫자, 특수문자(!@#$%^&*)를 각각 1개 이상 포함해주세요.";
  }
  return null;
}

function handlePasswordInput() {
  const password = passwordInputEl?.value ?? "";
  if (!password) {
    setFieldMessage(passwordMessageEl, "", null);
    return;
  }
  const error = validatePassword(password);
  if (error) {
    setFieldMessage(passwordMessageEl, error, false);
  } else {
    setFieldMessage(passwordMessageEl, "사용 가능한 비밀번호입니다.", true);
  }
}

function handlePasswordConfirmInput() {
  const password = passwordInputEl?.value ?? "";
  const confirm = passwordConfirmInputEl?.value ?? "";

  if (!confirm) {
    setFieldMessage(passwordConfirmMessageEl, "", null);
    return;
  }
  if (password !== confirm) {
    setFieldMessage(passwordConfirmMessageEl, "비밀번호가 일치하지 않습니다.", false);
  } else {
    setFieldMessage(passwordConfirmMessageEl, "비밀번호가 일치합니다.", true);
  }
}

// ----- 폼 제출 -----
function handleSubmit(event) {
  event.preventDefault();

  const id = idInputEl?.value.trim() ?? "";
  const password = passwordInputEl?.value ?? "";
  const passwordConfirm = passwordConfirmInputEl?.value ?? "";

  if (!state.isIdChecked || !state.isIdAvailable || state.checkedId !== id) {
    setFieldMessage(idMessageEl, "아이디 중복 확인을 먼저 진행해주세요.", false);
    idInputEl?.focus();
    return;
  }

  const passwordError = validatePassword(password);
  if (passwordError) {
    setFieldMessage(passwordMessageEl, passwordError, false);
    passwordInputEl?.focus();
    return;
  }

  if (password !== passwordConfirm) {
    setFieldMessage(passwordConfirmMessageEl, "비밀번호가 일치하지 않습니다.", false);
    passwordConfirmInputEl?.focus();
    return;
  }

  // 가입 성공 처리 (mock)
  MOCK_EXISTING_IDS.push(id.toLowerCase());
  if (resultMessageEl) {
    resultMessageEl.textContent = `${id}님, 회원가입이 완료되었습니다.`;
    resultMessageEl.classList.remove("result-message--error");
    resultMessageEl.classList.add("result-message--success");
  }

  formEl?.reset();
  state.isIdChecked = false;
  state.isIdAvailable = false;
  state.checkedId = "";
}

// ----- 이벤트 바인딩 -----
checkIdBtnEl?.addEventListener("click", checkIdDuplicate);
idInputEl?.addEventListener("input", invalidateIdCheck);
passwordInputEl?.addEventListener("input", handlePasswordInput);
passwordConfirmInputEl?.addEventListener("input", handlePasswordConfirmInput);
formEl?.addEventListener("submit", handleSubmit);
