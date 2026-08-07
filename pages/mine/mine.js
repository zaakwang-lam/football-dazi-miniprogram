// pages/mine/mine.js
// “我的”统一用户态：roles = 已注册身份，role = 当前使用身份。
const app = getApp();
const api = require('../../utils/api.js');

Page({
  data: {
    userInfo: null,
    unread: 2,
    myTeams: [],
    currentRole: '',
    hasUser: false,
    hasCourt: false,
    needAuth: false,
    _authPrompted: true,
    showRoleHint: false
  },

  onLoad() { this.loadUser(); },

  onShow() {
    this.loadUser();
    if (wx.getStorageSync('token') && api.hasRole(this.data.userInfo, 'user')) {
      this.loadMyTeams();
    } else {
      this.setData({ myTeams: [] });
    }
  },

  async loadMyTeams() {
    try {
      const res = await api.getMyTeams();
      if (res.code === 0) this.setData({ myTeams: res.data?.list || [] });
    } catch (e) {
      console.warn('加载我的球队失败:', e);
      this.setData({ myTeams: [] });
    }
  },

  /**
   * 加载用户资料。
   * 重要：不能再用 role=user 判断“已经注册个人用户”。
   * 首次微信登录可能存在默认 role=user，但 roles=[] 才代表尚未选择身份。
   */
  async loadUser() {
    const cached = wx.getStorageSync('userInfo');
    if (cached) this.applyUserState(cached);
    else this.setData({ userInfo: null, hasUser: false, hasCourt: false, currentRole: '', myTeams: [] });

    const token = wx.getStorageSync('token');
    if (!token) return;

    try {
      const res = await api.getUserProfile();
      if (res.code !== 0 || !res.data) return;

      const serverUser = res.data;
      const serverRoles = Array.isArray(serverUser.roles) ? serverUser.roles : null;
      const cachedRoles = Array.isArray(cached?.roles) ? cached.roles : null;
      // 新后端有 roles 时以后端为准；兼容没有 roles 的旧接口。
      const roles = serverRoles !== null
        ? serverRoles
        : (cachedRoles !== null ? cachedRoles : (serverUser.role ? [serverUser.role] : []));

      let currentRole = serverUser.role && roles.includes(serverUser.role)
        ? serverUser.role
        : (cached?.role && roles.includes(cached.role) ? cached.role : (roles[0] || ''));
      if (roles.length === 0) currentRole = '';

      const merged = {
        ...cached,
        ...serverUser,
        roles,
        role: currentRole,
        nickName: serverUser.nickname || cached?.nickName || cached?.nickname || '微信用户',
        nickname: serverUser.nickname || cached?.nickname || cached?.nickName || '微信用户',
        avatarUrl: serverUser.avatarUrl || cached?.avatarUrl || ''
      };

      wx.setStorageSync('userInfo', merged);
      app.globalData.userInfo = merged;
      this.applyUserState(merged);
    } catch (e) {
      console.warn('拉取用户信息失败，使用本地缓存:', e);
    }
  },

  applyUserState(userInfo) {
    const roles = Array.isArray(userInfo?.roles)
      ? userInfo.roles
      : (userInfo?.role ? [userInfo.role] : []);
    const currentRole = userInfo?.role && roles.includes(userInfo.role) ? userInfo.role : (roles[0] || '');
    const normalized = userInfo ? { ...userInfo, roles, role: currentRole } : null;

    this.setData({
      userInfo: normalized,
      hasUser: roles.includes('user'),
      hasCourt: roles.includes('court'),
      currentRole,
      needAuth: false
    });
  },

  onSwitchRole() {
    const { userInfo, currentRole, hasUser, hasCourt } = this.data;
    if (!hasUser || !hasCourt) return wx.showToast({ title: '当前仅一种身份', icon: 'none' });

    const newRole = currentRole === 'user' ? 'court' : 'user';
    const nextUser = { ...userInfo, role: newRole };
    wx.setStorageSync('userInfo', nextUser);
    app.globalData.userInfo = nextUser;
    this.setData({ userInfo: nextUser, currentRole: newRole });
    wx.showToast({ title: `已切换到${newRole === 'user' ? '个人用户' : '球场方'}`, icon: 'success' });
  },

  onLogin() { wx.navigateTo({ url: '/pages/login/login' }); },

  /** 历史账号没有头像/昵称时，重新触发微信资料授权。 */
  onRelogin() {
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: async (profileRes) => {
        const p = profileRes?.userInfo;
        if (!p?.nickName) return wx.showToast({ title: '授权失败，请重试', icon: 'none' });
        wx.showLoading({ title: '更新中...' });
        try {
          const loginRes = await new Promise((resolve, reject) => wx.login({ success: resolve, fail: reject }));
          if (!loginRes?.code) throw new Error('微信登录失败');
          const res = await api.wxLogin(loginRes.code, {
            nickName: p.nickName, nickname: p.nickName, avatarUrl: p.avatarUrl || '',
            gender: p.gender, country: p.country, province: p.province, city: p.city, language: p.language
          });
          if (res.code !== 0) throw new Error(res.message || '资料更新失败');

          const current = wx.getStorageSync('userInfo') || {};
          const serverUser = res.data?.user || {};
          const userInfo = {
            ...current, ...serverUser,
            roles: Array.isArray(serverUser.roles) ? serverUser.roles : (current.roles || []),
            nickName: p.nickName, nickname: p.nickName, avatarUrl: p.avatarUrl || serverUser.avatarUrl || '', authorized: true
          };
          wx.setStorageSync('userInfo', userInfo);
          if (res.data?.accessToken) wx.setStorageSync('token', res.data.accessToken);
          app.globalData.userInfo = userInfo;
          app.globalData.token = res.data?.accessToken || wx.getStorageSync('token');
          app.globalData.openid = userInfo.openid || '';
          this.applyUserState(userInfo);
          wx.showToast({ title: '资料已更新', icon: 'success' });
        } catch (e) {
          console.error('[mine] refresh profile error:', e);
          wx.showToast({ title: e.message || '更新失败', icon: 'none' });
        } finally { wx.hideLoading(); }
      },
      fail: () => wx.showToast({ title: '已取消授权', icon: 'none' })
    });
  },

  syncRolesFromStorage() {
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) this.applyUserState(userInfo);
  },

  async onRegisterTap(e) {
    const role = e.currentTarget.dataset.role;
    if (!wx.getStorageSync('token')) {
      wx.showToast({ title: '登录状态已失效，请重新登录', icon: 'none' });
      return setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 700);
    }
    if (role === 'court') return wx.navigateTo({ url: '/pages/mine/court-register' });
    if (role !== 'user') return;

    try {
      wx.showLoading({ title: '注册中...' });
      const res = await api.registerRole({ role: 'user' });
      if (res.code !== 0) throw new Error(res.message || '注册失败');
      const current = wx.getStorageSync('userInfo') || {};
      const userInfo = { ...current, roles: Array.isArray(res.data?.roles) ? res.data.roles : ['user'], role: 'user' };
      wx.setStorageSync('userInfo', userInfo);
      app.globalData.userInfo = userInfo;
      this.applyUserState(userInfo);
      wx.showToast({ title: '注册成功', icon: 'success' });
      this.loadUser();
    } catch (e) {
      console.error('[mine] register user error:', e);
      wx.showToast({ title: e.message || '注册失败', icon: 'none' });
    } finally { wx.hideLoading(); }
  },

  onMenuTap(e) {
    const type = e.currentTarget.dataset.type;
    const userInfo = this.data.userInfo || {};
    if (api.hasRole(userInfo, 'user')) {
      if (type === 'my-teams') return wx.navigateTo({ url: '/pages/mine/my-teams?type=created' });
      if (type === 'joined-teams') return wx.navigateTo({ url: '/pages/mine/my-teams?type=joined' });
      if (type === 'create-team') return wx.navigateTo({ url: '/pages/mine/lfg-publish' });
      if (type === 'join-team') return wx.navigateTo({ url: '/pages/mine/my-teams?type=browse' });
    }
    if (api.hasRole(userInfo, 'court')) {
      if (type === 'my-courts') return wx.navigateTo({ url: '/pages/mine/my-courts' });
      if (type === 'court-info') return wx.navigateTo({ url: '/pages/mine/court-info' });
      if (type === 'publish-slot') return wx.navigateTo({ url: '/pages/mine/publish-slot' });
      if (type === 'my-slots') return wx.navigateTo({ url: '/pages/mine/my-slots' });
    }
    const map = { order: '/pages/order/list', msg: null, about: null };
    if (type === 'team') return wx.showToast({ title: '请向上滚动查看', icon: 'none' });
    if (map[type]) return wx.navigateTo({ url: map[type] });
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onMyTeamTap(e) { wx.navigateTo({ url: `/pages/team/detail?id=${e.currentTarget.dataset.id}` }); },

  onEditNickname() {
    wx.showModal({
      title: '修改昵称', editable: true, placeholderText: '请输入新昵称(最多20字)', content: '', confirmText: '保存', cancelText: '取消',
      success: async (m) => {
        if (!m.confirm || !m.content) return;
        const newName = m.content.trim().slice(0, 20);
        if (!newName) return wx.showToast({ title: '昵称不能为空', icon: 'none' });
        wx.showLoading({ title: '保存中...' });
        try {
          const res = await api.updateUserProfile({ nickname: newName });
          if (res.code !== 0) throw new Error(res.message || '保存失败');
          const userInfo = { ...this.data.userInfo, nickname: newName, nickName: newName };
          wx.setStorageSync('userInfo', userInfo); app.globalData.userInfo = userInfo; this.setData({ userInfo });
          wx.showToast({ title: '昵称已更新', icon: 'success' });
        } catch (e) { wx.showToast({ title: e.message || '保存失败', icon: 'none' }); }
        finally { wx.hideLoading(); }
      }
    });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录', content: '确定要退出当前账号吗？', confirmText: '退出', cancelText: '取消', confirmColor: '#FF3B30',
      success: (m) => {
        if (!m.confirm) return;
        wx.removeStorageSync('token'); wx.removeStorageSync('userInfo');
        app.globalData.token = ''; app.globalData.userInfo = null; app.globalData.openid = '';
        this.setData({ userInfo: null, myTeams: [], needAuth: false, hasUser: false, hasCourt: false, currentRole: '' });
        wx.showToast({ title: '已退出', icon: 'success' });
        setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 800);
      }
    });
  },

  onShareAppMessage() { return { title: '足球搭子 - 广州业余足球平台', path: '/pages/index/index' }; }
});