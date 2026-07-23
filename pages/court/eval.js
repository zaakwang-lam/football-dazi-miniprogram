// pages/court/eval.js
Page({
  data: {
    form: {
      rating: 5,
      content: '',
      images: []
    }
  },

  onStarTap(e) {
    const idx = e.currentTarget.dataset.idx;
    this.setData({ 'form.rating': idx + 1 });
  },

  onInput(e) {
    const key = e.currentTarget.dataset.key;
    this.setData({ [`form.${key}`]: e.detail.value });
  },

  onImageAdd() {
    wx.chooseImage({
      count: 9 - this.data.form.images.length,
      success: (res) => {
        this.setData({
          'form.images': [...this.data.form.images, ...res.tempFilePaths]
        });
      }
    });
  },

  onImageDelete(e) {
    const idx = e.currentTarget.dataset.idx;
    const images = [...this.data.form.images];
    images.splice(idx, 1);
    this.setData({ 'form.images': images });
  },

  onSubmit() {
    if (!this.data.form.content) return wx.showToast({ title: '请填写评价', icon: 'none' });
    wx.showLoading({ title: '提交中...' });
    setTimeout(() => {
      wx.hideLoading();
      wx.showToast({ title: '评价成功！', icon: 'success' });
      setTimeout(() => wx.navigateBack(), 1500);
    }, 800);
  }
});