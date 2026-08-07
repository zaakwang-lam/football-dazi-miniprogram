// pages/role-select/role-select.js
// PRD：微信登录后必须手动选择「个人 / 球场方」
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: { loading: false },

  onLoad() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    const userInfo = wx.getStorageSync('userInfo') || {};
    const roles = Array.isArray(userInfo.roles) ? userInfo.roles.filter(Boolean) : [];
    // 已选过身份才回「我的」；roles 为空必须留在本页
    if (roles.length > 0) {
      wx.switchTab({ url: '/pages/mine/mine' });
    }
  },

  async onSelectRole(e) {
    const role = e.currentTarget.dataset.role;
    if (this.data.loading) return;

    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '登录状态已失效，请重新登录', icon: 'none' });
      setTimeout(() => wx.redirectTo({ url: '/pages/login/login' }), 700);
      return;
    }

    // 球场方：进入球场信息编辑（PRD 第八/九节）
    if (role === 'court') {
      wx.redirectTo({ url: '/pages/mine/court-register' });
      return;
    }
    if (role !== 'user') {
      wx.showToast({ title: '请选择正确的身份', icon: 'none' });
      return;
    }

    // 个人用户：直接完成个人账户创建（PRD 第六节，不强制再弹 getUserProfile）
    this.setData({ loading: true });
    wx.showLoading({ title: '注册中...', mask: true });
    try {
      let roles = [];
      try {
        const roleResult = await api.registerRole({ role: 'user' });
        if (roleResult?.code === 0) {
          roles = Array.isArray(roleResult.data?.roles) ? roleResult.data.roles : ['user'];
        } else {
          throw new Error(roleResult?.message || '注册失败');
        }
      } catch (roleErr) {
        const message = roleErr?.message || '';
        if (!message.includes('已注册') && !message.includes('already')) throw roleErr;
        const profile = await api.getUserProfile();
        const profileRoles = profile?.data?.roles;
        if (Array.isArray(profileRoles) && profileRoles.includes('user')) {
          roles = profileRoles;
        } else {
          throw roleErr;
        }
      }

      if (!roles.includes('user')) roles = [...roles, 'user'];

      const oldUser = wx.getStorageSync('userInfo') || {};
      const userInfo = {
        ...oldUser,
        roles,
        role: 'user',
        registered: true,
        nickName: oldUser.nickName || oldUser.nickname || '微信用户',
        nickname: oldUser.nickname || oldUser.nickName || '微信用户'
      };
      wx.setStorageSync('userInfo', userInfo);
      app.globalData.userInfo = userInfo;

      this.setData({ loading: false });
      wx.hideLoading();
      wx.showToast({ title: '登录成功', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/mine/mine' }), 500);
    } catch (err) {
      this.setData({ loading: false });
      wx.hideLoading();
      console.error('[role-select] personal register error:', err);
      wx.showToast({ title: err?.message || '注册失败，请重试', icon: 'none', duration: 2500 });
    }
  }
});
