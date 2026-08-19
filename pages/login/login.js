// pages/login/login.js
// 流程：勾选协议 → 微信一键登录 → 选择头像+填写昵称 → 选择身份（个人方/球场方）
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
  const hasAvatar = !!(user.avatarUrl && String(user.avatarUrl).trim());
  return hasNick && hasAvatar;
}

/** 仅 roles 数组判定已选身份；忽略 ENUM role 默认值 */
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
    uploadingAvatar: false
  },

  onShow() {
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('userInfo') || {};
    const roles = normalizeRoles(user.roles);

    if (!token) return;

    // 资料不全 → 完善资料
    if (!isProfileComplete(user)) {
      this.setData({
        step: 'profile',
        avatarUrl: user.avatarUrl || '',
        draftNickname: isDefaultNickname(user.nickname || user.nickName) ? '' : (user.nickname || user.nickName || '')
      });
      return;
    }

    // 资料全但未选身份 → 强制身份选择（修复：此前会停在登录页或误进「我的」当个人）
    if (roles.length === 0) {
      wx.redirectTo({ url: '/pages/role-select/role-select' });
      return;
    }

    // 已选身份 → 回我的
    wx.switchTab({ url: '/pages/mine/mine' });
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

  onLoginTap() {
    if (!this.data.agreed) {
      return wx.showToast({ title: '请先同意用户协议', icon: 'none' });
    }
    if (this.data.loading) return;

    this.setData({ loading: true });

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

          if (!isProfileComplete({
            ...user,
            nickname: user.nickname,
            avatarUrl: user.avatarUrl || (wx.getStorageSync('userInfo') || {}).avatarUrl
          })) {
            this.setData({
              step: 'profile',
              avatarUrl: user.avatarUrl || (wx.getStorageSync('userInfo') || {}).avatarUrl || '',
              draftNickname: isDefaultNickname(user.nickname) ? '' : (user.nickname || '')
            });
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
    const localPath = e.detail?.avatarUrl;
    if (!localPath) return wx.showToast({ title: '未获取到头像', icon: 'none' });
    this.setData({ avatarUrl: localPath });
    this._uploadLocalAvatar(localPath);
  },

  onChooseLocalAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (chooseRes) => {
        const tempPath = chooseRes.tempFiles?.[0]?.tempFilePath;
        if (!tempPath) return wx.showToast({ title: '未选择图片', icon: 'none' });
        this.setData({ avatarUrl: tempPath });
        this._uploadLocalAvatar(tempPath);
      },
      fail: () => wx.showToast({ title: '未选择图片', icon: 'none' })
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
            const avatarUrl = res.data?.avatarUrl;
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
            wx.showToast({ title: e.message || '头像上传失败', icon: 'none' });
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

    wx.compressImage({
      src: tempPath,
      quality: 80,
      success: (r) => doUpload(r.tempFilePath || tempPath),
      fail: () => doUpload(tempPath)
    });
  },

  onNicknameInput(e) {
    this.setData({ draftNickname: e.detail.value || '' });
  },

  async onConfirmProfile() {
    if (this.data.loading || this.data.uploadingAvatar) return;

    const avatarUrl = this.data.avatarUrl || (wx.getStorageSync('userInfo') || {}).avatarUrl || '';
    const nickname = String(this.data.draftNickname || '').trim().slice(0, 20);

    if (!avatarUrl) {
      return wx.showToast({ title: '请选择微信头像', icon: 'none' });
    }
    if (!nickname || isDefaultNickname(nickname)) {
      return wx.showToast({ title: '请填写微信昵称', icon: 'none' });
    }

    this.setData({ loading: true });
    wx.showLoading({ title: '保存中...', mask: true });

    try {
      const res = await api.updateUserProfile({ nickname });
      if (res.code !== 0) throw new Error(res.message || '保存失败');

      const savedNick = res.data?.nickname || nickname;
      const prev = wx.getStorageSync('userInfo') || {};
      // 身份只认 roles，资料接口返回的 role 字符串不自动视为已选身份
      const roles = normalizeRoles(res.data?.roles != null ? res.data.roles : prev.roles);
      const userInfo = {
        ...prev,
        nickname: savedNick,
        nickName: savedNick,
        avatarUrl: res.data?.avatarUrl || avatarUrl,
        roles,
        role: roles.length ? (roles.includes(prev.role) ? prev.role : roles[0]) : '',
        registered: roles.length > 0
      };
      wx.setStorageSync('userInfo', userInfo);
      app.globalData.userInfo = userInfo;

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
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    }
  },

  _saveLoginState(user, token, roles) {
    const oldUser = wx.getStorageSync('userInfo') || {};
    const safeRoles = normalizeRoles(roles);
    const role = safeRoles.length
      ? ((user?.role && safeRoles.includes(user.role)) ? user.role : safeRoles[0])
      : '';

    const serverNick = user?.nickname || '';
    const nick = isDefaultNickname(serverNick)
      ? (isDefaultNickname(oldUser.nickName || oldUser.nickname) ? '' : (oldUser.nickName || oldUser.nickname || ''))
      : serverNick;

    const userInfo = {
      ...oldUser,
      ...(user || {}),
      roles: safeRoles,
      role,
      registered: safeRoles.length > 0,
      nickName: nick,
      nickname: nick,
      avatarUrl: user?.avatarUrl || oldUser.avatarUrl || ''
    };

    wx.setStorageSync('token', token || '');
    wx.setStorageSync('userInfo', userInfo);
    app.globalData.token = token || '';
    app.globalData.userInfo = userInfo;
    app.globalData.openid = userInfo.openid || '';
  }
});
