# Virtual DOM Edge Case Testing Checklist

## Recommended Run

1. 프로젝트 루트에서 `python -m http.server 8000`을 실행한다.
2. 앱은 `http://localhost:8000/index.html`에서, 테스트 러너는 `http://localhost:8000/tests/`에서 연다.
3. 테스트 러너의 `Run Tests`를 눌러 `Contract`, `Smoke`, `Characterization` 결과를 확인한다.

## Manual Smoke Checklist

1. `index.html`에서 첫 번째 카드 `Like`를 눌렀을 때 해당 카드의 좋아요 수, 버튼 상태, 강조 문구만 바뀌는지 본다.
2. 가운데 카드와 마지막 카드도 각각 눌러서 카드 위치와 상관없이 실제 DOM이 안정적으로 바뀌는지 본다.
3. 같은 카드의 `Like`를 두 번 눌렀을 때 처음 상태로 정확히 돌아오는지 본다.
4. 카드 두 개를 순서대로 누른 뒤 `Undo`, `Redo`를 눌러 상태가 순서대로 되감기고 다시 적용되는지 본다.
5. 여러 카드를 바꾼 뒤 `Reset`을 눌렀을 때 피드와 버튼 상태가 초기 상태로 돌아오는지 본다.
6. `Inspect`는 포커스만 이동하고 실제 피드 DOM은 바꾸지 않는지 본다.

## Blocking Coverage

- 동일 트리 no-op diff
- 루트 add / remove / replace
- element / text 상호 교체
- prop add / update / remove
- 부모 prop 변경과 자식 text 변경 동시 처리
- 같은 부모에서 앞 / 중간 / 뒤 삽입과 삭제
- mixed text + element children
- whitespace-only text 무시
- ignored attribute 제외
- history branch truncation
- seeded fuzz patch correctness

## Reading the Runner

- `Contract`: 현재 엔진이 보장해야 하는 동작. 실패하면 blocking이다.
- `Smoke`: 실제 앱에서 Like / Undo / Redo / Reset 흐름이 기대 VDOM과 같은지 확인한다.
- `Characterization`: React와 다른 현재 구현의 실제 동작을 warning으로 남긴다.
