const SYSTEM = [
  '你是「爱拍球」小程序里的足球场地助手。只用简体中文，回答短、直接，一般不超过 180 字。',
  '你只说明怎么操作，不能代替用户订场、付款或退款，也不要编造实时空位、价格和订单状态。',
  '订场：打开球场，选择球场方已发布的空闲时段，微信支付到球场对公账户。',
  '退订：在「我的 - 我的订单」里对已支付订单发起退订，款项原路退回。',
  '找球场：首页搜索，或进入球场列表，可按距离筛选。',
  '凑人和约战：首页有入口。凑人需要选择人制，水平只有「养生」和「竞技」。',
  '球场方：在「我的球场」认领球场；空闲时段可发布、修改和删除。已被预订的时段不能改、不能删。',
  '不知道就说去对应页面查看，不要猜测。'
].join('\n');

const SUGGESTS = ['怎么预订球场？', '付了款怎么退订？', '怎么改已发布的空闲时段？', '怎么发起约战？'];

function pluginErrorText() {
  return '还不能调用 AI。请先在小程序后台「设置 - 第三方设置 - 插件管理」添加 HermitKit，AppID 为 wx5817321c8df4844e，并确认已开通「深度合成」类目。app.json 里的插件版本号要和后台批准的版本一致。';
}

Page({
  data: {
    models: [
      { id: 'Deepseek-v4-flash', label: 'DeepSeek' },
      { id: 'GLM-5.2', label: 'GLM' },
      { id: 'default', label: '默认' }
    ],
    modelId: 'Deepseek-v4-flash',
    messages: [],
    suggests: SUGGESTS,
    input: '',
    sending: false,
    ready: false,
    pluginError: '',
    scrollInto: ''
  },

  onLoad() {
    let kit = null;
    try {
      kit = requirePlugin('hermitkit');
    } catch (e) {
      kit = null;
    }
    if (!kit || !kit.chatapi || typeof kit.chatapi.createModel !== 'function') {
      this.setData({ pluginError: pluginErrorText() });
      return;
    }
    const app = getApp();
    const scope = String(app.globalData.openid || wx.getStorageSync('openid') || 'aipaiqiu').slice(0, 64);
    try {
      kit.init({ accountScope: scope, maxConversations: 20 });
    } catch (e) {}
    this._kit = kit;
    this._model = kit.chatapi.createModel();
    this.setData({ ready: true });
  },

  onUnload() {
    if (this._handle && this._handle.abort) this._handle.abort();
  },

  onModelTap(e) {
    if (this.data.sending) return;
    this.setData({ modelId: e.currentTarget.dataset.id });
  },

  onInput(e) {
    this.setData({ input: e.detail.value });
  },

  onSuggest(e) {
    const text = e.currentTarget.dataset.text;
    if (!text || this.data.sending) return;
    this.setData({ input: text });
    this.onSend();
  },

  onStop() {
    if (this._handle && this._handle.abort) this._handle.abort();
    this.setData({ sending: false });
  },

  _setAnswer(text) {
    if (!this._list || !this._list.length) return;
    this._list[this._list.length - 1] = { role: 'assistant', content: text };
    this.setData({ messages: this._list.slice(), scrollInto: 'ai-bottom' });
  },

  async _generate(messages) {
    const res = await this._model.generateText({
      model: this.data.modelId,
      messages
    });
    const choice = res && res.choices && res.choices[0];
    const msg = choice && choice.message;
    return (msg && (msg.content || msg.reasoning_content)) || '';
  },

  async onSend() {
    const text = String(this.data.input || '').trim();
    if (!text || this.data.sending) return;
    if (!this.data.ready) {
      wx.showToast({ title: 'AI 插件还不可用', icon: 'none' });
      return;
    }
    const history = this.data.messages.concat([
      { role: 'user', content: text },
      { role: 'assistant', content: '' }
    ]);
    this._list = history;
    this.setData({ messages: history.slice(), input: '', sending: true, scrollInto: 'ai-bottom' });
    const payload = [{ role: 'system', content: SYSTEM }].concat(
      history
        .filter((m) => m.role === 'user' || (m.role === 'assistant' && m.content))
        .slice(-12)
        .map((m) => ({ role: m.role, content: m.content }))
    );
    try {
      let answer = '';
      if (typeof this._model.streamText === 'function') {
        const handle = await this._model.streamText({
          data: { model: this.data.modelId, messages: payload },
          onText: (delta) => {
            answer += delta || '';
            this._setAnswer(answer);
          }
        });
        this._handle = handle;
        if (handle && handle.done) answer = (await handle.done) || answer;
      }
      if (!answer) answer = await this._generate(payload);
      if (!answer) answer = '这次没有生成内容，请换个说法再试。';
      this._setAnswer(answer);
    } catch (err) {
      const code = err && err.code;
      if (code === 'HERMITKIT_AUTH_REQUIRED') {
        this._list = this._list.slice(0, -1);
        this.setData({ messages: this._list.slice(), input: text });
        const page = (err.extra && err.extra.authPage) || (this._kit && this._kit.USER_AUTH_PAGE);
        if (this._kit && typeof this._kit.openUserAuthPage === 'function') this._kit.openUserAuthPage();
        else if (page) wx.navigateTo({ url: page });
        else wx.showToast({ title: '请先完成 AI 授权', icon: 'none' });
      } else if (this.data.modelId !== 'default') {
        try {
          const fallback = await this._model.generateText({ model: 'default', messages: payload });
          const choice = fallback && fallback.choices && fallback.choices[0];
          const content = choice && choice.message && (choice.message.content || choice.message.reasoning_content);
          this._setAnswer(content || '默认模型也没有返回内容。');
          this.setData({ modelId: 'default' });
        } catch (e2) {
          this._setAnswer((e2 && e2.message) || 'AI 暂时不可用，请稍后再试。');
        }
      } else {
        this._setAnswer((err && err.message) || 'AI 暂时不可用，请稍后再试。');
      }
    } finally {
      this._handle = null;
      this.setData({ sending: false });
    }
  }
});
