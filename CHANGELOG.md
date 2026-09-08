# Changelog

本文件遵循 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/) 格式记录用户可见变化。

## [Unreleased]

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
