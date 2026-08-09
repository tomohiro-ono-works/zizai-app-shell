"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

function loadShortcuts(platform = "Win32") {
  const sourcePath = path.resolve(__dirname, "../src/shell_shortcuts.js");
  const source = fs.readFileSync(sourcePath, "utf8");
  const window = { navigator: { platform } };
  vm.runInNewContext(source, { window });
  return window.zizPackages.__uiShellModules.shellShortcuts;
}

function event(key, overrides = {}) {
  return {
    key,
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    ...overrides
  };
}

{
  const shortcuts = loadShortcuts();
  const parsed = shortcuts.parseShortcut("Ctrl+Shift+P");
  assert.equal(parsed.key, "P");
  assert.equal(parsed.modifiers.has("Ctrl"), true);
  assert.equal(parsed.modifiers.has("Shift"), true);
  assert.equal(shortcuts.parseShortcut("Ctrl+P+X"), null);
}

{
  const shortcuts = loadShortcuts("Win32");
  assert.equal(shortcuts.matchesShortcut(event("s", { ctrlKey: true }), "Mod+S", false), true);
  assert.equal(shortcuts.matchesShortcut(event("s", { metaKey: true }), "Mod+S", false), false);
  assert.equal(shortcuts.matchesShortcut(event("F5"), "F5", false), true);
  assert.equal(shortcuts.matchesShortcut(event("F5", { repeat: true }), "F5", false), false);
  assert.equal(shortcuts.matchesShortcut(event("F5", { isComposing: true }), "F5", false), false);
}

{
  const shortcuts = loadShortcuts("MacIntel");
  assert.equal(shortcuts.matchesShortcut(event("s", { metaKey: true }), "Mod+S", true), true);
  assert.equal(shortcuts.matchesShortcut(event("s", { ctrlKey: true }), "Mod+S", true), false);
}

{
  const shortcuts = loadShortcuts();
  const listeners = new Map();
  const target = {
    ownerDocument: { defaultView: { navigator: { platform: "Win32" } } },
    addEventListener(name, handler) { listeners.set(name, handler); },
    removeEventListener(name, handler) {
      if (listeners.get(name) === handler) listeners.delete(name);
    }
  };
  let commands = [{ id: "save", shortcut: "Mod+S", disabled: false }];
  const emitted = [];
  const controller = shortcuts.createShortcutController({
    target,
    getCommands: () => commands,
    onExecute: (payload) => emitted.push(JSON.parse(JSON.stringify(payload)))
  });
  const keydown = listeners.get("keydown");
  keydown({
    ...event("s", { ctrlKey: true }),
    preventDefault() {},
    stopPropagation() {}
  });
  assert.deepEqual(emitted, [{ commandId: "save", source: "shortcut" }]);
  commands = [{ id: "save", shortcut: "Mod+S", disabled: true }];
  keydown({
    ...event("s", { ctrlKey: true }),
    preventDefault() {},
    stopPropagation() {}
  });
  assert.equal(emitted.length, 1);
  controller.destroy();
  assert.equal(listeners.has("keydown"), false);
}

console.log("shortcut.test.js: PASS");
