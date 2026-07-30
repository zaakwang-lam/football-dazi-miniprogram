// app.js
App({
  onLaunch() {
    // 启动时获取本地缓存的用户信息 + token
    const userInfo = wx.getStorageSync('userInfo');
    const token = wx.getStorageSync('token');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
    if (token) {
      this.globalData.token = token;
    }

    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    this.globalData.navBarHeight = (systemInfo.statusBarHeight || 20) + 44;

    // 后台静默获取 openid（不需要用户授权，仅 wx.login）
    this.silentLogin();
  },

  /**
   * 静默登录（拿 openid 缓存到 globalData，调用支付时用）
   */
  silentLogin() {
    // 2026-07-30 修复：token 默认 2h 过期 → silentLogin 重新拿 token，避免需要鉴权的请求 401
    // 检查本地 token 是否在有效期
    const existingToken = wx.getStorageSync('token');
    if (existingToken && this.globalData.openid) return;
    wx.login({
      success: (res) => {
        if (!res.code) return;
        this.globalData.wxCode = res.code;
        wx.request({
          url: this.globalData.apiBase + '/api/user/login',
          method: 'POST',
          data: { code: res.code },  // 不传 userInfo → 后端只拿 openid，不覆盖昵称
          success: (loginRes) => {
            if (loginRes.data?.code === 0) {
              const { accessToken, user } = loginRes.data.data;
              this.globalData.openid = user.openid || '';
              this.globalData.token = accessToken;
              wx.setStorageSync('token', accessToken);
              // 只在没有 userInfo 时才用后端返回的（避免覆盖 wx.getUserProfile 的真实昵称）
              if (!wx.getStorageSync('userInfo')) {
                wx.setStorageSync('userInfo', user);
                this.globalData.userInfo = user;
              }
              console.log('[silentLogin] token refreshed, userId=', user.id);
            }
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
    openid: '',          // 微信 openid（用于支付）
    wxCode: '',          // 临时 wx.login code
    systemInfo: null,
    navBarHeight: 64,
    apiBase: 'https://intelligent-emails-supporters-tribunal.trycloudflare.com',  // 与 utils/api.js 一致（Cloudflare Tunnel HTTPS 临时域名）
    city: '广州',
    // 兼容旧代码（部分页面可能仍引用）
    mockData: {}
  },

  // 通用请求方法
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