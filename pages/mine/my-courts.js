// pages/mine/my-courts.js
// 我的球场列表（仅显示已审核通过的球场，按加入时间倒序）
// 关联: 后端 GET /api/user/me/courts (2026-07-28 新增)
const api = require('../../utils/api.js');

Page({
  data: {
    courts: [],
    loading: true
  },

  onLoad() {
    this.loadMyCourts();
  },

  onShow() {
    this.loadMyCourts();
  },

  // 下拉刷新
  onPullDownRefresh() {
    this.loadMyCourts().then(() => wx.stopPullDownRefresh());
  },

  async loadMyCourts() {
    this.setData({ loading: true });
    try {
      const res = await api.getMyCourts();
      if (res.code === 0) {
        const list = (res.data.list || []).map(c => ({
          ...c,
          surfaceTypesText: (c.surfaceTypes && c.surfaceTypes.length > 0)
            ? c.surfaceTypes.join(' / ')
            : (c.surfaceType || '未设置'),
          openHoursText: this.formatOpenHours(c.openHours),
          createdAtText: this.formatDate(c.createdAt)
        }));
        this.setData({ courts: list, loading: false });
      } else {
        this.setData({ loading: false });
        wx.showToast({ title: res.message || '加载失败', icon: 'none' });
      }
    } catch (e) {
      this.setData({ loading: false });
      console.error('加载我的球场失败:', e);
    }
  },

  // 格式化按周开放时间
  formatOpenHours(openHours) {
    if (!openHours || typeof openHours !== 'object') return '';
    const lines = [];
    const dayMap = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    for (const day of dayMap) {
      const slots = openHours[day];
      if (Array.isArray(slots) && slots.length > 0) {
        const slotStr = slots.map(s => `${s.start}-${s.end}`).join(', ');
        lines.push(`${day} ${slotStr}`);
      }
    }
    return lines.length > 0 ? lines.join(' · ') : '';
  },

  // 格式化日期
  formatDate(isoStr) {
    if (!isoStr) return '';
    try {
      const d = new Date(isoStr);
      const pad = n => String(n).padStart(2, '0');
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    } catch (e) {
      return isoStr;
    }
  },

  // 点击球场卡片 → 跳详情（暂时显示 toast，详情页后续做）
  onCourtTap(e) {
    const id = e.currentTarget.dataset.id;
    wx.showToast({ title: `球场 ${id} 详情页待开发`, icon: 'none' });
  },

  // 空状态下的"登记新球场"按钮
  onRegisterTap() {
    wx.navigateTo({ url: '/pages/mine/court-register' });
  }
});