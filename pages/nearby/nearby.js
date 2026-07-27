// pages/nearby/nearby.js
const api = require('../../utils/api.js');

Page({
  data: {
    userLocation: null,
    courts: [],
    filterType: 'all'
  },

  onLoad() {
    this.getLocation();
  },

  onPullDownRefresh() {
    this.getLocation().then(() => wx.stopPullDownRefresh());
  },

  /**
   * 获取用户位置
   * 后续接入腾讯地图 SDK 后，用 GCJ-02 坐标系
   */
  async getLocation() {
    try {
      const res = await new Promise((resolve, reject) => {
        wx.getLocation({
          type: 'gcj02',
          success: resolve,
          fail: reject
        });
      });
      this.setData({
        userLocation: {
          latitude: res.latitude,
          longitude: res.longitude,
          accuracy: res.accuracy
        }
      });
      this.loadCourts(res.longitude, res.latitude);
    } catch (e) {
      console.warn('获取位置失败:', e);
      // 即使定位失败，也加载默认列表（按热度排序）
      this.loadCourts();
    }
  },

  async loadCourts(longitude, latitude) {
    try {
      const params = { type: this.data.filterType };
      if (longitude && latitude) {
        params.longitude = longitude;
        params.latitude = latitude;
        params.radiusKm = 50;
      }
      const res = await api.getNearbyCourts(params);
      if (res.code === 0) {
        this.setData({ courts: res.data.list || [] });
      }
    } catch (e) {
      console.error('加载球场失败:', e);
    }
  },

  onFilterTap(e) {
    const type = e.currentTarget.dataset.type;
    this.setData({ filterType: type });
    const loc = this.data.userLocation;
    this.loadCourts(loc?.longitude, loc?.latitude);
  },

  onCourtTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/court/detail?id=${id}` });
  },

  onRefresh() {
    this.getLocation();
  }
});