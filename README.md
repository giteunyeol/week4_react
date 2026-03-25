# week_react

Vanilla JavaScript만으로 Virtual DOM, diff, patch, history 흐름을 직접 구현하고, Like 피드 데모로 상태 변화를 시각화한 프로젝트입니다.

## Project Goal

- Virtual DOM 객체를 직접 만든다.
- 이전 상태와 다음 상태를 비교해서 patch 목록을 만든다.
- 실제 DOM에는 변경된 부분만 반영한다.
- Undo / Redo / Reset으로 상태 흐름을 다시 확인한다.
- 브라우저 기반 edge case 테스트 러너로 계약 범위와 한계를 함께 검증한다.

## Run The App

1. 프로젝트 루트에서 간단한 로컬 서버를 실행한다.
2. 앱은 `index.html`, 테스트 러너는 `tests/index.html`을 연다.

```bash
python -m http.server 8000
```

- App: `http://localhost:8000/index.html`
- Test Runner: `http://localhost:8000/tests/`

`file://`로 직접 열면 기본 앱은 보일 수 있지만, iframe을 사용하는 smoke 테스트는 로컬 HTTP 환경이 더 안전합니다.

## Current Demo Flow

1. 앱이 열리면 초기 feed state를 기반으로 Virtual DOM을 만든다.
2. `renderVNode()`로 왼쪽 User Page를 실제 DOM으로 렌더링한다.
3. 사용자가 `Like`를 누르면 다음 state를 만들고 `diff(currentVNode, nextVNode)`를 실행한다.
4. `applyPatch()`가 실제 DOM에 patch를 반영한다.
5. 오른쪽 Compare 패널은 바뀐 post 기준으로 before / after, patch log, HTML diff를 보여준다.
6. `Undo`, `Redo`, `Reset`은 history snapshot을 기준으로 이전 상태와 다음 상태를 복원한다.
7. `Inspect`는 실제 상태를 바꾸지 않고 비교 포커스만 옮긴다.

## Core Files

```text
.
├── app.js
├── diff.js
├── history.js
├── index.html
├── vdom.js
├── tests
│   ├── index.html
│   ├── test-runner.css
│   └── test-runner.js
├── docs
│   ├── edge-case-testing.md
│   └── react-diff-limitations.md
└── style.css
```

## Core APIs

### `domToVNode(node)`

- 실제 DOM 노드를 Virtual DOM 객체로 바꾼다.
- whitespace-only text node는 무시한다.
- `contenteditable`, `spellcheck`, `data-edit-root`는 테스트용 속성으로 보고 제외한다.

### `renderVNode(vnode)`

- Virtual DOM 객체를 실제 DOM 노드로 다시 만든다.
- 초기 렌더링과 fallback rerender에 사용한다.

### `diff(oldVNode, newVNode)`

- 이전 VDOM과 다음 VDOM을 비교해서 patch 배열을 만든다.
- 현재 계약은 `ADD`, `REMOVE`, `REPLACE`, `TEXT`, `PROPS` 다섯 종류다.
- child 비교는 React의 keyed reconciliation이 아니라 index 기반이다.

### `applyPatch(realRoot, patches)`

- diff 결과를 실제 DOM에 적용한다.
- 같은 부모의 뒤쪽 path부터 적용해서 index 기반 변경이 흔들리지 않게 한다.

### `createHistoryManager(initialVNode)`

- snapshot 배열과 현재 포인터를 관리한다.
- `push`, `undo`, `redo`, `canUndo`, `canRedo`를 제공한다.

## Edge Case Testing

브라우저 테스트 러너는 세 가지 그룹으로 나뉩니다.

- `Contract`: 현재 엔진이 보장해야 하는 correctness 테스트
- `Smoke`: 실제 Like feed 앱에서 DOM이 기대 상태와 같은지 확인하는 테스트
- `Characterization`: React와 다른 현재 동작을 warning으로 문서화하는 테스트

자동 검증 항목은 아래를 포함합니다.

- no-op diff
- root add / remove / replace
- element / text 상호 교체
- prop add / update / remove
- 부모 prop 변경 + 자식 text 변경
- 같은 부모에서 앞 / 중간 / 뒤 삽입과 삭제
- mixed text + element children
- whitespace-only text 무시
- ignored attribute 제외
- history branch truncation
- seeded fuzz patch correctness
- Like / Undo / Redo / Reset smoke flow

문서도 함께 추가했습니다.

- Manual checklist: [docs/edge-case-testing.md](./docs/edge-case-testing.md)
- React 차이 / 한계: [docs/react-diff-limitations.md](./docs/react-diff-limitations.md)

## Supported Contract

- 단일 root 기준의 text / element VNode
- 문자열 attribute 기반 props diff
- index 기반 child comparison
- Like feed demo에서의 실제 DOM patch 적용
- Undo / Redo / Reset history 흐름

## Known Limits

- sibling reorder는 key 기반이 아니라 index 기반이라 patch가 최소가 아닐 수 있다.
- Fragment 같은 multi-root 입력은 직접 지원하지 않는다.
- `null`, boolean child는 React처럼 자연스럽게 처리하지 않는다.
- `value`, `checked`, `selected` 같은 live form property 상태를 그대로 직렬화하지 못한다.
- SVG는 `createElementNS()`가 아니라 `createElement()`에 의존한다.
- whitespace-only text node는 의도적으로 버린다.

자세한 설명은 [docs/react-diff-limitations.md](./docs/react-diff-limitations.md)에 정리했습니다.
