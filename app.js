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

    // 仅刷新 token / openid，不自动当成「已选个人身份」
    this.silentLogin();
  },

  /**
   * 静默登录：只拿 openid + token。
   * PRD：身份必须用户手动选择；roles 为空时不得把用户写成个人方。
   */
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

            if (roles.length > 0) {
              // 已选过身份：合并服务端资料
              const role = (user.role && roles.includes(user.role)) ? user.role : roles[0];
              const merged = {
                ...existing,
                ...user,
                roles,
                role,
                nickName: user.nickname || existing.nickName || existing.nickname || '微信用户',
                nickname: user.nickname || existing.nickname || existing.nickName || '微信用户',
                avatarUrl: user.avatarUrl || existing.avatarUrl || ''
              };
              wx.setStorageSync('userInfo', merged);
              this.globalData.userInfo = merged;
            } else {
              // 未选身份：只保留 token/openid，不写成「微信用户」完整登录态
              // 昵称/头像留空，强制走登录页完善资料 + 身份选择
              const serverNick = (user?.nickname || '').trim();
              const isDefault = !serverNick || serverNick === '微信用户' || serverNick === '微信昵称';
              const nick = isDefault
                ? ((existing.nickname && existing.nickname !== '微信用户') ? existing.nickname : '')
                : serverNick;
              const shell = {
                id: user?.id || existing.id,
                openid: user?.openid || existing.openid || '',
                nickname: nick,
                nickName: nick,
                avatarUrl: user?.avatarUrl || existing.avatarUrl || '',
                roles: [],
                role: '',
                registered: false
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
