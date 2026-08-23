// app.js
App({
  onLaunch() {
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
    if (token) {
      this.globalData.token = token;
    }

    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    this.globalData.navBarHeight = (systemInfo.statusBarHeight || 20) + 44;

    this.silentLogin();
  },

  silentLogin() {
    wx.login({
      success: (res) => {
        if (!res.code) return;
        this.globalData.wxCode = res.code;
        wx.request({
          url: this.globalData.apiBase + '/api/user/login',
          method: 'POST',
          data: { code: res.code },
          success: (loginRes) => {
            if (loginRes.data?.code !== 0) return;
            const { accessToken, user } = loginRes.data.data || {};
            if (!accessToken) return;

            this.globalData.openid = user?.openid || this.globalData.openid || '';
            this.globalData.token = accessToken;
            wx.setStorageSync('token', accessToken);

            const roles = Array.isArray(user?.roles) ? user.roles.filter(Boolean) : [];
            const existing = wx.getStorageSync('userInfo') || {};

            const cleanRoles = Array.isArray(roles)
              ? roles.filter((r) => r === 'user' || r === 'court')
              : [];
            if (cleanRoles.length > 0) {
              const role = (user.role && cleanRoles.includes(user.role)) ? user.role : cleanRoles[0];
              const merged = {
                ...existing,
                ...user,
                roles: cleanRoles,
                role,
                registered: true,
                nickName: user.nickname || existing.nickName || existing.nickname || '',
                nickname: user.nickname || existing.nickname || existing.nickName || '',
                avatarUrl: user.avatarUrl || existing.avatarUrl || ''
              };
              wx.setStorageSync('userInfo', merged);
              this.globalData.userInfo = merged;
            } else {
              // 删号重登：用户 id 变化时不继承旧本地 roles/资料
              const sameUser = existing && user && existing.id && user.id && Number(existing.id) === Number(user.id);
              const serverNick = (user?.nickname || '').trim();
              const isDefault = !serverNick || serverNick === '微信用户' || serverNick === '微信昵称';
              const nick = isDefault
                ? (sameUser && existing.nickname && existing.nickname !== '微信用户' ? existing.nickname : '')
                : serverNick;
              const shell = {
                id: user?.id || '',
                openid: user?.openid || '',
                nickname: nick,
                nickName: nick,
                avatarUrl: (user?.avatarUrl) || (sameUser ? (existing.avatarUrl || '') : '') || '',
                roles: [],
                role: '',
                registered: false,
                courtId: null
              };
              wx.setStorageSync('userInfo', shell);
              this.globalData.userInfo = shell;
            }
            console.log('[silentLogin] token refreshed, roles=', roles);
          },
          fail: (err) => {
            console.warn('[silentLogin] fail:', err);
          }
        });
      }
    });
  },

  globalData: {
    userInfo: null,
    token: '',
    openid: '',
    wxCode: '',
    systemInfo: null,
    navBarHeight: 64,
    apiBase: 'https://footballdazi.cn',
    city: '广州',
    mockData: {}
  },

  request(url, method = 'GET', data = {}) {
    return new Promise((resolve, reject) => {
      wx.request({
        url: this.globalData.apiBase + url,
        method,
        data,
        header: {
          'Authorization': this.globalData.token || ''
        },
        success: (res) => resolve(res.data),
        fail: (err) => reject(err)
      });
    });
  }
});
