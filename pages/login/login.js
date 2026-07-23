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

  onGetUserInfo(e) {
    if (!this.data.agreed) {
      return wx.showToast({ title: '请先同意用户协议', icon: 'none' });
    }
    if (!e.detail.userInfo) {
      return wx.showToast({ title: '需要您的授权才能登录', icon: 'none' });
    }

    wx.showLoading({ title: '登录中...' });
    // 模拟登录流程
    api.wxLogin('mock_code').then(res => {
      wx.hideLoading();
      if (res.code === 0) {
        // 合并微信信息
        const userInfo = {
          ...res.data.userInfo,
          nickName: e.detail.userInfo.nickName,
          avatarUrl: e.detail.userInfo.avatarUrl
        };
        wx.setStorageSync('userInfo', userInfo);
        wx.setStorageSync('token', res.data.token);
        app.globalData.userInfo = userInfo;
        app.globalData.token = res.data.token;

        wx.showToast({ title: '登录成功', icon: 'success' });
        setTimeout(() => wx.navigateBack(), 1000);
      }
    });
  }
});