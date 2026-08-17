// pages/court/eval.js
const api = require('../../utils/api.js');

Page({
  data: {
    courtId: null,
    form: { rating: 5, content: '', images: [] }
  },

  onLoad(options) {
    this.setData({ courtId: options.id || options.courtId });
  },

  onStarTap(e) {
    this.setData({ 'form.rating': Number(e.currentTarget.dataset.idx) + 1 });
  },

  onInput(e) {
    this.setData({ [`form.${e.currentTarget.dataset.key}`]: e.detail.value });
  },

  onImageAdd() {
    wx.chooseImage({
      count: 9 - this.data.form.images.length,
      success: (res) => {
        this.setData({ 'form.images': [...this.data.form.images, ...res.tempFilePaths] });
      }
    });
  },

  onImageDelete(e) {
    const images = [...this.data.form.images];
    images.splice(e.currentTarget.dataset.idx, 1);
    this.setData({ 'form.images': images });
  },

  async onSubmit() {
    if (!this.data.courtId) return wx.showToast({ title: '缺少球场信息', icon: 'none' });
    if (!this.data.form.content) return wx.showToast({ title: '请填写评价', icon: 'none' });
    try {
      const res = await api.evaluateCourt(this.data.courtId, {
        score: this.data.form.rating,
        content: this.data.form.content
      });
      if (res.code !== 0) throw new Error(res.message || '评价失败');
      wx.showToast({ title: '评价成功', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1200);
    } catch (e) {
      wx.showToast({ title: e.message || '评价失败', icon: 'none' });
    }
  }
});
