// pages/role-select/role-select.js
// PRD：登录完善资料后必须手动选择「个人 / 球场方」，禁止默认个人方
const app = getApp();
const api = require('../../utils/api.js');

function normalizeRoles(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((r) => r === 'user' || r === 'court');
}

Page({
  data: { loading: false },

  onLoad() {
    this._guard();
  },

  onShow() {
    this._guard();
  },

  _guard() {
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    const userInfo = wx.getStorageSync('userInfo') || {};
    const roles = normalizeRoles(userInfo.roles);
    // 仅当 roles 明确已选时才离开；不得用 role 字符串默认值跳过
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

    if (role === 'court') {
      // 球场方：去登记球场（registerRole 在提交球场信息时调用）
      wx.redirectTo({ url: '/pages/mine/court-register' });
      return;
    }
    if (role !== 'user') {
      wx.showToast({ title: '请选择正确的身份', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '注册中...', mask: true });
    try {
      let roles = [];
      try {
        const roleResult = await api.registerRole({ role: 'user' });
        if (roleResult?.code === 0) {
          roles = normalizeRoles(roleResult.data?.roles);
          if (!roles.length) roles = ['user'];
        } else {
          throw new Error(roleResult?.message || '注册失败');
        }
      } catch (roleErr) {
        const message = roleErr?.message || '';
        if (!message.includes('已注册') && !message.includes('already')) throw roleErr;
        const profile = await api.getUserProfile();
        const profileRoles = normalizeRoles(profile?.data?.roles);
        if (profileRoles.includes('user')) {
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
