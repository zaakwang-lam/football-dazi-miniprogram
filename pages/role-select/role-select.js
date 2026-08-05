// pages/role-select/role-select.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  onLoad() {
    // 检查用户是否已选过角色（如果已选,直接跳走）
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.role) {
      console.log('[role-select] user already has role, skip to mine');
      wx.switchTab({ url: '/pages/mine/mine' });
    }
  },

  async onSelectRole(e) {
    const role = e.currentTarget.dataset.role;
    console.log('[role-select] onSelectRole, role=', role);

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

      console.log('[role-select] registerRole res=', res);

      // 【2026-08-05 修复】res.code === 0 才算成功
      // res.code === 400 + message 包含"已注册" → 提示后跳 mine
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
        // 【修复】不再显示"网络错误",直接显示后端错误信息
        wx.showToast({
          title: res.message || '注册失败',
          icon: 'none',
          duration: 2000
        });
        // 如果是"已注册"类错误,1.5s 后自动跳 mine
        if (res.message && (
          res.message.includes('已注册') ||
          res.message.includes('已选择') ||
          res.code === 400
        )) {
          setTimeout(() => {
            wx.switchTab({ url: '/pages/mine/mine' });
          }, 1500);
        }
      }
    } catch (err) {
      wx.hideLoading();
      console.error('[role-select] registerRole catch:', err);
      wx.showToast({
        title: err?.message || '网络错误',
        icon: 'none',
        duration: 2000
      });
    }
  }
});