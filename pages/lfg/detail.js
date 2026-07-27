// pages/lfg/detail.js
// 凑人/约战共享详情页
const api = require('../../utils/api.js');

const TYPE_CONFIG = {
  sub: { icon: '🙋', cnName: '凑人', actionText: '我要顶' },
  war: { icon: '⚔️', cnName: '约战', actionText: '接受挑战' }
};

Page({
  data: {
    detail: null,
    typeFromQuery: null
  },

  onLoad(options) {
    this.setData({ typeFromQuery: options.type || null });
    this.loadDetail(options.id);
  },

  async loadDetail(id) {
    try {
      const res = await api.getLfgDetail(id);
      const detail = res.data;
      const typeKey = detail.type || this.data.typeFromQuery || 'sub';
      const config = TYPE_CONFIG[typeKey] || TYPE_CONFIG.sub;
      this.setData({
        detail: {
          ...detail,
          typeKey,
          icon: config.icon,
          typeLabel: config.cnName,
          actionText: config.actionText,
          teamName: detail.publisher?.nickname || detail.title,
          desc: detail.description || '',
          contact: detail.contact || '微信同名',
          status: detail.status === 'open' ? '招募中' : (detail.status === 'full' ? '已满' : '已关闭')
        }
      });
      wx.setNavigationBarTitle({
        title: config.cnName + (detail.publisher?.nickname ? ` · ${detail.publisher.nickname}` : '')
      });
    } catch (e) {
      console.error('加载详情失败:', e);
      wx.showToast({ title: '加载失败', icon: 'none' });
    }
  },

  onContactTap() {
    const contact = this.data.detail?.contact || '';
    if (!contact) {
      wx.showToast({ title: '暂无联系方式', icon: 'none' });
      return;
    }
    wx.setClipboardData({
      data: contact,
      success: () => wx.showToast({ title: '已复制联系方式', icon: 'success' })
    });
  },

  onJoinTap() {
    const id = this.data.detail?.id;
    if (!id) return;
    const action = this.data.detail?.actionText || '参与';
    wx.showModal({
      title: `确认${action}`,
      content: `${action}后将通过微信服务通知联系你`,
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.joinLfg(id);
            wx.showToast({ title: `已${action}成功！`, icon: 'success' });
          } catch (e) {
            console.error(e);
            wx.showToast({ title: '操作失败', icon: 'none' });
          }
        }
      }
    });
  },

  onShareAppMessage() {
    const d = this.data.detail;
    return {
      title: d ? `${d.teamName} ${d.typeLabel === '凑人' ? '缺人' : '约战'}，快来！` : '来足球搭子',
      path: `/pages/lfg/detail?id=${d ? d.id : ''}`
    };
  }
});