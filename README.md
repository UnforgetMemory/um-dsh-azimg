# um-dsh-azimg — 图片分析动态插件（源码快照）

`um_analyze_img` 工具插件：为（尤其纯文本输入的）agent 提供本地图片分析能力，经 provider 代理 subagent 链路调用选定 vision 模型。

四项能力：**① 工具功能完整**（多图 / 格式嗅探 / 限额预检 / 失败切换 / 结构化呈现元数据）、**② provider 模型图片能力识别**（image / text / unknown 三分 + 适配器复核）、**③ 热切换**（选择即时生效，无需重启）、**④ UI 符合 DSH 设计风格**（设计令牌 + 设置页 + 工具调用卡片）。

## 运行时身份（当前进程）

| 项 | 值 |
|----|----|
| pluginId | `umimg-1` |
| 当前版本 | `pkg-2` |
| 激活 Run | `run-2`（`update`，激活成功） |
| 运行态 | `state: running`（`cordis_inspect_self` 实测） |
| 快照方式 | 本目录 `host.js` / `client.js` 即 `cordis_define` 的 `code.host` / `code.client` 原文 |

> 上一进程的 `umaimg-1`（pkg-1…pkg-5）已随进程重启消失；其演进记录见文末「历史」。

## 文件

| 文件 | 内容 |
|------|------|
| `host.js` | Host 半：工具 + 模型能力枚举 + 热切换状态 + RPC（纯 JS function body，`cordis_define` 的 `code.host` 值） |
| `client.js` | Client 半：`settings.section` 设置页 + `tool.call.toolview` 工具卡（`code.client` 值） |

> 两者是动态插件的**函数体快照**（返回 Cordis Plugin 的纯 JS function body，无 TS/import/JSX）。恢复方式：分别作为 `cordis_define` 的 `code.host` / `code.client` 重新提交，再 `cordis_run`。

## 架构

```
模型调用 agent（纯文本）
   │ 调用工具 um_analyze_img(image_paths[1..8], question?)
   ▼
Host 插件
   │ 1. 逐张 fs.resolve → readBytes(≤imageLimits.maxImageBytes)
   │ 2. 魔数嗅探真实格式（PNG/JPEG/GIF/WebP）→ 扩展名兜底
   │ 3. 总量校验（maxMessageImageBytes）→ attachments.saveImages 批量原子入库
   │ 4. 组装 prompt：文本 + N 个 image 块（ImageAttachmentRef）
   │ 5. 候选模型：
   │      · 面板有选择 → 只试指定 provider/model（不静默切换）
   │      · 无选择     → 依次尝试全部 image 能力模型（失败自动切换）
   ▼
subagents.start('agent', { prompt, agentOptions: { provider, model } })
   ▼
vision 子代理分析图片 → 文本结果 → { analysis, meta } 规范值
   │ render            → 模型只看到 analysis 文本
   │ presentationMeta  → 工具卡读取 meta（模型 / 图片 / 尝试次数 / 耗时）
```

## 依赖服务（Host inject）

`tools` · `subagents` · `llm` · `agents` · `attachments` · `fs`

## RPC 契约（Client → Host，Package 私有）

| method | 入参 | 返回 |
|--------|------|------|
| `state` | `{ refresh?: boolean }` | `{ selection, groups, stats, lastRun, limits, toolName }` |
| `select` | `{ provider, model }` 或 `null` | `{ selection, warning }`（warning 非空 = 该模型不在支持图片列表） |
| `probe` | `{ provider, model }` | `{ ok: true, provider, model, name, inputModalities, contextWindow }` / `{ ok: false, detail, code }` |

`groups` = 逐 provider 的模型行（`support: 'image' | 'text' | 'unknown'`、`declared`、`resolved`、可选 `contextWindow`/`probeError`）；`stats` = `{ providers, models, image, textOnly, unknown, resolved }`。

## 关键设计点（对应四项诉求）

### ① 工具功能
- **多图**：`image_paths` 为字符串数组（1–8，并受 `maxImagesPerMessage` 收窄），一次调用把多张图交给同一 vision 模型，prompt 中带顺序与文件名。
- **真实格式嗅探**：按魔数判定 PNG/JPEG/GIF/WebP，扩展名仅作兜底；避免「`.png` 实为 JPEG」被附件校验拒绝（`ImageMediaType` 仅这四种）。
- **限额预检**：读取前用 `attachments.imageLimits` 校验单图字节、单消息总字节、图片数量，错误信息含具体上限值。
- **批量原子入库**：`attachments.saveImages` 一次提交，任一失败不落盘部分。
- **失败归因**：`agent/request-error`（waterfall）捕获模型层 `LlmFailure`（code/message），叠加 `stopReason` 与 `diagnostic`，逐候选聚合进错误回报。
- **协作式超时**：`timeoutMs: 600000`（10 分钟）——声明即表示转发 `exec.signal`，把病态挂起转成明确失败。
- **呈现契约**：`presentCall`（标题 + `kind: 'read'` + `locations` 供编辑器跟随）、`presentResult`（成功/失败标题）、`output.presentationMeta`（卡片数据）。

### ② 模型图片能力识别
1. 逐 provider `llm.listModels()`，按 `inputModalities` 三分：含 `image` → `image`；声明了但不含 → `text`；**未声明（absent = 未知）→ `unknown`**。
2. 对 `unknown` 行再调 `llm.resolveModelInfo()` 复核一次（上限 60 行、并发 4），把能解析出模态的归位并标记「已解析」，解析失败的标「解析失败」。
3. 结果按 `MODEL_CACHE_TTL_MS = 30000` 缓存；面板「刷新」强制重算。
4. 面板按 provider 分组、按能力排序，统计 `支持图片 / 未声明模态 / 纯文本` 数量。

