// pages/mine/court-register.js
const api = require('../../utils/api.js');

Page({
  data: {
    courtTypes: ['11人制', '7人制', '5人制'],
    surfaceTypes: ['人工草地', '天然草地', '硬地'],
    courtTypeIndex: 0,
    surfaceTypeIndex: 0,
    form: {
      name: '',
      type: '11人制',
      surfaceType: '人工草地',
      address: '',
      longitude: '',
      latitude: '',
      phone: '',
      price: '',
      openTime: '08:00',
      closeTime: '22:00',
      description: ''
    }
  },

  onInput(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  onTypeChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      courtTypeIndex: idx,
      'form.type': this.data.courtTypes[idx]
    });
  },

  onSurfaceChange(e) {
    const idx = Number(e.detail.value);
    this.setData({
      surfaceTypeIndex: idx,
      'form.surfaceType': this.data.surfaceTypes[idx]
    });
  },

  onTimeChange(e) {
    const field = e.currentTarget.dataset.field;
    this.setData({ [`form.${field}`]: e.detail.value });
  },

  async onSubmit() {
    const f = this.data.form;
    if (!f.name || !f.address) {
      wx.showToast({ title: '请填写球场名称和地址', icon: 'none' });
      return;
    }
    if (!f.longitude || !f.latitude) {
      wx.showToast({ title: '请填写经纬度（暂不支持选点）', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '提交中...' });
    try {
      const res = await api.registerRole({
        role: 'court',
        courtInfo: {
          name: f.name,
          type: f.type,
          surfaceType: f.surfaceType,
          address: f.address,
          longitude: Number(f.longitude),
          latitude: Number(f.latitude),
          phone: f.phone,
          price: Number(f.price) || 0,
          openTime: f.openTime + ':00',
          closeTime: f.closeTime + ':00',
          description: f.description
        }
      });
      wx.hideLoading();

      if (res.code === 0) {
        wx.showModal({
          title: '提交成功',
          content: '球场信息已提交，请等待管理员审核（1-3 个工作日）',
          showCancel: false,
          success: () => {
            wx.navigateBack();
          }
        });
      } else {
        wx.showToast({ title: res.message || '提交失败', icon: 'none' });
      }
    } catch (e) {
      wx.hideLoading();
      wx.showToast({ title: '网络错误', icon: 'none' });
      console.error(e);
    }
  }
});