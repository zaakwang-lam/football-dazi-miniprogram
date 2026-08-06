// pages/login/login.js
// 登录流程：我的 → 微信登录 → 选择身份 → 完成对应注册
const api = require('../../utils/api.js');
const app = getApp();

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

  /**
   * 微信登录：只完成微信身份认证，不提前索取昵称/头像。
   * 后端通过 roles 数组判断用户是否已经完成身份注册：
   * roles=[]          → 首次登录，进入身份选择
   * roles=[user]      → 已注册个人用户
   * roles=[user,court] → 已注册个人+球场方
   */
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
          const roles = Array.isArray(user.roles) ? user.roles : [];
          this._saveLoginState(user, res.data?.accessToken);

          // 不能使用 user.role 判断首次登录，因为后端 users.role 有默认值 user。
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
          wx.showToast({ title: '网络错误，请稍后重试', icon: 'none' });
        }
      },
      fail: (err) => {
        this.setData({ loading: false });
        console.error('[login] wx.login fail:', err);
        wx.showToast({ title: '微信登录失败', icon: 'none' });
      }
    });
  },

  _saveLoginState(user, token) {
    const oldUser = wx.getStorageSync('userInfo') || {};
    const userInfo = {
      ...oldUser,
      ...(user || {}),
      roles: Array.isArray(user?.roles) ? user.roles : [],
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
