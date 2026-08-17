// pages/court/list.js
const api = require('../../utils/api.js');
const { getCurrentLocation } = require('../../utils/location.js');

const COLOR_PAIRS = [
  ['#4FACFE', '#00F2FE'],
  ['#FF6B00', '#FF8C42'],
  ['#2ECC71', '#58D68D'],
  ['#9B59B6', '#BE7BDB'],
  ['#FFB800', '#FFD75E']
];

Page({
  data: {
    filters: { type: 'all' },
    keyword: '',
    sortBy: 'distance', // distance | price | rating
    userLat: null,
    userLng: null,
    locLabel: '定位中',
    loading: false,
    _allCourts: [],
    courts: []
  },

  onLoad() {
    this.initLocationAndLoad();
  },

  onShow() {
    // 若已有定位则静默刷新列表
    if (this.data.userLat != null) this.loadData();
  },

  onPullDownRefresh() {
    this.initLocationAndLoad().then(() => wx.stopPullDownRefresh());
  },

  async initLocationAndLoad() {
    this.setData({ locLabel: '定位中', loading: true });
    const loc = await getCurrentLocation();
    if (loc) {
      this.setData({
        userLat: loc.latitude,
        userLng: loc.longitude,
        locLabel: '已定位'
      });
    } else {
      this.setData({ locLabel: '重新定位' });
    }
    await this.loadData();
  },

  async onRelocate() {
    this.setData({ locLabel: '定位中' });
    const loc = await getCurrentLocation();
    if (loc) {
      this.setData({
        userLat: loc.latitude,
        userLng: loc.longitude,
        locLabel: '已定位',
        sortBy: 'distance'
      });
      wx.showToast({ title: '定位成功', icon: 'success' });
      await this.loadData();
    } else {
      this.setData({ locLabel: '重新定位' });
    }
  },

  onKeywordInput(e) {
    this.setData({ keyword: e.detail.value || '' });
  },

  onClearKeyword() {
    this.setData({ keyword: '' });
    this.loadData();
  },

  onSearch() {
    this.loadData();
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const params = {
        pageSize: 30,
        radiusKm: 80
      };
      if (this.data.userLat != null && this.data.userLng != null) {
        params.latitude = this.data.userLat;
        params.longitude = this.data.userLng;
      }
      if (this.data.keyword) params.keyword = this.data.keyword.trim();

      const res = await api.getNearbyCourts(params);
      const allCourts = (res.data?.list || []).map((c, i) => {
        const types = Array.isArray(c.types) && c.types.length ? c.types : (c.type ? [c.type] : []);
        const coverUrl = c.coverUrl || (Array.isArray(c.images) && c.images[0]) || '';
        const dist = c.distanceKm != null ? c.distanceKm : c.distance;
        let distanceText = '';
        if (dist != null && !Number.isNaN(Number(dist))) {
          const d = Number(dist);
          distanceText = d < 1 ? `${Math.round(d * 1000)}m` : `${d.toFixed(1)}km`;
        }
        return {
          ...c,
          types,
          typeLabel: types.length ? types.join('/') : (c.type || ''),
          coverUrl,
          distanceText,
          distanceKm: dist != null ? Number(dist) : null,
          bgColor1: COLOR_PAIRS[i % COLOR_PAIRS.length][0],
          bgColor2: COLOR_PAIRS[i % COLOR_PAIRS.length][1],
          freeSlots: c.freeSlots || []
        };
      });
      this.setData({ _allCourts: allCourts });
      this.applyFilters();
    } catch (e) {
      console.error('加载场地失败:', e);
    } finally {
      this.setData({ loading: false });
    }
  },

  applyFilters() {
    const { type } = this.data.filters;
    const sortBy = this.data.sortBy;
    let courts = (this.data._allCourts || []).slice();
    if (type !== 'all') {
      courts = courts.filter(c => {
        if (Array.isArray(c.types) && c.types.length) return c.types.includes(type);
        return c.type === type;
      });
    }
    if (sortBy === 'distance') {
      courts.sort((a, b) => (a.distanceKm != null ? a.distanceKm : 9999) - (b.distanceKm != null ? b.distanceKm : 9999));
    } else if (sortBy === 'price') {
      courts.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === 'rating') {
      courts.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    }
    this.setData({ courts });
  },

  onFilterTap(e) {
    const key = e.currentTarget.dataset.key;
    const val = e.currentTarget.dataset.val;
    this.setData({ [`filters.${key}`]: val });
    this.applyFilters();
  },

  onSortTap() {
    wx.showActionSheet({
      itemList: ['距离最近', '价格最低', '评分最高'],
      success: (res) => {
        const map = ['distance', 'price', 'rating'];
        this.setData({ sortBy: map[res.tapIndex] || 'distance' });
        this.applyFilters();
        wx.showToast({ title: '已应用排序', icon: 'none' });
      }
    });
  },

  onCourtTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/court/detail?id=${id}` });
  }
});
