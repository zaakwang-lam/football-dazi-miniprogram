// pages/mine/court-register.js
const api = require('../../utils/api.js');
const { chooseLocationOnMap } = require('../../utils/location.js');

const DISTRICTS = ['天河', '海珠', '越秀', '荔湾', '白云', '黄埔', '番禺', '花都', '南沙', '从化', '增城'];
const WEEK_DAYS = [
  { key: '周一', label: '周一' }, { key: '周二', label: '周二' }, { key: '周三', label: '周三' },
  { key: '周四', label: '周四' }, { key: '周五', label: '周五' }, { key: '周六', label: '周六' },
  { key: '周日', label: '周日' }
];

Page({
  data: {
    courtTypes: [
      { value: '11人制', selected: false }, { value: '8人制', selected: false },
      { value: '7人制', selected: false }, { value: '5人制', selected: false }, { value: '3人制', selected: false }
    ],
    surfaceTypes: [
      { value: '人工草地', selected: false }, { value: '天然草地', selected: false }, { value: '硬地', selected: false }
    ],
    districts: DISTRICTS,
    weekDays: WEEK_DAYS,
    districtIndex: -1,
    form: {
      name: '', types: [], surfaceTypes: [], district: '', address: '', longitude: '', latitude: '',
      phone: '', price: '', openHours: {}, description: ''
    }
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.field}`]: e.detail.value });
  },

  async onChooseLocation() {
    const loc = await chooseLocationOnMap();
    if (!loc) return;
    const patch = {
      'form.address': loc.address || loc.name || '',
      'form.longitude': String(loc.longitude),
      'form.latitude': String(loc.latitude)
    };
    // 若名称仍空，可用地图点名称填充
    if (!this.data.form.name && loc.name) {
      patch['form.name'] = loc.name;
    }
    // 尝试根据地址匹配行政区
    const addr = loc.address || '';
    const hitIdx = DISTRICTS.findIndex(d => addr.indexOf(d) >= 0);
    if (hitIdx >= 0) {
      patch.districtIndex = hitIdx;
      patch['form.district'] = DISTRICTS[hitIdx];
    }
    this.setData(patch);
    wx.showToast({ title: '位置已选择', icon: 'success' });
  },

  onCourtTypeToggle(e) {
    const value = e.currentTarget.dataset.value;
    const list = (this.data.form.types || []).slice();
    const idx = list.indexOf(value);
    if (idx >= 0) list.splice(idx, 1); else list.push(value);
    const courtTypes = this.data.courtTypes.map(item => ({ ...item, selected: list.includes(item.value) }));
    this.setData({ 'form.types': list, courtTypes });
  },

  onSurfaceToggle(e) {
    const value = e.currentTarget.dataset.value;
    const list = (this.data.form.surfaceTypes || []).slice();
    const idx = list.indexOf(value);
    if (idx >= 0) list.splice(idx, 1); else list.push(value);
    const surfaceTypes = this.data.surfaceTypes.map(item => ({ ...item, selected: list.includes(item.value) }));
    this.setData({ 'form.surfaceTypes': list, surfaceTypes });
  },

  onDistrictChange(e) {
    const idx = Number(e.detail.value);
    this.setData({ districtIndex: idx, 'form.district': this.data.districts[idx] });
  },

  onAddSlot(e) {
    const day = e.currentTarget.dataset.day;
    const openHours = { ...this.data.form.openHours };
    if (!openHours[day]) openHours[day] = [];
    openHours[day] = [...openHours[day], { start: '18:00', end: '22:00' }];
    this.setData({ 'form.openHours': openHours });
  },

  onDelSlot(e) {
    const day = e.currentTarget.dataset.day;
    const idx = Number(e.currentTarget.dataset.idx);
    const openHours = { ...this.data.form.openHours };
    if (openHours[day]) {
      openHours[day] = openHours[day].filter((_, i) => i !== idx);
      if (!openHours[day].length) delete openHours[day];
    }
    this.setData({ 'form.openHours': openHours });
  },

  onSlotTimeChange(e) {
    const { day, idx, field } = e.currentTarget.dataset;
    const openHours = { ...this.data.form.openHours };
    const index = Number(idx);
    if (openHours[day]?.[index]) {
      openHours[day] = openHours[day].map((slot, i) => i === index ? { ...slot, [field]: e.detail.value } : slot);
    }
    this.setData({ 'form.openHours': openHours });
  },

  async onSubmit() {
    const f = this.data.form;
    if (!f.name) return wx.showToast({ title: '请填写球场名称', icon: 'none' });
    if (!f.address) return wx.showToast({ title: '请填写球场地址', icon: 'none' });
    if (!f.district) return wx.showToast({ title: '请选择行政区', icon: 'none' });
    if (!f.types.length) return wx.showToast({ title: '请至少选择一种人制', icon: 'none' });
    if (!f.surfaceTypes.length) return wx.showToast({ title: '请至少选择一种场地性质', icon: 'none' });

    wx.showLoading({ title: '提交中...', mask: true });
    try {
      const res = await api.registerRole({
        role: 'court',
        courtInfo: {
          name: f.name, types: f.types, type: f.types[0], district: f.district,
          surfaceTypes: f.surfaceTypes, surfaceType: f.surfaceTypes[0], address: f.address,
          longitude: f.longitude ? Number(f.longitude) : null, latitude: f.latitude ? Number(f.latitude) : null,
          phone: f.phone, price: Number(f.price) || 0, openHours: f.openHours,
          openTime: this.inferOldOpenTime(f.openHours), closeTime: this.inferOldCloseTime(f.openHours),
          description: f.description
        }
      });
      wx.hideLoading();
      if (res.code === 0) {
        const userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.roles = Array.isArray(res.data?.roles) ? res.data.roles : ['user', 'court'];
        userInfo.role = 'court';
        userInfo.courtId = res.data?.courtId || null;
        wx.setStorageSync('userInfo', userInfo);
        wx.showModal({
          title: '提交成功', content: '球场信息已提交，请等待管理员审核（1-3 个工作日）', showCancel: false,
          success: () => wx.switchTab({ url: '/pages/mine/mine' })
        });
      } else {
        wx.showToast({ title: res.message || '提交失败', icon: 'none', duration: 3000 });
      }
    } catch (e) {
      wx.hideLoading();
      console.error('[court-register] submit failed:', e);
      const msg = (e && (e.message || e.errMsg)) || '提交失败，请重试';
      wx.showToast({ title: msg, icon: 'none', duration: 3000 });
    }
  },

  inferOldOpenTime(openHours) {
    const days = Object.keys(openHours || {});
    for (const day of days) if (openHours[day]?.[0]?.start) return openHours[day][0].start + ':00';
    return '08:00:00';
  },

  inferOldCloseTime(openHours) {
    const days = Object.keys(openHours || {});
    for (const day of days) if (openHours[day]?.[0]?.end) return openHours[day][0].end + ':00';
    return '22:00:00';
  }
});
