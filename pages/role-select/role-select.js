// pages/role-select/role-select.js
// 登录后身份选择：先完成微信身份登录，再按身份处理资料/球场登记。
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: { loading: false },

  onLoad() {
    const userInfo = wx.getStorageSync('userInfo') || {};
    const roles = Array.isArray(userInfo.roles) ? userInfo.roles : [];
    if (roles.length > 0) wx.switchTab({ url: '/pages/mine/mine' });
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
      wx.redirectTo({ url: '/pages/mine/court-register' });
      return;
    }
    if (role !== 'user') {
      wx.showToast({ title: '请选择正确的身份', icon: 'none' });
      return;
    }

    this.setData({ loading: true });
    wx.getUserProfile({
      desc: '用于显示您的微信昵称和头像',
      success: async (profileRes) => {
        try {
          const userProfile = profileRes?.userInfo;
          if (!userProfile?.nickName) throw new Error('未获取到微信昵称，请重新授权');

          // 授权成功后重新取 code，把真实头像/昵称同步给后端。
          const loginRes = await new Promise((resolve, reject) => {
            wx.login({ success: resolve, fail: reject });
          });
          if (!loginRes?.code) throw new Error('微信登录凭证获取失败');

          const loginResult = await api.wxLogin(loginRes.code, {
            nickName: userProfile.nickName,
            nickname: userProfile.nickName,
            avatarUrl: userProfile.avatarUrl || '',
            gender: userProfile.gender,
            country: userProfile.country,
            province: userProfile.province,
            city: userProfile.city,
            language: userProfile.language
          });
          if (!loginResult || loginResult.code !== 0) {
            throw new Error(loginResult?.message || '微信资料同步失败');
          }

          const loginData = loginResult.data || {};
          const backendUser = loginData.user || {};
          const tokenValue = loginData.accessToken || loginData.token || wx.getStorageSync('token');
          if (!tokenValue) throw new Error('登录成功但未取得登录凭证');

          const oldUser = wx.getStorageSync('userInfo') || {};
          const userInfo = {
            ...oldUser,
            ...backendUser,
            nickName: userProfile.nickName,
            nickname: userProfile.nickName,
            avatarUrl: userProfile.avatarUrl || backendUser.avatarUrl || '',
            authorized: true
          };
          wx.setStorageSync('token', tokenValue);
          wx.setStorageSync('userInfo', userInfo);
          app.globalData.token = tokenValue;
          app.globalData.userInfo = userInfo;
          app.globalData.openid = userInfo.openid || '';

          // 注册个人身份。若服务端提示“已注册”，再拉 profile 做幂等确认，
          // 避免历史账号/旧数据导致用户卡在“注册失败”。
          let roles = Array.isArray(backendUser.roles) ? backendUser.roles : [];
          try {
            const roleResult = await api.registerRole({ role: 'user' });
            if (roleResult?.code === 0) {
              roles = Array.isArray(roleResult.data?.roles) ? roleResult.data.roles : ['user'];
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
          userInfo.roles = roles;
          userInfo.role = 'user';
          wx.setStorageSync('userInfo', userInfo);
          app.globalData.userInfo = userInfo;

          this.setData({ loading: false });
          wx.showToast({ title: '登录成功', icon: 'success' });
          setTimeout(() => wx.switchTab({ url: '/pages/mine/mine' }), 500);
        } catch (err) {
          this.setData({ loading: false });
          console.error('[role-select] personal register error:', err);
          wx.showToast({ title: err?.message || '注册失败，请重试', icon: 'none', duration: 2500 });
        }
      },
      fail: (err) => {
        this.setData({ loading: false });
        console.warn('[role-select] user profile authorization cancelled:', err);
        wx.showToast({ title: '需要授权微信资料才能注册个人用户', icon: 'none', duration: 2200 });
      }
    });
  }
});
