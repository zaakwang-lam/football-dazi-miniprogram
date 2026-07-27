// pages/lfg/detail.js
const api = require('../../utils/api.js');

const TYPE_CONFIG = {
  sub: { icon: '🙋', cnName: '凑人' },
  war: { icon: '⚔️', cnName: '约战' }
};

Page({
  data: {
    detail: null
  },

  onLoad(options) {
    this.loadDetail(options.id);
  },

  async loadDetail(id) {
    try {
      const res = await api.getLfgDetail(id);
      const detail = res.data;
      const config = TYPE_CONFIG[detail.type] || TYPE_CONFIG.sub;
      this.setData({
        detail: {
          ...detail,
          icon: config.icon,
          teamName: detail.publisher?.nickname || detail.title,
          desc: detail.description || '',
          contact: detail.contact || '微信同名',
          status: detail.status === 'open' ? '招募中' : (detail.status === 'full' ? '已满' : '已关闭')
        }
      });
      wx.setNavigationBarTitle({ title: detail.publisher?.nickname || '凑人详情' });
    } catch (e) {
      console.error(e);
    }
  },

  onContactTap() {
    wx.showModal({
      title: '联系队长',
      content: '已为队长发送服务通知，请等待回复',
      showCancel: false
    });
  },

  onJoinTap() {
    const id = this.data.detail?.id;
    if (!id) return;
    wx.showModal({
      title: '确认加入',
      content: '加入后将通过微信服务通知联系你',
      success: async (res) => {
        if (res.confirm) {
          try {
            await api.joinLfg(id);
            wx.showToast({ title: '已报名成功！', icon: 'success' });
          } catch (e) {
            console.error(e);
          }
        }
      }
    });
  },

  onShareAppMessage() {
    return {
      title: this.data.detail ? `${this.data.detail.teamName} 缺人，来顶！` : '来足球搭子',
      path: `/pages/lfg/detail?id=${this.data.detail ? this.data.detail.id : ''}`
    };
  }
});