const { cloneVNode } = window.VDOM;

function createHistoryManager(initialVNode) {
  const snapshots = [cloneVNode(initialVNode)];
  let currentIndex = 0;

  function current() {
    return cloneVNode(snapshots[currentIndex]);
  }

  return {
    push(vnode) {
      snapshots.splice(currentIndex + 1);
      snapshots.push(cloneVNode(vnode));
      currentIndex = snapshots.length - 1;
      return current();
    },
    undo() {
      if (currentIndex === 0) {
        return null;
      }

      currentIndex -= 1;
      return current();
    },
    redo() {
      if (currentIndex === snapshots.length - 1) {
        return null;
      }

      currentIndex += 1;
      return current();
    },
    canUndo() {
      return currentIndex > 0;
    },
    canRedo() {
      return currentIndex < snapshots.length - 1;
    },
    current,
  };
}

window.HistoryManager = {
  createHistoryManager,
};
