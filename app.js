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
    if (this.globalData.openid) return;  // 已获取过
    wx.login({
      success: (res) => {
        if (!res.code) return;
        // 缓存 code 给支付时用（或者直接调后端 code2Session）
        this.globalData.wxCode = res.code;
        // 可选：立即调后端静默登录拿 openid（不需要用户授权）
        wx.request({
          url: 'http://localhost:3000/api/user/login',
          method: 'POST',
          data: { code: res.code },
          success: (loginRes) => {
            if (loginRes.data?.code === 0) {
              this.globalData.openid = loginRes.data.data.openid;
            }
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
    apiBase: 'http://43.136.84.244',  // 后端地址（灰度期用云服务器IP，上线后改HTTPS域名）
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