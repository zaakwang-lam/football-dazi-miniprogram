// pages/mine/my-teams.js
// 我发起的 / 我加入的 / 加入已发起 三个 tab
const api = require('../../utils/api.js');

Page({
  data: {
    activeTab: 'created',  // 默认我发起的
    list: [],
    loaded: false
  },

  onLoad(options) {
    const tab = options.type;
    // mine 跳过来时: type=created/joined → 直接显示对应 tab
    // 或 type=browse → 浏览所有可加入的
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
        // 浏览所有可加入的（status=open 且未满）
        res = await api.getLfgList({ type: 'sub', status: 'open' });
      } else {
        // 我发起的 / 我加入的
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
    // 跳详情（sub/war 都跳到 lfg/detail，detail 内部根据 type 分支）
    wx.navigateTo({ url: `/pages/lfg/detail?id=${id}&type=${type}` });
  },

  onPublishTap() {
    // 我发起的 tab 的 + 按钮 → 跳个人发起组队页（mine/lfg-publish）
    wx.navigateTo({ url: '/pages/mine/lfg-publish' });
  },

  onShareAppMessage() {
    return {
      title: '足球搭子 - 组队列表',
      path: '/pages/mine/my-teams'
    };
  }
});