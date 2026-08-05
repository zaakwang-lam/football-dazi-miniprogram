// pages/mine/mine.js
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    userInfo: null,
    unread: 2,
    myTeams: [],  // 2026-07-28 改：我的球队改为 inline 渲染，不再跳 tab
    currentRole: 'user',  // 【2026-08-04 #22】当前操作角色
    hasUser: false,       // 【2026-08-04 #22】多身份 - 是否有 user 身份
    hasCourt: false,      // 【2026-08-04 #22】多身份 - 是否有 court 身份
    needAuth: false       // 【2026-08-05】昵称为默认值时为 true,显示"完善资料"按钮
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

    // 后台异步拉取最新（含 role / roles / courtId）
    if (wx.getStorageSync('token')) {
      try {
        const res = await api.getUserProfile();
        if (res.code === 0 && res.data) {
          // 兼容：小程序登录返回的字段是 nickName/avatarUrl；后端 userInfo 返回的是 nickname/avatarUrl
          const merged = {
            ...userInfo,
            ...res.data,
            nickName: res.data.nickname || userInfo?.nickName || '',
            // 【2026-08-04 #22】多身份 roles 数组同步
            roles: res.data.roles || []
          };
          wx.setStorageSync('userInfo', merged);
          // 计算多身份开关
          const roles = merged.roles || [];
          // 【2026-08-05】检测是否需要重新授权（昵称为默认值 / 头像为空）
          const nick = merged.nickName || merged.nickname || '';
          const needAuth = !nick || nick === '微信用户' || nick === '广州老炮' || !merged.avatarUrl;
          this.setData({
            userInfo: merged,
            hasUser: roles.includes('user') || merged.role === 'user',
            hasCourt: roles.includes('court') || merged.role === 'court',
            currentRole: merged.role || 'user',
            needAuth
          });
        }
      } catch (e) {
        console.warn('拉取用户信息失败，使用本地缓存:', e);
      }
    }
  },

  /**
   * 【2026-08-04 #22】切换身份 (本地操作, 不用调接口)
   * roles 数组本身不变, 只是切换当前显示的角色 + 操作上下文
   */
  onSwitchRole() {
    const { userInfo, currentRole, hasUser, hasCourt } = this.data;
    if (!hasUser || !hasCourt) {
      wx.showToast({ title: '当前仅一种身份', icon: 'none' });
      return;
    }

    // 切换逻辑: user ⇄ court
    const newRole = currentRole === 'user' ? 'court' : 'user';
    // 同步 storage
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

  onLogin() {
    wx.navigateTo({ url: '/pages/login/login' });
  },

  /**
   * 【2026-08-05】重新授权（昵称是默认值时手动触发）
   * 直接调 wx.getUserProfile → 拿到真实昵称/头像 → 重写后端 → 刷新本页
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
                  avatarUrl: userProfile.avatarUrl || res.data.user.avatarUrl
                };
                wx.setStorageSync('userInfo', userInfo);
                wx.setStorageSync('token', res.data.accessToken);
                app.globalData.userInfo = userInfo;
                app.globalData.token = res.data.accessToken;
                app.globalData.openid = userInfo.openid || '';
                this.setData({
                  userInfo,
                  needAuth: false
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

  /**
   * 【2026-08-04 #22】同步 storage roles 数组 (court-register 页面调用)
   * court-register 注册成功后回跳 mine, 调用此方法同步状态
   */
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
          userInfo.role = 'user';  // 【兼容期】兑底同步
          // 【2026-08-04 #22】从后端响应取真实 roles
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
      // 球场方：跳转到登记表单
      wx.navigateTo({ url: '/pages/mine/court-register' });
    }
  },

  onMenuTap(e) {
    const type = e.currentTarget.dataset.type;
    const userInfo = this.data.userInfo || {};

    // 个人用户专用 【2026-08-03 改：hasRole 支持多身份】
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
        // 2026-07-28 改：跳 my-teams?type=browse 浏览所有可加入的组队
        wx.navigateTo({ url: '/pages/mine/my-teams?type=browse' });
        return;
      }
    }

    // 球场方专用 【2026-08-03 改：hasRole 支持多身份】
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