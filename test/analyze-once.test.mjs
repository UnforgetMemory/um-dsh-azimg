// um-dsh-azimg · host.js 语义测试（零依赖，node test/analyze-once.test.mjs）
// 用 mock ctx 驱动真实 host.js 的工具 execute，验证核心修复：
//   1. 阶段 5 直调 ctx.llm.stream（不经过子代理），请求携带 { type: 'image', attachment: ref } 像素引用
//   2. finish 归因与候选失败切换语义
//   3. 取消与输入校验传播
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

// ── 1×1 透明 PNG（魔数嗅探可识别）
const PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
)

const LIMITS = {
  maxImageBytes: 32 * 1024 * 1024,
  maxImagesPerMessage: 8,
  maxMessageImageBytes: 64 * 1024 * 1024,
  maxImagePixels: 0,
  maxImageDimension: 0,
  mediaTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif'],
}

let passed = 0
let failed = 0
function assert(cond, label) {
  if (cond) {
    passed++
    console.log('  \u2714 ' + label)
  } else {
    failed++
    console.error('  \u2718 ' + label)
  }
}

// ── 组装插件与 mock 运行时 ──
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const code = readFileSync(join(root, 'host.js'), 'utf8')

let capturedTool = null
globalThis.harness = {
  defineTool(def) {
    capturedTool = def
    return def
  },
  registerTool(ctx, tool) {
    return () => {}
  },
  handle(name, fn) {
    return () => {}
  },
}

const queue = []   // 每次 llm.stream 消费一个场景生成器
const calls = []   // 每次 llm.stream 的实际入参
const ctx = {
  effect(cb) {
    cb()
    return () => {}
  },
  on() {
    return () => {}
  },
  get() {
    return undefined
  },
  attachments: {
    imageLimits: LIMITS,
    async saveImages(inputs) {
      return inputs.map((input, i) => ({
        attachmentId: 'att-' + (i + 1),
        mediaType: input.mediaType,
        width: 1,
        height: 1,
        bytes: input.data.length,
      }))
    },
  },
  fs: {
    async resolve(path) {
      return { path: String(path) }
    },
    async readBytes(target, signal, cap) {
      if (String(target.path).includes('bad.bin')) return Buffer.from('not an image at all')
      return PNG_BYTES
    },
  },
  llm: {
    listProviders() {
      return [
        { id: 'p1', name: 'P1' },
        { id: 'p2', name: 'P2' },
      ]
    },
    async listModels(providerId) {
      return [{ id: providerId === 'p1' ? 'm1' : 'm2', name: 'M', inputModalities: ['image'] }]
    },
    async resolveModelInfo() {
      throw new Error('unused')
    },
    stream(options) {
      calls.push({ provider: options.provider, model: options.model, options: options })
      const gen = queue.shift()
      return (async function* () {
        if (!gen) return
        yield* gen(options)
      })()
    },
  },
}

const plugin = new Function(code)()
plugin.apply(ctx)
const tool = capturedTool
// 生产环境 exec.signal 是真实 AbortSignal（deepFreeze 跳过冻结）；夹具须保真
let controller = new AbortController()
const exec = { signal: controller.signal }

function reset() {
  queue.length = 0
  calls.length = 0
  controller = new AbortController()
  exec.signal = controller.signal
}

