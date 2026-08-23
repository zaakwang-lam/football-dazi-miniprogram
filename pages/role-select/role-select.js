// pages/role-select/role-select.js
// 正式身份选择已收敛到 login 页；本页仅作兼容跳转
Page({
  onLoad() { this._go(); },
  onShow() { this._go(); },
  _go() {
    wx.redirectTo({ url: '/pages/login/login' });
  }
});
