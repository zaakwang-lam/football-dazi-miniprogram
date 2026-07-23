// pages/mine/mine.js
const app = getApp();

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

  loadUser() {
    const userInfo = wx.getStorageSync('userInfo');
    this.setData({ userInfo });
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