// 场景生成器
const textReply = (text) => async function* () {
  yield { type: 'block-start', index: 0, blockType: 'text' }
  for (const part of [text.slice(0, 4), text.slice(4)]) {
    yield { type: 'text-delta', index: 0, text: part }
  }
  yield { type: 'block-end', index: 0, block: { type: 'text', text: text } }
  yield { type: 'usage', usage: { inputTokens: 12, outputTokens: 5 } }
  yield { type: 'finish', reason: { kind: 'stop' } }
}
const errorReply = (codeValue, message) => async function* () {
  yield { type: 'finish', reason: { kind: 'error', failure: { code: codeValue, message: message } } }
}
const abortedReply = () => async function* () {
  yield { type: 'finish', reason: { kind: 'aborted', failure: { code: 'TIMEOUT', message: 'request timed out' } } }
}
const maxTokensReply = () => async function* () {
  yield { type: 'block-start', index: 0, blockType: 'text' }
  yield { type: 'text-delta', index: 0, text: '截断' }
  yield { type: 'finish', reason: { kind: 'max-tokens' } }
}
const toolCallsReply = () => async function* () {
  yield { type: 'finish', reason: { kind: 'tool-calls' } }
}
const emptyStopReply = () => async function* () {
  yield { type: 'finish', reason: { kind: 'stop' } }
}
const throwReply = (message) => async function* () {
  throw new Error(message)
}
const silentReply = () => async function* () {}

async function run(label, fn) {
  console.log('\n▶ ' + label)
  try {
    await fn()
  } catch (err) {
    console.error('  测试用例抛出异常:', err)
    failed++
  }
}

await run('T1 成功直调：请求携带像素引用（image block + attachment ref），返回分析文本', async () => {
  reset()
  queue.push(textReply('图片里是一只橘猫。'))
  const result = await tool.execute({ image_paths: ['hero.png'], question: '描述' }, exec)
  assert(result.analysis === '图片里是一只橘猫。', 'analysis 文本正确: ' + JSON.stringify(result.analysis))
  assert(result.meta && result.meta.provider === 'p1' && result.meta.model === 'm1', 'meta 使用第一个候选 p1/m1')
  assert(result.meta && result.meta.attempts.length === 1 && result.meta.attempts[0].ok === true, 'attempts=[ok]')
  assert(result.meta && result.meta.images[0].name === 'hero.png' && result.meta.images[0].mediaType === 'image/png', 'meta.images 回写嗅探格式')
  const options = calls[0].options
  assert(calls.length === 1 && options.provider === 'p1' && options.model === 'm1', 'llm.stream 收到 provider/model')
  const message = options.messages[0]
  assert(message && message.role === 'user' && typeof message.id === 'string' && message.id.length > 0, 'user 消息带 id/role')
  assert(message.source && message.source.kind === 'plugin' && message.source.plugin === 'um-dsh-azimg', '消息来源标记为插件')
  assert(message.content[0] && message.content[0].type === 'text', '首块为文本提示')
  const imageBlock = message.content[1]
  assert(
    imageBlock && imageBlock.type === 'image' && imageBlock.attachment && imageBlock.attachment.attachmentId === 'att-1',
    '像素以 { type:image, attachment } 引用直传（修复核心断言）',
  )
})

await run('T2 失败切换：候选 1 模型层错误 → 候选 2 成功，attempts 归因完整', async () => {
  reset()
  queue.push(errorReply('RATE_LIMIT', '429 rate limited'))
  queue.push(textReply('切换后的分析。'))
  const result = await tool.execute({ image_paths: ['hero.png'] }, exec)
  assert(result.analysis === '切换后的分析。', 'failover 后拿到分析')
  assert(calls.length === 2 && calls[1].provider === 'p2', '第二个候选 p2 被调用')
  const attempts = result.meta.attempts
  assert(attempts.length === 2, 'attempts 记录两次')
  assert(attempts[0].ok === false && String(attempts[0].detail).includes('RATE_LIMIT'), '第一次失败归因含 RATE_LIMIT: ' + attempts[0].detail)
  assert(attempts[1].ok === true && attempts[1].detail === null, '成功尝试 detail 为 null（无损 JSON）')
})

await run('T3 全失败：两个候选均失败 → 抛出聚合错误', async () => {
  reset()
  queue.push(errorReply('RATE_LIMIT', '429 rate limited'))
  queue.push(errorReply('AUTH', 'bad key'))
  let message = ''
  try {
    await tool.execute({ image_paths: ['hero.png'] }, exec)
  } catch (err) {
    message = String(err && err.message)
  }
  assert(message.includes('所有候选 vision 模型均失败'), '聚合错误标题存在')
  assert(message.includes('RATE_LIMIT') && message.includes('AUTH'), '两个候选的失败归因都在: ' + message)
})

