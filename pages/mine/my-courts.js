// pages/mine/my-courts.js
const api = require('../../utils/api.js');

const STATUS_MAP = {
  1: { label: '营业中', cls: 'ok' },
  2: { label: '审核中', cls: 'pending' },
  3: { label: '已拒绝', cls: 'reject' },
  0: { label: '休息中', cls: 'off' }
};

const TYPE_OPTIONS = ['11人制', '8人制', '7人制', '5人制', '3人制'];

Page({
  data: {
    courts: [],
    loading: true,
    editing: false,
    typeOptions: TYPE_OPTIONS,
    editCourtTypes: TYPE_OPTIONS.map(v => ({ value: v, selected: false })),
    editForm: {
      id: null, name: '', address: '', types: [], type: '',
      phone: '', price: '', description: ''
    }
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
          const types = Array.isArray(c.types) && c.types.length
            ? c.types
            : (c.type ? [c.type] : []);
          return {
            ...c,
            types,
            typesText: types.length ? types.join(' / ') : (c.type || '未设置'),
            statusLabel: st.label,
            statusCls: st.cls,
            surfaceTypesText: (c.surfaceTypes && c.surfaceTypes.length)
              ? c.surfaceTypes.join(' / ') : (c.surfaceType || '未设置'),
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
    } catch (e) { return isoStr; }
  },

  onEditTap(e) {
    const id = e.currentTarget.dataset.id;
    const court = this.data.courts.find(c => c.id === id);
    if (!court) return;
    const types = Array.isArray(court.types) && court.types.length
      ? court.types.slice()
      : (court.type ? [court.type] : []);
    const editCourtTypes = TYPE_OPTIONS.map(v => ({
      value: v,
      selected: types.includes(v)
    }));
    this.setData({
      editing: true,
      editCourtTypes,
      editForm: {
        id: court.id,
        name: court.name || '',
        address: court.address || '',
        types,
        type: types[0] || TYPE_OPTIONS[0],
        phone: court.phone || '',
        price: court.price != null ? String(court.price) : '',
        description: court.description || ''
      }
    });
  },

  onEditInput(e) {
    this.setData({ [`editForm.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  onEditTypeToggle(e) {
    const value = e.currentTarget.dataset.value;
    const list = (this.data.editForm.types || []).slice();
    const idx = list.indexOf(value);
    if (idx >= 0) list.splice(idx, 1); else list.push(value);
    const editCourtTypes = TYPE_OPTIONS.map(v => ({ value: v, selected: list.includes(v) }));
    this.setData({
      'editForm.types': list,
      'editForm.type': list[0] || '',
      editCourtTypes
    });
  },

  onCancelEdit() { this.setData({ editing: false }); },

  async onSaveEdit() {
    const f = this.data.editForm;
    if (!f.id) return;
    if (!f.name || !f.address) {
      return wx.showToast({ title: '请填写名称和地址', icon: 'none' });
    }
    if (!f.types || !f.types.length) {
      return wx.showToast({ title: '请至少选择一种人制', icon: 'none' });
    }
    wx.showLoading({ title: '保存中...', mask: true });
    try {
      const res = await api.updateMyCourt(f.id, {
        name: String(f.name).trim(),
        address: String(f.address).trim(),
        types: f.types,
        type: f.types[0],
        phone: String(f.phone || '').trim(),
        price: Number(f.price) || 0,
        description: String(f.description || '').trim()
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
    wx.navigateTo({ url: `/pages/mine/publish-slot?courtId=${e.currentTarget.dataset.id}` });
  },

  onRegisterTap() {
    wx.navigateTo({ url: '/pages/mine/court-register' });
  }
});
