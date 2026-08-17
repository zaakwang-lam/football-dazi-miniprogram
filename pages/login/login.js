// pages/login/login.js
const api = require('../../utils/api.js');
const app = getApp();

// 与后端 TEST_LOGIN_SECRET 默认值一致（可在后端改环境变量）
const TEST_LOGIN_SECRET = 'football-audit-2026';

Page({
  data: {
    agreed: false,
    loading: false
  },

  onAgreeTap() {
    this.setData({ agreed: !this.data.agreed });
  },

  onAgreementTap() {
    wx.navigateTo({ url: '/pages/agreement/user-agreement' });
  },

  onPrivacyTap() {
    wx.navigateTo({ url: '/pages/agreement/privacy-policy' });
  },

  onLoginTap() {
    if (!this.data.agreed) {
      return wx.showToast({ title: '请先同意用户协议', icon: 'none' });
    }
    if (this.data.loading) return;

    this.setData({ loading: true });

    wx.login({
      success: async (loginRes) => {
        if (!loginRes.code) {
          this.setData({ loading: false });
          return wx.showToast({ title: '微信登录失败', icon: 'none' });
        }

        try {
          const res = await api.wxLogin(loginRes.code, null);
          this.setData({ loading: false });

          if (res.code !== 0) {
            return wx.showToast({ title: res.message || '登录失败', icon: 'none' });
          }

          const user = res.data?.user || {};
          const roles = Array.isArray(user.roles) ? user.roles.filter(Boolean) : [];
          this._saveLoginState(user, res.data?.accessToken, roles);

          if (roles.length === 0) {
            wx.redirectTo({ url: '/pages/role-select/role-select' });
            return;
          }

          wx.showToast({ title: '登录成功', icon: 'success' });
          setTimeout(() => {
            wx.switchTab({ url: '/pages/mine/mine' });
          }, 500);
        } catch (err) {
          this.setData({ loading: false });
          console.error('[login] wx login error:', err);
          wx.showToast({ title: err.message || '网络错误，请稍后重试', icon: 'none' });
        }
      },
      fail: (err) => {
        this.setData({ loading: false });
        console.error('[login] wx.login fail:', err);
        wx.showToast({ title: '微信登录失败', icon: 'none' });
      }
    });
  },

  /** 审核测试账号：同时具备个人方 + 球场方 */
  async onTestLoginTap() {
    if (!this.data.agreed) {
      return wx.showToast({ title: '请先同意用户协议', icon: 'none' });
    }
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const res = await api.loginTest(TEST_LOGIN_SECRET);
      this.setData({ loading: false });
      if (res.code !== 0) {
        return wx.showToast({ title: res.message || '测试登录失败', icon: 'none' });
      }
      const user = res.data?.user || {};
      const roles = Array.isArray(user.roles) ? user.roles.filter(Boolean) : ['user', 'court'];
      this._saveLoginState(user, res.data?.accessToken, roles);
      wx.showToast({ title: '测试账号已登录', icon: 'success' });
      setTimeout(() => {
        wx.switchTab({ url: '/pages/mine/mine' });
      }, 500);
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({
        title: err.message || '测试登录未开启或密钥错误',
        icon: 'none',
        duration: 2500
      });
    }
  },

  _saveLoginState(user, token, roles) {
    const oldUser = wx.getStorageSync('userInfo') || {};
    const safeRoles = Array.isArray(roles) ? roles : [];
    const role = safeRoles.length
      ? ((user?.role && safeRoles.includes(user.role)) ? user.role : safeRoles[0])
      : '';

    const userInfo = {
      ...oldUser,
      ...(user || {}),
      roles: safeRoles,
      role,
      registered: safeRoles.length > 0,
      nickName: user?.nickname || oldUser.nickName || '微信用户',
      nickname: user?.nickname || oldUser.nickname || '微信用户',
      avatarUrl: user?.avatarUrl || oldUser.avatarUrl || ''
    };

    wx.setStorageSync('token', token || '');
    wx.setStorageSync('userInfo', userInfo);
    app.globalData.token = token || '';
    app.globalData.userInfo = userInfo;
    app.globalData.openid = userInfo.openid || '';
  }
});
