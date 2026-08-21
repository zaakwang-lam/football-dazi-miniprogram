// pages/login/login.js
// 流程：勾选协议 → 微信一键登录 → 选择头像+填写昵称 → 选择身份
// 头像能力对齐 8.18～8.19 可用写法（chooseAvatar + 隐私授权）
const api = require('../../utils/api.js');
const app = getApp();

const TEST_LOGIN_SECRET = 'football-audit-2026';
const ENABLE_TEST_LOGIN = false;

function isDefaultNickname(name) {
  const n = String(name || '').trim();
  return !n || n === '微信用户' || n === '微信昵称';
}

function isProfileComplete(user) {
  if (!user) return false;
  const hasNick = !isDefaultNickname(user.nickname || user.nickName);
  const hasAvatar = !!(user.avatarUrl && String(user.avatarUrl).trim()
    && !/^wxfile:\/\//i.test(user.avatarUrl)
    && !/^http:\/\/tmp\//i.test(user.avatarUrl));
  return hasNick && hasAvatar;
}

function normalizeRoles(raw) {
  if (!Array.isArray(raw)) return [];
  return raw.filter((r) => r === 'user' || r === 'court');
}

Page({
  data: {
    agreed: false,
    loading: false,
    showTestLogin: ENABLE_TEST_LOGIN,
    step: 'login',
    avatarUrl: '',
    draftNickname: '',
    uploadingAvatar: false,
    needPrivacy: false
  },

  _editingProfile: false,
  _privacyReady: false,

  onLoad() {
    this._ensurePrivacy();
  },

  onShow() {
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('userInfo') || {};
    const roles = normalizeRoles(user.roles);

    if (!token) {
      if (this.data.step !== 'login') {
        this.setData({ step: 'login' });
      }
      return;
    }

    if (!isProfileComplete(user)) {
      if (this.data.step === 'profile' && this._editingProfile) {
        return;
      }
      const patch = { step: 'profile' };
      if (this.data.step !== 'profile') {
        patch.avatarUrl = user.avatarUrl || this.data.avatarUrl || '';
        patch.draftNickname = isDefaultNickname(user.nickname || user.nickName)
          ? (this.data.draftNickname || '')
          : (user.nickname || user.nickName || '');
      }
      this.setData(patch);
      this._ensurePrivacy();
      return;
    }

    if (roles.length === 0) {
      wx.redirectTo({ url: '/pages/role-select/role-select' });
      return;
    }

    wx.switchTab({ url: '/pages/mine/mine' });
  },

  /** 微信隐私协议：未授权时 chooseAvatar 真机常完全无响应 */
  _ensurePrivacy() {
    if (typeof wx.getPrivacySetting !== 'function') {
      this._privacyReady = true;
      this.setData({ needPrivacy: false });
      return;
    }
    try {
      wx.getPrivacySetting({
        success: (res) => {
          const need = !!(res && res.needAuthorization);
          this.setData({ needPrivacy: need });
          if (!need) {
            this._privacyReady = true;
            return;
          }
          if (typeof wx.requirePrivacyAuthorize === 'function') {
            wx.requirePrivacyAuthorize({
              success: () => {
                this._privacyReady = true;
                this.setData({ needPrivacy: false });
              },
              fail: () => {
                console.warn('[login] privacy authorize fail/cancel');
                this.setData({ needPrivacy: true });
              }
            });
          }
        },
        fail: () => {
          this._privacyReady = true;
          this.setData({ needPrivacy: false });
        }
      });
    } catch (e) {
      this._privacyReady = true;
      this.setData({ needPrivacy: false });
    }
  },

  onAgreePrivacy() {
    this._privacyReady = true;
    this.setData({ needPrivacy: false });
    wx.showToast({ title: '已授权，请再点选微信头像', icon: 'none' });
  },

  onAvatarBtnTap() {
    this._editingProfile = true;
    if (this.data.needPrivacy) {
      this._ensurePrivacy();
      wx.showToast({ title: '请先点击上方同意隐私保护指引', icon: 'none' });
    }
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

  onBackToLogin() {
    this._editingProfile = false;
    wx.removeStorageSync('token');
    wx.removeStorageSync('userInfo');
    app.globalData.token = '';
    app.globalData.userInfo = null;
    this.setData({
      step: 'login',
      agreed: false,
      loading: false,
      avatarUrl: '',
      draftNickname: '',
      uploadingAvatar: false,
      needPrivacy: false
    });
  },

  onLoginTap() {
    if (!this.data.agreed) {
      return wx.showToast({ title: '请先同意用户协议', icon: 'none' });
    }
    if (this.data.loading) return;

    this.setData({ loading: true });
    this._ensurePrivacy();

    wx.login({
      success: async (loginRes) => {
        if (!loginRes.code) {
          this.setData({ loading: false });
          return wx.showToast({ title: '微信登录失败', icon: 'none' });
        }

        try {
          const res = await api.wxLogin(loginRes.code, null);
          this.setData({ loading: false });

          if (res.code !== 0) {
            return wx.showToast({ title: res.message || '登录失败', icon: 'none' });
          }

          const user = res.data?.user || {};
          const roles = normalizeRoles(user.roles);
          this._saveLoginState(user, res.data?.accessToken, roles);

          const mergedForCheck = {
            ...user,
            nickname: user.nickname,
            avatarUrl: user.avatarUrl || (wx.getStorageSync('userInfo') || {}).avatarUrl
          };

          if (!isProfileComplete(mergedForCheck)) {
            this._editingProfile = false;
            this.setData({
              step: 'profile',
              avatarUrl: mergedForCheck.avatarUrl || '',
              draftNickname: isDefaultNickname(user.nickname) ? '' : (user.nickname || '')
            });
            this._ensurePrivacy();
            return;
          }

          if (roles.length === 0) {
            wx.redirectTo({ url: '/pages/role-select/role-select' });
            return;
          }

          wx.showToast({ title: '登录成功', icon: 'success' });
          setTimeout(() => wx.switchTab({ url: '/pages/mine/mine' }), 500);
        } catch (err) {
          this.setData({ loading: false });
          console.error('[login] wx login error:', err);
          wx.showToast({ title: err.message || '网络错误，请稍后重试', icon: 'none' });
        }
      },
      fail: (err) => {
        this.setData({ loading: false });
        console.error('[login] wx.login fail:', err);
        wx.showToast({ title: '微信登录失败', icon: 'none' });
      }
    });
  },

  async onTestLoginTap() {
    if (!ENABLE_TEST_LOGIN) {
      return wx.showToast({ title: '测试入口未开放', icon: 'none' });
    }
    if (!this.data.agreed) {
      return wx.showToast({ title: '请先同意用户协议', icon: 'none' });
    }
    if (this.data.loading) return;
    this.setData({ loading: true });
    try {
      const res = await api.loginTest(TEST_LOGIN_SECRET);
      this.setData({ loading: false });
      if (res.code !== 0) {
        return wx.showToast({ title: res.message || '测试登录失败', icon: 'none' });
      }
      const user = res.data?.user || {};
      const roles = normalizeRoles(user.roles).length
        ? normalizeRoles(user.roles)
        : ['user', 'court'];
      this._saveLoginState(user, res.data?.accessToken, roles);
      wx.showToast({ title: '测试账号已登录', icon: 'success' });
      setTimeout(() => wx.switchTab({ url: '/pages/mine/mine' }), 500);
    } catch (err) {
      this.setData({ loading: false });
      wx.showToast({
        title: err.message || '测试登录未开启或密钥错误',
        icon: 'none',
        duration: 2500
      });
    }
  },

  onChooseWechatAvatar(e) {
    this._editingProfile = true;
    const localPath = e && e.detail && e.detail.avatarUrl;
    if (!localPath) {
      return wx.showToast({ title: '未获取到头像，请重试', icon: 'none' });
    }
    this.setData({ avatarUrl: localPath });
    this._uploadLocalAvatar(localPath);
  },

  onChooseLocalAvatar() {
    this._editingProfile = true;
    this._ensurePrivacy();
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (chooseRes) => {
        const tempPath = chooseRes.tempFiles && chooseRes.tempFiles[0]
          ? chooseRes.tempFiles[0].tempFilePath
          : '';
        if (!tempPath) return wx.showToast({ title: '未选择图片', icon: 'none' });
        this.setData({ avatarUrl: tempPath });
        this._uploadLocalAvatar(tempPath);
      },
      fail: (err) => {
        if (err && err.errMsg && String(err.errMsg).indexOf('cancel') >= 0) return;
        wx.showToast({ title: '无法打开相册，请检查隐私授权', icon: 'none' });
      }
    });
  },

  _uploadLocalAvatar(tempPath) {
    if (this.data.uploadingAvatar) return;
    this.setData({ uploadingAvatar: true });
    wx.showLoading({ title: '上传头像...', mask: true });

    const doUpload = (filePath) => {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success: async (fileRes) => {
          try {
            const res = await api.request(
              '/api/v1/user/avatar',
              'POST',
              { base64: fileRes.data, mimeType: 'image/jpeg' },
              { showLoading: false, silent: true }
            );
            if (res.code !== 0) throw new Error(res.message || '头像上传失败');
            const avatarUrl = res.data && res.data.avatarUrl;
            if (!avatarUrl) throw new Error('服务器未返回头像地址');

            const userInfo = {
              ...(wx.getStorageSync('userInfo') || {}),
              avatarUrl
            };
            wx.setStorageSync('userInfo', userInfo);
            app.globalData.userInfo = userInfo;
            this.setData({ avatarUrl });
            wx.showToast({ title: '头像已设置', icon: 'success' });
          } catch (e) {
            wx.showToast({ title: (e && e.message) || '头像上传失败', icon: 'none' });
          } finally {
            this.setData({ uploadingAvatar: false });
            wx.hideLoading();
          }
        },
        fail: () => {
          this.setData({ uploadingAvatar: false });
          wx.hideLoading();
          wx.showToast({ title: '读取图片失败', icon: 'none' });
        }
      });
    };

    if (wx.compressImage) {
      wx.compressImage({
        src: tempPath,
        quality: 80,
        success: (r) => doUpload((r && r.tempFilePath) || tempPath),
        fail: () => doUpload(tempPath)
      });
    } else {
      doUpload(tempPath);
    }
  },

  onNicknameInput(e) {
    this._editingProfile = true;
    const val = e && e.detail && e.detail.value != null ? String(e.detail.value) : '';
    this.setData({ draftNickname: val });
  },

  onNicknameBlur(e) {
    this._editingProfile = true;
    const val = e && e.detail && e.detail.value != null ? String(e.detail.value) : '';
    if (val) this.setData({ draftNickname: val });
  },

  async onConfirmProfile() {
    if (this.data.loading || this.data.uploadingAvatar) return;

    const avatarUrl = this.data.avatarUrl || (wx.getStorageSync('userInfo') || {}).avatarUrl || '';
    const nickname = String(this.data.draftNickname || '').trim().slice(0, 20);

    if (!avatarUrl) {
      return wx.showToast({ title: '请选择微信头像', icon: 'none' });
    }
    if (/^wxfile:\/\//i.test(avatarUrl) || /^http:\/\/tmp\//i.test(avatarUrl)) {
      return wx.showToast({ title: '头像上传中或失败，请重新选择', icon: 'none' });
    }
    if (!nickname || isDefaultNickname(nickname)) {
      return wx.showToast({ title: '请填写微信昵称', icon: 'none' });
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '保存中...', mask: true });

    try {
      const res = await api.updateUserProfile({ nickname });
      if (res.code !== 0) throw new Error(res.message || '保存失败');

      const savedNick = (res.data && res.data.nickname) || nickname;
      const prev = wx.getStorageSync('userInfo') || {};
      const roles = normalizeRoles(
        res.data && res.data.roles != null ? res.data.roles : prev.roles
      );
      const userInfo = {
        ...prev,
        nickname: savedNick,
        nickName: savedNick,
        avatarUrl: (res.data && res.data.avatarUrl) || avatarUrl,
        roles,
        role: roles.length ? (roles.includes(prev.role) ? prev.role : roles[0]) : '',
        registered: roles.length > 0
      };
      wx.setStorageSync('userInfo', userInfo);
      app.globalData.userInfo = userInfo;

      this._editingProfile = false;
      this.setData({ loading: false });
      wx.hideLoading();

      if (roles.length === 0) {
        wx.redirectTo({ url: '/pages/role-select/role-select' });
      } else {
        wx.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => wx.switchTab({ url: '/pages/mine/mine' }), 500);
      }
    } catch (e) {
      this.setData({ loading: false });
      wx.hideLoading();
      wx.showToast({ title: (e && e.message) || '保存失败', icon: 'none' });
    }
  },

  _saveLoginState(user, token, roles) {
    const oldUser = wx.getStorageSync('userInfo') || {};
    const safeRoles = normalizeRoles(roles);
    const role = safeRoles.length
      ? ((user && user.role && safeRoles.includes(user.role)) ? user.role : safeRoles[0])
      : '';

    const serverNick = (user && user.nickname) || '';
    const nick = isDefaultNickname(serverNick)
      ? (isDefaultNickname(oldUser.nickName || oldUser.nickname)
        ? ''
        : (oldUser.nickName || oldUser.nickname || ''))
      : serverNick;

    const userInfo = {
      ...oldUser,
      ...(user || {}),
      roles: safeRoles,
      role,
      registered: safeRoles.length > 0,
      nickName: nick,
      nickname: nick,
      avatarUrl: (user && user.avatarUrl) || oldUser.avatarUrl || ''
    };

    wx.setStorageSync('token', token || '');
    wx.setStorageSync('userInfo', userInfo);
    app.globalData.token = token || '';
    app.globalData.userInfo = userInfo;
    app.globalData.openid = userInfo.openid || '';
  }
});
