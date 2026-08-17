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
    _allCourts: [],
    courts: []
  },

  onLoad() {
    this.loadData();
  },

  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    try {
      const res = await api.getNearbyCourts();
      const allCourts = (res.data?.list || []).map((c, i) => {
        const types = Array.isArray(c.types) && c.types.length ? c.types : (c.type ? [c.type] : []);
        return {
          ...c,
          types,
          typeLabel: types.length ? types.join('/') : (c.type || ''),
          bgColor1: COLOR_PAIRS[i % COLOR_PAIRS.length][0],
          bgColor2: COLOR_PAIRS[i % COLOR_PAIRS.length][1],
          freeSlots: c.freeSlots || []
        };
      });
      this.setData({ _allCourts: allCourts });
      this.applyFilters();
    } catch (e) {
      console.error('加载场地失败:', e);
    }
  },

  applyFilters() {
    const { type } = this.data.filters;
    let courts = this.data._allCourts || [];
    if (type !== 'all') {
      courts = courts.filter(c => {
        if (Array.isArray(c.types) && c.types.length) return c.types.includes(type);
        return c.type === type;
      });
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
      success: () => {
        wx.showToast({ title: '已应用排序', icon: 'none' });
      }
    });
  },

  onCourtTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/court/detail?id=${id}` });
  }
});
