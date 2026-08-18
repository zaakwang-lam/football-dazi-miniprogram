// pages/nearby/nearby.js — 不用 getLocation，默认广州中心；可地图选点刷新距离
const api = require('../../utils/api.js');
const { chooseLocationOnMap, DEFAULT_GUANGZHOU } = require('../../utils/location.js');

Page({
  data: {
    userLocation: {
      latitude: DEFAULT_GUANGZHOU.latitude,
      longitude: DEFAULT_GUANGZHOU.longitude
    },
    locLabel: '广州（默认）',
    courts: [],
    filterType: 'all'
  },

  onLoad() {
    this.loadCourts(DEFAULT_GUANGZHOU.longitude, DEFAULT_GUANGZHOU.latitude);
  },

  onPullDownRefresh() {
    const loc = this.data.userLocation;
    this.loadCourts(loc?.longitude, loc?.latitude).then(() => wx.stopPullDownRefresh());
  },

  async onPickLocation() {
    const loc = await chooseLocationOnMap();
    if (!loc) return;
    this.setData({
      userLocation: {
        latitude: loc.latitude,
        longitude: loc.longitude
      },
      locLabel: loc.name || loc.address || '已选位置'
    });
    this.loadCourts(loc.longitude, loc.latitude);
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
    this.onPickLocation();
  }
});
