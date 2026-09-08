return {
  apply(ctx) {
    const slots = ctx.get('slots')
    if (slots === undefined) return

    slots.inject('settings.section', () => slots.register(
      { name: 'settings.section', id: 'um-analyze-img', order: 25, label: '图片分析 (um_analyze_img)' },
      () => React.createElement(UMPanel),
    ))

    function UMPanel() {
      const [models, setModels] = React.useState([])
      const [sel, setSel] = React.useState(null)
      const [status, setStatus] = React.useState('加载中…')

      React.useEffect(() => {
        let alive = true
        host.call('list-vision-models').then((data) => {
          if (!alive) return
          const list = (data && Array.isArray(data.models)) ? data.models : []
          setModels(list)
          setSel((data && data.selection) || null)
          setStatus('')
        }).catch(() => {
          if (!alive) return
          setStatus('读取模型列表失败')
        })
        return () => { alive = false }
      }, [])

      const selectedKey = sel ? (sel.provider + '\u0000' + sel.model) : ''
      const onChange = (event) => {
        const key = event.target.value
        if (key === '') {
          setSel(null)
          host.call('set-selection', null).then(() => setStatus('已清除选择：调用时自动使用第一个可用模型'))
          return
        }
        const hit = models.find((m) => (m.provider + '\u0000' + m.model) === key)
        if (!hit) return
        const next = { provider: hit.provider, model: hit.model }
        setSel(next)
        host.call('set-selection', next).then(() => setStatus('已切换（即时生效）：' + hit.providerName + ' / ' + hit.name))
      }
      const refresh = () => {
        setStatus('刷新中…')
        host.call('list-vision-models').then((data) => {
          const list = (data && Array.isArray(data.models)) ? data.models : []
          setModels(list)
          setSel((data && data.selection) || null)
          setStatus('已刷新，共 ' + list.length + ' 个支持图片的模型')
        }).catch(() => setStatus('刷新失败'))
      }

      return React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
        React.createElement('h3', null, 'um_analyze_img · 图片分析模型'),
        React.createElement('p', { style: { opacity: 0.8 } },
          '为图片分析工具选择视觉（vision）模型。列表自动读取当前已注册 provider 中声明支持图片输入（inputModalities 含 image）的模型；选择即时热切换，下次工具调用即生效，无需重启。'),
        models.length === 0
          ? React.createElement('p', null, status || '当前没有已注册且支持图片的模型。请先在「模型」设置中配置 vision 模型后刷新。')
          : React.createElement('select',
              { value: selectedKey, onChange, style: { padding: '6px', maxWidth: '100%' } },
              React.createElement('option', { value: '' }, '（自动：第一个可用模型）'),
              models.map((m) => React.createElement('option',
                { key: m.provider + '\u0000' + m.model, value: m.provider + '\u0000' + m.model },
                m.providerName + ' / ' + m.name + (m.description ? ' — ' + m.description : ''),
              )),
            ),
        React.createElement('div', { style: { display: 'flex', gap: '8px', alignItems: 'center' } },
          React.createElement('button', { onClick: refresh, style: { padding: '4px 10px' } }, '刷新模型列表'),
          status ? React.createElement('span', { style: { opacity: 0.7 } }, status) : null,
        ),
      )
    }
  },
}
