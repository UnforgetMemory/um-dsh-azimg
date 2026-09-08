// um-dsh-azimg · Host 半（cordis_define 的 code.host 函数体）
// 工具 um_analyze_img：多图 + 格式嗅探 + 限额预检 + 候选失败切换 + 结构化呈现元数据
// 设置面板数据面：模型能力识别（image/text/unknown）+ 热切换选择 + 可用性探测

const MAX_IMAGES = 8
const MODEL_CACHE_TTL_MS = 30000
const RESOLVE_BUDGET = 60
const RESOLVE_CONCURRENCY = 4

const EXT_MEDIA = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}
const MEDIA_LABEL = {
  'image/png': 'PNG',
  'image/jpeg': 'JPEG',
  'image/webp': 'WebP',
  'image/gif': 'GIF',
}

function clip(value, max) {
  const text = String(value === undefined || value === null ? '' : value)
  return text.length > max ? text.slice(0, max) + '…' : text
}

function baseNameOf(path) {
  return String(path || '').split(/[\\/]/).pop() || 'image'
}

function extOf(path) {
  const text = String(path || '')
  const dot = text.lastIndexOf('.')
  return dot < 0 ? '' : text.slice(dot + 1).toLowerCase()
}

// 魔数嗅探：不依赖扩展名，避免「.png 实际是 jpeg」被 attachments 校验拒绝
function sniffMediaType(bytes) {
  if (!bytes || bytes.length < 4) return undefined
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) return 'image/png'
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg'
  if (
    bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 &&
    bytes[3] === 0x38 && (bytes[4] === 0x37 || bytes[4] === 0x39) && bytes[5] === 0x61
  ) return 'image/gif'
  if (
    bytes.length >= 12 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) return 'image/webp'
  return undefined
}

function resolveMediaType(path, bytes) {
  const sniffed = sniffMediaType(bytes)
  if (sniffed) return sniffed
  return EXT_MEDIA[extOf(path)]
}

function textOfBlocks(blocks) {
  return (blocks || [])
    .map(function (block) { return block && block.type === 'text' ? String(block.text || '') : '' })
    .join('\n')
    .trim()
}

function toStringList(value) {
  if (Array.isArray(value)) {
    return value.filter(function (item) { return typeof item === 'string' && item.trim() !== '' })
  }
  if (typeof value === 'string' && value.trim() !== '') return [value]
  return []
}

// 有并发上限的 map（不引入外部依赖）
async function mapLimit(items, limit, worker) {
  let cursor = 0
  const runners = []
  const size = Math.max(1, Math.min(limit, items.length))
  for (let i = 0; i < size; i++) {
    runners.push((async function () {
      while (cursor < items.length) {
        const index = cursor++
        await worker(items[index], index)
      }
    })())
  }
  await Promise.all(runners)
}

function buildPrompt(question, described) {
  const ask = question && String(question).trim()
  const head = described.length > 1
    ? '以下 ' + described.length + ' 张图片，按给定顺序为：' + described.map(function (item) { return item.name }).join('、') + '。'
    : ''
  return [
    head,
    ask || '请详细描述图片内容：场景、主体、文字、布局与任何值得注意的细节。',
    '（请直接以文本回答分析结果，不要使用工具，不要复述指示。）',
  ].filter(Boolean).join('\n\n')
}

