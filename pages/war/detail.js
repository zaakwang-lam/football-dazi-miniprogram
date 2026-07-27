// pages/war/detail.js - 约战详情（重定向到共享详情页）
Page({
  onLoad(options) {
    const id = options.id || '';
    wx.redirectTo({ url: `/pages/lfg/detail?id=${id}&type=war` });
  }
});