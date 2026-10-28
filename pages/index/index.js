// pages/index/index.js
const api = require('../../utils/api.js');
const { dialPhone } = require('../../utils/util.js');

Page({
  data: {
    banners: [],
    bannerHeight: 360,
    lfgList: []
  },

  onLoad() { this.loadData(); },
  onShow() { this.loadData(); },
  onPullDownRefresh() {
    this.loadData().then(() => wx.stopPullDownRefresh());
  },

  async loadData() {
    const [lfgRes, bannerRes] = await Promise.allSettled([
      api.getLfgList(),
      api.getBanners()
    ]);

    const lfgData = lfgRes.status === 'fulfilled' ? lfgRes.value.data?.list || [] : [];
    const TYPE_KEY = { sub: 'sub', war: 'war' };
    const TYPE_LABEL = { sub: '凑人', war: '约战' };
    const lfgList = lfgData.map(item => ({
      ...item,
      typeKey: TYPE_KEY[item.type] || 'sub',
      typeLabel: TYPE_LABEL[item.type] || '凑人',
      teamName: item.title || item.publisher?.nickname || '招募中',
      time: this.formatTime(item.playTime),
      need: item.needCount != null ? item.needCount : 0,
      // 约战不展示「缺 X 人」
      showNeed: item.type === 'sub',
      location: item.location || '地点待定'
    }));

    const banners = bannerRes.status === 'fulfilled'
      ? (bannerRes.value.data?.list || []).filter(b => b.imageUrl)
      : [];

    this._bannerHeight = 0;
    this.setData({ lfgList, banners, bannerHeight: 360 });
  },

  onBannerLoad(e) {
    const w = Number(e.detail.width);
    const h = Number(e.detail.height);
    if (!w || !h) return;
    const heightRpx = Math.min(1200, Math.max(200, Math.round((750 - 48) * h / w)));
    const next = Math.max(this._bannerHeight || 0, heightRpx);
    this._bannerHeight = next;
    if (next !== this.data.bannerHeight) this.setData({ bannerHeight: next });
  },

  formatTime(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return '';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(d);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.round((target - today) / 86400000);
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    if (diffDays === 0) return `今晚 ${hours}:${mins}`;
    if (diffDays === 1) return `明晚 ${hours}:${mins}`;
    return `${d.getMonth() + 1}/${d.getDate()} ${hours}:${mins}`;
  },

  onSearchTap() {
    wx.navigateTo({ url: '/pages/search/search' });
  },

  onBannerTap(e) {
    const url = e.currentTarget.dataset.url;
    if (url && /^https?:\/\//i.test(url)) {
      wx.showToast({ title: '活动页开发中', icon: 'none' });
      return;
    }
    wx.showToast({ title: '一起踢球，一起FUNS', icon: 'none' });
  },

  onEntryTap(e) {
    const type = e.currentTarget.dataset.type;
    const map = {
      book: '/pages/court/list',
      lfg: '/pages/lfg/lfg',
      war: '/pages/war/war'
    };
    const dest = map[type];
    if (!dest) return;
    wx.navigateTo({ url: dest });
  },

  onLfgTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return wx.showToast({ title: '无效的组队信息', icon: 'none' });
    wx.navigateTo({ url: `/pages/lfg/detail?id=${id}` });
  },

  onContactCaptain(e) {
    dialPhone(e.currentTarget.dataset.phone);
  },

  onShareAppMessage() {
    return {
      title: '爱拍球 - 广州业余足球一站式平台',
      path: '/pages/index/index'
    };
  }
});
