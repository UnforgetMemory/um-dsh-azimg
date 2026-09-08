# um-dsh-azimg — 图片分析动态插件（源码快照）

`um_analyze_img` 工具插件：为（尤其纯文本输入）agent 提供本地图片分析能力，经 provider 代理 subagent 链路调用选定 vision 模型；设置面板智能列出支持图片的模型并热切换。

## 运行时身份（快照来源）

| 项 | 值 |
|----|----|
| pluginId | `umaimg-1` |
| 快照版本 | `pkg-5`（um-analyze-img-candidate-failover） |
| 激活 Run | `run-5`（用户手动运行，激活成功） |
| 快照方式 | `cordis_inspect_self(umaimg-1, pkg-5)` 源码原文落盘 |

## 文件

| 文件 | 内容 |
|------|------|
| `host.js` | Host 半：工具 + 模型枚举 + 热切换状态 + RPC（纯 JS function body，`cordis_define` 的 `code.host` 值） |
| `client.js` | Client 半：`settings.section` 设置面板 UI（`code.client` 值） |

> 这两个文件是动态插件的**函数体快照**（返回 Cordis Plugin 的纯 JS function body，无 TS/import/JSX）。重新提交：把文件内容分别作为 `cordis_define` 的 `code.host` / `code.client` 即可。

## 架构

```
模型调用 agent（纯文本）
   │ 调用工具 um_analyze_img(image_path, question?)
   ▼
Host 插件
   │ 1. fs 读图片字节 → attachments.saveImage 入库（校验+规范化）
   │ 2. 组装 prompt：文本 + image 块（ImageAttachmentRef）
   │ 3. 候选模型：
   │      · 面板有选择 → 只试指定 provider/model
   │      · 无选择 → 依次尝试全部 vision 模型（失败自动切换）
   ▼
subagents.start('agent', { prompt, agentOptions: { provider, model } })
   ▼
vision 子代理分析图片 → 文本结果返回 agent
```

## 依赖服务（Host inject）

`tools` · `subagents` · `llm` · `agents` · `attachments` · `fs`

## RPC 契约（Client → Host，Package 私有）

| method | 说明 |
|--------|------|
| `list-vision-models` | 返回 `{ models: [{provider, providerName, model, name, description}], selection }`；models = 全部 `inputModalities` 含 `image` 的模型 |
| `get-selection` | 返回 `{ selection }` |
| `set-selection` | 入参 `{ provider, model }` 或 null（清除）；返回 `{ selection }`；即时生效（热切换） |

## 关键设计点

1. **智能模型列表**：`llm.listProviders()` → 逐 provider `listModels()` → 过滤 `inputModalities` 含 `'image'`（不含该字段视为未知、不列出）。
2. **热切换**：selection 是 Host 内存态；工具每次调用实时读取；设置面板选择即生效，无需重启。
3. **失败切换（failover）**：无面板选择时依次尝试全部候选；`agent/request-error`（waterfall）捕获模型层 `LlmFailure`（code/message），失败详情聚合进工具错误回报。
4. **生命周期**：工具注册、RPC handler、事件监听全部经 `ctx.effect` 包内 disposer 回收；stop/update 自动清理。

## 版本演进（umaimg-1）

| Package | 变更 |
|---------|------|
| pkg-1 | 首版（`question.required: false` 违反 host-runner 规范，激活失败） |
| pkg-2 | 修复可选参数（省略 required）；冒烟发现子代理 error 无诊断 |
| pkg-3 | 透传 subagent diagnostic + 日志 |
| pkg-4 | 捕获 `agent/request-error` → 定位 `MISSING_CREDENTIAL`（deepseek-official 无 DEEPSEEK_API_KEY） |
| pkg-5 | **当前**：候选 failover（自动切到有凭据的 sensenova vision 模型），端到端冒烟通过 |

## 验证记录

- 工具注册：`Tool.listTools` 含 `um_analyze_img`（image_path 必填、question 可选）
- 设置面板：`settings.section` occupant `dyn/umaimg-1` → `um-analyze-img`（active）
- 端到端冒烟：分析 64×64 红底白字 "DSH" 测试图，返回描述与图片内容一致
- 热切换：面板切换后回答措辞随模型变化（中央 vs 左下方），证明切换即时生效

## 备注

- 动态插件临时性：进程退出即消失；本目录为源码留存，重新提交即可恢复。
- 如需长期安装（不依赖 cordis_define 会话提交），可将 host/client 改造为 cordis.yml 静态插件或 bundle 包（见 `umdshdev/` 技能体系 `references/publish-distribution.md`）。
