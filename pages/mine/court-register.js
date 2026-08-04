// pages/mine/court-register.js
// 球场信息登记表单（2026-07-28 升级：行政区 + 多选场地性质 + 按周多时段）
const api = require('../../utils/api.js');

const DISTRICTS = ['天河', '海珠', '越秀', '荔湾', '白云', '黄埔', '番禺', '花都', '南沙', '从化', '增城'];
const WEEK_DAYS = [
  { key: '周一', label: '周一' },
  { key: '周二', label: '周二' },
  { key: '周三', label: '周三' },
  { key: '周四', label: '周四' },
  { key: '周五', label: '周五' },
  { key: '周六', label: '周六' },
  { key: '周日', label: '周日' }
];

Page({
  data: {
    courtTypes: ['11人制', '8人制', '7人制', '5人制', '3人制'],  // 2026-07-30 增加 8 人制 + 3 人制
    surfaceTypes: ['人工草地', '天然草地', '硬地'],
    districts: DISTRICTS,
    weekDays: WEEK_DAYS,
    courtTypeIndex: 0,
    surfaceTypeIndex: 0,
    districtIndex: -1,  // -1 表示未选
    form: {
      name: '',
      types: [],  // 2026-07-30 改：支持人制多选（原来 type 单选）
      surfaceTypes: [],  // 多选
      district: '',
      address: '',
      longitude: '',
      latitude: '',
      phone: '',
      price: '',
      openHours: {},  // 按周多时段 {周一: [{start,end}], ...}
      description: ''
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  // 支持人制多选 toggle（2026-07-30 宏哥要求多选）
  onCourtTypeToggle(e) {
    const value = e.currentTarget.dataset.value;
    const list = [...(this.data.form.types || [])];
    const idx = list.indexOf(value);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(value);
    }
    this.setData({ 'form.types': list });
  },

  // 场地性质多选 toggle
  onSurfaceToggle(e) {
    const value = e.currentTarget.dataset.value;
    const list = [...this.data.form.surfaceTypes];
    const idx = list.indexOf(value);
    if (idx >= 0) {
      list.splice(idx, 1);
    } else {
      list.push(value);
    }
    this.setData({ 'form.surfaceTypes': list });
  },

  onDistrictChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      districtIndex: idx,
      'form.district': this.data.districts[idx]
    });
  },

  // 添加时段
  onAddSlot(e) {
    const day = e.currentTarget.dataset.day;
    const openHours = { ...this.data.form.openHours };
    if (!openHours[day]) openHours[day] = [];
    openHours[day] = [...openHours[day], { start: '18:00', end: '22:00' }];
    this.setData({ 'form.openHours': openHours });
  },

  // 删除时段
  onDelSlot(e) {
    const day = e.currentTarget.dataset.day;
    const idx = Number(e.currentTarget.dataset.idx);
    const openHours = { ...this.data.form.openHours };
    if (openHours[day]) {
      openHours[day] = openHours[day].filter((_, i) => i !== idx);
      if (openHours[day].length === 0) delete openHours[day];
    }
    this.setData({ 'form.openHours': openHours });
  },

  // 修改时段
  onSlotTimeChange(e) {
    const day = e.currentTarget.dataset.day;
    const idx = Number(e.currentTarget.dataset.idx);
    const field = e.currentTarget.dataset.field;
    const openHours = { ...this.data.form.openHours };
    if (openHours[day] && openHours[day][idx]) {
      openHours[day] = openHours[day].map((s, i) => i === idx ? { ...s, [field]: e.detail.value } : s);
    }
    this.setData({ 'form.openHours': openHours });
  },

  async onSubmit() {
    const f = this.data.form;
    // 必填校验
    if (!f.name) return wx.showToast({ title: '请填写球场名称', icon: 'none' });
    if (!f.address) return wx.showToast({ title: '请填写球场地址', icon: 'none' });
    if (!f.district) return wx.showToast({ title: '请选择行政区', icon: 'none' });
    if (!f.types || f.types.length === 0) {
      return wx.showToast({ title: '请至少选择一种人制', icon: 'none' });
    }
    if (!f.surfaceTypes || f.surfaceTypes.length === 0) {
      return wx.showToast({ title: '请至少选择一种场地性质', icon: 'none' });
    }

    wx.showLoading({ title: '提交中...' });
    try {
      const res = await api.registerRole({
        role: 'court',
        courtInfo: {
          name: f.name,
          types: f.types,  // 2026-07-30 多选人制
          type: f.types[0],  // 兼容后端单 type 字段
          district: f.district,
          surfaceTypes: f.surfaceTypes,
          // 兼容旧字段（取多选第一个作 fallback，避免后端报错）
          surfaceType: f.surfaceTypes[0],
          address: f.address,
          longitude: f.longitude ? Number(f.longitude) : null,
          latitude: f.latitude ? Number(f.latitude) : null,
          phone: f.phone,
          price: Number(f.price) || 0,
          // 按周多时段（已过滤空对象）
          openHours: f.openHours,
          // 兼容旧字段（从按周时段拼出 openTime/closeTime，取周一第一段）
          openTime: this.inferOldOpenTime(f.openHours),
          closeTime: this.inferOldCloseTime(f.openHours),
          description: f.description
        }
      });
      wx.hideLoading();

      if (res.code === 0) {
        // 【2026-08-04 #22】同步 storage - 多身份数组
        const userInfo = wx.getStorageSync('userInfo') || {};
        userInfo.role = 'court';
        userInfo.roles = res.data?.roles || ['user', 'court'];
        userInfo.courtId = res.data?.courtId || null;
        wx.setStorageSync('userInfo', userInfo);
        wx.showModal({
          title: '提交成功',
          content: '球场信息已提交，请等待管理员审核（1-3 个工作日）',
          showCancel: false,
          success: () => wx.navigateBack()
        });
      } else {
        wx.showToast({ title: res.message || '提交失败', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
      console.error(e);
    }
  },

  // 从按周时段推断 openTime（旧字段 fallback）
  inferOldOpenTime(openHours) {
    if (!openHours) return '08:00:00';
    const mon = openHours['周一'];
    if (mon && mon[0] && mon[0].start) return mon[0].start + ':00';
    // 取第一个有数据的日
    for (const day of Object.keys(openHours)) {
      if (openHours[day] && openHours[day][0] && openHours[day][0].start) {
        return openHours[day][0].start + ':00';
      }
    }
    return '08:00:00';
  },

  inferOldCloseTime(openHours) {
    if (!openHours) return '22:00:00';
    const mon = openHours['周一'];
    if (mon && mon[0] && mon[0].end) return mon[0].end + ':00';
    for (const day of Object.keys(openHours)) {
      if (openHours[day] && openHours[day][0] && openHours[day][0].end) {
        return openHours[day][0].end + ':00';
      }
    }
    return '22:00:00';
  }
});