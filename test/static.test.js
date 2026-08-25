"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const src = path.join(root, "src");
const jsFiles = fs.readdirSync(src).filter((name) => name.endsWith(".js"));
const css = fs.readFileSync(path.join(src, "ui-shell.css"), "utf8");
const javascript = jsFiles.map((name) => fs.readFileSync(path.join(src, name), "utf8")).join("\n");

assert.equal(javascript.includes("window.zizShell"), false, "must not expose legacy shell global");
assert.equal(javascript.includes("QWebChannel"), false, "must not contain backend transport");
assert.equal(javascript.includes("dataflow.html"), false, "must not contain app route");
assert.equal(javascript.includes('"sidebar zui-shell__activitybar"'), false,
  "activity bar must not depend on legacy sidebar class");
assert.equal(javascript.includes('"right-sidebar zui-shell__right-panel"'), false,
  "right panel must not depend on legacy right-sidebar class");
assert.ok(javascript.includes('bottomPanelAlignment: "center"'),
  "layout defaults must define center bottom panel alignment");
assert.ok(javascript.includes('is-bottom-panel-justify'),
  "layout controller must expose justify alignment through a shell class");
assert.ok(css.includes('.zui-shell.is-bottom-panel-justify .zui-shell__bottom-panel'),
  "shell CSS must define justify bottom panel placement");
assert.match(css, /\.zui-shell__bottom-panel\s*\{[^}]*grid-column:\s*3\s*\/\s*4/s,
  "center bottom panel must occupy only the main column");
assert.match(css, /\.zui-shell\.is-bottom-panel-justify \.zui-shell__bottom-panel\s*\{[^}]*grid-column:\s*2\s*\/\s*5/s,
  "justify bottom panel must span sidebar, main, and right panel columns");

[".sidebar", ".right-sidebar", ".workspace-", "button {", "body {"].forEach((selector) => {
  assert.equal(css.includes(selector), false, `library CSS must not include global/app selector: ${selector}`);
});

jsFiles.filter((name) => name !== "app_shell.js").forEach((name) => {
  const lines = fs.readFileSync(path.join(src, name), "utf8").split(/\r?\n/).length;
  assert.ok(lines <= 300, `${name} must stay within 300 lines; received ${lines}`);
});

const tabInteractionsPath = path.join(src, "shell_tab_interactions.js");
assert.ok(jsFiles.includes("shell_tab_interactions.js") && fs.existsSync(tabInteractionsPath),
  "src/shell_tab_interactions.js must exist to own generic tab reorder and tab context action interactions");

if (fs.existsSync(tabInteractionsPath)) {
  const tabInteractionsSource = fs.readFileSync(tabInteractionsPath, "utf8");
  assert.equal(tabInteractionsSource.includes("QWebChannel"), false,
    "shell_tab_interactions.js must not contain backend transport");
  assert.equal(tabInteractionsSource.includes("dataflow.html"), false,
    "shell_tab_interactions.js must not contain an application route");
  assert.equal(tabInteractionsSource.includes("workflow"), false,
    "shell_tab_interactions.js must not reference application-specific workflow concepts");
  assert.equal(tabInteractionsSource.includes("window.zizShell"), false,
    "shell_tab_interactions.js must not expose the legacy shell global");
}

console.log("static.test.js: PASS");
