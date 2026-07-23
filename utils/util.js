// utils/util.js
// 时间格式化
function formatTime(date, fmt = 'YYYY-MM-DD HH:mm') {
  if (!date) return '';
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  const pad = (n) => n < 10 ? '0' + n : n;
  const map = {
    YYYY: d.getFullYear(),
    MM: pad(d.getMonth() + 1),
    DD: pad(d.getDate()),
    HH: pad(d.getHours()),
    mm: pad(d.getMinutes()),
    ss: pad(d.getSeconds())
  };
  return fmt.replace(/YYYY|MM|DD|HH|mm|ss/g, (k) => map[k]);
}

// 距离格式化
function formatDistance(km) {
  if (!km && km !== 0) return '';
  if (km < 1) return Math.round(km * 1000) + 'm';
  return km.toFixed(1) + 'km';
}

// 价格格式化
function formatPrice(p) {
  if (p === null || p === undefined) return '';
  return '¥' + p;
}

// 防抖
function debounce(fn, delay = 300) {
  let timer = null;
  return function (...args) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

// Toast
function toast(title, icon = 'none', duration = 1500) {
  wx.showToast({ title, icon, duration });
}

// Loading
function loading(title = '加载中') {
  wx.showLoading({ title, mask: true });
}

function hideLoading() {
  wx.hideLoading();
}

// 分享配置
function shareConfig(title, desc, path, imageUrl) {
  return {
    title,
    desc,
    path,
    imageUrl
  };
}

module.exports = {
  formatTime,
  formatDistance,
  formatPrice,
  debounce,
  toast,
  loading,
  hideLoading,
  shareConfig
};