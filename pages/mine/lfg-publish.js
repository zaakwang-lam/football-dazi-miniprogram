// pages/mine/lfg-publish.js — 兼容旧入口，直接打开「发起凑人」
Page({
  onLoad() {
    wx.redirectTo({
      url: '/pages/lfg/publish',
      fail: () => wx.showToast({ title: '页面打开失败', icon: 'none' })
    });
  }
});
