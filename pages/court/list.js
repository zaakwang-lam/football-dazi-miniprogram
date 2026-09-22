// pages/court/list.js
const api = require('../../utils/api.js');
const {
  chooseLocationOnMap,
  getSavedLocation,
  getCurrentLocation,
  formatDistance,
  haversineKm,
  openInMaps
} = require('../../utils/location.js');

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
    locating: false,
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
    this.autoLocate();
    this.init();
  },

  onShow() {
    if (this.data._allCourts && this.data._allCourts.length) return;
    this.init();
  },

  onPullDownRefresh() {
    this.autoLocate(true).then(() => this.init()).then(() => wx.stopPullDownRefresh());
  },

  restoreLocation() {
    const loc = getSavedLocation();
    if (!loc) return;
    this.setData({
      locName: loc.name || '当前位置',
      userLat: loc.latitude,
      userLng: loc.longitude,
      sortBy: 'distance'
    });
  },

  async autoLocate(force) {
    this.setData({ locating: true });
    try {
      const loc = await getCurrentLocation({ force: !!force });
      if (!loc) {
        this.setData({ locating: false });
        return;
      }
      this.setData({
        locName: loc.name || '当前位置',
        userLat: loc.latitude,
        userLng: loc.longitude,
        sortBy: 'distance',
        locating: false
      });
      if (this.data._allCourts && this.data._allCourts.length) {
        this.attachDistances();
        this.applyFilters();
      }
    } catch (e) {
      this.setData({ locating: false });
    }
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
    wx.showActionSheet({
      itemList: ['重新定位当前位置', '在地图上选点'],
      success: async (res) => {
        if (res.tapIndex === 0) {
          const loc = await getCurrentLocation({ force: true, askSetting: true });
          if (!loc) return wx.showToast({ title: '定位失败，请检查权限', icon: 'none' });
          this.setData({
            locName: loc.name || '当前位置',
            userLat: loc.latitude,
            userLng: loc.longitude,
            sortBy: 'distance'
          });
          this.loadData();
          return;
        }
        const picked = await chooseLocationOnMap();
        if (!picked) return;
        this.setData({
          locName: picked.name || picked.address || '已选位置',
          userLat: picked.latitude,
          userLng: picked.longitude,
          sortBy: 'distance'
        });
        this.loadData();
      }
    });
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
          wx.showToast({ title: '正在定位，请稍候再筛', icon: 'none' });
          this.autoLocate(true);
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

  attachDistances(list) {
    const src = list || this.data._allCourts || [];
    const lat = this.data.userLat;
    const lng = this.data.userLng;
    return src.map((c) => {
      let km = c.distanceKm;
      if (lat && lng) {
        const local = haversineKm(lat, lng, c.latitude, c.longitude);
        if (local != null) km = local;
      }
      return {
        ...c,
        distanceKm: km,
        distanceText: formatDistance(km) || (lat && lng ? '距离未测' : '')
      };
    });
  },

  async loadData() {
    this.setData({ loading: true });
    try {
      const params = { pageSize: 500 };
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
          distanceKm: Number.isFinite(km) ? km : null,
          distanceText: formatDistance(km)
        };
      });
      const withDist = this.attachDistances(allCourts);
      this.setData({ _allCourts: withDist });
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
      const measured = courts.filter(c => c.distanceKm != null);
      const within = measured.filter(c => c.distanceKm <= radiusKm);
      if (measured.length === 0) {
        wx.showToast({ title: '这批球场尚未标注坐标，暂无法按距离筛选', icon: 'none' });
      } else {
        courts = within;
      }
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
        this.setData({ sortBy });
        this.applyFilters();
      }
    });
  },

  onCourtTap(e) {
    wx.navigateTo({ url: `/pages/court/detail?id=${e.currentTarget.dataset.id}` });
  },

  onAddressTap(e) {
    const item = (this.data.courts || []).find(c => String(c.id) === String(e.currentTarget.dataset.id));
    if (!item) return;
    openInMaps({
      latitude: item.latitude,
      longitude: item.longitude,
      name: item.name,
      address: item.address
    });
  }
});
