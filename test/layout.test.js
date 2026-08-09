"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const src = path.resolve(__dirname, "..", "src");

function load(file, sandbox) {
  vm.runInContext(fs.readFileSync(path.join(src, file), "utf8"), sandbox, { filename: file });
}

function createClassList() {
  const values = new Set();
  return {
    toggle(name, enabled) {
      if (enabled) values.add(name);
      else values.delete(name);
    },
    contains(name) {
      return values.has(name);
    }
  };
}

function createNode(documentRef, tagName) {
  return {
    tagName,
    ownerDocument: documentRef,
    className: "",
    dataset: {},
    attributes: new Map(),
    children: [],
    parentElement: null,
    hidden: false,
    classList: createClassList(),
    style: {
      values: new Map(),
      setProperty(name, value) {
        this.values.set(name, value);
      }
    },
    setAttribute(name, value) {
      this.attributes.set(name, String(value));
    },
    append(...nodes) {
      nodes.forEach((node) => {
        node.parentElement = this;
        this.children.push(node);
      });
    },
    addEventListener() {},
    removeEventListener() {}
  };
}

const sandbox = vm.createContext({ console });
sandbox.window = sandbox;
sandbox.zizPackages = {};

load("shell_types.js", sandbox);
load("shell_dom.js", sandbox);
load("shell_layout.js", sandbox);

const documentRef = {
  body: { classList: createClassList() },
  defaultView: {
    requestAnimationFrame(callback) {
      callback();
      return 1;
    },
    cancelAnimationFrame() {}
  },
  createElement(tagName) {
    return createNode(documentRef, tagName);
  },
  addEventListener() {},
  removeEventListener() {}
};

const refs = sandbox.zizPackages.__uiShellModules.shellDom.buildShell(documentRef);
assert.equal(refs.bottomPanel.parentElement, refs.root,
  "bottom panel must be a direct shell child so it can span multiple shell columns");
assert.notEqual(refs.bottomPanel.parentElement, refs.main,
  "bottom panel must not be owned by main layout");

const layoutChanges = [];
const controller = sandbox.zizPackages.__uiShellModules.createLayoutController({
  refs,
  initialLayout: {
    sidebarVisible: true,
    rightPanelVisible: true,
    bottomPanelVisible: true
  },
  onChange(layout) {
    layoutChanges.push(layout);
  }
});

assert.equal(controller.get().bottomPanelAlignment, "center",
  "default bottom panel alignment must be center");
assert.equal(refs.root.classList.contains("is-bottom-panel-justify"), false,
  "center alignment must not set justify class");

controller.set({ bottomPanelAlignment: "justify" });
assert.equal(controller.get().bottomPanelAlignment, "justify",
  "justify must be stored in normalized layout");
assert.equal(refs.root.classList.contains("is-bottom-panel-justify"), true,
  "justify must set shell layout class");
assert.equal(layoutChanges.at(-1).bottomPanelAlignment, "justify",
  "alignment change must be included in layout change snapshot");

controller.set({ bottomPanelAlignment: "unsupported" });
assert.equal(controller.get().bottomPanelAlignment, "justify",
  "invalid alignment must preserve the current valid alignment");

controller.set({ bottomPanelAlignment: "center" });
assert.equal(controller.get().bottomPanelAlignment, "center",
  "center must be selectable after justify");
assert.equal(refs.root.classList.contains("is-bottom-panel-justify"), false,
  "returning to center must remove justify class");

controller.destroy();
console.log("layout.test.js: PASS");
