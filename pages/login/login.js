// pages/login/login.js
const api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    agreed: false
  },

  onAgreeTap() {
    this.setData({ agreed: !this.data.agreed });
  },

  // 【2026-08-05 新增】点击《用户协议》可查看
  onAgreementTap() {
    wx.navigateTo({ url: '/pages/agreement/user-agreement' });
  },

  // 【2026-08-05 新增】点击《隐私政策》可查看
  onPrivacyTap() {
    wx.navigateTo({ url: '/pages/agreement/privacy-policy' });
  },

  /**
   * 微信一键登录（2026-08-05 简化 - 只保留微信）
   * 复用 wx.getUserProfile + wx.login 拿 code + userInfo
   */
  onWechatLoginTap() {
    if (!this.data.agreed) {
      return wx.showToast({ title: '请先同意用户协议', icon: 'none' });
    }

    console.log('[login] onWechatLoginTap start');

    // wx.getUserProfile 必须用户主动点击才会返回真实昵称
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (profileRes) => {
        const userProfile = profileRes.userInfo;
        console.log('[login] wx.getUserProfile success, nickName=', userProfile.nickName);

        if (!userProfile || !userProfile.nickName) {
          return wx.showToast({ title: '授权失败，请重试', icon: 'none' });
        }

        this._doWxLogin(userProfile);
      },
      fail: (err) => {
        console.warn('[login] wx.getUserProfile fail:', err);
        // 用户拒绝授权,直接静默登录
        this._doWxLogin(null);
      }
    });
  },

  /**
   * 微信登录：调 /api/user/login
   */
  _doWxLogin(userProfile) {
    wx.showLoading({ title: '登录中...' });
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          wx.hideLoading();
          return wx.showToast({ title: '微信登录失败', icon: 'none' });
        }
        api.wxLogin(loginRes.code, userProfile).then(res => {
          wx.hideLoading();
          if (res.code === 0) {
            this._afterLoginSuccess(res.data.user, res.data.accessToken, userProfile);
          } else {
            wx.showToast({ title: res.message || '登录失败', icon: 'none' });
          }
        }).catch(err => {
          wx.hideLoading();
          console.error(err);
          if (err && err.errMsg && err.errMsg.includes('url not in domain list')) {
            wx.showToast({
              title: '请先在开发者工具勾选"不校验合法域名"',
              icon: 'none',
              duration: 3000
            });
          } else {
            wx.showToast({ title: '网络错误', icon: 'none' });
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '微信登录失败', icon: 'none' });
      }
    });
  },

  /**
   * 登录成功后的统一处理
   * - 保存 token / userInfo
   * - 强制跳转到角色选择页（强制用户选个人 vs 球场方）
   * - 不依赖 navigateBack,直接 switchTab
   */
  _afterLoginSuccess(user, token, userProfile) {
    console.log('[login] _afterLoginSuccess, userId=', user.id, 'role=', user.role);

    // 保存 token
    wx.setStorageSync('token', token);
    app.globalData.token = token;

    // 保存用户信息（微信登录用 userProfile 优先）
    // 【关键】即使微信昵称是"微信用户",也保存,不要默认覆盖
    const userInfo = {
      ...user,
      nickName: userProfile?.nickName || user.nickname || '',
      nickname: userProfile?.nickName || user.nickname || '',
      avatarUrl: userProfile?.avatarUrl || user.avatarUrl || '',
      authorized: !!userProfile
    };
    wx.setStorageSync('userInfo', userInfo);
    app.globalData.userInfo = userInfo;
    app.globalData.openid = user.openid || '';

    wx.showToast({ title: '登录成功', icon: 'success' });

    // 【2026-08-05】统一 redirectTo 到 role-select
    // 选了角色后,onSelectRole 自己 switchTab 到 mine
    setTimeout(() => {
      console.log('[login] redirectTo to role-select, current role=', user.role);
      wx.redirectTo({
        url: '/pages/role-select/role-select',
        fail: () => {
          wx.switchTab({ url: '/pages/mine/mine' });
        }
      });
    }, 800);
  }
});