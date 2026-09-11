// um-dsh-azimg · 静态 Client 半（factory-form CJS browser bundle，零构建、直接由 DSH serve）
// 1) settings.section：vision 模型能力列表 + 热切换 + 可用性探测（数据经 /api → umimg/* 网关调用）
// 2) tool.call.toolview：um_analyze_img 调用卡片
// 样式全部走 --dsw-alias-* 设计令牌，自动跟随明暗主题；<style> 元素打 data-plugin 标记由模块系统盘点。
// i18n: DSH locale service (ctx.get('locale')) with zh/en dictionaries;
// slot entries declare locale: NS so outlets re-render on language switch.
//
// 格式契约：经典 script 执行时调用 window.__ModuleLoader__.load({ id, factory })；
// factory 内 require 仅限 seed 白名单（react / react-dom / @deepseek-ai/cordis / ui-slots / ui-primitives 等）。

window.__ModuleLoader__.load({
  id: 'um-dsh-azimg',
  factory: function (require) {
    const React = require('react')

    // ════════════════════════ L1 libraries ════════════════════════

    const CSS = [
      '.umazimg-root{display:flex;flex-direction:column;gap:14px}',
      '.umazimg-h1{margin:0;font-size:16px;font-weight:600;line-height:24px;color:var(--dsw-alias-label-primary)}',
      '.umazimg-desc{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.umazimg-card{border:1px solid var(--dsw-alias-border-l2);border-radius:12px;padding:12px 14px;display:flex;flex-direction:column;gap:10px;background:var(--dsw-alias-bg-layer-1)}',
      '.umazimg-cardtitle{margin:0;font-size:13px;font-weight:600;line-height:20px;color:var(--dsw-alias-label-primary)}',
      '.umazimg-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap}',
      '.umazimg-grow{flex:1 1 auto;min-width:0}',
      '.umazimg-dot{width:8px;height:8px;border-radius:50%;flex:none;background:var(--dsw-alias-state-success-primary)}',
      '.umazimg-dot.is-missing{background:var(--dsw-alias-state-error-primary)}',
      '.umazimg-dot.is-auto{background:var(--dsw-alias-label-secondary)}',
      '.umazimg-name{font-size:13px;line-height:20px;color:var(--dsw-alias-label-primary)}',
      '.umazimg-mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);word-break:break-all}',
      '.umazimg-tag{border:1px solid var(--dsw-alias-border-l1);border-radius:4px;padding:0 6px;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);flex:none}',
      '.umazimg-tag.is-ok{color:var(--dsw-alias-state-success-primary);border-color:var(--dsw-alias-state-success-primary)}',
      '.umazimg-tag.is-err{color:var(--dsw-alias-state-error-primary);border-color:var(--dsw-alias-state-error-primary)}',
      '.umazimg-tag.is-warn{color:var(--dsw-alias-state-warn-primary);border-color:var(--dsw-alias-state-warn-primary)}',
      '.umazimg-tag.is-brand{color:var(--dsw-alias-brand-primary);border-color:var(--dsw-alias-brand-primary)}',
      '.umazimg-list{display:flex;flex-direction:column;gap:2px}',
      '.umazimg-group{padding:6px 0 2px}',
      '.umazimg-groupname{font-size:12px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.umazimg-model{display:flex;align-items:center;gap:8px;width:100%;box-sizing:border-box;padding:7px 10px;border:1px solid transparent;border-radius:10px;background:transparent;font:inherit;text-align:left;cursor:pointer;color:inherit}',
      '.umazimg-model:hover{background:var(--dsw-alias-bg-layer-2)}',
      '.umazimg-model.is-selected{border-color:var(--dsw-alias-brand-primary);background:var(--dsw-alias-bg-layer-2)}',
      '.umazimg-model.is-disabled{cursor:default;opacity:.62}',
      '.umazimg-model.is-disabled:hover{background:transparent}',
      '.umazimg-btn{height:30px;box-sizing:border-box;padding:0 12px;border-radius:15px;border:1px solid var(--dsw-alias-border-l2);background:var(--dsw-alias-bg-layer-2);color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:28px;cursor:pointer}',
      '.umazimg-btn:hover{border-color:var(--dsw-alias-brand-primary)}',
      '.umazimg-btn:disabled{opacity:.5;cursor:default}',
      '.umazimg-btn.is-primary{border-color:var(--dsw-alias-brand-primary);color:var(--dsw-alias-brand-primary)}',
      '.umazimg-status{font-size:12px;line-height:18px;color:var(--dsw-alias-label-secondary)}',
      '.umazimg-status.is-ok{color:var(--dsw-alias-state-success-primary)}',
      '.umazimg-status.is-err{color:var(--dsw-alias-state-error-primary)}',
      '.umazimg-status.is-warn{color:var(--dsw-alias-state-warn-primary)}',
      '.umazimg-link{border:none;background:none;padding:0;font:inherit;font-size:11px;line-height:16px;color:var(--dsw-alias-brand-primary);cursor:pointer;text-align:left}',
      '.umazimg-tool{border:1px solid var(--dsw-alias-border-l1);border-radius:10px;padding:8px 10px;display:flex;flex-direction:column;gap:6px;background:var(--dsw-alias-bg-layer-1)}',
      '.umazimg-tool-head{display:flex;align-items:center;gap:6px;flex-wrap:wrap}',
      '.umazimg-tool-title{font-size:12px;font-weight:600;line-height:18px;color:var(--dsw-alias-label-primary)}',
      '.umazimg-tool-text{margin:0;font-size:12px;line-height:18px;color:var(--dsw-alias-label-primary);white-space:pre-wrap;word-break:break-word}',
      '.umazimg-pre{margin:0;padding:8px;border-radius:8px;background:var(--dsw-alias-bg-layer-2);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;line-height:16px;color:var(--dsw-alias-label-secondary);white-space:pre-wrap;word-break:break-all}',
    ].join('')

    // ── i18n: locale namespace + zh/en dictionaries + fallback translator ──

    const NS = 'umazimg'

    const zh = {
      title: '图片分析（um_analyze_img）',
      description: '为图片分析工具选择视觉（vision）模型。列表自动读取当前已注册 provider 的能力：声明 inputModalities 含 image 的模型直接列出；未声明模态的模型会向适配器解析一次后再归类。选择即时生效（热切换），无需重启。',
      sectionLabel: '图片分析',
      currentModel: '当前模型',
      autoMode: '自动（按注册顺序依次尝试全部支持图片的模型）',
      fixedMode: '固定使用该模型；失败时不会自动切换',
      autoModeDesc: '无固定模型；调用时逐个候选自动失败切换',
      probe: '探测可用性',
      switchToAuto: '改为自动',
      modelCapabilities: '模型能力',
      refresh: '刷新',
      processing: '处理中…',
      registered: '已注册',
      providers: '个 provider',
      models: '个模型',
      imageSupport: '个支持图片',
      undeclared: '个未声明模态',
      textOnly: '个纯文本',
      noProvider: '当前没有已注册的 provider。请先在「模型」设置中配置 provider 与 vision 模型。',
      noImageSupport: '没有任何模型声明支持图片输入；工具调用会直接报错。',
      lastRun: '最近一次调用',
      success: '成功',
      failure: '失败',
      noRunYet: '本次会话尚未调用过该工具。',
      perImage: '单图 ≤',
      perMessage: '单条消息 ≤',
      maxImages: '最多',
      imagesUnit: '张',
      supports: '支持',
      loading: '正在读取模型能力…',
      refreshing: '正在刷新模型能力…',
      refreshed: '已刷新',
      loadFailed: '读取失败：',
      switchFailed: '切换失败：',
      switched: '已切换（即时生效）：',
      switchedToAuto: '已改为自动：调用时依次尝试全部支持图片的模型',
      probing: '正在探测',
      probeSuccess: '探测成功：inputModalities=[',
      probeSuccessCtx: '，上下文',
      probeSuccessCtxUnit: 'tokens',
      probeFailed: '探测失败：',
      tagSupportImage: '支持图片',
      tagUndeclared: '未声明模态',
      tagTextOnly: '纯文本',
      tagResolved: '已解析',
      tagCtx: 'ctx',
      tagResolveFailed: '解析失败',
      groupSupport: '支持图片',
      groupError: '（枚举失败）',
      unknownError: '未知错误',
      rpcFailed: '远程调用失败',
      toolTitle: '图片分析',
      toolFailed: '失败',
      toolCompleted: '完成',
      toolRunning: '运行中',
      attempts: '切换',
      attemptsUnit: '次',
      callFailed: '调用失败',
      analyzing: '正在调用 vision 模型分析图片…',
      collapse: '收起',
      expand: '展开全文（',
      expandUnit: '字）',
      hideArgs: '隐藏参数',
      showArgs: '查看参数',
      elapsed: 'ms',
    }

    const en = {
      title: 'Image Analysis (um_analyze_img)',
      description: 'Select a vision model for the image analysis tool. The list automatically reads capabilities of all registered providers: models declaring inputModalities with image are listed directly; models without declared modalities are resolved via the adapter before categorization. Selection takes effect immediately (hot switch), no restart required.',
      sectionLabel: 'Image Analysis',
      currentModel: 'Current Model',
      autoMode: 'Auto (try all image-capable models in registration order)',
      fixedMode: 'Fixed to this model; no automatic fallback on failure',
      autoModeDesc: 'No fixed model; automatically tries each candidate on failure',
      probe: 'Probe Availability',
      switchToAuto: 'Switch to Auto',
      modelCapabilities: 'Model Capabilities',
      refresh: 'Refresh',
      processing: 'Processing…',
      registered: 'Registered',
      providers: 'provider(s)',
      models: 'model(s)',
      imageSupport: 'with image support',
      undeclared: 'undeclared modalities',
      textOnly: 'text-only',
      noProvider: 'No registered providers. Please configure providers and vision models in the "Models" settings.',
      noImageSupport: 'No models declare image input support; tool calls will fail immediately.',
      lastRun: 'Last Run',
      success: 'Success',
      failure: 'Failure',
      noRunYet: 'This tool has not been called in this session yet.',
      perImage: 'Per image ≤',
      perMessage: 'Per message ≤',
      maxImages: 'Max',
      imagesUnit: 'images',
      supports: 'Supports',
      loading: 'Loading model capabilities…',
      refreshing: 'Refreshing model capabilities…',
      refreshed: 'Refreshed',
      loadFailed: 'Load failed: ',
      switchFailed: 'Switch failed: ',
      switched: 'Switched (immediate): ',
      switchedToAuto: 'Switched to Auto: tries all image-capable models in order',
      probing: 'Probing',
      probeSuccess: 'Probe succeeded: inputModalities=[',
      probeSuccessCtx: ', context',
      probeSuccessCtxUnit: 'tokens',
      probeFailed: 'Probe failed: ',
      tagSupportImage: 'Image',
      tagUndeclared: 'Undeclared',
      tagTextOnly: 'Text-only',
      tagResolved: 'Resolved',
      tagCtx: 'ctx',
      tagResolveFailed: 'Resolve failed',
      groupSupport: 'image support',
      groupError: '(enumeration failed)',
      unknownError: 'Unknown error',
      rpcFailed: 'Remote call failed',
      toolTitle: 'Image Analysis',
      toolFailed: 'Failed',
      toolCompleted: 'Completed',
      toolRunning: 'Running',
      attempts: 'Fallback ×',
      attemptsUnit: '',
      callFailed: 'Call failed',
      analyzing: 'Analyzing image with vision model…',
      collapse: 'Collapse',
      expand: 'Expand (',
      expandUnit: ' chars)',
      hideArgs: 'Hide args',
      showArgs: 'Show args',
      elapsed: 'ms',
    }

    const FALLBACK_T = function (key) {
      return zh[key] !== undefined ? zh[key] : key
    }

    let cssEl = null
    function ensureCss() {
      if (cssEl && cssEl.isConnected) return
      cssEl = document.createElement('style')
      cssEl.setAttribute('data-plugin', 'um-dsh-azimg')
      cssEl.setAttribute('data-plugin-css', 'umazimg')
      cssEl.textContent = CSS
      document.head.appendChild(cssEl)
    }

    function errorText(err, t) {
      if (err === undefined || err === null) return t ? t('unknownError') : '未知错误'
      if (typeof err === 'string') return err
      if (typeof err.message === 'string' && err.message) return err.message
      return t ? t('unknownError') : '未知错误'
    }

    function basenameOf(path) {
      return String(path || '').split(/[\\/]/).pop() || 'image'
    }

    function textOfBlocks(blocks) {
      return (blocks || [])
        .map(function (block) { return block && block.type === 'text' ? String(block.text || '') : '' })
        .join('\n')
        .trim()
    }

    function parseArgs(raw) {
      if (typeof raw !== 'string' || raw === '') return null
      try {
        const parsed = JSON.parse(raw)
        return parsed && typeof parsed === 'object' ? parsed : null
      } catch (err) {
        return null
      }
    }

    function argPaths(args) {
      if (!args) return []
      const value = args.image_paths
      if (Array.isArray(value)) return value.filter(function (item) { return typeof item === 'string' && item !== '' })
      if (typeof value === 'string' && value !== '') return [value]
      return []
    }

    function fmtTime(at) {
      if (!at) return ''
      const date = new Date(at)
      if (isNaN(date.getTime())) return ''
      return date.toLocaleString()
    }

    // ════════════════════════ L2 feature 组件（单一职责展示）════════════════════════

    // 当前模型卡：选定回显 + 探测 / 改回自动
    function CurrentModelCard(props) {
      const t = props.t
      const selection = props.selection
      return React.createElement('div', { className: 'umazimg-card' },
        React.createElement('h4', { className: 'umazimg-cardtitle' }, t('currentModel')),
        React.createElement('div', { className: 'umazimg-row' },
          React.createElement('span', { className: 'umazimg-dot' + (selection ? '' : ' is-auto') }),
          React.createElement('span', { className: 'umazimg-grow' },
            React.createElement('span', { className: 'umazimg-name' }, selection ? (selection.provider + ' / ' + selection.model) : t('autoMode')),
            selection
              ? React.createElement('div', { className: 'umazimg-mono' }, t('fixedMode'))
              : React.createElement('div', { className: 'umazimg-mono' }, t('autoModeDesc')),
          ),
          React.createElement('button', { type: 'button', className: 'umazimg-btn', disabled: props.busy || !selection, onClick: props.onProbe }, t('probe')),
          React.createElement('button', { type: 'button', className: 'umazimg-btn', disabled: props.busy || !selection, onClick: props.onAuto }, t('switchToAuto')),
        ),
        props.probe
          ? React.createElement('div', { className: 'umazimg-pre' }, JSON.stringify(props.probe, null, 2))
          : null,
      )
    }

    // 单个模型行：能力标签 + 选择态 + 点击切换
    function ModelRowButton(props) {
      const t = props.t
      const group = props.group
      const row = props.row
      const usable = row.support === 'image'
      const tags = []
      if (row.support === 'image') tags.push(React.createElement('span', { key: 't1', className: 'umazimg-tag is-ok' }, t('tagSupportImage')))
      else if (row.support === 'unknown') tags.push(React.createElement('span', { key: 't1', className: 'umazimg-tag is-warn' }, t('tagUndeclared')))
      else tags.push(React.createElement('span', { key: 't1', className: 'umazimg-tag', }, t('tagTextOnly')))
      if (row.resolved) tags.push(React.createElement('span', { key: 't2', className: 'umazimg-tag' }, t('tagResolved')))
      if (row.contextWindow) tags.push(React.createElement('span', { key: 't3', className: 'umazimg-tag' }, String(row.contextWindow) + ' ' + t('tagCtx')))
      if (row.probeError) tags.push(React.createElement('span', { key: 't4', className: 'umazimg-tag is-err' }, t('tagResolveFailed')))
      return React.createElement('button', {
        type: 'button',
        disabled: !usable,
        className: 'umazimg-model' + (props.selected ? ' is-selected' : '') + (usable ? '' : ' is-disabled'),
        onClick: usable ? function () { props.onChoose(group.provider, row.model) } : undefined,
      },
        React.createElement('span', { className: 'umazimg-dot' + (props.selected ? '' : ' is-auto'), style: { opacity: props.selected ? 1 : 0.35 } }),
        React.createElement('span', { className: 'umazimg-grow' },
          React.createElement('span', { className: 'umazimg-name' }, row.name || row.model),
          React.createElement('div', { className: 'umazimg-mono' }, row.model + (row.description ? ' · ' + row.description : '')),
        ),
        tags,
      )
    }

    // provider 分组：组头统计 + 按能力排序的模型行
    function ModelGroupSection(props) {
      const t = props.t
      const group = props.group
      if (group.error) {
        return React.createElement('div', { className: 'umazimg-group' },
          React.createElement('div', { className: 'umazimg-groupname' }, group.providerName + t('groupError')),
          React.createElement('div', { className: 'umazimg-status is-err' }, String(group.error)),
        )
      }
      const rows = group.models.slice().sort(function (a, b) {
        const rank = { image: 0, unknown: 1, text: 2 }
        return (rank[a.support] || 3) - (rank[b.support] || 3)
      })
      const imageCount = rows.filter(function (row) { return row.support === 'image' }).length
      return React.createElement('div', { className: 'umazimg-group' },
        React.createElement('div', { className: 'umazimg-groupname' }, group.providerName + ' · ' + imageCount + '/' + rows.length + ' ' + t('groupSupport')),
        React.createElement('div', { className: 'umazimg-list' },
          rows.map(function (row) {
            const key = group.provider + '\u0000' + row.model
            return React.createElement(ModelRowButton, {
              key: key,
              group: group,
              row: row,
              selected: key === props.selectionKey,
              onChoose: props.onChoose,
              t: t,
            })
          }),
        ),
      )
    }

    // 模型能力卡：统计行 + 刷新 + 分组列表
    function CapabilityCard(props) {
      const t = props.t
      const stats = props.stats
      const groups = props.groups
      return React.createElement('div', { className: 'umazimg-card' },
        React.createElement('div', { className: 'umazimg-row' },
          React.createElement('h4', { className: 'umazimg-cardtitle umazimg-grow' }, t('modelCapabilities')),
          React.createElement('button', { type: 'button', className: 'umazimg-btn is-primary', disabled: props.busy, onClick: props.onRefresh }, props.busy ? t('processing') : t('refresh')),
        ),
        React.createElement('div', { className: 'umazimg-status' },
          t('registered') + ' ' + stats.providers + ' ' + t('providers') + ' · ' + stats.models + ' ' + t('models') + ' · ' +
          stats.image + ' ' + t('imageSupport') + ' · ' + stats.unknown + ' ' + t('undeclared') + ' · ' + stats.textOnly + ' ' + t('textOnly')),
        groups.length === 0
          ? React.createElement('div', { className: 'umazimg-status' }, t('noProvider'))
          : React.createElement('div', { className: 'umazimg-list' },
              groups.map(function (group) {
                if (!group.error && (!group.models || group.models.length === 0)) return null
                return React.createElement(ModelGroupSection, {
                  key: (group.error ? 'err-' : 'g-') + group.provider,
                  group: group,
                  selectionKey: props.selectionKey,
                  onChoose: props.onChoose,
                  t: t,
                })
              }),
            ),
        stats.image === 0 && groups.length > 0
          ? React.createElement('div', { className: 'umazimg-status is-warn' }, t('noImageSupport'))
          : null,
      )
    }

    // 最近一次调用卡：结果回显 + 附件限额
    function LastRunCard(props) {
      const t = props.t
      const lastRun = props.lastRun
      const limits = props.limits
      return React.createElement('div', { className: 'umazimg-card' },
        React.createElement('h4', { className: 'umazimg-cardtitle' }, t('lastRun')),
        lastRun
          ? React.createElement('div', { className: 'umazimg-row' },
              React.createElement('span', { className: 'umazimg-dot' + (lastRun.ok ? '' : ' is-missing') }),
              React.createElement('span', { className: 'umazimg-grow' },
                React.createElement('span', { className: 'umazimg-name' },
                  (lastRun.ok ? t('success') : t('failure')) + ' · ' + (lastRun.provider || '?') + ' / ' + (lastRun.model || '?')),
                React.createElement('div', { className: 'umazimg-mono' },
                  (lastRun.images || 0) + ' ' + t('imagesUnit') + ' · ' + (lastRun.elapsedMs || 0) + ' ' + t('elapsed') + ' · ' + fmtTime(lastRun.at) +
                  (lastRun.detail ? ' · ' + lastRun.detail : '')),
              ),
            )
          : React.createElement('div', { className: 'umazimg-status' }, t('noRunYet')),
        limits
          ? React.createElement('div', { className: 'umazimg-mono' },
              t('perImage') + ' ' + limits.maxImageBytes + ' B · ' + t('perMessage') + ' ' + limits.maxMessageImageBytes + ' B · ' + t('maxImages') + ' ' +
              Math.min(8, limits.maxImagesPerMessage || 8) + ' ' + t('imagesUnit') + ' · ' + t('supports') + ' ' + (limits.mediaTypes || []).join(' / '))
          : null,
      )
    }

    // ════════════════════════ L3 app（状态编排 + 装配）════════════════════════

    return {
      inject: ['slots', 'connection'],
      apply(ctx) {
        ctx.effect(function () {
          ensureCss()
          return function () {
            if (cssEl && cssEl.isConnected) cssEl.remove()
            cssEl = null
          }
        })

        // ── i18n: bind translator + register dictionaries ──
        const locale = ctx.get('locale')
        const t = locale !== undefined && typeof locale.bind === 'function'
          ? locale.bind(NS)
          : FALLBACK_T

        if (locale !== undefined && typeof locale.register === 'function') {
          ctx.effect(function () {
            return locale.register(NS, { zh: zh, en: en })
          }, 'um-dsh-azimg: card dictionaries')
        }

        // 经 /api 网关调用 Host 半的 umimg/* Remote 方法（等价于动态形态的 host.call）
        function callHost(method, request) {
          return ctx.connection.rpc.call('/api', 'umimg/' + method, { args: { request: request || {} } })
            .then(function (res) {
              if (res && res.ok === true) return res.value
              throw new Error((res && res.error) ? String(res.error) : t('rpcFailed'))
            })
        }

        // ── 设置页：状态编排（store 本地态）+ 卡片组合 ──
        function SettingsPanel() {
          const [snapshot, setSnapshot] = React.useState(null)
          const [status, setStatus] = React.useState({ kind: '', text: t('loading') })
          const [busy, setBusy] = React.useState(false)
          const [probe, setProbe] = React.useState(null)

          function applySnapshot(data) {
            setSnapshot(data && typeof data === 'object' ? data : null)
          }

          function load(refresh) {
            setBusy(true)
            setProbe(null)
            setStatus({ kind: '', text: refresh ? t('refreshing') : t('loading') })
            callHost('state', { refresh: !!refresh }).then(function (data) {
              applySnapshot(data)
              setBusy(false)
              setStatus({ kind: refresh ? 'ok' : '', text: refresh ? t('refreshed') : '' })
            }).catch(function (err) {
              setBusy(false)
              setStatus({ kind: 'err', text: t('loadFailed') + errorText(err, t) })
            })
          }

          React.useEffect(function () { load(false) }, [])

          function choose(provider, model) {
            setBusy(true)
            setProbe(null)
            callHost('select', provider ? { provider: provider, model: model } : {}).then(function (data) {
              setBusy(false)
              const next = data && data.selection ? data.selection : null
              setSnapshot(function (prev) { return prev ? Object.assign({}, prev, { selection: next }) : prev })
              const warning = data && data.warning ? String(data.warning) : ''
              setStatus({
                kind: warning ? 'warn' : 'ok',
                text: warning || (next ? t('switched') + next.provider + ' / ' + next.model : t('switchedToAuto')),
              })
            }).catch(function (err) {
              setBusy(false)
              setStatus({ kind: 'err', text: t('switchFailed') + errorText(err, t) })
            })
          }

          function runProbe() {
            const selection = snapshot && snapshot.selection
            if (!selection) return
            setBusy(true)
            setProbe(null)
            setStatus({ kind: '', text: t('probing') + ' ' + selection.provider + ' / ' + selection.model + ' …' })
            callHost('probe', { provider: selection.provider, model: selection.model }).then(function (data) {
              setBusy(false)
              setProbe(data || null)
              if (data && data.ok) {
                const mods = Array.isArray(data.inputModalities) ? data.inputModalities : []
                setStatus({
                  kind: mods.indexOf('image') >= 0 ? 'ok' : 'warn',
                  text: t('probeSuccess') + mods.join(', ') + ']' +
                    (data.contextWindow ? t('probeSuccessCtx') + ' ' + data.contextWindow + ' ' + t('probeSuccessCtxUnit') : ''),
                })
              } else {
                setStatus({ kind: 'err', text: t('probeFailed') + errorText(data && data.detail, t) })
              }
            }).catch(function (err) {
              setBusy(false)
              setStatus({ kind: 'err', text: t('probeFailed') + errorText(err, t) })
            })
          }

          const groups = (snapshot && Array.isArray(snapshot.groups)) ? snapshot.groups : []
          const stats = (snapshot && snapshot.stats) || { providers: 0, models: 0, image: 0, textOnly: 0, unknown: 0, resolved: 0 }
          const selection = (snapshot && snapshot.selection) || null
          const selectionKey = selection ? selection.provider + '\u0000' + selection.model : ''

          return React.createElement('div', { className: 'umazimg-root' },
            React.createElement('h3', { className: 'umazimg-h1' }, t('title')),
            React.createElement('p', { className: 'umazimg-desc' }, t('description')),
            React.createElement(CurrentModelCard, {
              selection: selection,
              busy: busy,
              probe: probe,
              onProbe: runProbe,
              onAuto: function () { choose(null, null) },
              t: t,
            }),
            React.createElement(CapabilityCard, {
              groups: groups,
              stats: stats,
              busy: busy,
              selectionKey: selectionKey,
              onChoose: choose,
              onRefresh: function () { load(true) },
              t: t,
            }),
            React.createElement(LastRunCard, {
              lastRun: (snapshot && snapshot.lastRun) || null,
              limits: (snapshot && snapshot.limits) || null,
              t: t,
            }),
            React.createElement('div', { className: 'umazimg-row' },
              React.createElement('span', { className: 'umazimg-status' + (status.kind ? ' is-' + status.kind : '') }, status.text),
            ),
          )
        }

        // ── 工具调用卡片 ──
        function ToolCard(props) {
          const block = props && props.block
          const settled = !!(block && block.kind === 'tool-result')
          const rawArgs = settled ? (block.call && block.call.argsRaw) : (block && block.argsRaw)
          const args = parseArgs(rawArgs)
          const paths = argPaths(args)
          const meta = settled && block.meta && typeof block.meta === 'object' ? block.meta : null
          const text = settled ? textOfBlocks(block.content) : ''
          const isError = settled && block.isError === true
          const [expanded, setExpanded] = React.useState(false)
          const [showArgs, setShowArgs] = React.useState(false)

          const head = [
            React.createElement('span', { key: 'title', className: 'umazimg-tool-title' }, t('toolTitle')),
            React.createElement('span', { key: 'state', className: 'umazimg-tag' + (settled ? (isError ? ' is-err' : ' is-ok') : '') },
              settled ? (isError ? t('toolFailed') : t('toolCompleted')) : t('toolRunning')),
          ]
          if (meta && meta.provider) {
            head.push(React.createElement('span', { key: 'model', className: 'umazimg-tag is-brand' },
              meta.provider + ' / ' + (meta.modelName || meta.model)))
          }
          if (meta && Array.isArray(meta.attempts) && meta.attempts.length > 1) {
            head.push(React.createElement('span', { key: 'attempts', className: 'umazimg-tag is-warn' },
              t('attempts') + ' ' + meta.attempts.length + (t('attemptsUnit') ? ' ' + t('attemptsUnit') : '')))
          }

          const imageLine = paths.length > 0
            ? React.createElement('div', { className: 'umazimg-row' },
                paths.map(function (path, index) {
                  return React.createElement('button', {
                    key: String(index) + path,
                    type: 'button',
                    className: 'umazimg-link',
                    onClick: props && props.openFile ? function () { props.openFile(path) } : undefined,
                  }, basenameOf(path))
                }),
              )
            : null

          const limit = 420
          const body = settled
            ? React.createElement('p', { className: 'umazimg-tool-text' },
                isError
                  ? (text || t('callFailed'))
                  : (expanded || text.length <= limit ? text : text.slice(0, limit) + '…'))
            : React.createElement('div', { className: 'umazimg-status' }, t('analyzing'))

          const footer = []
          if (settled && !isError && text.length > limit) {
            footer.push(React.createElement('button', {
              key: 'toggle',
              type: 'button',
              className: 'umazimg-link',
              onClick: function () { setExpanded(!expanded) },
            }, expanded ? t('collapse') : t('expand') + text.length + ' ' + t('expandUnit')))
          }
          if (rawArgs) {
            footer.push(React.createElement('button', {
              key: 'args',
              type: 'button',
              className: 'umazimg-link',
              onClick: function () { setShowArgs(!showArgs) },
            }, showArgs ? t('hideArgs') : t('showArgs')))
          }
          if (meta && meta.elapsedMs) {
            footer.push(React.createElement('span', { key: 'elapsed', className: 'umazimg-mono' }, meta.elapsedMs + ' ' + t('elapsed')))
          }

          return React.createElement('div', { className: 'umazimg-tool' },
            React.createElement('div', { className: 'umazimg-tool-head' }, head),
            imageLine,
            body,
            showArgs && rawArgs ? React.createElement('pre', { className: 'umazimg-pre' }, rawArgs) : null,
            footer.length > 0 ? React.createElement('div', { className: 'umazimg-row' }, footer) : null,
          )
        }

        // ── Slot 装配（Fiber 副作用随卸载自动回收）──
        ctx.slots.inject('settings.section', function () {
          return ctx.slots.register(
            { name: 'settings.section', id: 'um-analyze-img', order: 25, locale: NS, label: function () { return t('sectionLabel') } },
            function () { return React.createElement(SettingsPanel, { t: t }) },
          )
        })

        ctx.slots.inject('tool.call.toolview', function () {
          return ctx.slots.register(
            { name: 'tool.call.toolview', key: 'um_analyze_img', locale: NS },
            function (props) { return React.createElement(ToolCard, props) },
          )
        })
      },
    }
  },
})
