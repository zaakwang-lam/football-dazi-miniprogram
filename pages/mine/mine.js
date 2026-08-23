// pages/mine/mine.js
const app = getApp();

function isDefaultNickname(name) {
  const n = String(name || '').trim();
  return !n || n === '微信用户' || n === '微信昵称';
}
function isProfileComplete(user) {
  if (!user) return false;
  const hasNick = !isDefaultNickname(user.nickname || user.nickName);
  const hasAvatar = !!(user.avatarUrl && String(user.avatarUrl).trim());
  return hasNick && hasAvatar;
}


const api = require('../../utils/api.js');

function normalizeRoles(raw) {
  if (Array.isArray(raw)) return raw.filter(Boolean);
  return [];
}

Page({
  data: {
    userInfo: null,
    unread: 2,
    myTeams: [],
    currentRole: '',
    hasUser: false,
    hasCourt: false,
    needSelectRole: false,
    needAuth: false,
    showProfilePanel: false,
    draftNickname: ''
  },

  onLoad() { this.loadUser(); },
  onShow() { this.loadUser(); },

  async loadMyTeams() {
    try {
      const res = await api.getMyTeams();
      if (res.code === 0) this.setData({ myTeams: res.data?.list || [] });
    } catch (e) {
      this.setData({ myTeams: [] });
    }
  },

  async loadUser() {
    const token = wx.getStorageSync('token');
    const cached = wx.getStorageSync('userInfo');

    if (!token) {
      this.setData({ userInfo: null, hasUser: false, hasCourt: false, currentRole: '', needSelectRole: false, myTeams: [] });
      return;
    }

    if (cached) this.applyUserState(cached);

    try {
      const res = await api.getUserProfile();
      // 用户已删除 / token 失效：清本地，回登录
      if (res.code === 401 || res.code === 404) {
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
        app.globalData.token = '';
        app.globalData.userInfo = null;
        this.setData({ userInfo: null, hasUser: false, hasCourt: false, currentRole: '', needSelectRole: false, myTeams: [] });
        wx.redirectTo({ url: '/pages/login/login' });
        return;
      }
      if (res.code !== 0 || !res.data) {
        const localRoles = normalizeRoles(cached?.roles);
        if (!isProfileComplete(cached || {})) {
          wx.redirectTo({ url: '/pages/login/login' });
        } else if (localRoles.length === 0) {
          wx.redirectTo({ url: '/pages/login/login' });
        }
        return;
      }
      const serverUser = res.data;
      // 【关键】身份只信服务端 roles，禁止用本地旧 roles 覆盖
      const roles = normalizeRoles(serverUser.roles);
      let currentRole = '';
      if (roles.length) {
        currentRole = (serverUser.role && roles.includes(serverUser.role))
          ? serverUser.role
          : roles[0];
      }

      const localAvatar = cached?.avatarUrl || '';
      const serverAvatar = serverUser.avatarUrl || '';
      const avatarUrl = serverAvatar
        || (localAvatar && !/^https?:\/\//i.test(localAvatar) ? localAvatar : '')
        || localAvatar
        || '';

      const merged = {
        ...cached,
        ...serverUser,
        roles,
        role: currentRole,
        registered: roles.length > 0,
        nickName: (serverUser.nickname && serverUser.nickname !== '微信用户') ? serverUser.nickname : (cached?.nickName || cached?.nickname || ''),
        nickname: (serverUser.nickname && serverUser.nickname !== '微信用户') ? serverUser.nickname : (cached?.nickname || cached?.nickName || ''),
        avatarUrl,
        courtInfo: serverUser.court || cached?.courtInfo || null
      };
      wx.setStorageSync('userInfo', merged);
      app.globalData.userInfo = merged;
      this.applyUserState(merged);

      if (!isProfileComplete(merged)) {
        wx.redirectTo({ url: '/pages/login/login' });
        return;
      }

      // 未选身份（含后台重置后）→ 登录页身份步骤
      if (roles.length === 0) {
        wx.redirectTo({ url: '/pages/login/login' });
        return;
      }

      if (roles.includes('user') && currentRole === 'user') this.loadMyTeams();
      else this.setData({ myTeams: [] });
    } catch (e) {
      console.warn('[mine] loadUser error:', e);
      if (token && !isProfileComplete(cached || {})) {
        wx.redirectTo({ url: '/pages/login/login' });
      } else if (token && normalizeRoles(cached?.roles).length === 0) {
        wx.redirectTo({ url: '/pages/login/login' });
      }
    }
  },

  applyUserState(userInfo) {
    const roles = normalizeRoles(userInfo?.roles);
    const currentRole = roles.length
      ? ((userInfo?.role && roles.includes(userInfo.role)) ? userInfo.role : roles[0])
      : '';
    const normalized = userInfo
      ? { ...userInfo, roles, role: currentRole, registered: roles.length > 0 }
      : null;
    this.setData({
      userInfo: normalized,
      hasUser: roles.includes('user'),
      hasCourt: roles.includes('court'),
      currentRole,
      needSelectRole: !!wx.getStorageSync('token') && roles.length === 0,
      draftNickname: normalized?.nickName || normalized?.nickname || ''
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
    if (newRole === 'user') this.loadMyTeams();
    else this.setData({ myTeams: [] });
  },

  onLogin() { wx.navigateTo({ url: '/pages/login/login' }); },
  onSelectRolePage() { wx.navigateTo({ url: '/pages/role-select/role-select' }); },

  onAvatarTap() {
    if (!this.data.userInfo || !this.data.currentRole) return this.onLogin();
    this.setData({ showProfilePanel: true, draftNickname: this.data.userInfo.nickName || this.data.userInfo.nickname || '' });
  },
  onCloseProfilePanel() { this.setData({ showProfilePanel: false }); },

  onChooseWechatAvatar(e) {
    const localPath = e.detail?.avatarUrl;
    if (!localPath) return wx.showToast({ title: '未获取到头像', icon: 'none' });
    this._previewAndUploadAvatar(localPath);
  },

  onChooseLocalAvatar() {
    wx.chooseMedia({
      count: 1, mediaType: ['image'], sourceType: ['album', 'camera'], sizeType: ['compressed'],
      success: (chooseRes) => {
        const tempPath = chooseRes.tempFiles?.[0]?.tempFilePath;
        if (!tempPath) return wx.showToast({ title: '未选择图片', icon: 'none' });
        this._previewAndUploadAvatar(tempPath);
      },
      fail: () => wx.showToast({ title: '未选择图片', icon: 'none' })
    });
  },

  _previewAndUploadAvatar(localPath) {
    const previewUser = { ...this.data.userInfo, avatarUrl: localPath };
    this.setData({ userInfo: previewUser });
    wx.setStorageSync('userInfo', previewUser);
    app.globalData.userInfo = previewUser;
    this._uploadLocalAvatar(localPath);
  },

  _uploadLocalAvatar(tempPath) {
    wx.showLoading({ title: '上传头像...', mask: true });
    const doUpload = (filePath) => {
      wx.getFileSystemManager().readFile({
        filePath, encoding: 'base64',
        success: async (fileRes) => {
          try {
            const res = await api.request('/api/v1/user/avatar', 'POST', { base64: fileRes.data, mimeType: 'image/jpeg' }, { showLoading: false, silent: true });
            if (res.code !== 0) throw new Error(res.message || '头像上传失败');
            const avatarUrl = res.data?.avatarUrl;
            if (!avatarUrl) throw new Error('服务器未返回头像地址');
            const userInfo = { ...this.data.userInfo, avatarUrl };
            wx.setStorageSync('userInfo', userInfo);
            app.globalData.userInfo = userInfo;
            this.setData({ userInfo, showProfilePanel: false });
            wx.showToast({ title: '头像已更新', icon: 'success' });
          } catch (e) {
            wx.showToast({ title: e.message || '头像上传失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        },
        fail: () => { wx.hideLoading(); wx.showToast({ title: '读取图片失败', icon: 'none' }); }
      });
    };
    wx.compressImage({ src: tempPath, quality: 80, success: (r) => doUpload(r.tempFilePath || tempPath), fail: () => doUpload(tempPath) });
  },

  onDraftNicknameInput(e) { this.setData({ draftNickname: e.detail.value || '' }); },

  async onSaveNickname() {
    const newName = String(this.data.draftNickname || '').trim().slice(0, 20);
    if (!newName) return wx.showToast({ title: '昵称不能为空', icon: 'none' });
    if (newName === '微信用户') return wx.showToast({ title: '请填写真实昵称', icon: 'none' });
    wx.showLoading({ title: '保存中...', mask: true });
    try {
      const res = await api.updateUserProfile({ nickname: newName });
      if (res.code !== 0) throw new Error(res.message || '保存失败');
      const userInfo = { ...this.data.userInfo, nickname: res.data?.nickname || newName, nickName: res.data?.nickname || newName };
      wx.setStorageSync('userInfo', userInfo);
      app.globalData.userInfo = userInfo;
      this.setData({ userInfo, showProfilePanel: false, draftNickname: userInfo.nickName });
      wx.showToast({ title: '昵称已更新', icon: 'success' });
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
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
      const userInfo = { ...current, roles: Array.isArray(res.data?.roles) ? res.data.roles : ['user'], role: 'user', registered: true };
      wx.setStorageSync('userInfo', userInfo);
      app.globalData.userInfo = userInfo;
      this.applyUserState(userInfo);
      wx.showToast({ title: '注册成功', icon: 'success' });
      this.loadUser();
    } catch (e) {
      wx.showToast({ title: e.message || '注册失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
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
      if (type === 'court-info' || type === 'my-courts') return wx.navigateTo({ url: '/pages/mine/my-courts' });
      if (type === 'publish-slot' || type === 'my-slots') return wx.navigateTo({ url: '/pages/mine/publish-slot' });
      if (type === 'court-orders') return wx.navigateTo({ url: '/pages/court-orders/list' });
    }
    if (type === 'order') return wx.navigateTo({ url: '/pages/order/list' });
    wx.showToast({ title: '功能开发中', icon: 'none' });
  },

  onMyTeamTap(e) {
    wx.navigateTo({ url: `/pages/team/detail?id=${e.currentTarget.dataset.id}` });
  },

  onEditNickname() {
    this.setData({ showProfilePanel: true, draftNickname: this.data.userInfo?.nickName || this.data.userInfo?.nickname || '' });
  },

  onLogout() {
    wx.showModal({
      title: '退出登录',
      content: '确定要退出当前账号吗？',
      confirmText: '退出',
      cancelText: '取消',
      confirmColor: '#FF3B30',
      success: (m) => {
        if (!m.confirm) return;
        wx.removeStorageSync('token');
        wx.removeStorageSync('userInfo');
        app.globalData.token = '';
        app.globalData.userInfo = null;
        app.globalData.openid = '';
        this.setData({ userInfo: null, myTeams: [], hasUser: false, hasCourt: false, currentRole: '', needSelectRole: false, showProfilePanel: false });
        wx.showToast({ title: '已退出', icon: 'success' });
        setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 800);
      }
    });
  },

  onShareAppMessage() {
    return { title: '足球搭子 - 广州业余足球平台', path: '/pages/index/index' };
  }
});
