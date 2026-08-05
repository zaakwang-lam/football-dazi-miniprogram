// pages/role-select/role-select.js
// 【2026-08-05 v2.0】简化版
// 1. 选个人 → 调 registerRole → 跳 mine
// 2. 选球场方 → 跳 court-register（球场方注册在那里调）
// 3. 如果已注册过 → 自动跳 mine
const app = getApp();
const api = require('../../utils/api.js');

Page({
  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.role) {
      console.log('[role-select] already has role, skip to mine');
      wx.switchTab({ url: '/pages/mine/mine' });
    }
  },

  async onSelectRole(e) {
    const role = e.currentTarget.dataset.role;

    if (role === 'court') {
      wx.redirectTo({ url: '/pages/mine/court-register' });
      return;
    }

    // 个人注册
    wx.showLoading({ title: '注册中...' });
    try {
      const res = await api.registerRole({ role: 'user' });
      wx.hideLoading();

      if (res.code === 0) {
        wx.showToast({ title: '注册成功', icon: 'success' });
        // 更新本地
        const userInfo = wx.getStorageSync('userInfo');
        userInfo.role = 'user';
        userInfo.roles = res.data?.roles || ['user'];
        wx.setStorageSync('userInfo', userInfo);
        app.globalData.userInfo = userInfo;
        setTimeout(() => {
          wx.switchTab({ url: '/pages/mine/mine' });
        }, 800);
      } else {
        // 没成功 - 如果是"已注册"类,直接跳 mine
        wx.showToast({ title: res.message || '注册失败', icon: 'none', duration: 1500 });
        if (res.message && res.message.includes('已注册')) {
          setTimeout(() => {
            wx.switchTab({ url: '/pages/mine/mine' });
          }, 1000);
        }
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  }
});