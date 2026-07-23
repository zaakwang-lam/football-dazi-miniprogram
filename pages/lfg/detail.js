// pages/lfg/detail.js
const api = require('../../utils/api.js');

Page({
  data: {
    detail: null
  },

  onLoad(options) {
    this.loadDetail(options.id);
  },

  async loadDetail(id) {
    const res = await api.getLfgList();
    const allList = res.data || [];
    const detail = allList.find(item => item.id === Number(id)) || allList[0];

    if (detail) {
      const typeConfig = {
        '找人顶': { icon: '🙋', typeKey: 'sub' },
        '约战': { icon: '⚔️', typeKey: 'war' },
        '凑局': { icon: '👥', typeKey: 'join' }
      };
      this.setData({
        detail: {
          ...detail,
          ...typeConfig[detail.type]
        }
      });
      wx.setNavigationBarTitle({ title: detail.teamName });
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
    wx.showModal({
      title: '确认加入',
      content: '加入后将通过微信服务通知联系你',
      success: (res) => {
        if (res.confirm) {
          wx.showToast({ title: '已报名成功！', icon: 'success' });
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