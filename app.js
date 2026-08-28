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
    this.probeBackend();
  },

  probeBackend() {
    wx.request({
      url: this.globalData.apiBase + '/api/v1/meta',
      method: 'GET',
      timeout: 10000,
      success: (res) => {
        const data = (res.data && res.data.data) || {};
        this.globalData.apiReachable = true;
        this.globalData.serverWxAppId = data.wxAppId || '';
        if (data.wxAppId && data.wxAppId !== this.globalData.wxAppId) {
          console.warn('[probeBackend] 服务器 AppID 与小程序不一致', data.wxAppId, this.globalData.wxAppId);
        }
      },
      fail: (err) => {
        this.globalData.apiReachable = false;
        const errMsg = String((err && err.errMsg) || '');
        console.warn('[probeBackend] fail:', errMsg);
        if (/url not in domain list|not in domain/i.test(errMsg) && !this.globalData._domainAlerted) {
          this.globalData._domainAlerted = true;
          wx.showModal({
            title: '无法连接服务器',
            content: '新主体小程序尚未配置服务器域名。请在微信公众平台 → 开发管理 → 开发设置 → 服务器域名，把 https://footballdazi.cn 加入 request / uploadFile / downloadFile 合法域名。',
            showCancel: false
          });
        }
      }
    });
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
            const errMsg = String((err && err.errMsg) || '');
            console.warn('[silentLogin] fail:', errMsg);
            if (/url not in domain list|not in domain/i.test(errMsg) && !this.globalData._domainAlerted) {
              this.globalData._domainAlerted = true;
              wx.showModal({
                title: '无法连接服务器',
                content: '新主体小程序尚未配置服务器域名。请在微信公众平台把 https://footballdazi.cn 加入 request 合法域名。',
                showCancel: false
              });
            }
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
    wxAppId: 'wxb3f1e355853399c8',
    apiReachable: null,
    serverWxAppId: '',
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
