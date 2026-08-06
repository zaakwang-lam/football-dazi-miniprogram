// pages/login/login.js
// 【2026-08-06】“我的”登录流程：微信登录 → 选择身份 → 按身份完成资料
// 1. 点击“微信一键登录”先完成微信身份认证
// 2. 首次登录进入“选择身份”
// 3. 个人用户：选择后调用 wx.getUserProfile 获取昵称/头像，再完成注册
// 4. 球场方：选择后进入球场方注册页
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
   * 微信一键登录
   * 注意：这里不提前索取昵称/头像授权。
   * 登录成功后再让用户选择“个人用户/球场方”，符合“我的 → 微信登录 → 选择身份”的流程。
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
          // 先完成微信身份登录，不索取个人资料授权
          const res = await api.wxLogin(loginRes.code, null);
          this.setData({ loading: false });

          if (res.code !== 0) {
            return wx.showToast({ title: res.message || '登录失败', icon: 'none' });
          }

          this._saveLoginState(res.data.user, res.data.accessToken);

          // 已经选择过身份的用户直接进入“我的”
          if (res.data.user && res.data.user.role) {
            wx.showToast({ title: '登录成功', icon: 'success' });
            setTimeout(() => {
              wx.switchTab({ url: '/pages/mine/mine' });
            }, 500);
            return;
          }

          // 新用户：进入身份选择
          wx.redirectTo({ url: '/pages/role-select/role-select' });
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
    wx.setStorageSync('token', token || '');
    app.globalData.token = token || '';

    const oldUser = wx.getStorageSync('userInfo') || {};
    const userInfo = {
      ...oldUser,
      ...(user || {}),
      nickName: user?.nickname || oldUser.nickName || '微信用户',
      nickname: user?.nickname || oldUser.nickname || '微信用户',
      avatarUrl: user?.avatarUrl || oldUser.avatarUrl || ''
    };

    wx.setStorageSync('userInfo', userInfo);
    app.globalData.userInfo = userInfo;
    app.globalData.openid = userInfo.openid || '';
  }
});
