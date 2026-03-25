import { applyPatch, diff } from "./diff.js";
import { createHistoryManager } from "./history.js";
import { cloneVNode, domToVNode, renderVNode } from "./vdom.js";

const actualRoot = document.getElementById("actual-root");
const testRoot = document.getElementById("test-root");
const patchButton = document.getElementById("patch-button");
const undoButton = document.getElementById("undo-button");
const redoButton = document.getElementById("redo-button");

const initialVNode = domToVNode(actualRoot.firstElementChild);
const history = createHistoryManager(initialVNode);
let currentVNode = cloneVNode(initialVNode);

function renderArea(rootElement, vnode) {
  rootElement.replaceChildren(renderVNode(vnode));
}

function renderTestArea(vnode) {
  renderArea(testRoot, vnode);

  const editableRoot = testRoot.firstElementChild;

  if (editableRoot) {
    editableRoot.setAttribute("contenteditable", "true");
    editableRoot.setAttribute("spellcheck", "false");
    editableRoot.setAttribute("data-edit-root", "true");
  }
}

function syncBothAreas(vnode) {
  renderArea(actualRoot, vnode);
  renderTestArea(vnode);
}

function updateButtons() {
  undoButton.disabled = !history.canUndo();
  redoButton.disabled = !history.canRedo();
}

function printDiffResult(patches) {
  const rows = patches.map((patch) => ({
    type: patch.type,
    path: patch.path.length === 0 ? "root" : patch.path.join(" > "),
    detail: patch.text || patch.node?.tag || Object.keys(patch.props || {}).join(", "),
  }));

  console.group("Diff Result");

  if (rows.length === 0) {
    console.log("변경 사항이 없습니다.");
  } else {
    console.table(rows);
  }

  console.groupEnd();
}

function readTestVNode() {
  return domToVNode(testRoot.firstChild);
}

function handlePatch() {
  const nextVNode = readTestVNode();

  if (!nextVNode) {
    alert("테스트 영역에 유효한 DOM이 없습니다.");
    return;
  }

  const patches = diff(currentVNode, nextVNode);
  printDiffResult(patches);

  if (patches.length === 0) {
    return;
  }

  // Patch는 왼쪽 실제 DOM에만 변경 부분을 반영한다.
  applyPatch(actualRoot, patches);
  history.push(nextVNode);
  currentVNode = cloneVNode(nextVNode);
  renderTestArea(nextVNode);
  updateButtons();
}

function handleUndo() {
  const previousVNode = history.undo();

  if (!previousVNode) {
    return;
  }

  currentVNode = cloneVNode(previousVNode);
  syncBothAreas(previousVNode);
  updateButtons();
}

function handleRedo() {
  const nextVNode = history.redo();

  if (!nextVNode) {
    return;
  }

  currentVNode = cloneVNode(nextVNode);
  syncBothAreas(nextVNode);
  updateButtons();
}

renderTestArea(initialVNode);
updateButtons();

patchButton.addEventListener("click", handlePatch);
undoButton.addEventListener("click", handleUndo);
redoButton.addEventListener("click", handleRedo);
