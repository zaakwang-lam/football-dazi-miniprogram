// pages/mine/my-teams.js
const api = require('../../utils/api.js');

Page({
  data: {
    activeTab: 'created',
    list: [],
    loaded: false
  },

  onLoad(options) {
    const tab = options.type;
    if (tab === 'created' || tab === 'joined' || tab === 'browse') {
      this.setData({ activeTab: tab });
    }
    this.loadList();
  },

  onShow() {
    this.loadList();
  },

  onPullDownRefresh() {
    this.loadList().then(() => wx.stopPullDownRefresh());
  },

  onTabTap(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === this.data.activeTab) return;
    this.setData({ activeTab: tab, list: [], loaded: false });
    this.loadList();
  },

  async loadList() {
    try {
      let res;
      const tab = this.data.activeTab;

      if (tab === 'browse') {
        res = await api.getLfgList({ type: 'sub', status: 'open' });
      } else {
        res = await api.getMyLfgPosts(tab);
      }

      const rawList = (res.data?.list || []);
      const list = rawList.map(item => ({
        ...item,
        teamName: item.title || item.publisher?.nickname || '未命名',
        publishTime: this.formatPublishTime(item.createdAt),
        playTimeText: this.formatPlayTime(item.playTime),
        matchTypesText: (item.matchTypes && item.matchTypes.length > 0)
          ? item.matchTypes.join('/')
          : ''
      }));

      this.setData({
        list,
        loaded: true,
        emptyText: this.getEmptyText(tab)
      });
    } catch (e) {
      console.error('加载失败:', e);
      this.setData({ list: [], loaded: true });
    }
  },

  getEmptyText(tab) {
    if (tab === 'created') return '还没有发起组队';
    if (tab === 'joined') return '还没有加入组队';
    return '暂无可加入的组队';
  },

  formatPublishTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  formatPlayTime(isoStr) {
    if (!isoStr) return '待定';
    const date = new Date(isoStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    const hm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    if (isToday) return `今天 ${hm}`;
    if (isTomorrow) return `明天 ${hm}`;
    return `${date.getMonth() + 1}月${date.getDate()}日 ${hm}`;
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    const type = e.currentTarget.dataset.type;
    wx.navigateTo({ url: `/pages/lfg/detail?id=${id}&type=${type}` });
  },

  onDeleteTap(e) {
    const id = e.currentTarget.dataset.id;
    if (!id) return;
    wx.showModal({
      title: '删除组队',
      content: '删除后报名记录一并清除，确认删除？',
      confirmColor: '#FF4757',
      success: async (res) => {
        if (!res.confirm) return;
        try {
          await api.deleteLfg(id);
          wx.showToast({ title: '已删除', icon: 'success' });
          this.loadList();
        } catch (err) {
          wx.showToast({ title: err.message || '删除失败', icon: 'none' });
        }
      }
    });
  },

  onPublishTap() {
    wx.navigateTo({ url: '/pages/mine/lfg-publish' });
  },

  onShareAppMessage() {
    return {
      title: '一起搭球 - 组队列表',
      path: '/pages/mine/my-teams'
    };
  }
});
