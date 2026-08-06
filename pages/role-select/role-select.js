// pages/role-select/role-select.js
// 【2026-08-06】登录后身份选择
// 个人用户：微信授权 → 获取昵称/头像 → 注册个人身份 → 我的
// 球场方：进入球场方资料登记 → 审核流程
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    loading: false
  },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo && userInfo.role) {
      wx.switchTab({ url: '/pages/mine/mine' });
    }
  },

  async onSelectRole(e) {
    const role = e.currentTarget.dataset.role;
    if (this.data.loading) return;

    if (role === 'court') {
      // 球场方不要求个人微信昵称授权，直接进入球场登记。
      wx.redirectTo({ url: '/pages/mine/court-register' });
      return;
    }

    // 个人用户：选择身份后再请求微信个人资料授权
    this.setData({ loading: true });

    wx.getUserProfile({
      desc: '用于显示您的微信昵称和头像',
      success: async (profileRes) => {
        try {
          const userProfile = profileRes.userInfo;
          if (!userProfile || !userProfile.nickName) {
            this.setData({ loading: false });
            return wx.showToast({ title: '未获取到微信资料，请重试', icon: 'none' });
          }

          // 重新获取 code，并将微信资料同步到后端
          const loginRes = await new Promise((resolve, reject) => {
            wx.login({ success: resolve, fail: reject });
          });

          if (!loginRes.code) {
            throw new Error('微信登录 code 获取失败');
          }

          const loginResult = await api.wxLogin(loginRes.code, userProfile);
          if (loginResult.code !== 0) {
            throw new Error(loginResult.message || '微信资料同步失败');
          }

          // 注册个人身份
          const roleResult = await api.registerRole({ role: 'user' });
          if (roleResult.code !== 0) {
            throw new Error(roleResult.message || '个人身份注册失败');
          }

          const backendUser = loginResult.data?.user || {};
          const oldUser = wx.getStorageSync('userInfo') || {};
          const userInfo = {
            ...oldUser,
            ...backendUser,
            nickName: userProfile.nickName,
            nickname: userProfile.nickName,
            avatarUrl: userProfile.avatarUrl || '',
            authorized: true,
            role: 'user',
            roles: roleResult.data?.roles || ['user']
          };

          const token = loginResult.data?.accessToken || wx.getStorageSync('token');
          wx.setStorageSync('token', token);
          wx.setStorageSync('userInfo', userInfo);
          app.globalData.token = token;
          app.globalData.userInfo = userInfo;
          app.globalData.openid = userInfo.openid || '';

          this.setData({ loading: false });
          wx.showToast({ title: '登录成功', icon: 'success' });

          setTimeout(() => {
            wx.switchTab({ url: '/pages/mine/mine' });
          }, 600);
        } catch (err) {
          this.setData({ loading: false });
          console.error('[role-select] personal register error:', err);
          wx.showToast({ title: err.message || '注册失败，请重试', icon: 'none' });
        }
      },
      fail: (err) => {
        this.setData({ loading: false });
        console.warn('[role-select] user profile authorization cancelled:', err);
        wx.showToast({ title: '需要授权微信资料才能注册个人用户', icon: 'none' });
      }
    });
  }
});
