(function () {
  const { createAppShell } = window.zizPackages.uiShell;
  const icon = (name) => `./icons/${name}.svg`;

  const appState = {
    activeTabId: "flow-main",
    activeActivityId: "explorer",
    tabs: [
      {
        id: "flow-main",
        title: "main.zizd",
        kind: "workflow",
        icon: icon("workflow"),
        closable: true
      },
      {
        id: "query",
        title: "daily_sales.sql",
        kind: "sql",
        icon: icon("sql"),
        dirty: true,
        closable: true
      }
    ],
    log: []
  };

  function node(tag, className, text) {
    const element = document.createElement(tag);
    if (className) element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  }

  function image(src, alt = "") {
    const element = document.createElement("img");
    element.src = src;
    element.alt = alt;
    return element;
  }

  function createBrand() {
    const brand = node("div", "sample-brand");
    brand.appendChild(image(icon("brand")));
    return brand;
  }

  function treeItem(label, iconName, current = false) {
    const item = node("li", `sample-tree-item${current ? " is-current" : ""}`);
    item.append(image(icon(iconName)), node("span", "", label));
    return item;
  }

  function createExplorer(activityId) {
    const panel = node("div", "sample-sidebar");
    panel.appendChild(node("h2", "sample-section-title", activityId === "search" ? "Search" : "Explorer"));

    if (activityId === "search") {
      const field = node("div", "sample-field");
      field.append(node("label", "", "Search files"));
      const input = document.createElement("input");
      input.placeholder = "Keyword";
      field.appendChild(input);
      panel.append(field, node("div", "sample-tree-item", "No search has been run."));
      return panel;
    }

    const tree = node("ul", "sample-tree");
    const project = treeItem("sales_pipeline", "folder", true);
    const children = node("ul", "");
    children.append(
      treeItem("main.zizd", "workflow", appState.activeTabId === "flow-main"),
      treeItem("daily_sales.sql", "sql", appState.activeTabId === "query"),
      treeItem("README.md", "document")
    );
    tree.append(project, children);
    panel.appendChild(tree);
    return panel;
  }

  function createFlowCanvas() {
    const canvas = node("div", "sample-canvas");
    const toolbar = node("div", "sample-canvas-toolbar");
    toolbar.append(
      node("button", "", "＋ Add node"),
      node("button", "", "Fit view")
    );

    const source = node("div", "sample-node sample-node--source");
    const sourceIcon = node("div", "sample-node-icon");
    sourceIcon.appendChild(image(icon("database")));
    source.append(
      sourceIcon,
      node("div", "sample-node-title", "Load sales data"),
      node("div", "sample-node-description", "Read daily source records")
    );

    const transform = node("div", "sample-node sample-node--transform");
    const transformIcon = node("div", "sample-node-icon");
    transformIcon.appendChild(image(icon("workflow")));
    transform.append(
      transformIcon,
      node("div", "sample-node-title", "Aggregate by region"),
      node("div", "sample-node-description", "Group and calculate totals")
    );

    canvas.append(toolbar, node("div", "sample-flow-line"), source, transform);
    return canvas;
  }

  function createSqlEditor() {
    const editor = node("div", "sample-text-editor");
    editor.append(
      node("div", "sample-text-path", "sales_pipeline / daily_sales.sql"),
      node("pre", "sample-code", [
        "-- Daily sales aggregation",
        "SELECT",
        "  sale_date,",
        "  region,",
        "  SUM(amount) AS total_amount",
        "FROM analytics.daily_sales",
        "GROUP BY sale_date, region",
        "ORDER BY sale_date DESC;"
      ].join("\n"))
    );
    return editor;
  }

  function createMainContent(tabId) {
    return tabId === "query" ? createSqlEditor() : createFlowCanvas();
  }

  function createProperties(tabId) {
    const panel = node("div", "sample-properties");
    panel.appendChild(node("h2", "", tabId === "query" ? "SQL document" : "Node details"));

    const name = node("div", "sample-field");
    name.append(node("label", "", "Name"));
    const nameInput = document.createElement("input");
    nameInput.value = tabId === "query" ? "daily_sales.sql" : "Aggregate by region";
    name.appendChild(nameInput);

    const type = node("div", "sample-field");
    type.append(node("label", "", "Type"));
    const select = document.createElement("select");
    const option = document.createElement("option");
    option.textContent = tabId === "query" ? "SQL" : "Transform";
    select.appendChild(option);
    type.appendChild(select);

    panel.append(name, type);
    return panel;
  }

  function createTerminal() {
    const terminal = node("div", "sample-terminal");
    appState.log.slice(-20).forEach((entry) => {
      const line = node("div", "sample-terminal-line");
      line.append(
        node("span", "sample-terminal-time", entry.time),
        node("span", "", entry.message)
      );
      terminal.appendChild(line);
    });
    return terminal;
  }

  function createStatusBrand() {
    return node("span", "sample-status-brand", "ZIZAI");
  }

  const shell = createAppShell({
    root: document.getElementById("app-shell-root"),
    layout: {
      sidebarVisible: true,
      rightPanelVisible: true,
      bottomPanelVisible: false,
      bottomPanelAlignment: "center",
      sidebarWidth: 280,
      rightPanelWidth: 320,
      activeActivityId: appState.activeActivityId
    },
    activities: [
      { id: "explorer", label: "Explorer", icon: icon("folder") },
      { id: "search", label: "Search", icon: icon("search") }
    ],
    commands: [
      { id: "document.save", label: "Save", icon: icon("save"), region: "tabbar", shortcut: "Mod+S" },
      { id: "document.run", label: "Run", icon: icon("run"), region: "tabbar", shortcut: "F5" },
      { id: "panel.toggle", label: "Toggle panel", icon: icon("terminal"), region: "tabbar", shortcut: "Mod+J" },
      { id: "panel.align.center", label: "中央揃え", region: "tabbar" },
      { id: "panel.align.justify", label: "両端揃え", region: "tabbar" }
    ],
    regions: {
      activitybar: createBrand(),
      sidebar: createExplorer(appState.activeActivityId),
      main: createMainContent(appState.activeTabId),
      rightPanel: createProperties(appState.activeTabId),
      bottomPanel: createTerminal(),
      statusbar: createStatusBrand()
    },
    labels: {
      closeTab: "閉じる",
      dirty: "未保存"
    }
  });

  function now() {
    return new Date().toLocaleTimeString("ja-JP", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }

  function appendLog(message) {
    appState.log.push({ time: now(), message });
    shell.setRegion("bottomPanel", createTerminal());
  }

  function updateStatus(message) {
    shell.setStatus([
      { id: "state", label: message },
      { id: "tab", label: "Active", value: appState.activeTabId }
    ]);
  }

  function renderActiveDocument() {
    shell.setRegion("main", createMainContent(appState.activeTabId));
    shell.setRegion("rightPanel", createProperties(appState.activeTabId));
    shell.setRegion("sidebar", createExplorer(appState.activeActivityId));
    updateStatus("Ready");
  }

  shell.on("activity:select", ({ activityId }) => {
    appState.activeActivityId = activityId;
    shell.setLayout({ sidebarVisible: true, activeActivityId: activityId });
    shell.setRegion("sidebar", createExplorer(activityId));
    appendLog(`activity:select → ${activityId}`);
  });

  shell.on("tab:activate", ({ tabId }) => {
    appState.activeTabId = tabId;
    renderActiveDocument();
    appendLog(`tab:activate → ${tabId}`);
  });

  shell.on("tab:close-request", ({ tabId }) => {
    appendLog(`tab:close-request → ${tabId}`);
    if (appState.tabs.length <= 1) return;
    appState.tabs = appState.tabs.filter((tab) => tab.id !== tabId);
    if (appState.activeTabId === tabId) appState.activeTabId = appState.tabs[0].id;
    shell.setTabs(appState.tabs, appState.activeTabId);
    renderActiveDocument();
  });

  shell.on("command:execute", ({ commandId, source }) => {
    appendLog(`command:execute → ${commandId} (${source})`);

    if (commandId === "document.save") {
      const active = appState.tabs.find((tab) => tab.id === appState.activeTabId);
      if (active) active.dirty = false;
      shell.updateTab(appState.activeTabId, { dirty: false });
      updateStatus("Saved");
      return;
    }

    if (commandId === "document.run") {
      updateStatus("Running");
      return;
    }

    if (commandId === "panel.toggle") {
      const layout = shell.getLayout();
      shell.setLayout({ bottomPanelVisible: !layout.bottomPanelVisible });
      return;
    }

    if (commandId === "panel.align.center") {
      shell.setLayout({ bottomPanelVisible: true, bottomPanelAlignment: "center" });
      return;
    }

    if (commandId === "panel.align.justify") {
      shell.setLayout({ bottomPanelVisible: true, bottomPanelAlignment: "justify" });
    }
  });

  shell.on("layout:change", ({ layout }) => {
    updateStatus(`Bottom ${layout.bottomPanelAlignment} / Sidebar ${layout.sidebarWidth}px`);
  });

  shell.setTabs(appState.tabs, appState.activeTabId);
  shell.mount();
  updateStatus("Ready");
  appendLog("AppShell mounted. Ctrl/Cmd+S and F5 emit command events.");
})();
