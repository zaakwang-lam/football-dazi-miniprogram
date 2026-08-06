// pages/role-select/role-select.js
// 登录后身份选择：先完成微信身份登录，再按身份处理资料/球场登记。
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    loading: false
  },

  onLoad() {
    // 关键修复：不能用 userInfo.role 判断是否已注册。
    // 后端 users.role 有默认值 user，首次微信登录时也可能存在 role=user，
    // 但 roles=[] 才代表“尚未完成身份选择”。
    const userInfo = wx.getStorageSync('userInfo') || {};
    const roles = Array.isArray(userInfo.roles) ? userInfo.roles : [];

    if (roles.length > 0) {
      wx.switchTab({ url: '/pages/mine/mine' });
    }
  },

  async onSelectRole(e) {
    const role = e.currentTarget.dataset.role;
    if (this.data.loading) return;

    // 当前登录态必须存在，否则身份注册接口没有 Authorization。
    const token = wx.getStorageSync('token');
    if (!token) {
      wx.showToast({ title: '登录状态已失效，请重新登录', icon: 'none' });
      setTimeout(() => wx.redirectTo({ url: '/pages/login/login' }), 700);
      return;
    }

    if (role === 'court') {
      // 球场方：不要求先授权昵称/头像，直接进入球场资料登记。
      wx.redirectTo({ url: '/pages/mine/court-register' });
      return;
    }

    if (role !== 'user') {
      wx.showToast({ title: '请选择正确的身份', icon: 'none' });
      return;
    }

    // 个人用户：必须由用户点击后调用 wx.getUserProfile。
    // 不能在页面 onLoad/onShow 自动调用，否则微信会拒绝授权。
    this.setData({ loading: true });

    wx.getUserProfile({
      desc: '用于显示您的微信昵称和头像',
      success: async (profileRes) => {
        try {
          const userProfile = profileRes && profileRes.userInfo;
          if (!userProfile || !userProfile.nickName) {
            throw new Error('未获取到微信昵称，请重新授权');
          }

          // 微信资料授权成功后，再用新的 wx.login code 同步资料。
          // 不依赖旧 code，也不依赖客户端自己生成 openid。
          const loginRes = await new Promise((resolve, reject) => {
            wx.login({ success: resolve, fail: reject });
          });

          if (!loginRes || !loginRes.code) {
            throw new Error('微信登录凭证获取失败');
          }

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
          const tokenValue = loginData.accessToken || wx.getStorageSync('token');

          if (!tokenValue) {
            throw new Error('登录成功但未取得登录凭证');
          }

          // 先保存最新微信资料，避免后端只返回基础用户字段时头像/昵称丢失。
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

          // 完成个人身份注册。
          const roleResult = await api.registerRole({ role: 'user' });
          if (!roleResult || roleResult.code !== 0) {
            throw new Error(roleResult?.message || '个人身份注册失败');
          }

          // 以后端最终 roles 为准，不再硬编码 [user]。
          const roles = Array.isArray(roleResult.data?.roles)
            ? roleResult.data.roles
            : ['user'];

          userInfo.roles = roles;
          userInfo.role = 'user';
          wx.setStorageSync('userInfo', userInfo);
          app.globalData.userInfo = userInfo;

          this.setData({ loading: false });
          wx.showToast({ title: '登录成功', icon: 'success' });

          setTimeout(() => {
            wx.switchTab({ url: '/pages/mine/mine' });
          }, 500);
        } catch (err) {
          this.setData({ loading: false });
          console.error('[role-select] personal register error:', err);
          wx.showToast({
            title: err.message || '注册失败，请重试',
            icon: 'none',
            duration: 2200
          });
        }
      },
      fail: (err) => {
        this.setData({ loading: false });
        console.warn('[role-select] user profile authorization cancelled:', err);
        wx.showToast({
          title: '需要授权微信资料才能注册个人用户',
          icon: 'none',
          duration: 2200
        });
      }
    });
  }
});
