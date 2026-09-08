const MEDIA_TYPES = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  gif: 'image/gif',
}

function mediaTypeOf(path) {
  const ext = String(path || '').split('.').pop().toLowerCase()
  return MEDIA_TYPES[ext] || 'image/png'
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

return {
  inject: ['tools', 'subagents', 'llm', 'agents', 'attachments', 'fs'],
  apply(ctx) {
    // 热切换状态：当前选定的 vision provider/model（null = 无指定，自动尝试全部候选）
    let selection = null

    async function listVisionModels() {
      const out = []
      for (const p of ctx.llm.listProviders()) {
        let models
        try {
          models = await ctx.llm.listModels(p.id)
        } catch (err) {
          continue // 该 provider 不可枚举时跳过
        }
        for (const m of models) {
          const mods = Array.isArray(m.inputModalities) ? m.inputModalities : []
          if (mods.includes('image')) {
            out.push({
              provider: p.id,
              providerName: p.name,
              model: m.id,
              name: m.name,
              description: m.description || '',
            })
          }
        }
      }
      return out
    }

    function toolPrompt(question) {
      const q = question && String(question).trim()
      const base = q || '请详细描述这张图片的内容：场景、主体、文字、布局与任何值得注意的细节。'
      return base + '\n\n（请直接以文本回答分析结果，不要使用工具，不要复述指示。）'
    }

    // 分析一次：返回 { ok, text, detail }
    async function analyzeOnce(candidate, prompt, parent, exec) {
      const requestFailures = []
      const offError = ctx.on('agent/request-error', async (payload, next) => {
        if (payload && payload.failure) {
          requestFailures.push('[' + (payload.provider || '?') + '] ' + (payload.failure.code || 'E') + ': ' + String(payload.failure.message || '').slice(0, 240))
        }
        return next()
      })
      const names = ctx.subagents.list()
      const providerName = names.includes('agent') ? 'agent' : names[0]
      if (!providerName) return { ok: false, detail: '没有可用的 subagent provider。' }
      try {
        console.log('[um_analyze_img] try vision=' + candidate.provider + '/' + candidate.model + ' via subagent provider=' + providerName)
        const run = await ctx.subagents.start(providerName, {
          label: 'um_analyze_img',
          prompt,
          parent,
          signal: exec.signal,
          agentOptions: { provider: candidate.provider, model: candidate.model },
        })
        try {
          const result = await run.result
          if (result.stopReason !== 'completed') {
            const bits = []
            if (requestFailures.length > 0) bits.push('模型请求失败: ' + requestFailures.join(' | '))
            if (result.diagnostic) bits.push('diagnostic: ' + String(result.diagnostic).slice(0, 240))
            bits.push('stopReason: ' + result.stopReason)
            return { ok: false, detail: bits.join('; ') }
          }
          const text = textOfBlocks(result.output || [])
          if (!text) return { ok: false, detail: '子代理未产出文本分析。' }
          return { ok: true, text }
        } finally {
          await run.dispose()
        }
      } finally {
        offError()
      }
    }

    const tool = harness.defineTool({
      name: 'um_analyze_img',
      description: '使用选定的视觉（vision）模型分析本地图片文件。适用于当前 agent 本身无法直接看图（纯文本输入）的场景：传入图片的绝对路径与可选问题，返回对图片内容的分析。',
      parameters: {
        image_path: { type: 'string', required: true, description: '图片文件的绝对路径（png/jpg/webp/gif）。' },
        question: { type: 'string', description: '针对图片的可选问题；缺省时返回对图片的完整描述。' },
      },
      output: {
        schema: { type: 'string' },
        render: (args, value) => [{ type: 'text', text: String(value) }],
      },
      async execute(args, exec) {
        // 1. 读取本地图片字节
        const target = await ctx.fs.resolve(args.image_path)
        const bytes = await ctx.fs.readBytes(target, exec.signal, 20 * 1024 * 1024)
        // 2. 入库为附件引用（校验 + 规范化）
        const ref = await ctx.attachments.saveImage({
          data: bytes,
          mediaType: mediaTypeOf(args.image_path),
          name: basenameOf(args.image_path),
        })
        const prompt = [
          { type: 'text', text: toolPrompt(args.question) },
          { type: 'image', attachment: ref },
        ]
        const parent = ctx.agents.currentInitiator() || ctx.agents.requireInitiator()
        // 3. 候选模型：面板有选择 → 只试它；无选择 → 依次尝试全部 vision 模型
        const all = await listVisionModels()
        let candidates
        if (selection) {
          const hit = all.find(function (m) { return m.provider === selection.provider && m.model === selection.model })
          candidates = hit ? [hit] : [{ provider: selection.provider, model: selection.model, providerName: selection.provider, name: selection.model, description: '' }]
        } else {
          candidates = all
        }
        if (candidates.length === 0) {
          throw new Error('um_analyze_img: 当前没有任何已注册且支持图片输入的模型（inputModalities 含 image）。请先在设置面板/模型配置中配置一个 vision 模型。')
        }
        const failures = []
        for (const candidate of candidates) {
          const attempt = await analyzeOnce(candidate, prompt, parent, exec)
          if (attempt.ok) return attempt.text
          failures.push(candidate.provider + '/' + candidate.model + ' → ' + attempt.detail)
        }
        throw new Error('um_analyze_img: 所有候选 vision 模型均失败。\n' + failures.join('\n'))
      },
    })

    ctx.effect(() => {
      const disposeTool = harness.registerTool(ctx, tool)
      const offList = harness.handle('list-vision-models', async () => {
        const models = await listVisionModels()
        return { models, selection }
      })
      const offGet = harness.handle('get-selection', () => ({ selection }))
      const offSet = harness.handle('set-selection', (args) => {
        if (args && typeof args.provider === 'string' && typeof args.model === 'string' && args.provider !== '' && args.model !== '') {
          selection = { provider: args.provider, model: args.model }
        } else {
          selection = null
        }
        return { selection }
      })
      return () => {
        disposeTool()
        offList()
        offGet()
        offSet()
      }
    })
  },
}
