// pages/mine/mine.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    userInfo: null,
    unread: 2
  },

  onLoad() {
    this.loadUser();
  },

  onShow() {
    this.loadUser();
  },

  async loadUser() {
    // 先用本地缓存（快速）
    let userInfo = wx.getStorageSync('userInfo');
    if (userInfo) this.setData({ userInfo });

    // 后台异步拉取最新
    if (wx.getStorageSync('token')) {
      try {
        const res = await api.getUserProfile();
        if (res.code === 0 && res.data) {
          const merged = { ...userInfo, ...res.data };
          wx.setStorageSync('userInfo', merged);
          this.setData({ userInfo: merged });
        }
      } catch (e) {
        console.warn('拉取用户信息失败，使用本地缓存:', e);
      }
    }
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  onMenuTap(e) {
    const type = e.currentTarget.dataset.type;
    const map = {
      order: '/pages/order/list',
      team: '/pages/team/team',
      coupon: null,
      wallet: null,
      msg: null,
      cert: null,
      about: null,
      feedback: null
    };
    if (map[type]) {
      wx.navigateTo({ url: map[type] });
    } else {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  },

  onShareAppMessage() {
    return {
      title: '足球搭子 - 广州业余足球平台',
      path: '/pages/index/index'
    };
  }
});