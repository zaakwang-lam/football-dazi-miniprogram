// pages/team/aa.js — 兼容旧路径，跳转到正式 AA 页
Page({
  onLoad(options) {
    const teamId = options.teamId || '';
    const q = teamId ? ('?teamId=' + teamId) : '';
    wx.redirectTo({
      url: '/pages/team/aa/aa' + q,
      fail: () => wx.showToast({ title: 'AA 页面打开失败', icon: 'none' })
    });
  }
});
