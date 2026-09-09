<p align="center">
  <img src="./hero.jpg" alt="um-dsh-azimg — let agents see images" width="100%" />
</p>

<h1 align="center">um-dsh-azimg</h1>

<p align="center">
  <strong>Give DeepSeek Harness agents eyes</strong> — a dynamic plugin for local image analysis
</p>

<p align="center">
  <img src="https://img.shields.io/badge/version-0.2.0-blue" alt="version" />
  <img src="https://img.shields.io/badge/platform-DeepSeek%20Harness-6c63ff" alt="platform" />
  <a href="https://ko-fi.com/unforgetmemory"><img src="https://img.shields.io/badge/Ko--fi-F16061?logo=ko-fi&logoColor=white" alt="Ko-fi" /></a>
</p>

<p align="center">
  English | <a href="./README.md">简体中文</a>
</p>

---

`um-dsh-azimg` is a dynamic Cordis plugin for DSH. It gives agents — especially text-only ones — the ability to analyze local images: it registers the `um_analyze_img` tool, hands local images to a chosen vision model, and returns a structured analysis.

## ✨ Features

- **Multi-image analysis** — 1–8 local images per call, all handled by the same vision model, with order and filenames carried in the prompt
- **True format sniffing** — magic-number detection for PNG / JPEG / GIF / WebP instead of trusting extensions; attachment limit pre-checks + atomic batch ingestion
- **Smart model routing** — three-way image-capability detection per provider model (image / text / unknown) with adapter re-verification; automatic failover with aggregated attribution (credentials / stopReason / diagnostic)
- **Hot switching** — selection in the settings page takes effect immediately, no restart; availability probing + last-call echo
- **Native UI** — settings page and tool card built entirely on DSH design tokens (`--dsw-alias-*`), adapting to light/dark themes automatically

## 🚀 Quick Start

This repository is a **function-body source snapshot** of a dynamic plugin: `host.js` / `client.js` are the verbatim `code.host` / `code.client` values for `cordis_define` (plain JS function bodies — no TS / import / JSX).

To restore the plugin inside a DSH session:

1. Read `host.js` and `client.js` from this repository
2. Submit them as `code.host` / `code.client` to `cordis_define`
3. Activate with `cordis_run`

Once active, the agent can call:

```
um_analyze_img(image_paths: ["C:/path/a.png", "C:/path/b.jpg"], question: "Describe the images")
```

### Install as a profile bundle (recommended)

This repository is a complete profile bundle (`package.json` → `dsh.bundle` + `dsh.client` → a single dual-face row in `cordis.patch.yml`):

```
dsh plugin --profile <name> add github:UnforgetMemory/um-dsh-azimg
```

Installation joins the profile layer stack and activates the plugin: the host half `lib/index.js` registers the `um_analyze_img` tool and the `umimg/*` settings-data service (Typert Remote, exposed via SRC fallback), while the client half `lib/client.js` (hand-written factory-form bundle, zero build) provides the settings page and tool card. It persists with the profile across restarts. To upgrade:

```
dsh plugin --profile <name> update
```

> Fallback: the row can be disabled from the profile's own `cordis.patch.yml` with `- id: umimg, disabled: true`.

## ⚙️ How It Works

```
Model calls um_analyze_img(image_paths[1..8], question?)
   │
   ▼
Host plugin ── limit pre-check → magic-number sniffing → atomic batch ingestion → prompt assembly (text + N image blocks)
   │
   ▼
Candidates ── panel selection set → try only that model (no silent switching)
              not set             → try every image-capable model in turn (automatic failover)
   │
   ▼
subagents.start('agent', { provider, model }) → vision subagent analyzes
   │
   ▼
{ analysis, meta } — the model reads analysis; the tool card reads meta (model / images / attempts / elapsed)
```

Host service dependencies: `tools` · `subagents` · `llm` · `agents` · `attachments` · `fs`

## 🖥️ Settings Page & Tool Card

- **Settings page** (`settings.section` · 「图片分析」): lists every model grouped by provider with image-capability labels (supported / undeclared / text-only), hot switching, availability probing, and last-call echo
- **Tool card** (`tool.call.toolview`): status badge, model chip, failover count, clickable image names, collapsible result, elapsed time

## 🔌 RPC Contract (Client → Host, package-private)

| method | input | output |
|--------|-------|--------|
| `state` | `{ refresh?: boolean }` | `{ selection, groups, stats, lastRun, limits, toolName }` |
| `select` | `{ provider, model }` or `null` | `{ selection, warning }` (non-empty warning = model is not in the image-capable list) |
| `probe` | `{ provider, model }` | `{ ok: true, provider, model, name, inputModalities, contextWindow }` / `{ ok: false, detail, code }` |

## 📦 Repository Files

| file | content |
|------|---------|
| `host.js` / `client.js` | Dynamic-form source snapshots (in-session `cordis_define` restore; see Quick Start) |
| `lib/index.js` | Static host half: `um_analyze_img` tool + `umimg/*` Remote settings service |
| `lib/client.js` | Static client half: hand-written factory-form browser bundle (zero build) |
| `package.json` / `cordis.patch.yml` | `dsh.bundle` + `dsh.client` declarations and the single dual-face layer row |
| `README.md` | 简体中文 README（默认） |
| `hero.png` / `hero.jpg` | Hero artwork (original) / web-optimized version (referenced by the READMEs) |

> Code organization: each function body is internally sectioned into **libraries → provider → scenario → app** layers (in-body layering under the single-function-body constraint; dependencies point downward only), with `execute` as the linear orchestration entry point.

## 📋 Version

Current **0.2.0** — see [CHANGELOG.md](./CHANGELOG.md) for history.

## ☕ Support

If this plugin helps you, buy me a coffee:

<p align="center">
  <a href="https://ko-fi.com/unforgetmemory">
    <img src="https://ko-fi.com/img/githubbutton_sm.svg" alt="Buy Me a Coffee on Ko-fi" height="40" />
  </a>
</p>

## 📝 Notes

- A dynamic plugin lives as long as its DSH process: it disappears when the process exits and can be restored by resubmitting the sources; the model selection (`selection`) is not persisted and resets to "auto" on restart
- Permanent installation: this repository is already a complete static bundle — `dsh plugin add` activates it with the profile layer (`lib/index.js` + `lib/client.js`), no in-session `cordis_define` required
