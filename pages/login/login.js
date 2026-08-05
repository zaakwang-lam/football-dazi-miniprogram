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
   * 微信一键登录（2026-07-30 改用 wx.getUserProfile 新 API）
   * 原因：旧的 open-type="getUserInfo" 已被微信废弃
   */
  onWechatLoginTap() {
    if (!this.data.agreed) {
      return wx.showToast({ title: '请先同意用户协议', icon: 'none' });
    }

    // wx.getUserProfile 必须用户主动点击才会返回真实昵称
    wx.getUserProfile({
      desc: '用于完善会员资料',
      success: (profileRes) => {
        const userProfile = profileRes.userInfo;
        console.log('[login] wx.getUserProfile success, nickName=', userProfile.nickName);

        if (!userProfile || !userProfile.nickName) {
          return wx.showToast({ title: '授权失败，请重试', icon: 'none' });
        }

        this._doWxLogin(userProfile);
      },
      fail: (err) => {
        console.warn('[login] wx.getUserProfile fail:', err);
        wx.showToast({ title: '需要您的授权才能登录', icon: 'none' });
      }
    });
  },

  /**
   * 手机号一键登录（2026-08-05 新增）
   * 复用 button open-type="getPhoneNumber" 拿 phoneCode
   * 后端用 phonenumber.getPhoneNumber API 换真实手机号
   */
  onPhoneLoginTap(e) {
    if (!this.data.agreed) {
      return wx.showToast({ title: '请先同意用户协议', icon: 'none' });
    }

    const { encryptedData, iv, code: phoneCode } = e.detail;
    if (!phoneCode) {
      return wx.showToast({
        title: '未获取到手机号授权，请用微信登录',
        icon: 'none',
        duration: 3000
      });
    }

    // 同时拿 wx.login code
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          return wx.showToast({ title: '微信登录失败', icon: 'none' });
        }
        this._doPhoneLogin(loginRes.code, phoneCode);
      },
      fail: () => {
        wx.showToast({ title: '微信登录失败', icon: 'none' });
      }
    });
  },

  /**
   * 微信登录：调 /api/user/login
   */
  _doWxLogin(userProfile) {
    wx.showLoading({ title: '登录中...' });
    wx.login({
      success: (loginRes) => {
        if (!loginRes.code) {
          wx.hideLoading();
          return wx.showToast({ title: '微信登录失败', icon: 'none' });
        }
        api.wxLogin(loginRes.code, userProfile).then(res => {
          wx.hideLoading();
          if (res.code === 0) {
            this._afterLoginSuccess(res.data.user, res.data.accessToken, userProfile);
          } else {
            wx.showToast({ title: res.message || '登录失败', icon: 'none' });
          }
        }).catch(err => {
          wx.hideLoading();
          console.error(err);
          if (err && err.errMsg && err.errMsg.includes('url not in domain list')) {
            wx.showToast({
              title: '请先在开发者工具勾选"不校验合法域名"',
              icon: 'none',
              duration: 3000
            });
          } else {
            wx.showToast({ title: '网络错误', icon: 'none' });
          }
        });
      },
      fail: () => {
        wx.hideLoading();
        wx.showToast({ title: '微信登录失败', icon: 'none' });
      }
    });
  },

  /**
   * 手机号登录：调 /api/user/login-phone
   */
  _doPhoneLogin(wxCode, phoneCode) {
    wx.showLoading({ title: '登录中...' });
    api.phoneLogin(wxCode, phoneCode).then(res => {
      wx.hideLoading();
      if (res.code === 0) {
        this._afterLoginSuccess(res.data.user, res.data.accessToken, null);
      } else {
        wx.showToast({ title: res.message || '登录失败', icon: 'none' });
      }
    }).catch(err => {
      wx.hideLoading();
      console.error(err);
      wx.showToast({ title: '网络错误', icon: 'none' });
    });
  },

  /**
   * 登录成功后的统一处理
   */
  _afterLoginSuccess(user, token, userProfile) {
    // 保存 token
    wx.setStorageSync('token', token);
    app.globalData.token = token;

    // 保存用户信息（微信登录用 userProfile 优先，手机号登录用后端返回）
    const userInfo = {
      ...user,
      nickName: userProfile?.nickName || user.nickname || `手机用户${user.phone?.slice(-4) || ''}`,
      nickname: userProfile?.nickName || user.nickname || `手机用户${user.phone?.slice(-4) || ''}`,
      avatarUrl: userProfile?.avatarUrl || user.avatarUrl || ''
    };
    wx.setStorageSync('userInfo', userInfo);
    app.globalData.userInfo = userInfo;
    app.globalData.openid = user.openid || '';

    wx.showToast({ title: '登录成功', icon: 'success' });

    // 跳回上一页（mine）
    setTimeout(() => {
      const pages = getCurrentPages();
      if (pages.length > 1) {
        wx.navigateBack();
      } else {
        // 没有上一页，跳转到我的 tab
        wx.switchTab({ url: '/pages/mine/mine' });
      }
    }, 1000);
  }
});