// pages/login/login.js
const api = require('../../utils/api.js');
const app = getApp();

Page({
  data: {
    agreed: false
  },

  onAgreeTap() {
    this.setData({ agreed: !this.data.agreed });
  },

  /**
   * 微信授权登录（生产环境使用）
   */
  onGetUserInfo(e) {
    if (!this.data.agreed) {
      return wx.showToast({ title: '请先同意用户协议', icon: 'none' });
    }
    if (!e.detail.userInfo) {
      return wx.showToast({ title: '需要您的授权才能登录', icon: 'none' });
    }

    wx.showLoading({ title: '登录中...' });

    // 1. 调 wx.login 拿 code
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          wx.hideLoading();
          return wx.showToast({ title: '微信登录失败', icon: 'none' });
        }

        // 2. 调用后端登录接口
        api.wxLogin(loginRes.code, e.detail.userInfo).then(res => {
          wx.hideLoading();
          if (res.code === 0) {
            // 3. 保存用户信息 + token
            const userInfo = {
              ...res.data.user,
              nickName: e.detail.userInfo.nickName || res.data.user.nickname,
              avatarUrl: e.detail.userInfo.avatarUrl || res.data.user.avatarUrl
            };
            wx.setStorageSync('userInfo', userInfo);
            wx.setStorageSync('token', res.data.accessToken);
            app.globalData.userInfo = userInfo;
            app.globalData.token = res.data.accessToken;

            wx.showToast({ title: '登录成功', icon: 'success' });
            setTimeout(() => wx.navigateBack(), 1000);
          }
        }).catch(err => {
          wx.hideLoading();
          console.error('登录失败:', err);
          // 开发环境下的容错：后端未启动时允许 mock 登录
          if (err && err.errMsg && err.errMsg.includes('url not in domain list')) {
            wx.showToast({
              title: '请先在开发者工具勾选"不校验合法域名"',
              icon: 'none',
              duration: 3000
            });
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '微信登录失败', icon: 'none' });
      }
    });
  }
});