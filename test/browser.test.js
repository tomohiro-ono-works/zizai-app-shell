(function () {
  const output = document.getElementById("test-result");
  const messages = [];
  let failures = 0;

  function assert(condition, message) {
    if (!condition) {
      failures += 1;
      messages.push(`FAIL: ${message}`);
      return;
    }
    messages.push(`PASS: ${message}`);
  }

  function finish() {
    output.dataset.status = failures ? "fail" : "pass";
    output.textContent = `${failures ? "FAILED" : "PASSED"}\n${messages.join("\n")}`;
    document.title = failures ? `FAIL ${failures}` : "PASS";
  }

  try {
    const factory = window.zizPackages?.uiShell?.createAppShell;
    assert(typeof factory === "function", "browser package exposes createAppShell");
    if (typeof factory !== "function") {
      finish();
      return;
    }

    const root = document.getElementById("test-root");
    let regionCleanupCount = 0;
    const mainAdapter = {
      mount(host) {
        const node = document.createElement("div");
        node.className = "test-editor";
        node.textContent = "editor";
        host.appendChild(node);
      },
      destroy() {
        regionCleanupCount += 1;
      }
    };

    const shell = factory({
      root,
      layout: {
        sidebarVisible: true,
        rightPanelVisible: true,
        bottomPanelVisible: true,
        activeActivityId: "explorer"
      },
      activities: [
        { id: "explorer", label: "Explorer" },
        { id: "search", label: "Search" }
      ],
      commands: [
        { id: "save", label: "Save", region: "tabbar", shortcut: "Mod+S" },
        { id: "disabled", label: "Disabled", region: "tabbar", shortcut: "F6", disabled: true }
      ],
      regions: {
        sidebar: () => {
          const node = document.createElement("div");
          node.textContent = "sidebar";
          return node;
        },
        main: mainAdapter,
        rightPanel: () => {
          const node = document.createElement("div");
          node.textContent = "properties";
          return node;
        },
        bottomPanel: () => {
          const node = document.createElement("div");
          node.textContent = "terminal";
          return node;
        }
      }
    });

    const events = [];
    ["activity:select", "tab:activate", "tab:close-request", "command:execute", "layout:change"]
      .forEach((name) => shell.on(name, (payload) => events.push({ name, payload })));

    shell.setTabs([
      { id: "flow", title: "main.zizd", closable: true },
      { id: "sql", title: "query.sql", dirty: true, closable: true }
    ], "flow");
    shell.mount();

    const shellRoot = root.querySelector(".zui-shell");
    assert(!!shellRoot, "mount renders the shell root");
    assert(!shellRoot.classList.contains("app-shell"), "library does not add the legacy app-shell class");
    assert(!root.querySelector(".sidebar"), "library DOM does not depend on generic sidebar class");
    assert(!root.querySelector(".right-sidebar"), "library DOM does not depend on generic right-sidebar class");

    const activityStyle = getComputedStyle(root.querySelector(".zui-shell__activitybar"));
    const activeTabStyle = getComputedStyle(root.querySelector(".zui-shell__tab.is-active"));
    const rightPanelStyle = getComputedStyle(root.querySelector(".zui-shell__right-panel"));
    assert(activityStyle.backgroundColor === "rgb(41, 41, 65)", "activity rail keeps the existing dark palette");
    assert(activeTabStyle.borderTopLeftRadius === "12px", "active tab keeps the existing rounded top shape");
    assert(rightPanelStyle.backgroundColor === "rgb(227, 227, 243)", "right panel keeps the existing pale lavender surface");

    const bottomPanel = root.querySelector(".zui-shell__bottom-panel");
    const initialLayout = shell.getLayout();
    const initialBottomStyle = getComputedStyle(bottomPanel);
    assert(initialLayout.bottomPanelAlignment === "center", "bottom panel alignment defaults to center");
    assert(bottomPanel.parentElement === shellRoot, "bottom panel is a shell-level layout region");
    assert(initialBottomStyle.gridColumnStart === "3" && initialBottomStyle.gridColumnEnd === "4",
      "center alignment keeps the bottom panel under the main column");

    root.querySelector('[data-tab-id="sql"] .zui-shell__tab-activate').click();
    assert(events.some((entry) => entry.name === "tab:activate" && entry.payload.tabId === "sql"),
      "tab click emits tab:activate");

    const tabCountBeforeClose = root.querySelectorAll(".zui-shell__tab").length;
    root.querySelector('[data-tab-id="sql"] .zui-shell__tab-close').click();
    assert(events.some((entry) => entry.name === "tab:close-request" && entry.payload.tabId === "sql"),
      "tab close emits close request");
    assert(root.querySelectorAll(".zui-shell__tab").length === tabCountBeforeClose,
      "close request does not remove application-owned tab state");

    root.querySelector('[data-command-id="save"]').click();
    assert(events.some((entry) => entry.name === "command:execute"
      && entry.payload.commandId === "save"
      && entry.payload.source === "tabbar"), "command button emits command:execute");

    shellRoot.dispatchEvent(new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    }));
    assert(events.some((entry) => entry.name === "command:execute"
      && entry.payload.commandId === "save"
      && entry.payload.source === "shortcut"), "shortcut emits the same command event");

    const disabledBefore = events.filter((entry) => entry.payload?.commandId === "disabled").length;
    shellRoot.dispatchEvent(new KeyboardEvent("keydown", {
      key: "F6",
      bubbles: true,
      cancelable: true
    }));
    const disabledAfter = events.filter((entry) => entry.payload?.commandId === "disabled").length;
    assert(disabledBefore === disabledAfter, "disabled shortcut does not emit");

    shell.setLayout({
      sidebarWidth: 360,
      bottomPanelVisible: true,
      bottomPanelAlignment: "justify"
    });
    const justifiedLayout = shell.getLayout();
    const justifiedBottomStyle = getComputedStyle(bottomPanel);
    assert(justifiedLayout.sidebarWidth === 360, "setLayout updates normalized layout state");
    assert(justifiedLayout.bottomPanelAlignment === "justify", "setLayout accepts justify bottom alignment");
    assert(shellRoot.classList.contains("is-bottom-panel-visible"), "setLayout updates panel visibility");
    assert(shellRoot.classList.contains("is-bottom-panel-justify"), "justify alignment updates shell layout class");
    assert(justifiedBottomStyle.gridColumnStart === "2" && justifiedBottomStyle.gridColumnEnd === "5",
      "justify alignment spans sidebar, main, and right panel columns");
    assert(events.some((entry) => entry.name === "layout:change"
      && entry.payload.layout.bottomPanelAlignment === "justify"),
      "bottom alignment changes emit layout:change");

    shell.setLayout({ bottomPanelAlignment: "unsupported" });
    assert(shell.getLayout().bottomPanelAlignment === "justify",
      "invalid bottom alignment preserves the current normalized value");

    shell.setRegion("main", document.createElement("section"));
    assert(regionCleanupCount === 1, "replacing an adapter-backed region calls its destroy method");

    const oldShellRoot = shellRoot;
    shell.destroy();
    assert(!root.querySelector(".zui-shell"), "destroy removes shell DOM");
    const eventCountBeforeDestroyedShortcut = events.length;
    oldShellRoot.dispatchEvent(new KeyboardEvent("keydown", {
      key: "s",
      ctrlKey: true,
      bubbles: true,
      cancelable: true
    }));
    assert(events.length === eventCountBeforeDestroyedShortcut, "destroy removes shortcut listener");
  } catch (error) {
    failures += 1;
    messages.push(`ERROR: ${error && error.stack ? error.stack : error}`);
  }

  finish();
})();
