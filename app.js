const { diff, applyPatch } = window.DiffEngine;
const { createHistoryManager } = window.HistoryManager;
const { cloneVNode, domToVNode, renderVNode, vnodeToHTML } = window.VDOM;

const actualRoot = document.getElementById("actual-root");
const testRoot = document.getElementById("test-root");
const markupEditor = document.getElementById("markup-editor");
const previewStatus = document.getElementById("preview-status");
const patchButton = document.getElementById("patch-button");
const undoButton = document.getElementById("undo-button");
const redoButton = document.getElementById("redo-button");

const initialVNode = domToVNode(actualRoot.firstElementChild);
const history = createHistoryManager(initialVNode);
let currentVNode = cloneVNode(initialVNode);
let isPreviewValid = true;

function replaceChildrenCompat(rootElement, nextChild) {
  while (rootElement.firstChild) {
    rootElement.removeChild(rootElement.firstChild);
  }

  if (nextChild) {
    rootElement.appendChild(nextChild);
  }
}

function renderArea(rootElement, vnode) {
  replaceChildrenCompat(rootElement, renderVNode(vnode));
}

function setPreviewMessage(message, isError) {
  previewStatus.textContent = message;
  previewStatus.style.color = isError ? "#9b1c1c" : "";
}

function renderPreviewArea(vnode) {
  renderArea(testRoot, vnode);
}

function showPreviewError(message) {
  replaceChildrenCompat(testRoot, null);

  const errorBox = document.createElement("div");
  errorBox.className = "preview-error";
  errorBox.textContent = message;
  testRoot.appendChild(errorBox);
}

function syncAllAreas(vnode) {
  renderArea(actualRoot, vnode);
  markupEditor.value = vnodeToHTML(vnode);
  renderPreviewArea(vnode);
  isPreviewValid = true;
  setPreviewMessage("HTML이 정상적으로 렌더링되었습니다.", false);
}

function updateButtons() {
  patchButton.disabled = !isPreviewValid;
  undoButton.disabled = !history.canUndo();
  redoButton.disabled = !history.canRedo();
}

function printDiffResult(patches) {
  const rows = patches.map((patch) => ({
    type: patch.type,
    path: patch.path.length === 0 ? "root" : patch.path.join(" > "),
    detail: patch.text || (patch.node && patch.node.tag) || Object.keys(patch.props || {}).join(", "),
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

function parseEditorToVNode() {
  const source = markupEditor.value.trim();

  if (!source) {
    return {
      valid: false,
      message: "HTML을 입력해 주세요.",
    };
  }

  const template = document.createElement("template");
  template.innerHTML = source;

  const meaningfulNodes = Array.from(template.content.childNodes).filter((node) => {
    return !(node.nodeType === Node.TEXT_NODE && node.textContent.trim() === "");
  });

  if (meaningfulNodes.length !== 1) {
    return {
      valid: false,
      message: "최상위 루트 태그는 하나만 유지해 주세요.",
    };
  }

  const nextVNode = domToVNode(meaningfulNodes[0]);

  if (!nextVNode) {
    return {
      valid: false,
      message: "DOM으로 변환할 수 없는 HTML입니다.",
    };
  }

  return {
    valid: true,
    vnode: nextVNode,
  };
}

function refreshPreviewFromEditor() {
  const result = parseEditorToVNode();

  if (!result.valid) {
    isPreviewValid = false;
    setPreviewMessage(result.message, true);
    showPreviewError(result.message);
    updateButtons();
    return null;
  }

  isPreviewValid = true;
  renderPreviewArea(result.vnode);
  setPreviewMessage("HTML이 정상적으로 렌더링되었습니다.", false);
  updateButtons();
  return result.vnode;
}

function handlePatch() {
  const parsedVNode = refreshPreviewFromEditor();
  const nextVNode = parsedVNode || readTestVNode();

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
  markupEditor.value = vnodeToHTML(nextVNode);
  renderPreviewArea(nextVNode);
  updateButtons();
}

function handleUndo() {
  const previousVNode = history.undo();

  if (!previousVNode) {
    return;
  }

  currentVNode = cloneVNode(previousVNode);
  syncAllAreas(previousVNode);
  updateButtons();
}

function handleRedo() {
  const nextVNode = history.redo();

  if (!nextVNode) {
    return;
  }

  currentVNode = cloneVNode(nextVNode);
  syncAllAreas(nextVNode);
  updateButtons();
}

markupEditor.value = vnodeToHTML(initialVNode);
refreshPreviewFromEditor();
updateButtons();

markupEditor.addEventListener("input", refreshPreviewFromEditor);
patchButton.addEventListener("click", handlePatch);
undoButton.addEventListener("click", handleUndo);
redoButton.addEventListener("click", handleRedo);
