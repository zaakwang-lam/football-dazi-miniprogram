// pages/mine/mine.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    userInfo: null,
    unread: 2,
    myTeams: [],
    currentRole: 'user',
    hasUser: false,
    hasCourt: false,
    // 【2026-08-05 改】needAuth 含义变更: true = 昵称是默认微信用户/广州老炮/空
    needAuth: false,
    // 【2026-08-05 改】是否已强制让用户选过角色（不再强制弹窗）
    _authPrompted: true,  // 默认 true，避免重复弹窗
    // 【2026-08-05 新增】用户是否在登录时选择过身份（用于显示提示）
    showRoleHint: false
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

  // 加载我的球队
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

    // 后台异步拉取最新（含 role / roles / courtId）
    if (wx.getStorageSync('token')) {
      try {
        const res = await api.getUserProfile();
        if (res.code === 0 && res.data) {
          const merged = {
            ...userInfo,
            ...res.data,
            nickName: res.data.nickname || userInfo?.nickName || '',
            roles: res.data.roles || []
          };
          wx.setStorageSync('userInfo', merged);

          const roles = merged.roles || [];

          // 【2026-08-05 改】needAuth 检测: nickname 是默认默认值 且 未授权过
          const nick = merged.nickName || merged.nickname || '';
          // 用户登录过的标志（onRelogin / onWechatLoginTap 会设置 authorized=true）
          const isAuthorized = merged.authorized === true;

          // 【重要】如果已经授权过,即使是"微信用户"也认，不再显示"完善资料"按钮
          // 只有授权过 = false 且昵称是默认值时,才显示
          const needAuth = !isAuthorized;

          // 【2026-08-05 新增】检查是否需要显示"请选择身份"提示
          // 用户没选过角色 + 已经登录 → 提示一次（不是强弹窗）
          const showRoleHint = !merged.role && nick && nick.length > 0;

          this.setData({
            userInfo: merged,
            hasUser: roles.includes('user') || merged.role === 'user',
            hasCourt: roles.includes('court') || merged.role === 'court',
            currentRole: merged.role || 'user',
            needAuth,
            showRoleHint
          });

          // 【2026-08-05 改】不再强制弹窗，只在需要时显示轻量提示
          // 如果 needAuth + 未提示过 → 用 showActionSheet 让用户选择去登录或稍后
          if (needAuth && !this.data._authPrompted) {
            this.setData({ _authPrompted: true });
            // 不主动弹模态，避免"重复弹出"问题
            // 用户在 mine.wxml 看到"完善资料"按钮,自行点击即可
          }
        }
      } catch (e) {
        console.warn('拉取用户信息失败，使用本地缓存:', e);
      }
    }
  },

  /**
   * 切换身份
   */
  onSwitchRole() {
    const { userInfo, currentRole, hasUser, hasCourt } = this.data;
    if (!hasUser || !hasCourt) {
      wx.showToast({ title: '当前仅一种身份', icon: 'none' });
      return;
    }

    const newRole = currentRole === 'user' ? 'court' : 'user';
    userInfo.role = newRole;
    wx.setStorageSync('userInfo', userInfo);
    this.setData({
      userInfo,
      currentRole: newRole
    });
    wx.showToast({
      title: `已切换到${newRole === 'user' ? '个人用户' : '球场方'}`,
      icon: 'success'
    });
  },

  /**
   * 跳到登录页（用于完全未登录时）
   */
  onLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  /**
   * 【2026-08-05 改】点击"完善资料"按钮
   * 用户已经登录，只是昵称/头像空 → 重新调 wx.getUserProfile → 更新后端 + 本地
   * 完成后设置 authorized=true,这样下次进入 mine 不会再显示"完善资料"
   */
  onRelogin() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (profileRes) => {
        const userProfile = profileRes.userInfo;
        if (!userProfile || !userProfile.nickName) {
          return wx.showToast({ title: '授权失败，请重试', icon: 'none' });
        }

        wx.showLoading({ title: '更新中...' });
        wx.login({
          success: (loginRes) => {
            if (!loginRes.code) {
              wx.hideLoading();
              return wx.showToast({ title: '微信登录失败', icon: 'none' });
            }
            api.wxLogin(loginRes.code, userProfile).then(res => {
              wx.hideLoading();
              if (res.code === 0) {
                const userInfo = {
                  ...res.data.user,
                  nickName: userProfile.nickName || res.data.user.nickname,
                  nickname: userProfile.nickName || res.data.user.nickname,
                  avatarUrl: userProfile.avatarUrl || res.data.user.avatarUrl,
                  authorized: true  // 【关键】标记已授权
                };
                wx.setStorageSync('userInfo', userInfo);
                wx.setStorageSync('token', res.data.accessToken);
                app.globalData.userInfo = userInfo;
                app.globalData.token = res.data.accessToken;
                app.globalData.openid = userInfo.openid || '';
                this.setData({
                  userInfo,
                  needAuth: false  // 【关键】立即隐藏"完善资料"按钮
                });
                wx.showToast({ title: '资料已更新', icon: 'success' });
              } else {
                wx.showToast({ title: res.message || '更新失败', icon: 'none' });
              }
            }).catch(err => {
              wx.hideLoading();
              wx.showToast({ title: '网络错误', icon: 'none' });
              console.error(err);
            });
          }
        });
      },
      fail: () => {
        wx.showToast({ title: '已取消授权', icon: 'none' });
      }
    });
  },

  syncRolesFromStorage() {
    const userInfo = wx.getStorageSync('userInfo');
    if (!userInfo) return;
    const roles = userInfo.roles || [];
    this.setData({
      userInfo,
      hasUser: roles.includes('user') || userInfo.role === 'user',
      hasCourt: roles.includes('court') || userInfo.role === 'court',
      currentRole: userInfo.role || 'user'
    });
  },

  /**
   * 点击注册分支
   */
  async onRegisterTap(e) {
    const role = e.currentTarget.dataset.role;

    if (role === 'user') {
      try {
        wx.showLoading({ title: '注册中...' });
        const res = await api.registerRole({ role: 'user' });
        wx.hideLoading();
        if (res.code === 0) {
          wx.showToast({ title: '注册成功', icon: 'success' });
          const userInfo = wx.getStorageSync('userInfo');
          userInfo.role = 'user';
          userInfo.roles = res.data?.roles || ['user'];
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
      wx.navigateTo({ url: '/pages/mine/court-register' });
    }
  },

  onMenuTap(e) {
    const type = e.currentTarget.dataset.type;
    const userInfo = this.data.userInfo || {};

    if (api.hasRole(userInfo, 'user')) {
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
        wx.navigateTo({ url: '/pages/mine/my-teams?type=browse' });
        return;
      }
    }

    if (api.hasRole(userInfo, 'court')) {
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

    const map = {
      order: '/pages/order/list',
      msg: null,
      about: null
    };
    if (type === 'team') {
      wx.showToast({ title: '请向上滚动查看', icon: 'none' });
      return;
    }
    if (map[type]) {
      wx.navigateTo({ url: map[type] });
    } else {
      wx.showToast({ title: '功能开发中', icon: 'none' });
    }
  },

  onMyTeamTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/team/detail?id=${id}` });
  },

  /**
   * 【2026-08-05 新增】手动修改昵称
   * 用于微信默认昵称"微信用户"时,用户自己设置一个名字
   */
  onEditNickname() {
    wx.showModal({
      title: '修改昵称',
      editable: true,
      placeholderText: '请输入新昵称(最多20字)',
      content: '',
      confirmText: '保存',
      cancelText: '取消',
      success: async (m) => {
        if (!m.confirm || !m.content) return;
        const newName = m.content.trim().slice(0, 20);
        if (!newName) return wx.showToast({ title: '昵称不能为空', icon: 'none' });

        wx.showLoading({ title: '保存中...' });
        try {
          const res = await api.updateUserProfile({ nickname: newName });
          wx.hideLoading();
          if (res.code === 0) {
            // 更新本地
            const userInfo = { ...this.data.userInfo, nickname: newName, nickName: newName };
            wx.setStorageSync('userInfo', userInfo);
            app.globalData.userInfo = userInfo;
            this.setData({ userInfo });
            wx.showToast({ title: '昵称已更新', icon: 'success' });
          } else {
            wx.showToast({ title: res.message || '保存失败', icon: 'none' });
          }
        } catch (e) {
          wx.hideLoading();
          wx.showToast({ title: '网络错误', icon: 'none' });
        }
      }
    });
  },

  /**
   * 【2026-08-05 新增】退出登录
   * 1. 二次确认
   * 2. 清本地 storage + globalData
   * 3. 跳到 login 页
   */
  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmText: '退出',
      cancelText: '取消',
      confirmColor: '#FF3B30',
      success: (m) => {
        if (!m.confirm) return;

        // 清本地
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
        app.globalData.token = '';
        app.globalData.userInfo = null;
        app.globalData.openid = '';

        // 清页面状态
        this.setData({
          userInfo: null,
          myTeams: [],
          needAuth: false,
          hasUser: false,
          hasCourt: false,
          currentRole: 'user'
        });

        wx.showToast({ title: '已退出', icon: 'success' });

        // 跳到登录页
        setTimeout(() => {
          wx.navigateTo({ url: '/pages/login/login' });
        }, 800);
      }
    });
  },

  onShareAppMessage() {
    return {
      title: '足球搭子 - 广州业余足球平台',
      path: '/pages/index/index'
    };
  }
});