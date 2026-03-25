# Current Engine Limits Compared With React

| Case | Current project behavior | Why it matters |
| --- | --- | --- |
| Sibling reorder without keys | 자식 노드를 index 기준으로 비교해서 결과 DOM은 맞아도 patch가 최소가 아닐 수 있다. | React의 keyed reconciliation처럼 이동을 최적화하지 않는다. |
| Fragment / multi-root | 단일 root VNode만 지원한다. 여러 sibling root는 부모로 감싸야 한다. | React Fragment 같은 다중 루트 패턴과 다르다. |
| `null` / boolean children | `null`은 빈 텍스트로 렌더됐다가 round-trip에서 사라지고, `true` 같은 boolean child는 지원하지 않는다. | React child 모델과 다르므로 입력 검증이 필요하다. |
| Form property state | `domToVNode()`는 attribute를 읽기 때문에 `value`, `checked`, `selected`의 live property 변화를 그대로 직렬화하지 못한다. | 사용자가 직접 바꾼 form 상태를 정확히 반영하지 못할 수 있다. |
| SVG namespace | `createElementNS()`가 아니라 `createElement()`에 의존한다. | 브라우저에 따라 SVG 하위 노드 namespace가 기대와 다를 수 있다. |
| Whitespace-only text | 공백만 있는 text node는 무시한다. | 브라우저 DOM과 완전히 같은 텍스트 구조를 보존하지 않는다. |
| Prop semantics | props를 문자열 attribute로만 다룬다. | property와 attribute가 다른 DOM API는 React처럼 세밀하게 제어하지 않는다. |

## Supported Contract

- 단일 root 기준 element / text VNode
- 문자열 props 기반 diff / patch
- index 기반 child comparison
- Like feed 데모의 Undo / Redo / Reset 흐름
- patch 적용 후 DOM이 목표 VDOM과 같은지에 대한 correctness

## How to Use This Document

- 위 표의 항목은 runner의 `Characterization` 섹션과 대응된다.
- 이 문서는 “버그 목록”보다 “현재 계약의 경계”를 설명하는 문서로 본다.
- React와 동일한 동작을 목표로 확장할 때는 keyed reconciliation, form property handling, SVG namespace부터 우선순위를 잡는 것이 좋다.
