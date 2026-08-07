// pages/mine/my-courts.js
// 球场信息统一入口：查看 + 编辑费用/电话/简介
const api = require('../../utils/api.js');

const STATUS_MAP = {
  1: { label: '营业中', cls: 'ok' },
  2: { label: '审核中', cls: 'pending' },
  3: { label: '已拒绝', cls: 'reject' },
  0: { label: '休息中', cls: 'off' }
};

Page({
  data: {
    courts: [],
    loading: true,
    editing: false,
    editForm: { id: null, phone: '', price: '', description: '' }
  },

  onLoad() { this.loadMyCourts(); },
  onShow() { this.loadMyCourts(); },
  onPullDownRefresh() {
    this.loadMyCourts().then(() => wx.stopPullDownRefresh());
  },

  async loadMyCourts() {
    this.setData({ loading: true });
    try {
      const res = await api.getMyCourts();
      if (res.code === 0) {
        const list = (res.data.list || []).map(c => {
          const st = STATUS_MAP[c.status] || { label: '未知', cls: 'off' };
          return {
            ...c,
            statusLabel: st.label,
            statusCls: st.cls,
            surfaceTypesText: (c.surfaceTypes && c.surfaceTypes.length)
              ? c.surfaceTypes.join(' / ')
              : (c.surfaceType || '未设置'),
            openHoursText: this.formatOpenHours(c.openHours),
            priceText: c.price != null ? `¥${c.price}/场` : '未设置',
            createdAtText: this.formatDate(c.createdAt)
          };
        });
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

  formatOpenHours(openHours) {
    if (!openHours || typeof openHours !== 'object') return '';
    const lines = [];
    for (const day of ['周一', '周二', '周三', '周四', '周五', '周六', '周日']) {
      const slots = openHours[day];
      if (Array.isArray(slots) && slots.length) {
        lines.push(`${day} ${slots.map(s => `${s.start}-${s.end}`).join(', ')}`);
      }
    }
    return lines.join(' · ');
  },

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

  onEditTap(e) {
    const id = e.currentTarget.dataset.id;
    const court = this.data.courts.find(c => c.id === id);
    if (!court) return;
    this.setData({
      editing: true,
      editForm: {
        id: court.id,
        phone: court.phone || '',
        price: court.price != null ? String(court.price) : '',
        description: court.description || ''
      }
    });
  },

  onEditInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`editForm.${field}`]: e.detail.value });
  },

  onCancelEdit() {
    this.setData({ editing: false });
  },

  async onSaveEdit() {
    const { id, phone, price, description } = this.data.editForm;
    if (!id) return;
    wx.showLoading({ title: '保存中...', mask: true });
    try {
      const res = await api.updateMyCourt(id, {
        phone: String(phone || '').trim(),
        price: Number(price) || 0,
        description: String(description || '').trim()
      });
      if (res.code !== 0) throw new Error(res.message || '保存失败');
      wx.showToast({ title: '已保存', icon: 'success' });
      this.setData({ editing: false });
      this.loadMyCourts();
    } catch (e) {
      wx.showToast({ title: e.message || '保存失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  },

  onPublishSlot(e) {
    const id = e.currentTarget.dataset.id;
    wx.navigateTo({ url: `/pages/mine/publish-slot?courtId=${id}` });
  },

  onRegisterTap() {
    wx.navigateTo({ url: '/pages/mine/court-register' });
  }
});