return {
  inject: ['tools', 'subagents', 'llm', 'agents', 'attachments', 'fs'],
  apply(ctx) {
    // ── 热切换状态：当前选定的 vision provider/model（null = 自动依次尝试） ──
    let selection = null
    // ── 最近一次工具调用摘要（面板回显用） ──
    let lastRun = null
    // ── 模型能力枚举缓存 ──
    let modelCache = null

    function limitsSnapshot() {
      const limits = ctx.attachments.imageLimits
      return {
        maxImageBytes: limits.maxImageBytes,
        maxImagesPerMessage: limits.maxImagesPerMessage,
        maxMessageImageBytes: limits.maxMessageImageBytes,
        maxImagePixels: limits.maxImagePixels,
        maxImageDimension: limits.maxImageDimension,
        mediaTypes: limits.mediaTypes.slice(),
      }
    }

    function recount(groups) {
      const stats = { providers: 0, models: 0, image: 0, textOnly: 0, unknown: 0, resolved: 0 }
      for (const group of groups) {
        if (group.error) continue
        stats.providers++
        for (const row of group.models) {
          stats.models++
          if (row.support === 'image') stats.image++
          else if (row.support === 'text') stats.textOnly++
          else stats.unknown++
          if (row.resolved) stats.resolved++
        }
      }
      return stats
    }

    // 逐个 provider 枚举模型，按 inputModalities 三分；unknown 再用 resolveModelInfo 复核
    async function enumerateModels(force) {
      const now = Date.now()
      if (!force && modelCache && now - modelCache.at < MODEL_CACHE_TTL_MS) return modelCache

      const groups = []
      for (const provider of ctx.llm.listProviders()) {
        let models
        try {
          models = await ctx.llm.listModels(provider.id)
        } catch (err) {
          groups.push({
            provider: provider.id,
            providerName: provider.name,
            error: clip(err && err.message ? err.message : err, 160),
            models: [],
          })
          continue
        }
        const rows = []
        for (const model of models || []) {
          const declared = Array.isArray(model.inputModalities) ? model.inputModalities : null
          rows.push({
            model: model.id,
            name: model.name || model.id,
            description: model.description || '',
            support: declared === null ? 'unknown' : (declared.indexOf('image') >= 0 ? 'image' : 'text'),
            declared: declared !== null,
            resolved: false,
          })
        }
        groups.push({ provider: provider.id, providerName: provider.name, models: rows })
      }

      // 未声明模态的模型：向适配器精确解析一次（有上限，避免拖慢面板）
      const pending = []
      for (const group of groups) {
        for (const row of group.models) {
          if (row.support === 'unknown') pending.push({ group: group, row: row })
        }
      }
      await mapLimit(pending.slice(0, RESOLVE_BUDGET), RESOLVE_CONCURRENCY, async function (item) {
        try {
          const info = await ctx.llm.resolveModelInfo(item.group.provider, item.row.model)
          const modalities = info && Array.isArray(info.inputModalities) ? info.inputModalities : null
          item.row.resolved = true
          if (modalities) {
            item.row.support = modalities.indexOf('image') >= 0 ? 'image' : 'text'
            item.row.declared = true
          }
          if (info && info.context && info.context.contextWindow) item.row.contextWindow = info.context.contextWindow
        } catch (err) {
          item.row.probeError = clip(err && err.message ? err.message : err, 120)
        }
      })

      const stats = recount(groups)
      modelCache = { at: Date.now(), groups: groups, stats: stats }
      return modelCache
    }

    function imageCandidates(snapshot) {
      const out = []
      for (const group of snapshot.groups) {
        for (const row of group.models) {
          if (row.support !== 'image') continue
          out.push({
            provider: group.provider,
            providerName: group.providerName,
            model: row.model,
            name: row.name,
            description: row.description,
          })
        }
      }
      return out
    }

    async function probeModel(provider, model) {
      if (!provider || !model) return { ok: false, detail: '缺少 provider 或 model。' }
      try {
        const info = await ctx.llm.resolveModelInfo(provider, model)
        return {
          ok: true,
          provider: provider,
          model: model,
          name: info && info.name ? info.name : model,
          inputModalities: info && Array.isArray(info.inputModalities) ? info.inputModalities.slice() : [],
          contextWindow: info && info.context && info.context.contextWindow ? info.context.contextWindow : null,
        }
      } catch (err) {
        return {
          ok: false,
          provider: provider,
          model: model,
          detail: clip(err && err.message ? err.message : err, 240),
          code: err && err.code ? String(err.code) : '',
        }
      }
    }

    // 分析一次：返回 { ok, text, detail }
    async function analyzeOnce(candidate, prompt, parent, exec) {
      const requestFailures = []
      const offError = ctx.on('agent/request-error', async function (payload, next) {
        if (payload && payload.failure) {
          requestFailures.push(
            '[' + (payload.provider || '?') + '] ' + (payload.failure.code || 'E') + ': ' +
            clip(payload.failure.message, 240),
          )
        }
        return next()
      })
      const providers = ctx.subagents.list()
      const providerName = providers.indexOf('agent') >= 0 ? 'agent' : providers[0]
      if (!providerName) return { ok: false, detail: '没有可用的 subagent provider。' }
      try {
        console.log('[um_analyze_img] try ' + candidate.provider + '/' + candidate.model + ' via subagent=' + providerName)
        const run = await ctx.subagents.start(providerName, {
          label: 'um_analyze_img',
          prompt: prompt,
          parent: parent,
          signal: exec.signal,
          agentOptions: { provider: candidate.provider, model: candidate.model },
        })
        try {
          const result = await run.result
          const bits = []
          if (requestFailures.length > 0) bits.push('模型请求失败: ' + requestFailures.join(' | '))
          if (result.diagnostic) bits.push('diagnostic: ' + clip(result.diagnostic, 240))
          if (result.stopReason !== 'completed') {
            bits.push('stopReason: ' + result.stopReason)
            return { ok: false, detail: bits.join('; ') }
          }
          const text = textOfBlocks(result.output || [])
          if (!text) {
            bits.push('子代理未产出文本分析')
            return { ok: false, detail: bits.join('; ') }
          }
          return { ok: true, text: text, warnings: bits }
        } finally {
          await run.dispose()
        }
      } finally {
        offError()
      }
    }

    const tool = harness.defineTool({
      name: 'um_analyze_img',
      description:
        '用视觉（vision）模型分析本地图片文件，支持一次传入多张图。' +
        '适用于当前 agent 本身无法直接看图（纯文本输入）的场景：传入图片的绝对路径与可选问题，返回对图片内容的文字分析。',
      timeoutMs: 600000,
      parameters: {
        image_paths: {
          type: 'array',
          items: { type: 'string' },
          required: true,
          description: '图片文件路径列表（png/jpeg/webp/gif），1–8 个；可传绝对路径或相对工作区路径。',
        },
        question: {
          type: 'string',
          description: '针对图片的可选问题；缺省时返回对图片的完整描述。',
        },
      },
      output: {
        schema: {
          type: 'object',
          properties: {
            analysis: { type: 'string' },
            meta: { type: 'json' },
          },
          additionalProperties: false,
        },
        render: function (args, value) {
          return [{ type: 'text', text: String((value && value.analysis) || '') }]
        },
        presentationMeta: function (args, value) {
          return (value && value.meta) || null
        },
      },
      presentCall: function (args) {
        const paths = toStringList(args && args.image_paths)
        const names = paths.map(baseNameOf)
        const view = {
          card: 'generic',
          title: names.length > 1
            ? '分析图片 ' + names.length + ' 张：' + names.join('、')
            : '分析图片 ' + (names[0] || ''),
          kind: 'read',
          locations: paths.map(function (path) { return { path: path } }),
        }
        if (args && args.question) view.rawInput = { question: String(args.question) }
        return view
      },
      presentResult: function (args, result) {
        return { card: 'generic', title: result && result.isError ? '图片分析失败' : '图片分析完成' }
      },
      async execute(args, exec) {
        const started = Date.now()
        const paths = toStringList(args && args.image_paths)
        if (paths.length === 0) {
          throw new Error('um_analyze_img: image_paths 至少需要一个图片路径。')
        }
        const limits = limitsSnapshot()
        const maxCount = Math.min(MAX_IMAGES, limits.maxImagesPerMessage || MAX_IMAGES)
        if (paths.length > maxCount) {
          throw new Error('um_analyze_img: 一次最多 ' + maxCount + ' 张图片，收到 ' + paths.length + ' 张。')
        }

        // 1. 逐张读取字节 → 嗅探真实格式 → 限额预检
        const inputs = []
        const described = []
        let totalBytes = 0
        for (const path of paths) {
          let target
          try {
            target = await ctx.fs.resolve(path, { signal: exec.signal })
          } catch (err) {
            throw new Error('um_analyze_img: 无法定位图片「' + path + '」：' + clip(err && err.message, 160))
          }
          const readCap = Math.max(1024, Math.min(limits.maxImageBytes, 32 * 1024 * 1024))
          let bytes
          try {
            bytes = await ctx.fs.readBytes(target, exec.signal, readCap)
          } catch (err) {
            throw new Error('um_analyze_img: 读取图片「' + path + '」失败：' + clip(err && err.message, 160))
          }
          if (bytes.length >= readCap) {
            throw new Error(
              'um_analyze_img: 图片「' + path + '」超过单图上限 ' + limits.maxImageBytes + ' 字节。',
            )
          }
          const mediaType = resolveMediaType(path, bytes)
          if (!mediaType) {
            throw new Error(
              'um_analyze_img: 无法识别「' + path + '」的图片格式（仅支持 ' + limits.mediaTypes.join(' / ') + '）。',
            )
          }
          totalBytes += bytes.length
          inputs.push({ data: bytes, mediaType: mediaType, name: baseNameOf(path) })
          described.push({ path: path, name: baseNameOf(path), mediaType: mediaType, bytes: bytes.length })
        }
        if (limits.maxMessageImageBytes && totalBytes > limits.maxMessageImageBytes) {
          throw new Error(
            'um_analyze_img: 图片总量 ' + totalBytes + ' 字节超过单条消息上限 ' + limits.maxMessageImageBytes + ' 字节。',
          )
        }

        // 2. 入库为附件引用（校验 + 规范化，批量原子）
        const refs = await ctx.attachments.saveImages(inputs)
        for (let i = 0; i < described.length; i++) {
          const ref = refs[i]
          if (!ref) continue
          described[i].width = ref.width
          described[i].height = ref.height
          described[i].bytes = ref.bytes
          described[i].mediaType = ref.mediaType
        }

        const prompt = [{ type: 'text', text: buildPrompt(args && args.question, described) }]
        for (const ref of refs) prompt.push({ type: 'image', attachment: ref })

        const parent = ctx.agents.currentInitiator() || ctx.agents.requireInitiator()

        // 3. 候选模型：面板有选择 → 只试它；无选择 → 依次尝试全部支持图片的模型
        const snapshot = await enumerateModels(false)
        const all = imageCandidates(snapshot)
        let candidates
        let selectionNote = ''
        if (selection) {
          const hit = all.find(function (item) {
            return item.provider === selection.provider && item.model === selection.model
          })
          if (hit) {
            candidates = [hit]
          } else {
            candidates = [{
              provider: selection.provider,
              providerName: selection.provider,
              model: selection.model,
              name: selection.model,
              description: '',
            }]
            selectionNote = '当前选择的模型未出现在支持图片的模型列表中（可能已下线或未声明模态）。'
          }
        } else {
          candidates = all
        }
        if (candidates.length === 0) {
          throw new Error(
            'um_analyze_img: 当前没有任何已注册且支持图片输入的模型（inputModalities 含 image）。' +
            '请在「设置 → 图片分析」中确认 vision 模型配置。',
          )
        }

        // 4. 依次尝试，失败自动切换下一个候选
        const attempts = []
        for (const candidate of candidates) {
          const attempt = await analyzeOnce(candidate, prompt, parent, exec)
          attempts.push({
            provider: candidate.provider,
            model: candidate.model,
            ok: attempt.ok,
            // 必须是无损 JSON：成功的尝试用 null，而不是 undefined
            detail: attempt.ok ? null : clip(attempt.detail, 240),
          })
          if (attempt.ok) {
            const meta = {
              provider: candidate.provider,
              providerName: candidate.providerName,
              model: candidate.model,
              modelName: candidate.name,
              images: described.map(function (item) {
                return {
                  path: String(item.path),
                  name: String(item.name),
                  mediaType: String(item.mediaType),
                  width: item.width || 0,
                  height: item.height || 0,
                  bytes: item.bytes || 0,
                }
              }),
              attempts: attempts,
              elapsedMs: Date.now() - started,
            }
            lastRun = {
              at: Date.now(),
              ok: true,
              provider: candidate.provider,
              providerName: candidate.providerName,
              model: candidate.model,
              modelName: candidate.name,
              images: described.length,
              elapsedMs: meta.elapsedMs,
            }
            console.log('[um_analyze_img] ok via ' + candidate.provider + '/' + candidate.model + ' in ' + meta.elapsedMs + 'ms')
            return { analysis: attempt.text, meta: meta }
          }
        }

        const failures = attempts.map(function (item) {
          return item.provider + '/' + item.model + ' → ' + (item.detail || '未知失败')
        })
        lastRun = {
          at: Date.now(),
          ok: false,
          provider: attempts.length ? attempts[attempts.length - 1].provider : '',
          model: attempts.length ? attempts[attempts.length - 1].model : '',
          images: described.length,
          elapsedMs: Date.now() - started,
          detail: clip(failures.join(' | '), 240),
        }
        throw new Error(
          'um_analyze_img: 所有候选 vision 模型均失败。' +
          (selectionNote ? '\n注意：' + selectionNote : '') +
          '\n' + failures.join('\n'),
        )
      },
    })

    ctx.effect(function () {
      const disposeTool = harness.registerTool(ctx, tool)

      const offState = harness.handle('state', async function (args) {
        const force = !!(args && args.refresh)
        const snapshot = await enumerateModels(force)
        return {
          selection: selection,
          groups: snapshot.groups,
          stats: snapshot.stats,
          lastRun: lastRun,
          limits: limitsSnapshot(),
          toolName: 'um_analyze_img',
        }
      })

      const offSelect = harness.handle('select', async function (args) {
        if (!args || typeof args.provider !== 'string' || typeof args.model !== 'string' ||
            args.provider === '' || args.model === '') {
          selection = null
          return { selection: selection, warning: '' }
        }
        const next = { provider: args.provider, model: args.model }
        selection = next
        const snapshot = await enumerateModels(false)
        const hit = imageCandidates(snapshot).find(function (item) {
          return item.provider === next.provider && item.model === next.model
        })
        return {
          selection: selection,
          warning: hit ? '' : '该模型当前不在「支持图片」列表中，调用时可能失败。',
        }
      })

      const offProbe = harness.handle('probe', function (args) {
        return probeModel(args && args.provider, args && args.model)
      })

      return function () {
        disposeTool()
        offState()
        offSelect()
        offProbe()
      }
    })
  },
}