await run('T4 max-tokens：候选 1 截断 → 记为失败并切换', async () => {
  reset()
  queue.push(maxTokensReply())
  queue.push(textReply('完整分析。'))
  const result = await tool.execute({ image_paths: ['hero.png'] }, exec)
  assert(result.analysis === '完整分析。', '切换成功')
  assert(String(result.meta.attempts[0].detail).includes('maxTokens'), 'maxTokens 归因: ' + result.meta.attempts[0].detail)
})

await run('T5 tool-calls：候选 1 请求工具 → 记为不支持并切换', async () => {
  reset()
  queue.push(toolCallsReply())
  queue.push(textReply('纯文本分析。'))
  const result = await tool.execute({ image_paths: ['hero.png'] }, exec)
  assert(result.analysis === '纯文本分析。', '切换成功')
  assert(String(result.meta.attempts[0].detail).includes('工具'), 'tool-calls 归因: ' + result.meta.attempts[0].detail)
})

await run('T6 空输出：候选 1 stop 但无文本 → 记为失败并切换', async () => {
  reset()
  queue.push(emptyStopReply())
  queue.push(textReply('有内容的分析。'))
  const result = await tool.execute({ image_paths: ['hero.png'] }, exec)
  assert(result.analysis === '有内容的分析。', '切换成功')
  assert(String(result.meta.attempts[0].detail).includes('未产出文本'), '空输出归因: ' + result.meta.attempts[0].detail)
})

await run('T7 aborted finish（信号未取消）：候选 1 中止 → 归因 TIMEOUT 并切换', async () => {
  reset()
  queue.push(abortedReply())
  queue.push(textReply('恢复后的分析。'))
  const result = await tool.execute({ image_paths: ['hero.png'] }, exec)
  assert(result.analysis === '恢复后的分析。', '切换成功')
  assert(String(result.meta.attempts[0].detail).includes('TIMEOUT'), 'aborted 归因: ' + result.meta.attempts[0].detail)
})

await run('T8 流抛异常：候选 1 网络异常 → 归因并切换', async () => {
  reset()
  queue.push(throwReply('network down'))
  queue.push(textReply('重试成功。'))
  const result = await tool.execute({ image_paths: ['hero.png'] }, exec)
  assert(result.analysis === '重试成功。', '切换成功')
  assert(String(result.meta.attempts[0].detail).includes('network down'), '异常归因: ' + result.meta.attempts[0].detail)
})

await run('T9 取消：信号已中止 → 抛出取消错误，且不再试下一个候选', async () => {
  reset()
  queue.push(silentReply())
  queue.push(textReply('不应被调用。'))
  controller.abort()
  let message = ''
  try {
    await tool.execute({ image_paths: ['hero.png'] }, exec)
  } catch (err) {
    message = String(err && err.message)
  }
  assert(message.includes('已取消'), '取消错误: ' + message)
  assert(calls.length === 1, '取消后不再调用后续候选（calls=' + calls.length + '）')
})

await run('T10 输入校验：非法格式与空路径', async () => {
  reset()
  let message = ''
  try {
    await tool.execute({ image_paths: ['bad.bin'] }, exec)
  } catch (err) {
    message = String(err && err.message)
  }
  assert(message.includes('无法识别'), '非法格式报错: ' + message)
  message = ''
  try {
    await tool.execute({ image_paths: [] }, exec)
  } catch (err) {
    message = String(err && err.message)
  }
  assert(message.includes('至少需要'), '空路径报错: ' + message)
})

console.log('\n════════════════════════════')
console.log('通过 ' + passed + ' / ' + (passed + failed))
if (failed > 0) {
  console.error('存在失败用例')
  process.exit(1)
}
console.log('全部通过')
