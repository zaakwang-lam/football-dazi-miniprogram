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
   * 微信授权登录（2026-07-30 改用 wx.getUserProfile 新 API）
   * 原因：旧的 open-type="getUserInfo" 已被微信废弃，e.detail.userInfo 返回的
   *      nickName 可能是默认"微信用户"，导致后续头像/昵称不准确
   */
  onLoginTap() {
    if (!this.data.agreed) {
      return wx.showToast({ title: '请先同意用户协议', icon: 'none' });
    }

    // 新 API：wx.getUserProfile 必须用户主动点击才会返回真实昵称
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (profileRes) => {
        const userProfile = profileRes.userInfo;  // { nickName, avatarUrl, gender }
        console.log('[login] wx.getUserProfile success, nickName=', userProfile.nickName);

        if (!userProfile || !userProfile.nickName) {
          return wx.showToast({ title: '授权失败，请重试', icon: 'none' });
        }

        wx.showLoading({ title: '登录中...' });

        // 调 wx.login 拿 code
        wx.login({
          success: (loginRes) => {
            if (!loginRes.code) {
              wx.hideLoading();
              return wx.showToast({ title: '微信登录失败', icon: 'none' });
            }

            // 2. 调用后端登录接口
            api.wxLogin(loginRes.code, userProfile).then(res => {
              wx.hideLoading();
              if (res.code === 0) {
                // 3. 保存用户信息 + token（优先用 wx.getUserProfile 返回的真实昵称）
                const userInfo = {
                  ...res.data.user,
                  nickName: userProfile.nickName || res.data.user.nickname,
                  nickname: userProfile.nickName || res.data.user.nickname,
                  avatarUrl: userProfile.avatarUrl || res.data.user.avatarUrl
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
            return wx.showToast({ title: '微信登录失败', icon: 'none' });
          }
        });
      },
      fail: (err) => {
        console.warn('[login] wx.getUserProfile fail:', err);
        wx.showToast({ title: '需要您的授权才能登录', icon: 'none' });
      }
    });
  }
});