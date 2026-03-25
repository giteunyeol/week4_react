(function initEdgeCaseRunner() {
  const VDOM = window.VDOM;
  const DiffEngine = window.DiffEngine;
  const HistoryManager = window.HistoryManager;

  if (!VDOM || !DiffEngine || !HistoryManager) {
    return;
  }

  const domToVNode = VDOM.domToVNode;
  const renderVNode = VDOM.renderVNode;
  const cloneVNode = VDOM.cloneVNode;
  const diff = DiffEngine.diff;
  const applyPatch = DiffEngine.applyPatch;
  const createHistoryManager = HistoryManager.createHistoryManager;
  const supportsAppSmoke = window.location.protocol !== "file:";

  const elements = {
    runButton: document.getElementById("run-tests"),
    overallStatus: document.getElementById("overall-status"),
    overallDetail: document.getElementById("overall-detail"),
    totalCount: document.getElementById("total-count"),
    passCount: document.getElementById("pass-count"),
    failCount: document.getElementById("fail-count"),
    warnCount: document.getElementById("warn-count"),
    skipCount: document.getElementById("skip-count"),
    lastRun: document.getElementById("last-run"),
    contractStatus: document.getElementById("contract-status"),
    smokeStatus: document.getElementById("smoke-status"),
    characterizationStatus: document.getElementById("characterization-status"),
    contractResults: document.getElementById("contract-results"),
    smokeResults: document.getElementById("smoke-results"),
    characterizationResults: document.getElementById("characterization-results"),
    sandbox: document.getElementById("engine-sandbox"),
    appFrame: document.getElementById("app-frame"),
  };

  const tests = [];

  function text(value) {
    return {
      type: "text",
      text: String(value),
    };
  }

  function element(tag, props, children) {
    return {
      type: "element",
      tag: tag,
      props: props || {},
      children: children || [],
    };
  }

  function list(values) {
    return element(
      "ul",
      { class: "list-shell" },
      values.map(function mapValue(value) {
        return element("li", { "data-item": value }, [text(value)]);
      })
    );
  }

  function card(tag, label, extraProps) {
    return element(tag, Object.assign({ class: "card-node" }, extraProps || {}), [text(label)]);
  }

  function deepClone(value) {
    if (value === null || value === undefined) {
      return value;
    }

    return JSON.parse(JSON.stringify(value));
  }

  function assert(condition, message) {
    if (!condition) {
      throw new Error(message);
    }
  }

  function clearNode(node) {
    while (node.firstChild) {
      node.removeChild(node.firstChild);
    }
  }

  function mountRoot(container, vnode) {
    clearNode(container);

    if (vnode !== null && vnode !== undefined) {
      container.appendChild(renderVNode(vnode));
    }
  }

  function readRoot(container) {
    return container.firstChild ? domToVNode(container.firstChild) : null;
  }

  function sortProps(props) {
    const sorted = {};

    Object.keys(props || {})
      .sort()
      .forEach(function eachKey(key) {
        sorted[key] = props[key];
      });

    return sorted;
  }

  function canonicalizeVNode(vnode) {
    if (!vnode) {
      return null;
    }

    if (vnode.type === "text") {
      return {
        type: "text",
        text: vnode.text,
      };
    }

    return {
      type: "element",
      tag: vnode.tag,
      props: sortProps(vnode.props),
      children: (vnode.children || []).map(canonicalizeVNode),
    };
  }

  function normalizeVNode(vnode) {
    if (vnode === null || vnode === undefined) {
      return null;
    }

    const container = document.createElement("div");
    mountRoot(container, vnode);
    return readRoot(container);
  }

  function stringifyVNode(vnode) {
    return JSON.stringify(canonicalizeVNode(vnode), null, 2);
  }

  function assertNormalizedEqual(actualVNode, expectedVNode, message) {
    const actualNormalized = canonicalizeVNode(normalizeVNode(actualVNode));
    const expectedNormalized = canonicalizeVNode(normalizeVNode(expectedVNode));
    const actualText = JSON.stringify(actualNormalized);
    const expectedText = JSON.stringify(expectedNormalized);

    if (actualText !== expectedText) {
      throw new Error(
        message +
          "\nExpected:\n" +
          stringifyVNode(expectedNormalized) +
          "\nActual:\n" +
          stringifyVNode(actualNormalized)
      );
    }
  }

  function summarizePatches(patches) {
    if (!patches.length) {
      return "PATCH 0";
    }

    const counts = {};

    patches.forEach(function eachPatch(patch) {
      counts[patch.type] = (counts[patch.type] || 0) + 1;
    });

    return Object.keys(counts)
      .sort()
      .map(function mapType(type) {
        return type + " " + counts[type];
      })
      .join(", ");
  }

  function runPatchScenario(oldVNode, newVNode) {
    const oldSnapshot = deepClone(oldVNode);
    const newSnapshot = deepClone(newVNode);
    const patches = diff(oldVNode, newVNode);
    const container = document.createElement("div");

    mountRoot(container, oldVNode);
    applyPatch(container, patches);

    const actualVNode = readRoot(container);

    assertNormalizedEqual(
      actualVNode,
      newVNode,
      "Patched DOM does not match the target VNode after diff/apply."
    );
    assert(
      JSON.stringify(oldVNode) === JSON.stringify(oldSnapshot),
      "diff/apply mutated the old VNode input."
    );
    assert(
      JSON.stringify(newVNode) === JSON.stringify(newSnapshot),
      "diff/apply mutated the new VNode input."
    );

    return {
      patches: patches,
      actualVNode: actualVNode,
    };
  }

  function classTokens(value) {
    return String(value || "")
      .split(/\s+/)
      .filter(Boolean);
  }

  function hasClass(vnode, className) {
    return vnode && vnode.type === "element" && classTokens(vnode.props.class).indexOf(className) >= 0;
  }

  function findVNode(vnode, predicate) {
    if (!vnode) {
      return null;
    }

    if (predicate(vnode)) {
      return vnode;
    }

    if (!vnode.children) {
      return null;
    }

    for (let index = 0; index < vnode.children.length; index += 1) {
      const found = findVNode(vnode.children[index], predicate);

      if (found) {
        return found;
      }
    }

    return null;
  }

  function collectText(vnode) {
    if (!vnode) {
      return "";
    }

    if (vnode.type === "text") {
      return vnode.text;
    }

    return (vnode.children || [])
      .map(function mapChild(child) {
        return collectText(child);
      })
      .join("");
  }

  function setNodeText(vnode, value) {
    vnode.children = [text(value)];
  }

  function setClassList(vnode, tokens) {
    vnode.props.class = tokens.join(" ");
  }

  function toggleLikeInFeed(feedVNode, postId) {
    const nextFeed = cloneVNode(feedVNode);
    const targetPost = findVNode(nextFeed, function isPost(vnode) {
      return vnode.type === "element" && vnode.props["data-post-id"] === postId;
    });

    assert(targetPost, "Expected post not found in feed VNode: " + postId);

    const nextLiked = targetPost.props["data-liked"] !== "true";
    const reactionCopy = findVNode(targetPost, function isReaction(vnode) {
      return hasClass(vnode, "reaction-copy");
    });
    const likeNote = findVNode(targetPost, function isLikeNote(vnode) {
      return hasClass(vnode, "like-note");
    });
    const likeButton = findVNode(targetPost, function isLikeButton(vnode) {
      return hasClass(vnode, "like-button");
    });
    const heartIcon = findVNode(targetPost, function isHeartIcon(vnode) {
      return hasClass(vnode, "heart-icon");
    });
    const buttonLabel = findVNode(targetPost, function isButtonLabel(vnode) {
      return hasClass(vnode, "button-label");
    });

    assert(reactionCopy && likeNote && likeButton && heartIcon && buttonLabel, "Expected like subtrees were not found.");

    const currentLikes = Number(collectText(reactionCopy).replace(/[^\d-]/g, ""));

    targetPost.props["data-liked"] = nextLiked ? "true" : "false";
    setNodeText(reactionCopy, "좋아요 " + (currentLikes + (nextLiked ? 1 : -1)));
    setNodeText(
      likeNote,
      nextLiked
        ? "Like 상태가 켜져 있어서 이 카드가 강조되고 있습니다."
        : "Like를 누르면 이 카드 변화가 Compare 패널에 바로 반영됩니다."
    );
    setClassList(likeNote, nextLiked ? ["like-note"] : ["like-note", "is-muted"]);
    setClassList(
      likeButton,
      nextLiked ? ["social-button", "like-button", "is-active"] : ["social-button", "like-button"]
    );
    likeButton.props["aria-pressed"] = nextLiked ? "true" : "false";
    setNodeText(heartIcon, nextLiked ? "ON" : "OFF");
    setNodeText(buttonLabel, nextLiked ? "Liked" : "Like");

    return nextFeed;
  }

  function assertButtonDisabled(frameDocument, id, expectedDisabled) {
    const button = frameDocument.getElementById(id);

    assert(button, "Button not found: " + id);
    assert(
      button.disabled === expectedDisabled,
      id + " disabled state mismatch. Expected " + expectedDisabled + " but got " + button.disabled + "."
    );
  }

  function waitForFramePaint(frameWindow) {
    return new Promise(function onPromise(resolve) {
      frameWindow.requestAnimationFrame(function onFirstFrame() {
        frameWindow.requestAnimationFrame(resolve);
      });
    });
  }

  function loadFrame(iframe, url) {
    return new Promise(function onPromise(resolve, reject) {
      const timeoutId = window.setTimeout(function onTimeout() {
        reject(new Error("Timed out while loading the app iframe."));
      }, 10000);

      function cleanup() {
        iframe.removeEventListener("load", handleLoad);
        iframe.removeEventListener("error", handleError);
        window.clearTimeout(timeoutId);
      }

      function handleLoad() {
        cleanup();
        resolve(iframe);
      }

      function handleError() {
        cleanup();
        reject(new Error("Failed to load the app iframe."));
      }

      iframe.addEventListener("load", handleLoad);
      iframe.addEventListener("error", handleError);
      iframe.src = url;
    });
  }

  async function loadFreshAppFrame() {
    if (!supportsAppSmoke) {
      throw new Error("Smoke tests need a local HTTP server. Open /tests/ through http://localhost instead of file://.");
    }

    const url = new URL("../index.html", window.location.href);

    url.searchParams.set("edge-case-run", String(Date.now()));
    await loadFrame(elements.appFrame, url.toString());
    await waitForFramePaint(elements.appFrame.contentWindow);
    return elements.appFrame;
  }

  function getFrameFeedVNode(frameDocument) {
    const actualRoot = frameDocument.getElementById("actual-root");

    assert(actualRoot && actualRoot.firstChild, "The app iframe did not render #actual-root.");
    return domToVNode(actualRoot.firstChild);
  }

  async function clickFrameSelector(frameDocument, selector) {
    const target = frameDocument.querySelector(selector);

    assert(target, "Target not found in iframe: " + selector);
    target.click();
    await waitForFramePaint(elements.appFrame.contentWindow);
  }

  function assertFrameFeedMatches(frameDocument, expectedVNode, message) {
    const actualVNode = getFrameFeedVNode(frameDocument);

    assertNormalizedEqual(actualVNode, expectedVNode, message);
  }

  function createRng(seed) {
    let state = seed >>> 0;

    return function nextRandom() {
      state = (1664525 * state + 1013904223) >>> 0;
      return state / 4294967296;
    };
  }

  function randomInt(rng, max) {
    return Math.floor(rng() * max);
  }

  function maybe(rng, chance) {
    return rng() < chance;
  }

  function pick(rng, values) {
    return values[randomInt(rng, values.length)];
  }

  function randomText(rng) {
    const base = pick(rng, [
      "alpha",
      "beta",
      "gamma",
      "delta",
      "hello",
      "like",
      "state",
      "vdom",
      "patch",
    ]);

    if (maybe(rng, 0.3)) {
      return base + "!";
    }

    if (maybe(rng, 0.2)) {
      return base + " " + pick(rng, ["one", "two", "three"]);
    }

    return base;
  }

  function randomProps(rng) {
    const propFactories = {
      class: function classFactory() {
        return pick(rng, ["card", "card active", "row", "pill", "frame"]);
      },
      "data-id": function dataIdFactory() {
        return "node-" + randomInt(rng, 8);
      },
      title: function titleFactory() {
        return pick(rng, ["alpha", "beta", "gamma", "delta"]);
      },
      "aria-label": function ariaLabelFactory() {
        return pick(rng, ["chip", "toggle", "panel", "item"]);
      },
    };
    const props = {};
    const keys = Object.keys(propFactories);
    const count = randomInt(rng, keys.length + 1);

    while (Object.keys(props).length < count) {
      const key = pick(rng, keys);
      props[key] = propFactories[key]();
    }

    return props;
  }

  function randomVNode(rng, depth, allowNullRoot) {
    if (allowNullRoot && maybe(rng, 0.12)) {
      return null;
    }

    if (depth >= 3 || maybe(rng, 0.35)) {
      return text(randomText(rng));
    }

    const tag = pick(rng, ["div", "section", "article", "p", "span", "strong", "button", "ul", "li"]);
    const childCount = depth >= 2 ? randomInt(rng, 3) : 1 + randomInt(rng, 4);
    const children = [];

    for (let index = 0; index < childCount; index += 1) {
      children.push(randomVNode(rng, depth + 1, false));
    }

    return element(tag, randomProps(rng), children);
  }

  function defineTest(section, name, run) {
    tests.push({
      section: section,
      name: name,
      run: run,
    });
  }

  function setSuiteStatus(section, status) {
    const badge = elements[section + "Status"];

    badge.className = "suite-badge " + status;
    badge.textContent = status.toUpperCase();
  }

  function createResultCard(test) {
    const item = document.createElement("li");

    item.className = "result-card running";
    item.innerHTML = [
      '<div class="result-head">',
      "<strong>" + escapeHtml(test.name) + "</strong>",
      '<span class="result-tag">RUNNING</span>',
      "</div>",
      '<p class="result-meta">' + escapeHtml(test.section.toUpperCase()) + "</p>",
      '<p class="result-detail">실행 중...</p>',
    ].join("");
    elements[test.section + "Results"].appendChild(item);
    return item;
  }

  function updateResultCard(item, result) {
    item.className = "result-card " + result.status;
    item.innerHTML = [
      '<div class="result-head">',
      "<strong>" + escapeHtml(result.name) + "</strong>",
      '<span class="result-tag">' + escapeHtml(result.status.toUpperCase()) + "</span>",
      "</div>",
      '<p class="result-meta">' + escapeHtml(result.section.toUpperCase()) + "</p>",
      '<p class="result-detail">' + escapeHtml(result.detail) + "</p>",
    ].join("");
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function resetUi() {
    ["contract", "smoke", "characterization"].forEach(function eachSection(section) {
      clearNode(elements[section + "Results"]);
      setSuiteStatus(section, "running");
    });

    elements.overallStatus.textContent = "RUNNING";
    elements.overallDetail.textContent = "테스트를 실행 중입니다.";
    clearNode(elements.sandbox);
  }

  function updateSummary(results) {
    const counts = {
      pass: 0,
      fail: 0,
      warn: 0,
      skip: 0,
    };

    results.forEach(function eachResult(result) {
      counts[result.status] += 1;
    });

    elements.totalCount.textContent = String(results.length);
    elements.passCount.textContent = String(counts.pass);
    elements.failCount.textContent = String(counts.fail);
    elements.warnCount.textContent = String(counts.warn);
    elements.skipCount.textContent = String(counts.skip);
    elements.lastRun.textContent = "마지막 실행: " + new Date().toLocaleString("ko-KR");

    const blockingFailures = results.some(function hasBlockingFailure(result) {
      return result.status === "fail" && result.section !== "characterization";
    });
    const hasWarnings = counts.warn > 0;
    const hasSkips = counts.skip > 0;

    if (blockingFailures) {
      elements.overallStatus.textContent = "FAIL";
      elements.overallDetail.textContent = "Blocking suite에서 실패가 발생했습니다.";
      return;
    }

    if (hasWarnings) {
      elements.overallStatus.textContent = "PASS WITH WARNINGS";
      elements.overallDetail.textContent = "Blocking suite는 통과했고, React와 다른 동작은 warning으로 기록했습니다.";
      return;
    }

    if (hasSkips) {
      elements.overallStatus.textContent = "PASS WITH SKIPS";
      elements.overallDetail.textContent = "Blocking failure는 없지만 일부 테스트는 환경 제약 때문에 건너뛰었습니다.";
      return;
    }

    elements.overallStatus.textContent = "PASS";
    elements.overallDetail.textContent = "Blocking suite가 모두 통과했습니다.";
  }

  function finalizeSuiteStatuses(results) {
    ["contract", "smoke", "characterization"].forEach(function eachSection(section) {
      const suiteResults = results.filter(function filterBySection(result) {
        return result.section === section;
      });
      const hasFailure = suiteResults.some(function hasFailure(result) {
        return result.status === "fail";
      });
      const hasWarning = suiteResults.some(function hasWarning(result) {
        return result.status === "warn";
      });
      const hasSkip = suiteResults.some(function hasSkip(result) {
        return result.status === "skip";
      });

      if (hasFailure) {
        setSuiteStatus(section, "fail");
        return;
      }

      if (section === "characterization" && hasWarning) {
        setSuiteStatus(section, "warn");
        return;
      }

      if (hasWarning) {
        setSuiteStatus(section, "warn");
        return;
      }

      if (hasSkip) {
        setSuiteStatus(section, "skip");
        return;
      }

      setSuiteStatus(section, "pass");
    });
  }

  defineTest("contract", "No-op diff keeps the DOM stable", function runNoOpTest() {
    const vnode = element("div", { class: "frame" }, [
      element("span", { "data-id": "1" }, [text("hello")]),
      text(" tail"),
    ]);
    const scenario = runPatchScenario(vnode, cloneVNode(vnode));

    assert(scenario.patches.length === 0, "Expected no-op diff to return zero patches.");

    return {
      detail: "diff returned 0 patches and the DOM stayed identical.",
    };
  });

  defineTest("contract", "Root add, remove, and replace transitions patch correctly", function runRootTransitionTest() {
    runPatchScenario(null, element("section", { class: "born" }, [text("created")]));
    runPatchScenario(element("div", { class: "gone" }, [text("removed")]), null);
    runPatchScenario(element("div", { class: "swap" }, [text("from element")]), text("to text"));
    runPatchScenario(text("to element"), element("article", { "data-kind": "card" }, [text("done")]));

    return {
      detail: "Validated add, remove, element-to-text, and text-to-element root changes.",
    };
  });

  defineTest("contract", "Prop add, update, and remove flows emit a PROPS patch", function runPropTest() {
    const oldVNode = element("button", { class: "ghost", "data-tone": "blue", title: "before" }, [text("tap")]);
    const newVNode = element("button", { class: "solid", "aria-pressed": "true" }, [text("tap")]);
    const scenario = runPatchScenario(oldVNode, newVNode);

    assert(
      scenario.patches.some(function hasPropsPatch(patch) {
        return patch.type === "PROPS";
      }),
      "Expected a PROPS patch for prop-only changes."
    );

    return {
      detail: "Patch summary: " + summarizePatches(scenario.patches),
    };
  });

  defineTest("contract", "Parent prop updates and child text changes coexist safely", function runParentAndChildTest() {
    const oldVNode = element("section", { class: "card" }, [
      element("h3", { class: "title" }, [text("before")]),
      element("p", { class: "copy" }, [text("old body")]),
    ]);
    const newVNode = element("section", { class: "card active" }, [
      element("h3", { class: "title" }, [text("before")]),
      element("p", { class: "copy" }, [text("new body")]),
    ]);
    const scenario = runPatchScenario(oldVNode, newVNode);

    assert(
      scenario.patches.some(function hasPatch(patch) {
        return patch.type === "PROPS";
      }) &&
        scenario.patches.some(function hasTextPatch(patch) {
          return patch.type === "TEXT";
        }),
      "Expected both PROPS and TEXT patches."
    );

    return {
      detail: "Patch summary: " + summarizePatches(scenario.patches),
    };
  });

  defineTest("contract", "Front, middle, and end insertions still reach the target DOM", function runInsertionTest() {
    const oldVNode = list(["A", "C"]);
    const newVNode = list(["Z", "A", "B", "C", "D"]);
    const scenario = runPatchScenario(oldVNode, newVNode);

    return {
      detail: "Insertion-heavy update stabilized with " + summarizePatches(scenario.patches) + ".",
    };
  });

  defineTest("contract", "Front, middle, and end deletions still reach the target DOM", function runDeletionTest() {
    const oldVNode = list(["Z", "A", "B", "C", "D"]);
    const newVNode = list(["A", "C"]);
    const scenario = runPatchScenario(oldVNode, newVNode);

    return {
      detail: "Deletion-heavy update stabilized with " + summarizePatches(scenario.patches) + ".",
    };
  });

  defineTest("contract", "Sibling add/remove mixes stay stable after path sorting", function runOrderingTest() {
    const oldVNode = element("section", { class: "stack" }, [
      card("p", "one", { "data-id": "a" }),
      card("p", "two", { "data-id": "b" }),
      card("p", "three", { "data-id": "c" }),
      card("p", "four", { "data-id": "d" }),
    ]);
    const newVNode = element("section", { class: "stack accent" }, [
      card("h2", "zero", { "data-id": "x" }),
      card("p", "two", { "data-id": "b" }),
      card("p", "four", { "data-id": "d" }),
      card("p", "five", { "data-id": "e" }),
    ]);
    const scenario = runPatchScenario(oldVNode, newVNode);

    return {
      detail: "Ordering stress case completed with " + summarizePatches(scenario.patches) + ".",
    };
  });

  defineTest("contract", "Mixed text and element children patch correctly", function runMixedChildrenTest() {
    const oldVNode = element("p", { class: "copy" }, [
      text("Hello "),
      element("strong", { class: "accent" }, [text("old")]),
      text(" world"),
    ]);
    const newVNode = element("p", { class: "copy" }, [
      text("Hello "),
      element("em", { class: "accent" }, [text("new")]),
      text(" friend"),
    ]);
    const scenario = runPatchScenario(oldVNode, newVNode);

    return {
      detail: "Mixed children update completed with " + summarizePatches(scenario.patches) + ".",
    };
  });

  defineTest("contract", "domToVNode ignores whitespace-only text nodes", function runWhitespaceTest() {
    const wrapper = document.createElement("div");

    wrapper.innerHTML = '<div class="shell">\n  <span>alpha</span>\n  \n  <em>beta</em>\n</div>';

    const vnode = domToVNode(wrapper.firstChild);

    assert(vnode.children.length === 2, "Expected whitespace-only text nodes to be removed.");
    assert(vnode.children[0].tag === "span" && vnode.children[1].tag === "em", "Expected only meaningful element children.");

    return {
      detail: "Whitespace-only text nodes were ignored during DOM to VDOM conversion.",
    };
  });

  defineTest("contract", "domToVNode strips editor-only attributes", function runIgnoredAttributeTest() {
    const node = document.createElement("div");

    node.setAttribute("contenteditable", "true");
    node.setAttribute("spellcheck", "false");
    node.setAttribute("data-edit-root", "yes");
    node.setAttribute("data-keep", "ok");

    const vnode = domToVNode(node);

    assert(!("contenteditable" in vnode.props), "contenteditable should be ignored.");
    assert(!("spellcheck" in vnode.props), "spellcheck should be ignored.");
    assert(!("data-edit-root" in vnode.props), "data-edit-root should be ignored.");
    assert(vnode.props["data-keep"] === "ok", "Non-ignored attributes should remain.");

    return {
      detail: "Ignored attributes were removed and normal attributes were preserved.",
    };
  });

  defineTest("contract", "History manager truncates redo branches after undo + push", function runHistoryTest() {
    const history = createHistoryManager({ step: "initial", liked: [] });

    history.push({ step: "a", liked: ["post-1"] });
    history.push({ step: "b", liked: ["post-1", "post-3"] });

    const undoState = history.undo();

    assert(undoState.step === "a", "Undo should move back to step a.");

    history.push({ step: "c", liked: ["post-5"] });

    assert(history.canRedo() === false, "Redo branch should be cleared after pushing a new state.");
    assert(history.getSnapshots().length === 3, "Expected initial, a, and c snapshots to remain.");
    assert(history.getCurrentIndex() === 2, "Current index should point at the new tail snapshot.");

    const clonedSnapshots = history.getSnapshots();

    clonedSnapshots[2].step = "mutated";

    assert(history.current().step === "c", "Snapshot clones returned by getSnapshots() should be immutable copies.");

    return {
      detail: "Undo/push correctly truncated redo history and snapshot getters stayed immutable.",
    };
  });

  defineTest("contract", "Seeded fuzz patch correctness stays stable across random trees", function runFuzzTest() {
    const seeds = [];

    for (let seed = 1; seed <= 64; seed += 1) {
      const rng = createRng(seed);
      let oldVNode = randomVNode(rng, 0, true);
      let newVNode = randomVNode(rng, 0, true);

      if (oldVNode === null && newVNode === null) {
        newVNode = element("div", { class: "seed-" + seed }, [text("fallback")]);
      }

      try {
        runPatchScenario(oldVNode, newVNode);
      } catch (error) {
        throw new Error("Seed " + seed + " failed.\n" + error.message);
      }

      seeds.push(seed);
    }

    return {
      detail: "Verified patch correctness for deterministic seeds 1-" + seeds[seeds.length - 1] + ".",
    };
  });

  defineTest("smoke", "First card like toggle keeps the app DOM in sync", async function runFirstCardSmoke() {
    const frame = await loadFreshAppFrame();
    const frameDocument = frame.contentDocument;
    const initialFeed = getFrameFeedVNode(frameDocument);
    const expectedFeed = toggleLikeInFeed(initialFeed, "post-1");

    await clickFrameSelector(frameDocument, '[data-action="toggle-like"][data-post-id="post-1"]');
    assertFrameFeedMatches(frameDocument, expectedFeed, "First-card like toggle did not match the expected feed VDOM.");
    assertButtonDisabled(frameDocument, "undo-button", false);
    assertButtonDisabled(frameDocument, "redo-button", true);

    return {
      detail: "post-1 toggle updated the feed DOM and enabled Undo.",
    };
  });

  defineTest("smoke", "Middle card like toggle keeps the app DOM in sync", async function runMiddleCardSmoke() {
    const frame = await loadFreshAppFrame();
    const frameDocument = frame.contentDocument;
    const initialFeed = getFrameFeedVNode(frameDocument);
    const expectedFeed = toggleLikeInFeed(initialFeed, "post-3");

    await clickFrameSelector(frameDocument, '[data-action="toggle-like"][data-post-id="post-3"]');
    assertFrameFeedMatches(frameDocument, expectedFeed, "Middle-card like toggle did not match the expected feed VDOM.");

    return {
      detail: "post-3 toggle landed in the expected feed state.",
    };
  });

  defineTest("smoke", "Last card like toggle keeps the app DOM in sync", async function runLastCardSmoke() {
    const frame = await loadFreshAppFrame();
    const frameDocument = frame.contentDocument;
    const initialFeed = getFrameFeedVNode(frameDocument);
    const expectedFeed = toggleLikeInFeed(initialFeed, "post-5");

    await clickFrameSelector(frameDocument, '[data-action="toggle-like"][data-post-id="post-5"]');
    assertFrameFeedMatches(frameDocument, expectedFeed, "Last-card like toggle did not match the expected feed VDOM.");

    return {
      detail: "post-5 toggle landed in the expected feed state.",
    };
  });

  defineTest("smoke", "Toggling the same card twice returns to the initial feed", async function runDoubleToggleSmoke() {
    const frame = await loadFreshAppFrame();
    const frameDocument = frame.contentDocument;
    const initialFeed = getFrameFeedVNode(frameDocument);

    await clickFrameSelector(frameDocument, '[data-action="toggle-like"][data-post-id="post-1"]');
    await clickFrameSelector(frameDocument, '[data-action="toggle-like"][data-post-id="post-1"]');

    assertFrameFeedMatches(frameDocument, initialFeed, "Double toggle should return the feed to the initial VDOM.");

    return {
      detail: "post-1 toggled twice and returned to the exact starting DOM.",
    };
  });

  defineTest("smoke", "Undo and redo replay multi-card changes without drifting", async function runUndoRedoSmoke() {
    const frame = await loadFreshAppFrame();
    const frameDocument = frame.contentDocument;
    const initialFeed = getFrameFeedVNode(frameDocument);
    const firstState = toggleLikeInFeed(initialFeed, "post-1");
    const secondState = toggleLikeInFeed(firstState, "post-3");

    await clickFrameSelector(frameDocument, '[data-action="toggle-like"][data-post-id="post-1"]');
    assertFrameFeedMatches(frameDocument, firstState, "First transition should match the first expected state.");
    await clickFrameSelector(frameDocument, '[data-action="toggle-like"][data-post-id="post-3"]');
    assertFrameFeedMatches(frameDocument, secondState, "Second transition should match the second expected state.");

    await clickFrameSelector(frameDocument, "#undo-button");
    assertFrameFeedMatches(frameDocument, firstState, "Undo should rewind to the first expected state.");
    assertButtonDisabled(frameDocument, "undo-button", false);
    assertButtonDisabled(frameDocument, "redo-button", false);

    await clickFrameSelector(frameDocument, "#redo-button");
    assertFrameFeedMatches(frameDocument, secondState, "Redo should replay the second expected state.");

    return {
      detail: "Two-post history replay matched the expected VDOM at each step.",
    };
  });

  defineTest("smoke", "Reset returns the app to the initial feed and clears history buttons", async function runResetSmoke() {
    const frame = await loadFreshAppFrame();
    const frameDocument = frame.contentDocument;
    const initialFeed = getFrameFeedVNode(frameDocument);

    await clickFrameSelector(frameDocument, '[data-action="toggle-like"][data-post-id="post-2"]');
    await clickFrameSelector(frameDocument, '[data-action="toggle-like"][data-post-id="post-5"]');
    await clickFrameSelector(frameDocument, "#reset-button");

    assertFrameFeedMatches(frameDocument, initialFeed, "Reset should restore the initial feed state.");
    assertButtonDisabled(frameDocument, "undo-button", true);
    assertButtonDisabled(frameDocument, "redo-button", true);

    return {
      detail: "Reset restored the initial feed DOM and disabled Undo/Redo.",
    };
  });

  defineTest("characterization", "Keyless sibling reorder is correct but not minimal", function runReorderCharacterization() {
    const oldVNode = list(["A", "B", "C"]);
    const newVNode = list(["C", "A", "B"]);
    const scenario = runPatchScenario(oldVNode, newVNode);

    return {
      status: "warn",
      detail:
        "Final DOM is correct, but the reorder was handled as " +
        summarizePatches(scenario.patches) +
        " because siblings are matched by index, not key.",
    };
  });

  defineTest("characterization", "Null and fragment-like children normalize away or need wrapping", function runNullCharacterization() {
    const normalized = normalizeVNode(element("div", { class: "shell" }, [text("A"), null, text("B")]));
    let arrayError = "No error";

    try {
      diff([text("A"), text("B")], [text("A"), text("B")]);
    } catch (error) {
      arrayError = error.message;
    }

    return {
      status: "warn",
      detail:
        "Null child round-tripped to " +
        normalized.children.length +
        " visible children, and array roots are unsupported (" +
        arrayError +
        "). Wrap fragment-like siblings in a parent node.",
    };
  });

  defineTest("characterization", "Boolean children are unsupported input", function runBooleanCharacterization() {
    let detail;

    try {
      renderVNode(element("div", { class: "shell" }, [true]));
      detail = "Boolean child did not throw immediately, but this shape is still unsupported by the current VDOM contract.";
    } catch (error) {
      detail = "Boolean child throws during render: " + error.message;
    }

    return {
      status: "warn",
      detail: detail,
    };
  });

  defineTest("characterization", "Live form properties are not serialized back into VDOM", function runFormCharacterization() {
    const input = document.createElement("input");
    const checkbox = document.createElement("input");
    const select = document.createElement("select");
    const optionA = document.createElement("option");
    const optionB = document.createElement("option");

    input.setAttribute("value", "hello");
    input.value = "typed-by-user";

    checkbox.setAttribute("type", "checkbox");
    checkbox.setAttribute("checked", "checked");
    checkbox.checked = false;

    optionA.value = "a";
    optionA.textContent = "A";
    optionA.setAttribute("selected", "selected");
    optionB.value = "b";
    optionB.textContent = "B";
    select.appendChild(optionA);
    select.appendChild(optionB);
    optionB.selected = true;

    const inputVNode = domToVNode(input);
    const checkboxVNode = domToVNode(checkbox);
    const selectVNode = domToVNode(select);
    const selectedOption = findVNode(selectVNode, function hasSelected(vnode) {
      return vnode.type === "element" && Object.prototype.hasOwnProperty.call(vnode.props, "selected");
    });

    return {
      status: "warn",
      detail:
        'domToVNode reads attributes, not live properties: input value="' +
        String(inputVNode.props.value || "") +
        '", checkbox checked="' +
        String(checkboxVNode.props.checked || "") +
        '", selected option="' +
        String((selectedOption && selectedOption.props.value) || "") +
        '".',
    };
  });

  defineTest("characterization", "SVG still depends on HTML createElement semantics", function runSvgCharacterization() {
    const svgVNode = element("svg", { viewBox: "0 0 10 10" }, [
      element("circle", { cx: "5", cy: "5", r: "4" }, []),
    ]);
    const renderedNode = renderVNode(svgVNode);
    const circleNode = renderedNode.firstChild;

    return {
      status: "warn",
      detail:
        "renderVNode uses createElement(), so namespace support depends on browser behavior. Observed namespaces: svg=" +
        String(renderedNode.namespaceURI) +
        ", circle=" +
        String(circleNode && circleNode.namespaceURI) +
        ".",
    };
  });

  async function runAllTests() {
    const results = [];

    resetUi();
    elements.runButton.disabled = true;

    for (let index = 0; index < tests.length; index += 1) {
      const test = tests[index];
      const resultCard = createResultCard(test);

      try {
        if (test.section === "smoke" && !supportsAppSmoke) {
          const skipped = {
            name: test.name,
            section: test.section,
            status: "skip",
            detail: "Smoke tests are skipped under file://. Serve the repo over local HTTP to enable iframe checks.",
          };

          results.push(skipped);
          updateResultCard(resultCard, skipped);
          continue;
        }

        const response = (await test.run()) || {};
        const result = {
          name: test.name,
          section: test.section,
          status: response.status || (test.section === "characterization" ? "warn" : "pass"),
          detail:
            response.detail ||
            (test.section === "characterization"
              ? "Characterization completed."
              : "Test completed successfully."),
        };

        results.push(result);
        updateResultCard(resultCard, result);
      } catch (error) {
        const failure = {
          name: test.name,
          section: test.section,
          status: test.section === "characterization" ? "warn" : "fail",
          detail: error && error.message ? error.message : "Unknown test failure.",
        };

        results.push(failure);
        updateResultCard(resultCard, failure);
      }
    }

    finalizeSuiteStatuses(results);
    updateSummary(results);
    elements.runButton.disabled = false;
  }

  elements.runButton.addEventListener("click", runAllTests);
  window.addEventListener("load", runAllTests);
})();
