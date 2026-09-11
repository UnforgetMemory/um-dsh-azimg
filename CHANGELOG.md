# Changelog

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式记录用户可见变化。

## [Unreleased]

## [0.3.0] - 2026-09-11

### Added

- i18n 适配：Client 侧 UI 全量国际化，支持简体中文与英文双语，跟随 DSH locale 服务规范（`ctx.get('locale')` + `locale.bind(NS)` + `locale.register(NS, { zh, en })` + slot 入口 `locale: NS` 声明自动重渲染），覆盖设置页与工具调用卡片全部用户可见文本

## [0.2.1] - 2026-09-10

### Fixed

- 修复设置页「读取失败：transport failure for /api/umimg/state: HTTP 404」：`@deepseek-ai/*` 平台包由 `dependencies` 改声明为 `peerDependencies`，消除 pnpm 私有副本造成的 `dsh-typert-protocol` 双模块实例（Remote 方法标记存于模块级 WeakMap，双实例导致 typert 网关不认领 `umimg/*` 端点）

## [0.2.0] - 2026-09-08

### Added

- 静态 bundle 移植：`dsh.bundle` + `dsh.client` 声明、单行双面 `cordis.patch.yml` 层；Host 半 `lib/index.js`（裸 ToolDefinition 注册 `um_analyze_img` + `umimg/*` Typert Remote 设置服务），Client 半 `lib/client.js`（手写 factory-form 浏览器 bundle，零构建）；`dsh plugin add github:UnforgetMemory/um-dsh-azimg` 安装即随 profile 层常驻激活，消除 "declares no dsh.bundle" 警告

## [0.1.1] - 2026-09-08

### Changed

- 重写 README 为项目门面：hero 头图与徽章行、Ko-fi 赞助按钮、结构化简明分区；移除会话级验证记录，修正「无远程」过时描述

## [0.1.0] - 2026-09-08

### Added

- 支持一次分析 1–8 张本地图片（`image_paths` 数组），单次调用交给同一 vision 模型
- 图片真实格式魔数嗅探（PNG/JPEG/GIF/WebP），不信任扩展名；附件限额预检与批量原子入库
- 候选 vision 模型失败自动切换，凭据/stopReason/diagnostic 归因聚合回报
- provider 模型图片能力识别：`inputModalities` 三分（image/text/unknown）+ 适配器复核 + 设置页统计
- 设置页热切换：选择即时生效（无需重启）、可用性探测、最近一次调用回显
- DSH 设计风格设置页与工具调用卡片（`--dsw-alias-*` 设计令牌，自动适配明暗主题）