### ③ 热切换
- `selection` 为 Host 内存态（技能明示动态插件不做持久化），`select` 落定后**下一次工具调用即生效**；工具每次 `execute` 实时读取，无需重启或重载。
- `select` 会回告 `warning`：选中的模型不在「支持图片」列表时提示可能失败。
- 语义明确：**有选择 = 只用它**（失败不静默切换，错误里说明）；**无选择 = 自动依次尝试**。
- 面板提供 `probe` 可用性探测与「最近一次调用」回显（模型 / 张数 / 耗时 / 结果）。

### ④ DSH 设计风格 UI
- 样式经 Client 内置 `styles.insert(css)` 注入，类名前缀 `umazimg-`，颜色**全部**取 `--dsw-alias-*` 设计令牌（`label-primary/secondary`、`bg-layer-1/2`、`border-l1/l2`、`brand-primary`、`state-success/error/warn-primary`），自动跟随明暗主题。
- **设置页**：`settings.section`，`id: 'um-analyze-img'`、`order: 25`、`label: '图片分析'`，与「通用/模型/插件/预设」并列。
- **工具卡**：`tool.call.toolview`，`key: 'um_analyze_img'`（该 key 原本未占用 = 新增而非替换）：状态标签（运行中/完成/失败）、模型徽标、切换次数、图片名可点击（走 `openFile`）、结果折叠展开、参数查看、耗时。
- 仅用 `React.createElement` 与 `useState`/`useEffect`（Builtin 确认可用的最小集合）。

## 版本演进（umimg-1）

| Package | 变更 |
|---------|------|
| pkg-1 | 首版：多图工具 + 能力识别 + 热切换 + 设置页 + 工具卡；冒烟暴露 `meta.attempts[].detail = undefined` 违反无损 JSON |
| pkg-2 | **当前**：`detail` 改 `null`、`presentCall.rawInput` 改条件字段、`meta.images` 数值兜底 |

## 验证记录

| 项 | 证据 |
|----|------|
| 工具注册 | `Tool.listTools` → `um_analyze_img`，`required: ["image_paths"]`（数组）、`question` 可选 |
| 设置页 | `Slots.listSubTree('settings.section')` → occupant `dyn/umimg-1` / `um-analyze-img` / order 25 / **active** |
| 工具卡 | `Slots.listSubTree('tool.call.toolview')` → occupant `dyn/umimg-1` / key `um_analyze_img` / **active** |
| 运行态 | `cordis_inspect_self(umimg-1)` → `state: running`，`currentPackageId: pkg-2`，`activeRun: run-2` |
| 端到端冒烟 | 一次调用两张测试图，模型回答与像素事实一致（见下） |
| 元数据落盘 | 会话日志 `tool/result` 事件 `data.meta` = `{ provider: 'deepseek-official', model: 'deepseek-v4-flash-vision-exp', images: 2, attempts: 1, elapsedMs: 6702 }` —— 工具卡徽标/耗时数据来源 |

### 冒烟用例（`%TEMP%\umazimg-smoke-a.png` / `umazimg-smoke-b.png`）

| 图 | 像素事实 | 模型回答 |
|----|----------|----------|
| a（256×256） | 白底、左上蓝色方块、中央黑色实心圆、底部全宽红色横条 | 白底 + 左上蓝方块 + 中央黑圆 + 底部红条（并指出红条与圆底相接）✅ |
| b（128×128） | 绿底、两条白色斜线交叉成 X | 绿底 + 白色 X 形交叉线 ✅ |

> 生成脚本（可复现）：`node %TEMP%\umazimg-make-png.js`。
> 实际作答模型：`deepseek-official / deepseek-v4-flash-vision-exp`（1 次尝试即成功，无 failover，耗时 6702 ms）；附件服务回报尺寸 256×256 与 128×128，与生成参数一致。

## 历史（umaimg-1，上一进程）

| Package | 变更 |
|---------|------|
| pkg-1 | 首版（`question.required: false` 违反 host-runner 规范，激活失败） |
| pkg-2 | 修复可选参数（省略 required）；冒烟发现子代理 error 无诊断 |
| pkg-3 | 透传 subagent diagnostic + 日志 |
| pkg-4 | 捕获 `agent/request-error` → 定位 `MISSING_CREDENTIAL`（deepseek-official 无 DEEPSEEK_API_KEY） |
| pkg-5 | 候选 failover（自动切到有凭据的 vision 模型），端到端冒烟通过 |

## 备注与剩余风险

- 动态插件临时性：进程退出即消失；本目录为源码留存，重新提交即可恢复。
- `selection` 不持久化（技能规定动态插件无需持久化），进程重启回到「自动」。
- 本仓库为**本地 git 仓库**（`git init`，无远程）：提供回滚与恢复点，但不提供异地备份；如需远程备份/发布，走 umcommit / umrelease 流程。
- 工具卡注册 priority 为 `-2`（动态插件层级），与 shipped 卡片无冲突（key 独占）。
- 如需长期安装（不依赖会话内 `cordis_define`），可改造为 `cordis.yml` 静态插件或 bundle 包（见 `umdshdev/` 技能体系 `references/publish-distribution.md`）。
