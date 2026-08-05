// pages/role-select/role-select.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  async onSelectRole(e) {
    const role = e.currentTarget.dataset.role;
    if (role === 'court') {
      // 球场方：跳到登记表单
      wx.redirectTo({ url: '/pages/mine/court-register' });
      return;
    }

    // 个人：直接注册
    wx.showLoading({ title: '注册中...' });
    try {
      const res = await api.registerRole({ role: 'user' });
      wx.hideLoading();
      if (res.code === 0) {
        wx.showToast({ title: '注册成功', icon: 'success' });
        const userInfo = wx.getStorageSync('userInfo');
        userInfo.role = 'user';
        userInfo.roles = res.data?.roles || ['user'];
        wx.setStorageSync('userInfo', userInfo);
        app.globalData.userInfo = userInfo;
        setTimeout(() => {
          wx.switchTab({ url: '/pages/mine/mine' });
        }, 800);
      } else {
        wx.showToast({ title: res.message || '注册失败', icon: 'none' });
      }
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
    }
  }
});
