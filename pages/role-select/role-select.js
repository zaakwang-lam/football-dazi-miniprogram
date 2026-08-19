// pages/role-select/role-select.js
const api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    loading: false
  },

  onSelectRole(e) {
    const role = e.currentTarget.dataset.role;
    if (role === 'court') {
      return wx.navigateTo({ url: '/pages/mine/court-register' });
    }
    if (role === 'user') {
      this.registerPersonal();
    }
  },

  async registerPersonal() {
    if (this.data.loading) return;
    if (!wx.getStorageSync('token')) {
      wx.showToast({ title: '登录状态已失效，请重新登录', icon: 'none' });
      return setTimeout(() => wx.redirectTo({ url: '/pages/login/login' }), 700);
    }
    this.setData({ loading: true });
    try {
      wx.showLoading({ title: '注册中...' });
      let roles = ['user'];
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
        nickName: oldUser.nickName || oldUser.nickname || '',
        nickname: oldUser.nickname || oldUser.nickName || ''
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
