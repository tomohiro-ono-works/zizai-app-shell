# AppShell

VSCodeライクなアプリケーションフレームを再利用するためのJavaScript・CSSライブラリです。

HTML、CSS、標準JavaScriptだけで動作します。Node.js、npm、バンドル、トランスパイルは利用時に不要です。

## 責務

AppShellが担当するのは、アプリケーションの**フレームUI**です。

- topbar、activity bar、sidebar、main、right panel、bottom panel、status barの配置
- tabの表示、active状態、dirty表示、close request
- tabのdrag&drop並べ替え要求とcontext menuの表示・選択通知
- activityの表示と選択通知
- command buttonの表示と実行通知
- commandに割り当てたshortcutの検出と実行通知
- sidebar、right panel、bottom panelの表示・非表示とresize
- bottom panelの`center` / `justify`配置切替
- region contentの差し替えと破棄
- region単位のfocus
- UI操作をeventとしてアプリ側へ通知

AppShellは、各領域に表示する**アプリ固有機能の中身**を担当しません。

- ファイル検索、project選択、project tree
- ファイルの読込・保存
- workflow画面、node、edge、Node Detail
- SQL等のeditor機能
- bottom panel内のデータ表示、log、terminal
- 実行、キャンセル
- HTTP、QWebChannel等のbackend通信
- URL遷移、window操作
- 未保存確認、最大tab数等のアプリ固有policy
- layoutの永続化

これらはアプリ側または別ライブラリで実装し、`setRegion()`、`openTab()`、各eventを使ってAppShellと接続します。

## 読み込み

```html
<link rel="stylesheet" href="./src/00_tokens.css">
<link rel="stylesheet" href="./src/ui-shell.css">

<script src="./src/shell_types.js"></script>
<script src="./src/shell_events.js"></script>
<script src="./src/shell_dom.js"></script>
<script src="./src/shell_layout.js"></script>
<script src="./src/shell_regions.js"></script>
<script src="./src/shell_tabs.js"></script>
<script src="./src/shell_tab_interactions.js"></script>
<script src="./src/shell_activitybar.js"></script>
<script src="./src/shell_shortcuts.js"></script>
<script src="./src/app_shell.js"></script>
```

```js
const { createAppShell } = window.zizPackages.uiShell;
```

## 最小使用例

```html
<div id="shell-root"></div>
```

```js
const { createAppShell } = window.zizPackages.uiShell;

const shell = createAppShell({
  root: document.getElementById("shell-root"),
  layout: {
    sidebarVisible: true,
    rightPanelVisible: false,
    bottomPanelVisible: false,
    bottomPanelAlignment: "center"
  }
});

shell.mount();
```

`createAppShell()`はAppShell instanceを返します。

## createAppShell(options)

| key | 必須 | 内容 |
| --- | --- | --- |
| `root` | 必須 | AppShellをmountする`HTMLElement` |
| `layout` | 任意 | 初期layout。部分指定可能 |
| `activities` | 任意 | Activity Barに表示するitem配列 |
| `commands` | 任意 | command button / shortcut定義 |
| `regions` | 任意 | 各regionへ最初に表示するcontent |
| `labels` | 任意 | `closeTab`、`dirty`等の表示文言 |

### layout

```js
{
  sidebarVisible: false,
  rightPanelVisible: false,
  bottomPanelVisible: false,
  sidebarWidth: 280,
  rightPanelWidth: 320,
  bottomPanelHeight: 220,
  bottomPanelAlignment: "center",
  activeActivityId: ""
}
```

`bottomPanelAlignment`:

- `"center"`: main列の幅だけにbottom panelを配置。既定値。
- `"justify"`: Activity Barを除き、Sidebar・Main・RightPanelの全幅に配置。

## データ形式

### Tab

```js
{
  id: "query-1",
  title: "query.sql",
  kind: "sql",
  icon: "./icons/sql.svg",
  dirty: false,
  closable: true,
  contentKey: "query-1",
  badge: "",
  reorderable: false,
  contextActions: []
}
```

`reorderable`をtrueにすると、Tabがdrag&drop可能になります。ドラッグしたTabを別のTabへdropすると、`tab:reorder-request`が発火します。並べ替え自体はAppShellが行わず、アプリ側が`setTabs()`等でTab順を更新します。

`contextActions`にitemを指定すると、そのTab上のright-clickでAppShell自身が管理するcontext menuが表示されます。

```js
{
  id: "rename",
  label: "Rename",
  disabled: false
}
```

有効なactionを選択すると`tab:context-action`が発火します。`disabled: true`のactionは選択しても何も発火しません。

### Activity

```js
{
  id: "explorer",
  label: "Explorer",
  icon: "./icons/folder.svg",
  badge: "3",
  disabled: false
}
```

### Command

```js
{
  id: "document.save",
  label: "Save",
  icon: "./icons/save.svg",
  region: "tabbar",
  shortcut: "Mod+S",
  disabled: false
}
```

`region`は`"topbar"`、`"tabbar"`、`"panel"`、`"status"`を指定できます。

### Status item

```js
{
  id: "state",
  label: "State",
  value: "Ready"
}
```

## Regions

```text
topbar
activitybar
sidebar
main
rightPanel
bottomPanel
statusbar
```

`setRegion()`へは`HTMLElement`、render function、adapter objectを渡せます。

```js
const element = document.createElement("div");
element.textContent = "Main content";
shell.setRegion("main", element);
```

```js
shell.setRegion("sidebar", (host) => {
  const element = document.createElement("div");
  element.textContent = "Sidebar content";
  host.appendChild(element);

  return () => {
    // region差し替え時またはdestroy時のcleanup
  };
});
```

