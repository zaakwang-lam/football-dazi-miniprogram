// pages/war/war.js
// 约战 tab：仅显示约战（type='war'），球队对球队
const api = require('../../utils/api.js');

Page({
  data: {
    list: [],
    loaded: false
  },

  onLoad() {
    this.loadList();
  },

  onShow() {
    this.loadList();
  },

  onPullDownRefresh() {
    this.loadList().then(() => wx.stopPullDownRefresh());
  },

  async loadList() {
    try {
      const res = await api.getLfgList({ type: 'war' });
      const list = (res.data?.list || []).map(item => ({
        ...item,
        typeKey: 'war',
        teamName: item.title || item.publisher?.nickname || '海珠飓风队',
        // 2026-07-28 同步 lfg 风格：发布时间绝对时间 + 比赛时间格式化
        publishTime: this.formatPublishTime(item.createdAt),
        playTimeText: this.formatPlayTime(item.playTime),
        level: item.level || '业余',
        desc: item.description || '',
        matchTypesText: (item.matchTypes && item.matchTypes.length > 0)
          ? item.matchTypes.join('/')
          : ''
      }));
      this.setData({ list, loaded: true });
    } catch (e) {
      console.error('加载约战失败:', e);
      this.setData({ list: [], loaded: true });
    }
  },

  // 发布时间（与 lfg/lfg.js 同步）
  formatPublishTime(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diff = (now - date) / 1000;
    if (diff < 60) return '刚刚';
    if (diff < 3600) return Math.floor(diff / 60) + ' 分钟前';
    return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  },

  // 比赛时间
  formatPlayTime(isoStr) {
    if (!isoStr) return '待定';
    const date = new Date(isoStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const tomorrow = new Date(now); tomorrow.setDate(now.getDate() + 1);
    const isTomorrow = date.toDateString() === tomorrow.toDateString();
    const hm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
    if (isToday) return `今晚 ${hm}`;
    if (isTomorrow) return `明晚 ${hm}`;
    return `${date.getMonth() + 1}月${date.getDate()}日 ${hm}`;
  },

  onFilterTap(e) {
    const key = e.currentTarget.dataset.key;
    const labels = { distance: '距离', level: '水平', time: '时间', district: '区域' };
    wx.showActionSheet({
      itemList: ['全部', '1km内', '3km内', '5km内', '天河区', '越秀区', '海珠区', '番禺区'],
      success: () => {
        wx.showToast({ title: `已筛选${labels[key]}`, icon: 'none' });
      }
    });
  },

  onItemTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/war/detail?id=${id}` });
  },

  onActionTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/lfg/detail?id=${id}&type=war&join=1` });
  },

  onPublishTap() {
    wx.navigateTo({ url: '/pages/war/publish' });
  },

  onShareAppMessage() {
    return {
      title: '来足球搭子约一队！',
      path: '/pages/war/war'
    };
  }
});