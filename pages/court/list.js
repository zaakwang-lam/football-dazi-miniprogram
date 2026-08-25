// pages/court/list.js
const api = require('../../utils/api.js');

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
    sortBy: 'rating',
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
    this.init();
  },

  onShow() {
    if (this.data._allCourts && this.data._allCourts.length) return;
    this.init();
  },

  onPullDownRefresh() {
    this.init().then(() => wx.stopPullDownRefresh());
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
      const patch = {
        regions,
        regionLabels
      };
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
      const params = { pageSize: 500 };
      if (this.data.province) params.province = this.data.province;
      if (this.data.city) params.city = this.data.city;
      if (this.data.keyword) params.keyword = this.data.keyword.trim();

      const res = await api.getNearbyCourts(params);
      const total = res.data?.total;
      const allCourts = (res.data?.list || []).map((c, i) => {
        const types = Array.isArray(c.types) && c.types.length ? c.types : (c.type ? [c.type] : []);
        const coverUrl = c.coverUrl || (Array.isArray(c.images) && c.images[0]) || '';
        return {
          ...c,
          types,
          typeLabel: types.length ? types.join('/') : (c.type || ''),
          coverUrl,
          bgColor1: COLOR_PAIRS[i % COLOR_PAIRS.length][0],
          bgColor2: COLOR_PAIRS[i % COLOR_PAIRS.length][1],
          freeSlots: c.freeSlots || []
        };
      });
      this.setData({ _allCourts: allCourts });
      this.applyFilters();
      if (typeof total === 'number' && this.data.regionLabel && !this.data.regionLabel.includes('（')) {
        this.setData({ regionLabel: `${this.data.regions[this.data.regionIndex]?.label || this.data.regionLabel}` });
      }
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
    if (sortBy === 'price') {
      courts.sort((a, b) => (Number(a.price) || 0) - (Number(b.price) || 0));
    } else if (sortBy === 'rating') {
      courts.sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0));
    } else {
      courts.sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'zh-CN'));
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
      itemList: ['评分最高', '价格最低', '名称'],
      success: (res) => {
        const map = ['rating', 'price', 'name'];
        this.setData({ sortBy: map[res.tapIndex] || 'rating' });
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