```js
shell.setRegion("main", {
  mount(host) {
    const element = document.createElement("div");
    element.textContent = "Editor";
    host.appendChild(element);
  },
  destroy() {
    // cleanup
  }
});
```

## Instance API

| API | 内容 | 返却値 |
| --- | --- | --- |
| `mount()` | DOMを描画しlistenerを登録 | 同じAppShell instance |
| `destroy()` | listener、region content、DOMを破棄 | `undefined` |
| `setActivities(items)` | Activity Barを差し替え | 同じAppShell instance |
| `setCommands(commands)` | command定義を差し替え | 同じAppShell instance |
| `setTabs(tabs, activeTabId?)` | Tab一覧を差し替え | 同じAppShell instance |
| `openTab(tab)` | Tabを追加または更新しactive化 | 同じAppShell instance |
| `updateTab(tabId, patch)` | Tab表示情報を部分更新 | 成功時`true`、対象なし`false` |
| `closeTab(tabId)` | `tab:close-request`を発火 | 成功時`true`、対象なし`false` |
| `activateTab(tabId)` | 指定Tabをactive化 | 成功時`true`、対象なし`false` |
| `setRegion(region, content)` | region contentを差し替え | 同じAppShell instance |
| `setStatus(items)` | Status Barを更新 | 同じAppShell instance |
| `setLayout(layout)` | layoutを部分更新 | 同じAppShell instance |
| `getLayout()` | 現在のlayout snapshotを取得 | `LayoutSnapshot`のコピー |
| `focusRegion(region)` | regionへfocus移動 | 成功時`true`、対象なし`false` |
| `on(event, handler)` | eventを購読 | 購読解除関数 |
| `off(event, handler)` | event購読を解除 | 解除時`true`、登録なし`false` |

### 例: Tabを開く

```js
shell.openTab({
  id: "query-1",
  title: "query.sql",
  kind: "sql"
});
```

### 例: Tabを更新

```js
const updated = shell.updateTab("query-1", {
  title: "renamed.sql",
  dirty: true
});
```

### 例: layoutを変更

```js
shell.setLayout({
  bottomPanelVisible: true,
  bottomPanelAlignment: "justify"
});
```

### 例: layoutを取得

```js
const layout = shell.getLayout();
```

### 例: eventを購読

```js
const unsubscribe = shell.on("command:execute", (payload) => {
  console.log(payload);
});

unsubscribe();
```

## Events

| event | payload | 発生タイミング |
| --- | --- | --- |
| `activity:select` | `{ activityId }` | Activityを選択したとき |
| `tab:activate` | `{ tabId }` | UI上でTabを選択したとき |
| `tab:close-request` | `{ tabId }` | close要求したとき |
| `tab:reorder-request` | `{ tabId, targetTabId, placement }` | `reorderable`なTabを別のTabへdropしたとき。`placement`は`"before"`または`"after"` |
| `tab:context-action` | `{ tabId, actionId }` | context menuで有効なactionを選択したとき |
| `command:execute` | `{ commandId, source }` | command buttonまたはshortcut実行時 |
| `layout:change` | `{ layout }` | paneのresize、表示、配置等が変わったとき |
| `region:focus` | `{ region }` | `focusRegion()`でfocusを移したとき |

AppShellはcommandの意味を解釈しません。

```js
shell.on("command:execute", ({ commandId }) => {
  if (commandId === "document.save") {
    // 保存処理はアプリ側
  }
});
```

AppShell自身はTabを削除しません。

```js
shell.on("tab:close-request", ({ tabId }) => {
  const nextTabs = appTabs.filter((tab) => tab.id !== tabId);
  shell.setTabs(nextTabs);
});
```

AppShell自身はTabの並び替えも行いません。

```js
shell.on("tab:reorder-request", ({ tabId, targetTabId, placement }) => {
  const nextTabs = reorder(appTabs, tabId, targetTabId, placement);
  shell.setTabs(nextTabs, tabId);
});
```

## Shortcut

```js
shell.setCommands([
  {
    id: "document.save",
    label: "Save",
    region: "tabbar",
    shortcut: "Mod+S"
  },
  {
    id: "document.run",
    label: "Run",
    region: "tabbar",
    shortcut: "F5"
  }
]);
```

指定例:

```text
Mod+S
Ctrl+S
Meta+S
Ctrl+Shift+P
Alt+Enter
F5
Escape
Delete
ArrowLeft
```

`Mod`はmacOS系では`Meta`、それ以外では`Ctrl`です。Shortcutが一致すると`command:execute`が発火し、`source`は`"shortcut"`になります。

## 別ライブラリとの接続例

AppShellはファイル検索やproject treeを解釈しません。別コンポーネントからの要求をアプリ側が仲介します。

```js
explorer.on("file:open-request", async ({ path }) => {
  const document = await backend.openFile(path);

  shell.openTab({
    id: document.id,
    title: document.name,
    kind: document.kind
  });

  shell.setRegion("main", createDocumentView(document));
});
```

```text
Explorer等      : 開きたいファイルを通知
App / Adapter   : backend呼出し、document種別判断、各UIを仲介
Backend         : ファイル実体を取得
AppShell        : Tabと表示領域を管理
Editor等        : document内容を表示・編集
```

## Sample

`sample/index.html`をブラウザで開くと基本動作を確認できます。

Sample内のworkflow、Explorer、Node Detail風表示、terminal表示はregion利用例のためのダミーUIであり、AppShell本体の機能ではありません。

## Test

ライブラリ利用時にNode.jsは不要です。開発時の確認用として以下を同梱しています。

```bash
node test/layout.test.js
node test/shortcut.test.js
node test/static.test.js
```
