// pages/mine/mine.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    userInfo: null,
    unread: 2,
    myTeams: []  // 2026-07-28 改：我的球队改为 inline 渲染，不再跳 tab
  },

  onLoad() {
    this.loadUser();
  },

  onShow() {
    this.loadUser();
    if (wx.getStorageSync('token') && this.data.userInfo?.role) {
      this.loadMyTeams();
    }
  },

  // 加载我的球队（2026-07-28 新增）
  async loadMyTeams() {
    try {
      const res = await api.getMyTeams();
      if (res.code === 0) {
        this.setData({ myTeams: res.data?.list || [] });
      }
    } catch (e) {
      console.warn('加载我的球队失败:', e);
      this.setData({ myTeams: [] });
    }
  },

  async loadUser() {
    // 先用本地缓存（快速）
    let userInfo = wx.getStorageSync('userInfo');
    if (userInfo) this.setData({ userInfo });

    // 后台异步拉取最新（含 role / courtId）
    if (wx.getStorageSync('token')) {
      try {
        const res = await api.getUserProfile();
        if (res.code === 0 && res.data) {
          // 兼容：小程序登录返回的字段是 nickName/avatarUrl；后端 userInfo 返回的是 nickname/avatarUrl
          const merged = {
            ...userInfo,
            ...res.data,
            nickName: res.data.nickname || userInfo?.nickName || ''
          };
          wx.setStorageSync('userInfo', merged);
          this.setData({ userInfo: merged });
        }
      } catch (e) {
        console.warn('拉取用户信息失败，使用本地缓存:', e);
      }
    }
  },

  onLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  /**
   * 点击注册分支
   * 个人：直接调 registerRole('user') → 完成注册
   * 球场：跳转到球场信息登记表单
   */
  async onRegisterTap(e) {
    const role = e.currentTarget.dataset.role;

    if (role === 'user') {
      // 个人注册：直接提交
      try {
        wx.showLoading({ title: '注册中...' });
        const res = await api.registerRole({ role: 'user' });
        wx.hideLoading();
        if (res.code === 0) {
          wx.showToast({ title: '注册成功', icon: 'success' });
          // 更新本地 + 刷新
          const userInfo = wx.getStorageSync('userInfo');
          userInfo.role = 'user';
          userInfo.courtId = null;
          wx.setStorageSync('userInfo', userInfo);
          this.loadUser();
        } else {
          wx.showToast({ title: res.message || '注册失败', icon: 'none' });
        }
      } catch (e) {
        wx.hideLoading();
        wx.showToast({ title: '网络错误', icon: 'none' });
        console.error(e);
      }
    } else if (role === 'court') {
      // 球场方：跳转到登记表单
      wx.navigateTo({ url: '/pages/mine/court-register' });
    }
  },

  onMenuTap(e) {
    const type = e.currentTarget.dataset.type;
    const userInfo = this.data.userInfo || {};

    // 个人用户专用
    if (userInfo.role === 'user') {
      if (type === 'my-teams') {
        wx.navigateTo({ url: '/pages/mine/my-teams?type=created' });
        return;
      }
      if (type === 'joined-teams') {
        wx.navigateTo({ url: '/pages/mine/my-teams?type=joined' });
        return;
      }
      if (type === 'create-team') {
        wx.navigateTo({ url: '/pages/mine/lfg-publish' });
        return;
      }
      if (type === 'join-team') {
        // 2026-07-28 改：跳 my-teams?type=browse 浏览所有可加入的组队
        wx.navigateTo({ url: '/pages/mine/my-teams?type=browse' });
        return;
      }
    }

    // 球场方专用
    if (userInfo.role === 'court') {
      if (type === 'my-courts') {
        wx.navigateTo({ url: '/pages/mine/my-courts' });
        return;
      }
      if (type === 'court-info') {
        wx.navigateTo({ url: '/pages/mine/court-info' });
        return;
      }
      if (type === 'publish-slot') {
        wx.navigateTo({ url: '/pages/mine/publish-slot' });
        return;
      }
      if (type === 'my-slots') {
        wx.navigateTo({ url: '/pages/mine/my-slots' });
        return;
      }
    }

    // 通用菜单
    const map = {
      order: '/pages/order/list',
      msg: null,
      about: null
    };
    if (type === 'team') {
      // 2026-07-28 改：我的球队改为 inline 渲染，不再跳 tab
      // 这里不需跳转，页面已显示 myTeams 列表
      wx.showToast({ title: '请向上滚动查看', icon: 'none' });
      return;
    }
    if (map[type]) {
      wx.navigateTo({ url: map[type] });
    } else {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  },

  // 点击我的球队单项 → 跳详情（2026-07-28 新增）
  onMyTeamTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/team/detail?id=${id}` });
  },

  onShareAppMessage() {
    return {
      title: '足球搭子 - 广州业余足球平台',
      path: '/pages/index/index'
    };
  }
});