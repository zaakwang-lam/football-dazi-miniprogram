// pages/court/list.js
const api = require('../../utils/api.js');
const { chooseLocationOnMap, getSavedLocation, formatDistance } = require('../../utils/location.js');

const COLOR_PAIRS = [
  ['#4FACFE', '#00F2FE'],
  ['#1B4FD8', '#4C8DFF'],
  ['#2ECC71', '#58D68D'],
  ['#9B59B6', '#BE7BDB'],
  ['#FFB800', '#FFD75E']
];

Page({
  data: {
    filters: { type: 'all' },
    keyword: '',
    sortBy: 'distance',
    radiusKm: 0,
    radiusLabel: '不限距离',
    locName: '',
    userLat: null,
    userLng: null,
    regions: [],
    regionLabels: [],
    regionIndex: 0,
    regionLabel: '选择省市',
    province: '',
    city: '',
    loading: false,
    _allCourts: [],
    courts: []
  },

  onLoad() {
    this.restoreLocation();
    this.init();
  },

  onShow() {
    if (this.data._allCourts && this.data._allCourts.length) return;
    this.init();
  },

  onPullDownRefresh() {
    this.init().then(() => wx.stopPullDownRefresh());
  },

  restoreLocation() {
    const loc = getSavedLocation();
    if (!loc) return;
    this.setData({
      locName: loc.name || '已选位置',
      userLat: loc.latitude,
      userLng: loc.longitude,
      sortBy: 'distance'
    });
  },

  async init() {
    await this.loadRegions();
    await this.loadData();
  },

  async loadRegions() {
    try {
      const res = await api.getCourtRegions();
      const regions = res.data?.list || [];
      const regionLabels = regions.map(r => `${r.label}（${r.count}）`);
      let index = 0;
      const patch = { regions, regionLabels };
      if (regions.length) {
        const currentKey = `${this.data.province}|${this.data.city}`;
        const keep = regions.findIndex(r => `${r.province}|${r.city}` === currentKey);
        if (keep >= 0) index = keep;
        const selected = regions[index];
        patch.regionIndex = index;
        patch.regionLabel = selected.label;
        patch.province = selected.province;
        patch.city = selected.city;
      } else {
        patch.regionIndex = 0;
        patch.regionLabel = '暂无场地';
        patch.province = '';
        patch.city = '';
      }
      this.setData(patch);
    } catch (e) {
      console.error('加载省市失败:', e);
    }
  },

  onRegionChange(e) {
    const index = Number(e.detail.value) || 0;
    const r = this.data.regions[index];
    if (!r) return;
    this.setData({
      regionIndex: index,
      regionLabel: r.label,
      province: r.province,
      city: r.city
    });
    this.loadData();
  },

  async onLocateTap() {
    const loc = await chooseLocationOnMap();
    if (!loc) return;
    this.setData({
      locName: loc.name || loc.address || '已选位置',
      userLat: loc.latitude,
      userLng: loc.longitude,
      sortBy: 'distance'
    });
    wx.showToast({ title: '已按距离排序', icon: 'none' });
    this.loadData();
  },

  onRadiusTap() {
    wx.showActionSheet({
      itemList: ['不限距离', '3 公里内', '5 公里内', '10 公里内'],
      success: (res) => {
        const map = [0, 3, 5, 10];
        const labels = ['不限距离', '3km内', '5km内', '10km内'];
        const radiusKm = map[res.tapIndex] || 0;
        this.setData({ radiusKm, radiusLabel: labels[res.tapIndex] || '不限距离' });
        if (radiusKm && !this.data.userLat) {
          wx.showToast({ title: '请先点「定位」选位置', icon: 'none' });
          return;
        }
        this.applyFilters();
      }
    });
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
      const params = { pageSize: 500, radiusKm: 200 };
      if (this.data.province) params.province = this.data.province;
      if (this.data.city) params.city = this.data.city;
      if (this.data.keyword) params.keyword = this.data.keyword.trim();
      if (this.data.userLat && this.data.userLng) {
        params.latitude = this.data.userLat;
        params.longitude = this.data.userLng;
      }
      const res = await api.getNearbyCourts(params);
      const allCourts = (res.data?.list || []).map((c, i) => {
        const types = Array.isArray(c.types) && c.types.length ? c.types : (c.type ? [c.type] : []);
        const coverUrl = c.coverUrl || (Array.isArray(c.images) && c.images[0]) || '';
        const km = c.distanceKm != null ? Number(c.distanceKm) : (c.distance != null ? Number(c.distance) : null);
        return {
          ...c, types,
          typeLabel: types.length ? types.join('/') : (c.type || ''),
          coverUrl,
          bgColor1: COLOR_PAIRS[i % COLOR_PAIRS.length][0],
          bgColor2: COLOR_PAIRS[i % COLOR_PAIRS.length][1],
          freeSlots: c.freeSlots || [],
          distanceKm: km,
          distanceText: formatDistance(km)
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
    const radiusKm = Number(this.data.radiusKm) || 0;
    let courts = (this.data._allCourts || []).slice();
    if (type !== 'all') {
      courts = courts.filter(c => {
        if (Array.isArray(c.types) && c.types.length) return c.types.includes(type);
        return c.type === type;
      });
    }
    if (radiusKm > 0) {
      courts = courts.filter(c => c.distanceKm != null && c.distanceKm <= radiusKm);
    }
    if (sortBy === 'price') courts.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    else if (sortBy === 'rating') courts.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    else if (sortBy === 'distance') {
      courts.sort((a, b) => {
        const da = a.distanceKm != null ? a.distanceKm : 9999;
        const db = b.distanceKm != null ? b.distanceKm : 9999;
        return da - db;
      });
    } else courts.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN'));
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
      itemList: ['距离最近', '评分最高', '价格最低', '名称'],
      success: (res) => {
        const map = ['distance', 'rating', 'price', 'name'];
        const sortBy = map[res.tapIndex] || 'distance';
        if (sortBy === 'distance' && !this.data.userLat) {
          wx.showToast({ title: '请先点「定位」选位置', icon: 'none' });
        }
        this.setData({ sortBy });
        this.applyFilters();
      }
    });
  },

  onCourtTap(e) {
    wx.navigateTo({ url: `/pages/court/detail?id=${e.currentTarget.dataset.id}` });
  }
});
