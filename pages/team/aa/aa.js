// pages/team/aa/aa.js — AA 暂关：不走商户号收款
Page({
  onLoad() {
    wx.showModal({
      title: '队费 AA 暂未开放',
      content: '小程序暂无法将队员付款直接打入队长个人零钱，此功能已关闭。',
      showCancel: false,
      success: () => wx.navigateBack({ fail: () => wx.switchTab({ url: '/pages/index/index' }) })
    });
  }
});
