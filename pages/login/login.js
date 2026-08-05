// pages/login/login.js
// 【2026-08-05 重构 v2.0】简化登录流程
// 设计原则（参考微信官方推荐 + 美团/大众点评）：
// 1. 不强制 wx.getUserProfile（用户拒绝也能用）
// 2. 登录只取 wx.login code → 后端换 openid + token
// 3. 昵称/头像显示默认"微信用户",用户可在 mine 页手动修改
// 4. 登录后: 有 role → mine; 无 role → role-select
// 5. 不再每次都跳 role-select（user.role 已存则跳过）
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
   * 一键登录 - 简化版
   * 1. wx.login 拿 code
   * 2. 调后端 /api/user/login
   * 3. 后端返回 token + user（包含 role）
   * 4. 有 role → switchTab mine
   *    无 role → redirectTo role-select
   */
  onLoginTap() {
    if (!this.data.agreed) {
      return wx.showToast({ title: '请先同意用户协议', icon: 'none' });
    }
    if (this.data.loading) return;
    this.setData({ loading: true });

    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          this.setData({ loading: false });
          return wx.showToast({ title: '微信登录失败', icon: 'none' });
        }

        // 调后端（不传 userInfo,后端给默认昵称）
        api.wxLogin(loginRes.code, null).then(res => {
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

  /**
   * 登录成功后处理
   * 保存 token + userInfo
   * 有 role → mine; 无 role → role-select
   */
  _afterLoginSuccess(user, token) {
    // 保存 token
    wx.setStorageSync('token', token);
    app.globalData.token = token;

    // 保存 userInfo
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
        // 已注册角色 → mine
        wx.switchTab({ url: '/pages/mine/mine' });
      } else {
        // 未注册角色 → role-select
        wx.redirectTo({ url: '/pages/role-select/role-select' });
      }
    }, 800);
  }
});