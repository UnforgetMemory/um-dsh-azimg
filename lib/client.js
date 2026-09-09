// um-dsh-azimg · 静态 Client 半（factory-form CJS browser bundle，零构建、直接由 DSH serve）
// 1) settings.section：vision 模型能力列表 + 热切换 + 可用性探测（数据经 /api → umimg/* 网关调用）
// 2) tool.call.toolview：um_analyze_img 调用卡片
// 样式全部走 --dsw-alias-* 设计令牌，自动跟随明暗主题；<style> 元素打 data-plugin 标记由模块系统盘点。
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

    let cssEl = null
    function ensureCss() {
      if (cssEl && cssEl.isConnected) return
      cssEl = document.createElement('style')
      cssEl.setAttribute('data-plugin', 'um-dsh-azimg')
      cssEl.setAttribute('data-plugin-css', 'umazimg')
      cssEl.textContent = CSS
      document.head.appendChild(cssEl)
    }

    function errorText(err) {
      if (err === undefined || err === null) return '未知错误'
      if (typeof err === 'string') return err
      if (typeof err.message === 'string' && err.message) return err.message
      return '未知错误'
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
      const selection = props.selection
      return React.createElement('div', { className: 'umazimg-card' },
        React.createElement('h4', { className: 'umazimg-cardtitle' }, '当前模型'),
        React.createElement('div', { className: 'umazimg-row' },
          React.createElement('span', { className: 'umazimg-dot' + (selection ? '' : ' is-auto') }),
          React.createElement('span', { className: 'umazimg-grow' },
            React.createElement('span', { className: 'umazimg-name' }, selection ? (selection.provider + ' / ' + selection.model) : '自动（按注册顺序依次尝试全部支持图片的模型）'),
            selection
              ? React.createElement('div', { className: 'umazimg-mono' }, '固定使用该模型；失败时不会自动切换')
              : React.createElement('div', { className: 'umazimg-mono' }, '无固定模型；调用时逐个候选自动失败切换'),
          ),
          React.createElement('button', { type: 'button', className: 'umazimg-btn', disabled: props.busy || !selection, onClick: props.onProbe }, '探测可用性'),
          React.createElement('button', { type: 'button', className: 'umazimg-btn', disabled: props.busy || !selection, onClick: props.onAuto }, '改为自动'),
        ),
        props.probe
          ? React.createElement('div', { className: 'umazimg-pre' }, JSON.stringify(props.probe, null, 2))
          : null,
      )
    }

    // 单个模型行：能力标签 + 选择态 + 点击切换
    function ModelRowButton(props) {
      const group = props.group
      const row = props.row
      const usable = row.support === 'image'
      const tags = []
      if (row.support === 'image') tags.push(React.createElement('span', { key: 't1', className: 'umazimg-tag is-ok' }, '支持图片'))
      else if (row.support === 'unknown') tags.push(React.createElement('span', { key: 't1', className: 'umazimg-tag is-warn' }, '未声明模态'))
      else tags.push(React.createElement('span', { key: 't1', className: 'umazimg-tag' }, '纯文本'))
      if (row.resolved) tags.push(React.createElement('span', { key: 't2', className: 'umazimg-tag' }, '已解析'))
      if (row.contextWindow) tags.push(React.createElement('span', { key: 't3', className: 'umazimg-tag' }, String(row.contextWindow) + ' ctx'))
      if (row.probeError) tags.push(React.createElement('span', { key: 't4', className: 'umazimg-tag is-err' }, '解析失败'))
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
      const group = props.group
      if (group.error) {
        return React.createElement('div', { className: 'umazimg-group' },
          React.createElement('div', { className: 'umazimg-groupname' }, group.providerName + '（枚举失败）'),
          React.createElement('div', { className: 'umazimg-status is-err' }, String(group.error)),
        )
      }
      const rows = group.models.slice().sort(function (a, b) {
        const rank = { image: 0, unknown: 1, text: 2 }
        return (rank[a.support] || 3) - (rank[b.support] || 3)
      })
      const imageCount = rows.filter(function (row) { return row.support === 'image' }).length
      return React.createElement('div', { className: 'umazimg-group' },
        React.createElement('div', { className: 'umazimg-groupname' }, group.providerName + ' · ' + imageCount + '/' + rows.length + ' 支持图片'),
        React.createElement('div', { className: 'umazimg-list' },
          rows.map(function (row) {
            const key = group.provider + '\u0000' + row.model
            return React.createElement(ModelRowButton, {
              key: key,
              group: group,
              row: row,
              selected: key === props.selectionKey,
              onChoose: props.onChoose,
            })
          }),
        ),
      )
    }

    // 模型能力卡：统计行 + 刷新 + 分组列表
    function CapabilityCard(props) {
      const stats = props.stats
      const groups = props.groups
      return React.createElement('div', { className: 'umazimg-card' },
        React.createElement('div', { className: 'umazimg-row' },
          React.createElement('h4', { className: 'umazimg-cardtitle umazimg-grow' }, '模型能力'),
          React.createElement('button', { type: 'button', className: 'umazimg-btn is-primary', disabled: props.busy, onClick: props.onRefresh }, props.busy ? '处理中…' : '刷新'),
        ),
        React.createElement('div', { className: 'umazimg-status' },
          '已注册 ' + stats.providers + ' 个 provider · ' + stats.models + ' 个模型 · ' +
          stats.image + ' 个支持图片 · ' + stats.unknown + ' 个未声明模态 · ' + stats.textOnly + ' 个纯文本'),
        groups.length === 0
          ? React.createElement('div', { className: 'umazimg-status' }, '当前没有已注册的 provider。请先在「模型」设置中配置 provider 与 vision 模型。')
          : React.createElement('div', { className: 'umazimg-list' },
              groups.map(function (group) {
                if (!group.error && (!group.models || group.models.length === 0)) return null
                return React.createElement(ModelGroupSection, {
                  key: (group.error ? 'err-' : 'g-') + group.provider,
                  group: group,
                  selectionKey: props.selectionKey,
                  onChoose: props.onChoose,
                })
              }),
            ),
        stats.image === 0 && groups.length > 0
          ? React.createElement('div', { className: 'umazimg-status is-warn' }, '没有任何模型声明支持图片输入；工具调用会直接报错。')
          : null,
      )
    }

    // 最近一次调用卡：结果回显 + 附件限额
    function LastRunCard(props) {
      const lastRun = props.lastRun
      const limits = props.limits
      return React.createElement('div', { className: 'umazimg-card' },
        React.createElement('h4', { className: 'umazimg-cardtitle' }, '最近一次调用'),
        lastRun
          ? React.createElement('div', { className: 'umazimg-row' },
              React.createElement('span', { className: 'umazimg-dot' + (lastRun.ok ? '' : ' is-missing') }),
              React.createElement('span', { className: 'umazimg-grow' },
                React.createElement('span', { className: 'umazimg-name' },
                  (lastRun.ok ? '成功' : '失败') + ' · ' + (lastRun.provider || '?') + ' / ' + (lastRun.model || '?')),
                React.createElement('div', { className: 'umazimg-mono' },
                  (lastRun.images || 0) + ' 张图 · ' + (lastRun.elapsedMs || 0) + ' ms · ' + fmtTime(lastRun.at) +
                  (lastRun.detail ? ' · ' + lastRun.detail : '')),
              ),
            )
          : React.createElement('div', { className: 'umazimg-status' }, '本次会话尚未调用过该工具。'),
        limits
          ? React.createElement('div', { className: 'umazimg-mono' },
              '单图 ≤ ' + limits.maxImageBytes + ' B · 单条消息 ≤ ' + limits.maxMessageImageBytes + ' B · 最多 ' +
              Math.min(8, limits.maxImagesPerMessage || 8) + ' 张 · 支持 ' + (limits.mediaTypes || []).join(' / '))
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

        // 经 /api 网关调用 Host 半的 umimg/* Remote 方法（等价于动态形态的 host.call）
        function callHost(method, request) {
          return ctx.connection.rpc.call('/api', 'umimg/' + method, { args: { request: request || {} } })
            .then(function (res) {
              if (res && res.ok === true) return res.value
              throw new Error((res && res.error) ? String(res.error) : '远程调用失败')
            })
        }

        // ── 设置页：状态编排（store 本地态）+ 卡片组合 ──
        function SettingsPanel() {
          const [snapshot, setSnapshot] = React.useState(null)
          const [status, setStatus] = React.useState({ kind: '', text: '正在读取模型能力…' })
          const [busy, setBusy] = React.useState(false)
          const [probe, setProbe] = React.useState(null)

          function applySnapshot(data) {
            setSnapshot(data && typeof data === 'object' ? data : null)
          }

          function load(refresh) {
            setBusy(true)
            setProbe(null)
            setStatus({ kind: '', text: refresh ? '正在刷新模型能力…' : '正在读取模型能力…' })
            callHost('state', { refresh: !!refresh }).then(function (data) {
              applySnapshot(data)
              setBusy(false)
              setStatus({ kind: refresh ? 'ok' : '', text: refresh ? '已刷新' : '' })
            }).catch(function (err) {
              setBusy(false)
              setStatus({ kind: 'err', text: '读取失败：' + errorText(err) })
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
                text: warning || (next ? '已切换（即时生效）：' + next.provider + ' / ' + next.model : '已改为自动：调用时依次尝试全部支持图片的模型'),
              })
            }).catch(function (err) {
              setBusy(false)
              setStatus({ kind: 'err', text: '切换失败：' + errorText(err) })
            })
          }

          function runProbe() {
            const selection = snapshot && snapshot.selection
            if (!selection) return
            setBusy(true)
            setProbe(null)
            setStatus({ kind: '', text: '正在探测 ' + selection.provider + ' / ' + selection.model + ' …' })
            callHost('probe', { provider: selection.provider, model: selection.model }).then(function (data) {
              setBusy(false)
              setProbe(data || null)
              if (data && data.ok) {
                const mods = Array.isArray(data.inputModalities) ? data.inputModalities : []
                setStatus({
                  kind: mods.indexOf('image') >= 0 ? 'ok' : 'warn',
                  text: '探测成功：inputModalities=[' + mods.join(', ') + ']' +
                    (data.contextWindow ? '，上下文 ' + data.contextWindow + ' tokens' : ''),
                })
              } else {
                setStatus({ kind: 'err', text: '探测失败：' + errorText(data && data.detail) })
              }
            }).catch(function (err) {
              setBusy(false)
              setStatus({ kind: 'err', text: '探测失败：' + errorText(err) })
            })
          }

          const groups = (snapshot && Array.isArray(snapshot.groups)) ? snapshot.groups : []
          const stats = (snapshot && snapshot.stats) || { providers: 0, models: 0, image: 0, textOnly: 0, unknown: 0, resolved: 0 }
          const selection = (snapshot && snapshot.selection) || null
          const selectionKey = selection ? selection.provider + '\u0000' + selection.model : ''

          return React.createElement('div', { className: 'umazimg-root' },
            React.createElement('h3', { className: 'umazimg-h1' }, '图片分析（um_analyze_img）'),
            React.createElement('p', { className: 'umazimg-desc' },
              '为图片分析工具选择视觉（vision）模型。列表自动读取当前已注册 provider 的能力：' +
              '声明 inputModalities 含 image 的模型直接列出；未声明模态的模型会向适配器解析一次后再归类。' +
              '选择即时生效（热切换），无需重启。'),
            React.createElement(CurrentModelCard, {
              selection: selection,
              busy: busy,
              probe: probe,
              onProbe: runProbe,
              onAuto: function () { choose(null, null) },
            }),
            React.createElement(CapabilityCard, {
              groups: groups,
              stats: stats,
              busy: busy,
              selectionKey: selectionKey,
              onChoose: choose,
              onRefresh: function () { load(true) },
            }),
            React.createElement(LastRunCard, {
              lastRun: (snapshot && snapshot.lastRun) || null,
              limits: (snapshot && snapshot.limits) || null,
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
            React.createElement('span', { key: 'title', className: 'umazimg-tool-title' }, '图片分析'),
            React.createElement('span', { key: 'state', className: 'umazimg-tag' + (settled ? (isError ? ' is-err' : ' is-ok') : '') },
              settled ? (isError ? '失败' : '完成') : '运行中'),
          ]
          if (meta && meta.provider) {
            head.push(React.createElement('span', { key: 'model', className: 'umazimg-tag is-brand' },
              meta.provider + ' / ' + (meta.modelName || meta.model)))
          }
          if (meta && Array.isArray(meta.attempts) && meta.attempts.length > 1) {
            head.push(React.createElement('span', { key: 'attempts', className: 'umazimg-tag is-warn' },
              '切换 ' + meta.attempts.length + ' 次'))
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
                  ? (text || '调用失败')
                  : (expanded || text.length <= limit ? text : text.slice(0, limit) + '…'))
            : React.createElement('div', { className: 'umazimg-status' }, '正在调用 vision 模型分析图片…')

          const footer = []
          if (settled && !isError && text.length > limit) {
            footer.push(React.createElement('button', {
              key: 'toggle',
              type: 'button',
              className: 'umazimg-link',
              onClick: function () { setExpanded(!expanded) },
            }, expanded ? '收起' : '展开全文（' + text.length + ' 字）'))
          }
          if (rawArgs) {
            footer.push(React.createElement('button', {
              key: 'args',
              type: 'button',
              className: 'umazimg-link',
              onClick: function () { setShowArgs(!showArgs) },
            }, showArgs ? '隐藏参数' : '查看参数'))
          }
          if (meta && meta.elapsedMs) {
            footer.push(React.createElement('span', { key: 'elapsed', className: 'umazimg-mono' }, meta.elapsedMs + ' ms'))
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
            { name: 'settings.section', id: 'um-analyze-img', order: 25, label: '图片分析' },
            function () { return React.createElement(SettingsPanel) },
          )
        })

        ctx.slots.inject('tool.call.toolview', function () {
          return ctx.slots.register(
            { name: 'tool.call.toolview', key: 'um_analyze_img' },
            function (props) { return React.createElement(ToolCard, props) },
          )
        })
      },
    }
  },
})
