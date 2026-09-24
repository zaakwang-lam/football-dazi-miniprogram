// pages/team/aa.js — AA 暂关
Page({
  onLoad() {
    wx.showToast({ title: '队费 AA 暂未开放', icon: 'none' });
    setTimeout(() => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) }), 600);
  }
});
