(function initDemo() {
  var actualRoot = document.getElementById("actual-root");
  var testRoot = document.getElementById("test-root");
  var markupEditor = document.getElementById("markup-editor");
  var previewStatus = document.getElementById("preview-status");
  var patchButton = document.getElementById("patch-button");
  var undoButton = document.getElementById("undo-button");
  var redoButton = document.getElementById("redo-button");

  function replaceChildrenCompat(rootElement, nextChild) {
    while (rootElement.firstChild) {
      rootElement.removeChild(rootElement.firstChild);
    }

    if (nextChild) {
      rootElement.appendChild(nextChild);
    }
  }

  function setPreviewMessage(message, isError) {
    previewStatus.textContent = message;
    previewStatus.style.color = isError ? "#9b1c1c" : "";
  }

  function showPreviewError(message) {
    replaceChildrenCompat(testRoot, null);

    var errorBox = document.createElement("div");
    errorBox.className = "preview-error";
    errorBox.textContent = message;
    testRoot.appendChild(errorBox);
  }

  try {
    if (!window.DiffEngine || !window.HistoryManager || !window.VDOM) {
      throw new Error("필수 스크립트가 로드되지 않았습니다.");
    }

    var diff = window.DiffEngine.diff;
    var applyPatch = window.DiffEngine.applyPatch;
    var createHistoryManager = window.HistoryManager.createHistoryManager;
    var cloneVNode = window.VDOM.cloneVNode;
    var domToVNode = window.VDOM.domToVNode;
    var renderVNode = window.VDOM.renderVNode;
    var vnodeToHTML = window.VDOM.vnodeToHTML;

    var initialVNode = domToVNode(actualRoot.firstElementChild);
    var history = createHistoryManager(initialVNode);
    var currentVNode = cloneVNode(initialVNode);
    var isPreviewValid = true;

    function renderArea(rootElement, vnode) {
      replaceChildrenCompat(rootElement, renderVNode(vnode));
    }

    function renderPreviewArea(vnode) {
      renderArea(testRoot, vnode);
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
      var rows = patches.map(function mapPatch(patch) {
        return {
          type: patch.type,
          path: patch.path.length === 0 ? "root" : patch.path.join(" > "),
          detail: patch.text || (patch.node && patch.node.tag) || Object.keys(patch.props || {}).join(", "),
        };
      });

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
      var source = markupEditor.value.trim();

      if (!source) {
        return {
          valid: false,
          message: "HTML을 입력해 주세요.",
        };
      }

      var template = document.createElement("template");
      template.innerHTML = source;

      var meaningfulNodes = Array.from(template.content.childNodes).filter(function filterMeaningful(node) {
        return !(node.nodeType === Node.TEXT_NODE && node.textContent.trim() === "");
      });

      if (meaningfulNodes.length !== 1) {
        return {
          valid: false,
          message: "최상위 루트 태그는 하나만 유지해 주세요.",
        };
      }

      var nextVNode = domToVNode(meaningfulNodes[0]);

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
      var result = parseEditorToVNode();

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
      var parsedVNode = refreshPreviewFromEditor();
      var nextVNode = parsedVNode || readTestVNode();

      if (!nextVNode) {
        alert("테스트 영역에 유효한 DOM이 없습니다.");
        return;
      }

      var patches = diff(currentVNode, nextVNode);
      printDiffResult(patches);

      if (patches.length === 0) {
        return;
      }

      applyPatch(actualRoot, patches);
      history.push(nextVNode);
      currentVNode = cloneVNode(nextVNode);
      markupEditor.value = vnodeToHTML(nextVNode);
      renderPreviewArea(nextVNode);
      updateButtons();
    }

    function handleUndo() {
      var previousVNode = history.undo();

      if (!previousVNode) {
        return;
      }

      currentVNode = cloneVNode(previousVNode);
      syncAllAreas(previousVNode);
      updateButtons();
    }

    function handleRedo() {
      var nextVNode = history.redo();

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
  } catch (error) {
    console.error(error);
    setPreviewMessage("스크립트 실행 오류가 발생했습니다.", true);
    showPreviewError("스크립트 실행 오류: " + error.message);
    patchButton.disabled = true;
    undoButton.disabled = true;
    redoButton.disabled = true;
  }
})();
