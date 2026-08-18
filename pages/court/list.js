// pages/court/list.js
// 距离：用户通过「地图选点」设定参考位置（仅 chooseLocation，不用 getLocation）
const api = require('../../utils/api.js');
const { chooseLocationOnMap, DEFAULT_GUANGZHOU } = require('../../utils/location.js');

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
    sortBy: 'distance',
    userLat: DEFAULT_GUANGZHOU.latitude,
    userLng: DEFAULT_GUANGZHOU.longitude,
    locLabel: '广州（默认）',
    loading: false,
    _allCourts: [],
    courts: []
  },

  onLoad() {
    this.loadData();
  },

  onShow() {
    if (this.data._allCourts && this.data._allCourts.length) return;
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  /** 用地图选点设定「我的位置」，再按距离排序 */
  async onRelocate() {
    const loc = await chooseLocationOnMap();
    if (!loc) return;
    this.setData({
      userLat: loc.latitude,
      userLng: loc.longitude,
      locLabel: loc.name || loc.address || '已选位置',
      sortBy: 'distance'
    });
    wx.showToast({ title: '位置已更新', icon: 'success' });
    await this.loadData();
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
        radiusKm: 80,
        latitude: this.data.userLat,
        longitude: this.data.userLng
      };
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
