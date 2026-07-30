# To-Do List

## 프로젝트 개요
Vanilla JavaScript로 구현한 간단한 할 일 관리(To-Do List) 웹 애플리케이션입니다.
3주차 코드 피드백(상태 관리, Magic Number 제거, 이벤트 위임, innerHTML 대신 textContent 사용)을 반영하여 작성했습니다.

## 기능 설명 (Function Requirement)
- **FR1**: 일정을 추가할 수 있습니다. (입력 후 Enter 또는 '추가' 버튼)
- **FR2**: 일정을 삭제할 수 있습니다. (각 항목의 '삭제' 버튼)

## 설치 방법
별도의 설치 과정이 필요 없습니다. `index.html` 파일을 브라우저로 열면 바로 실행됩니다.

```bash
cd todo-list
open index.html   # 또는 더블 클릭으로 브라우저에서 열기
```

## 사용 방법
1. 입력창에 할 일을 입력합니다. (최대 100자)
2. '추가' 버튼을 클릭하거나 Enter를 누르면 목록에 추가됩니다.
3. 목록에서 '삭제' 버튼을 클릭하면 해당 항목이 제거됩니다.

## 디렉터리 구조
```
todo-list/
├── index.html
├── style.css
├── script.js
└── README.md
```

## 기술 스택
- HTML5
- CSS3 (CSS Variables)
- Vanilla JavaScript (ES6+)

## 코드 설계 포인트 (3주차 피드백 반영)
- 전역 변수 대신 `state` 객체 하나로 데이터를 관리합니다.
- 삭제 버튼마다 리스너를 등록하지 않고, 목록 컨테이너에 이벤트 위임을 적용했습니다.
- `innerHTML` 대신 `createElement` + `textContent`로 DOM을 구성해 XSS 위험을 줄였습니다.
- 글자 수 제한, 메시지 노출 시간 등은 이름이 있는 상수로 관리하고 Magic Number를 지양했습니다.

## 향후 개선 사항
- localStorage를 이용한 새로고침 후 데이터 유지
- 일정별 마감일/우선순위 추가
- 중복 일정 등록 방지 기능
