# week_react

Vanilla JavaScript만 사용해서 Virtual DOM, Diff, Patch, Undo / Redo의 핵심 흐름을 최소 기능으로 구현한 과제용 프로젝트입니다.

## 프로젝트 목적

- 실제 DOM을 Virtual DOM으로 변환한다.
- 이전 Virtual DOM과 새 Virtual DOM을 비교해서 diff를 만든다.
- 변경된 부분만 실제 DOM에 patch 방식으로 반영한다.
- 상태 history를 저장해서 Undo / Redo를 지원한다.
- 발표와 시연에 바로 사용할 수 있는 기본 데모 페이지를 제공한다.

## 실행 방법

1. 저장소를 연다.
2. `index.html`을 브라우저에서 연다.
3. 오른쪽 테스트 영역 내용을 직접 수정한다.
4. `Patch` 버튼을 눌러 왼쪽 실제 DOM에 변경 내용을 반영한다.
5. `Undo`, `Redo` 버튼으로 이전 상태와 다음 상태를 확인한다.

간단한 로컬 서버가 필요하면 아래처럼 실행해도 됩니다.

```bash
python3 -m http.server 8000
```

## 폴더 구조

```text
.
├── app.js
├── diff.js
├── history.js
├── index.html
├── README.md
├── style.css
└── vdom.js
```

## 핵심 함수 설명

### `domToVNode(node)`

- 실제 DOM 노드를 읽어서 Virtual DOM 객체로 바꾼다.
- 텍스트 노드와 엘리먼트 노드를 구분해서 저장한다.
- 과제 데모에서 필요 없는 공백 텍스트는 제외한다.

### `renderVNode(vnode)`

- Virtual DOM 객체를 다시 실제 DOM 노드로 만들어 준다.
- 초기 렌더링과 Undo / Redo 복원에 사용한다.

### `diff(oldVNode, newVNode)`

- 이전 Virtual DOM과 새 Virtual DOM을 비교한다.
- 아래 5가지 변경을 판별한다.
- 노드 추가
- 노드 삭제
- 태그 변경
- 텍스트 변경
- 속성 변경

### `applyPatch(realRoot, patches)`

- diff 결과를 바탕으로 왼쪽 실제 DOM에 변경 부분만 반영한다.
- index 기반 child 비교를 사용하므로 같은 부모의 뒤쪽 자식부터 적용한다.

### `createHistoryManager(initialVNode)`

- 상태 배열과 현재 인덱스를 관리한다.
- `push`, `undo`, `redo`를 단순하게 제공한다.

## Virtual DOM / Diff / Patch 동작 흐름

1. 페이지가 열리면 왼쪽 실제 DOM의 샘플 HTML을 `domToVNode()`로 읽는다.
2. 읽은 Virtual DOM을 이용해서 오른쪽 테스트 영역을 같은 구조로 렌더링한다.
3. 초기 Virtual DOM을 history의 첫 상태로 저장한다.
4. 사용자가 오른쪽 테스트 영역을 수정한다.
5. `Patch` 버튼을 누르면 오른쪽 현재 DOM을 다시 `domToVNode()`로 변환한다.
6. 이전 상태와 새 상태를 `diff()`로 비교한다.
7. 나온 patch 목록을 `applyPatch()`로 왼쪽 실제 DOM에만 반영한다.
8. 새 상태를 history에 저장한다.
9. `Undo`, `Redo`를 누르면 저장된 Virtual DOM으로 왼쪽과 오른쪽을 함께 다시 렌더링한다.

## 직접 테스트한 시나리오 5개

1. 오른쪽 제목 텍스트를 수정하고 `Patch`를 눌렀을 때 왼쪽 제목 텍스트만 변경되는지 확인
2. 오른쪽 설명 문장을 수정하고 `Patch`를 눌렀을 때 텍스트 patch가 콘솔에 출력되는지 확인
3. 오른쪽 `li` 하나를 삭제한 뒤 `Patch`를 눌렀을 때 왼쪽 목록에서도 해당 노드가 제거되는지 확인
4. 오른쪽 `li`를 복사해서 하나 더 추가한 뒤 `Patch`를 눌렀을 때 왼쪽 목록에 노드가 추가되는지 확인
5. `Patch` 후 `Undo`, `Redo`를 눌렀을 때 왼쪽 실제 DOM과 오른쪽 테스트 영역이 함께 이전 상태와 다음 상태로 이동하는지 확인

## 한계점

1. child 비교는 index 기반이므로 노드 재정렬이 많으면 효율적인 diff가 아니다.
2. 공백 텍스트 노드는 단순화를 위해 무시하므로 실제 브라우저 DOM과 완전히 동일한 텍스트 구조를 모두 보존하지는 않는다.
3. 테스트 영역은 `contenteditable` 기반이라 복잡한 HTML 편집기 수준의 안정성까지는 제공하지 않는다.

## 발표 4분 요약

- 이 프로젝트는 React의 핵심 개념인 Virtual DOM, Diff, Patch를 가장 단순한 수준으로 직접 구현한 과제입니다.
- 먼저 왼쪽 실제 DOM을 Virtual DOM 객체로 바꾸고, 그 객체를 이용해 오른쪽 테스트 영역을 같은 구조로 렌더링합니다.
- 사용자가 오른쪽 DOM을 수정하고 `Patch`를 누르면 현재 DOM을 다시 Virtual DOM으로 변환한 뒤 이전 상태와 비교합니다.
- 비교 결과는 노드 추가, 삭제, 태그 변경, 텍스트 변경, 속성 변경 형태의 patch 목록으로 만들어집니다.
- 이 patch 목록을 이용해 왼쪽 실제 DOM에는 바뀐 부분만 반영합니다.
- 그리고 새 Virtual DOM 상태를 history에 저장해서 `Undo`, `Redo`로 이전 상태와 다음 상태를 복원할 수 있습니다.
- 핵심 포인트는 전체를 다시 그리지 않고 변경된 부분만 반영하는 흐름을 직접 확인할 수 있다는 점입니다.
