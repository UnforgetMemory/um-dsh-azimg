<p align="center">
  <img src="./hero.jpg" alt="um-dsh-azimg — 让 agent 看见图片" width="100%" />
</p>

<h1 align="center">um-dsh-azimg</h1>

<p align="center">
  <strong>为 DeepSeek Harness agent 装上眼睛</strong> —— 本地图片视觉分析动态插件
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.3.0-blue" alt="version" />
  <img src="https://img.shields.io/badge/platform-DeepSeek%20Harness-6c63ff" alt="platform" />
  <a href="https://ko-fi.com/unforgetmemory"><img src="https://img.shields.io/badge/Ko--fi-F16061?logo=ko-fi&logoColor=white" alt="Ko-fi" /></a>
</p>

<p align="center">
  简体中文 | <a href="./README.en.md">English</a>
</p>

---

`um-dsh-azimg` 是一个 DSH 动态 Cordis 插件，为（尤其纯文本输入的）agent 提供本地图片分析能力：注册 `um_analyze_img` 工具，把本地图片交给选定的 vision 模型，返回结构化分析结果。

## ✨ 功能亮点

- **多图分析** —— 一次调用 1–8 张本地图片，交给同一 vision 模型，prompt 带顺序与文件名
- **真实格式嗅探** —— 魔数判定 PNG / JPEG / GIF / WebP，不信任扩展名；附件限额预检 + 批量原子入库
- **智能模型调度** —— provider 模型图片能力三分识别（image / text / unknown）+ 适配器复核；失败自动切换并聚合归因（凭据 / stopReason / diagnostic）
- **热切换** —— 设置页选择即时生效，无需重启；可用性探测 + 最近一次调用回显
- **原生 UI** —— 设置页与工具卡完全遵循 DSH 设计令牌（`--dsw-alias-*`），自动适配明暗主题
- **国际化** —— 设置页与工具卡全量支持简体中文 / 英文双语，跟随 DSH locale 服务规范，随语言切换自动重渲染

## 🚀 快速开始

本仓库是动态插件的**函数体源码快照**：`host.js` / `client.js` 即 `cordis_define` 的 `code.host` / `code.client` 原文（纯 JS function body，无 TS / import / JSX）。

在 DSH 会话中恢复插件：

1. 读取本仓库 `host.js` 与 `client.js`
2. 分别作为 `cordis_define` 的 `code.host` / `code.client` 提交
3. `cordis_run` 激活

激活后，agent 即可调用工具：

```
um_analyze_img(image_paths: ["C:/path/a.png", "C:/path/b.jpg"], question: "描述图中内容")
```

### 以 profile bundle 安装（推荐）

本仓库是完整 profile bundle（`package.json` → `dsh.bundle` + `dsh.client` → `cordis.patch.yml` 单行双面）：

```
dsh plugin --profile <name> add github:UnforgetMemory/um-dsh-azimg
```

安装即加入 profile 层栈并激活：Host 半 `lib/index.js` 注册 `um_analyze_img` 工具与 `umimg/*` 设置数据服务（Typert Remote，SRC 回退暴露），Client 半 `lib/client.js`（手写 factory-form bundle，零构建）提供设置页与工具卡；随 profile 常驻，重启不丢。升级：

```
dsh plugin --profile <name> update
```

> 故障兜底：可在 profile 的 `cordis.patch.yml` 写 `- id: umimg, disabled: true` 禁用该行。

## ⚙️ 工作原理

```
模型调用 um_analyze_img(image_paths[1..8], question?)
   │
   ▼
Host 插件 ── 限额预检 → 魔数嗅探真实格式 → 批量原子入库 → 组装 prompt（文本 + N 个 image 块）
   │
   ▼
候选模型 ── 面板已选择 → 只试指定模型（不静默切换）
           未选择     → 依次尝试全部 image 能力模型（失败自动切换）
   │
   ▼
llm.stream({ provider, model, messages }) → 进程内直调 vision 模型（附件像素由适配器就地解析）
   │
   ▼
{ analysis, meta } —— 模型读 analysis，工具卡读 meta（模型 / 张数 / 尝试次数 / 耗时）
```

Host 依赖服务：`tools` · `llm` · `attachments` · `fs`

## 🖥️ 设置页与工具卡

- **设置页**（`settings.section` · 「图片分析」）：按 provider 分组列出全部模型并标注图片能力（支持 / 未声明 / 纯文本），支持热切换、可用性探测与最近调用回显
- **工具卡**（`tool.call.toolview`）：状态标签、模型徽标、切换次数、可点击图片名、结果折叠展开、耗时统计

## 🔌 RPC 契约（Client → Host，Package 私有）

| method | 入参 | 返回 |
|--------|------|------|
| `state` | `{ refresh?: boolean }` | `{ selection, groups, stats, lastRun, limits, toolName }` |
| `select` | `{ provider, model }` 或 `null` | `{ selection, warning }`（warning 非空 = 该模型不在支持图片列表） |
| `probe` | `{ provider, model }` | `{ ok: true, provider, model, name, inputModalities, contextWindow }` / `{ ok: false, detail, code }` |

## 📦 仓库文件

| 文件 | 内容 |
|------|------|
| `host.js` / `client.js` | 动态形态源码快照（会话内 `cordis_define` 恢复用，见快速开始） |
| `lib/index.js` | 静态 Host 半：`um_analyze_img` 工具 + `umimg/*` Remote 设置服务 |
| `lib/client.js` | 静态 Client 半：手写 factory-form 浏览器 bundle（零构建） |
| `package.json` / `cordis.patch.yml` | `dsh.bundle` + `dsh.client` 声明与单行双面层 |
| `README.en.md` | English README |
| `hero.jpg` | 头图（README 引用；原稿本地留存于 `.um.agents/local/`，不入库） |

> 代码组织：两个函数体内部按 **libraries → provider → scenario → app** 分区（单函数体约束下的区内分层，依赖单向向下），`execute` 为线性编排入口。

## 📋 版本

当前 **0.3.0** —— 变更历史见 [CHANGELOG.md](./CHANGELOG.md)。

## ☕ 支持本项目

如果这个插件对你有帮助，欢迎请我喝杯咖啡：

<p align="center">
  <a href="https://ko-fi.com/unforgetmemory">
    <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Buy Me a Coffee on Ko-fi" height="40" />
  </a>
</p>

## 📝 备注

- 动态插件生命周期跟随 DSH 进程：进程退出即消失，重新提交源码即可恢复；模型选择（`selection`）不持久化，重启回到「自动」
- 长期安装：本仓库已是完整静态 bundle——`dsh plugin add` 安装即随 profile 层常驻激活（`lib/index.js` + `lib/client.js`），无需会话内 `cordis_define`
