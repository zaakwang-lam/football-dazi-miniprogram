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
    showRoleHint: false,
    showProfilePanel: false,
    draftNickname: ''
  },

  onLoad() { this.loadUser(); },
  onShow() {
    this.loadUser();
    if (wx.getStorageSync('token') && api.hasRole(this.data.userInfo, 'user')) this.loadMyTeams();
    else this.setData({ myTeams: [] });
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
      const roles = serverRoles !== null ? serverRoles : (cachedRoles !== null ? cachedRoles : (serverUser.role ? [serverUser.role] : []));
      let currentRole = serverUser.role && roles.includes(serverUser.role)
        ? serverUser.role
        : (cached?.role && roles.includes(cached.role) ? cached.role : (roles[0] || ''));
      if (!roles.length) currentRole = '';
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
    const roles = Array.isArray(userInfo?.roles) ? userInfo.roles : (userInfo?.role ? [userInfo.role] : []);
    const currentRole = userInfo?.role && roles.includes(userInfo.role) ? userInfo.role : (roles[0] || '');
    const normalized = userInfo ? { ...userInfo, roles, role: currentRole } : null;
    this.setData({
      userInfo: normalized,
      hasUser: roles.includes('user'),
      hasCourt: roles.includes('court'),
      currentRole,
      needAuth: false,
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
  },

  onLogin() { wx.navigateTo({ url: '/pages/login/login' }); },

  /** 点击头像：打开资料面板（chooseAvatar / 相册 / 改昵称） */
  onAvatarTap() {
    if (!this.data.userInfo) return this.onLogin();
    this.setData({
      showProfilePanel: true,
      draftNickname: this.data.userInfo.nickName || this.data.userInfo.nickname || ''
    });
  },

  onCloseProfilePanel() {
    this.setData({ showProfilePanel: false });
  },

  /**
   * 微信官方头像选择器（open-type=chooseAvatar）
   * 不再使用已失效的 getUserProfile 假资料。
   */
  onChooseWechatAvatar(e) {
    const avatarUrl = e.detail?.avatarUrl;
    if (!avatarUrl) {
      return wx.showToast({ title: '未获取到头像', icon: 'none' });
    }
    this._uploadLocalAvatar(avatarUrl);
  },

  /** 从相册/拍摄选择头像 */
  onChooseLocalAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (chooseRes) => {
        const tempPath = chooseRes.tempFiles?.[0]?.tempFilePath;
        if (!tempPath) return wx.showToast({ title: '未选择图片', icon: 'none' });
        this._uploadLocalAvatar(tempPath);
      },
      fail: () => wx.showToast({ title: '未选择图片', icon: 'none' })
    });
  },

  _uploadLocalAvatar(tempPath) {
    wx.showLoading({ title: '上传头像...', mask: true });
    const upload = (filePath) => {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success: async (fileRes) => {
          try {
            const res = await api.request(
              '/api/v1/user/avatar',
              'POST',
              { base64: fileRes.data, mimeType: 'image/jpeg' },
              { loadingText: '保存头像...', showLoading: false, silent: true }
            );
            if (res.code !== 0) throw new Error(res.message || '头像上传失败');
            const avatarUrl = res.data?.avatarUrl;
            if (!avatarUrl) throw new Error('服务器未返回头像地址');
            const saved = await api.updateUserProfile({ avatarUrl });
            if (saved.code !== 0) throw new Error(saved.message || '头像保存失败');
            const savedUrl = saved.data?.avatarUrl || avatarUrl;
            const userInfo = {
              ...this.data.userInfo,
              avatarUrl: savedUrl,
              nickName: this.data.userInfo?.nickName || this.data.userInfo?.nickname || '微信用户',
              nickname: this.data.userInfo?.nickname || this.data.userInfo?.nickName || '微信用户'
            };
            wx.setStorageSync('userInfo', userInfo);
            app.globalData.userInfo = userInfo;
            this.setData({ userInfo, showProfilePanel: false });
            wx.showToast({ title: '头像已更新', icon: 'success' });
          } catch (e) {
            console.error('[mine] avatar upload error:', e);
            wx.showToast({ title: e.message || '头像上传失败', icon: 'none' });
          } finally {
            wx.hideLoading();
          }
        },
        fail: () => {
          wx.hideLoading();
          wx.showToast({ title: '读取图片失败', icon: 'none' });
        }
      });
    };
    wx.compressImage({
      src: tempPath,
      quality: 75,
      success: (r) => upload(r.tempFilePath),
      fail: () => upload(tempPath)
    });
  },

  onDraftNicknameInput(e) {
    this.setData({ draftNickname: e.detail.value || '' });
  },

  async onSaveNickname() {
    const newName = String(this.data.draftNickname || '').trim().slice(0, 20);
    if (!newName) return wx.showToast({ title: '昵称不能为空', icon: 'none' });
    if (newName === '微信用户') {
      return wx.showToast({ title: '请填写真实昵称', icon: 'none' });
    }
    wx.showLoading({ title: '保存中...', mask: true });
    try {
      const res = await api.updateUserProfile({ nickname: newName });
      if (res.code !== 0) throw new Error(res.message || '保存失败');
      const userInfo = {
        ...this.data.userInfo,
        nickname: res.data?.nickname || newName,
        nickName: res.data?.nickname || newName
      };
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
      const userInfo = {
        ...current,
        roles: Array.isArray(res.data?.roles) ? res.data.roles : ['user'],
        role: 'user'
      };
      wx.setStorageSync('userInfo', userInfo);
      app.globalData.userInfo = userInfo;
      this.applyUserState(userInfo);
      wx.showToast({ title: '注册成功', icon: 'success' });
      this.loadUser();
    } catch (e) {
      console.error('[mine] register user error:', e);
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

  onMyTeamTap(e) {
    wx.navigateTo({ url: `/pages/team/detail?id=${e.currentTarget.dataset.id}` });
  },

  onEditNickname() {
    this.setData({
      showProfilePanel: true,
      draftNickname: this.data.userInfo?.nickName || this.data.userInfo?.nickname || ''
    });
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
        this.setData({
          userInfo: null,
          myTeams: [],
          needAuth: false,
          hasUser: false,
          hasCourt: false,
          currentRole: '',
          showProfilePanel: false
        });
        wx.showToast({ title: '已退出', icon: 'success' });
        setTimeout(() => wx.navigateTo({ url: '/pages/login/login' }), 800);
      }
    });
  },

  onShareAppMessage() {
    return { title: '足球搭子 - 广州业余足球平台', path: '/pages/index/index' };
  }
});
