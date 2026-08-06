// pages/login/login.js
// 【2026-08-06 PRD v2.0】首次登录必须授权拿微信昵称/头像
// 设计原则（参考 PRD 文档）：
// 1. 首次登录强制调 wx.getUserProfile → 拿昵称+头像
// 2. 拒绝授权：仍然能登录，但显示"点击授权"按钮，用户可主动改昵称
// 3. 登录后逻辑：user.role 存在 → mine; 无 → role-select
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
   * 微信登录 - 强制授权拿昵称
   * 流程：wx.login (code) → wx.getUserProfile (昵称/头像) → 后端 /api/user/login
   */
  onLoginTap() {
    if (!this.data.agreed) {
      return wx.showToast({ title: '请先同意用户协议', icon: 'none' });
    }
    if (this.data.loading) return;
    this.setData({ loading: true });

    // Step 1: 强制 wx.getUserProfile 拿昵称+头像
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (profileRes) => {
        const userProfile = profileRes.userInfo;
        console.log('[login] wx.getUserProfile success, nickName=', userProfile.nickName);

        if (!userProfile || !userProfile.nickName) {
          this.setData({ loading: false });
          return wx.showToast({ title: '授权失败，请重试', icon: 'none' });
        }

        // Step 2: 调 wx.login 拿 code
        wx.login({
          success: (loginRes) => {
            if (!loginRes.code) {
              this.setData({ loading: false });
              return wx.showToast({ title: '微信登录失败', icon: 'none' });
            }

            // Step 3: 调后端登录（带 userInfo）
            api.wxLogin(loginRes.code, userProfile).then(res => {
              this.setData({ loading: false });
              if (res.code === 0) {
                this._afterLoginSuccess(res.data.user, res.data.accessToken);
              } else {
                wx.showToast({ title: res.message || '登录失败', icon: 'none' });
              }
            }).catch(err => {
              this.setData({ loading: false });
              console.error(err);
              wx.showToast({ title: '网络错误', icon: 'none' });
            });
          },
          fail: () => {
            this.setData({ loading: false });
            wx.showToast({ title: '微信登录失败', icon: 'none' });
          }
        });
      },
      fail: (err) => {
        // 用户拒绝授权 → 仍然静默登录（无昵称），之后在 mine 页提示授权
        this.setData({ loading: false });
        console.warn('[login] wx.getUserProfile fail:', err);
        wx.showToast({
          title: '授权后可显示微信昵称',
          icon: 'none',
          duration: 1500
        });
        // 仍然静默登录
        this._silentLoginWithoutProfile();
      }
    });
  },

  /**
   * 拒绝授权时的静默登录（不带昵称）
   */
  _silentLoginWithoutProfile() {
    if (this.data.loading) return;
    this.setData({ loading: true });
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          this.setData({ loading: false });
          return wx.showToast({ title: '微信登录失败', icon: 'none' });
        }
        api.wxLogin(loginRes.code, null).then(res => {
          this.setData({ loading: false });
          if (res.code === 0) {
            this._afterLoginSuccess(res.data.user, res.data.accessToken);
          } else {
            wx.showToast({ title: res.message || '登录失败', icon: 'none' });
          }
        }).catch(err => {
          this.setData({ loading: false });
          wx.showToast({ title: '网络错误', icon: 'none' });
        });
      },
      fail: () => {
        this.setData({ loading: false });
      }
    });
  },

  /**
   * 登录成功后处理
   */
  _afterLoginSuccess(user, token) {
    // 保存 token
    wx.setStorageSync('token', token);
    app.globalData.token = token;

    // 保存 userInfo（完整保留后端返回的 user）
    // 注意：user 里可能包含 nickname/avatarUrl（如果 wx.getUserProfile 成功）
    const userInfo = {
      ...user,
      nickName: user.nickname || '微信用户',
      nickname: user.nickname || '微信用户',
      avatarUrl: user.avatarUrl || ''
    };
    wx.setStorageSync('userInfo', userInfo);
    app.globalData.userInfo = userInfo;
    app.globalData.openid = user.openid || '';

    wx.showToast({ title: '登录成功', icon: 'success' });

    // 判断跳转
    setTimeout(() => {
      if (user.role) {
        wx.switchTab({ url: '/pages/mine/mine' });
      } else {
        wx.redirectTo({ url: '/pages/role-select/role-select' });
      }
    }, 800);
  }
});