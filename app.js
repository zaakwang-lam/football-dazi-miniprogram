// app.js
App({
  onLaunch() {
    // 启动时获取本地缓存的用户信息
    const userInfo = wx.getStorageSync('userInfo');
    if (userInfo) {
      this.globalData.userInfo = userInfo;
    }
    // 获取系统信息
    const systemInfo = wx.getSystemInfoSync();
    this.globalData.systemInfo = systemInfo;
    // 自定义导航栏高度
    this.globalData.navBarHeight = (systemInfo.statusBarHeight || 20) + 44;
  },

  globalData: {
    userInfo: null,
    token: '',
    systemInfo: null,
    navBarHeight: 64,
    apiBase: 'https://api.kickgo.example.com',
    city: '广州',
    // 模拟数据 - 实际项目应替换为接口调用
    mockData: {
      courts: [
        { id: 1, name: '天河体育中心', type: '11人', price: 1200, distance: 1.2, rating: 4.8, free: '今晚有空', img: '' },
        { id: 2, name: '番禺五人球场A', type: '5人', price: 280, distance: 3.5, rating: 4.6, free: '周末空闲', img: '' },
        { id: 3, name: '海珠7人制球场', type: '7人', price: 580, distance: 5.2, rating: 4.7, free: '周四可用', img: '' }
      ]
    }
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