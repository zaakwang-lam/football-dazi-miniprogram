// utils/location.js
const STORAGE_KEY = 'user_chosen_location';

const DEFAULT_GUANGZHOU = {
  latitude: 23.1291,
  longitude: 113.2644,
  name: '广州市'
};

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function haversineKm(lat1, lng1, lat2, lng2) {
  const a = toNum(lat1);
  const b = toNum(lng1);
  const c = toNum(lat2);
  const d = toNum(lng2);
  if (a == null || b == null || c == null || d == null) return null;
  if (a === 0 && b === 0) return null;
  if (c === 0 && d === 0) return null;
  const R = 6371;
  const dLat = (c - a) * Math.PI / 180;
  const dLng = (d - b) * Math.PI / 180;
  const x = Math.sin(dLat / 2) ** 2 +
    Math.cos(a * Math.PI / 180) * Math.cos(c * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function formatDistance(km) {
  if (km == null || Number.isNaN(Number(km))) return '';
  const n = Number(km);
  if (n < 0.1) return '<100m';
  if (n < 1) return `${Math.round(n * 1000)}m`;
  if (n < 10) return `${n.toFixed(1)}km`;
  return `${Math.round(n)}km`;
}

function getSavedLocation() {
  try {
    const loc = wx.getStorageSync(STORAGE_KEY);
    if (loc && loc.latitude && loc.longitude) return loc;
  } catch (e) { /* ignore */ }
  return null;
}

function saveChosenLocation(loc) {
  if (!loc || !loc.latitude || !loc.longitude) return;
  const packed = {
    name: loc.name || loc.address || '当前位置',
    address: loc.address || loc.name || '',
    latitude: Number(loc.latitude),
    longitude: Number(loc.longitude),
    updatedAt: Date.now()
  };
  wx.setStorageSync(STORAGE_KEY, packed);
  return packed;
}

function clearSavedLocation() {
  wx.removeStorageSync(STORAGE_KEY);
}

function askOpenSetting() {
  return new Promise((resolve) => {
    wx.showModal({
      title: '需要位置权限',
      content: '允许定位后，可自动计算你到各球场的直线距离',
      confirmText: '去设置',
      success: (m) => {
        if (!m.confirm) return resolve(false);
        wx.openSetting({
          success: (s) => resolve(!!(s.authSetting && s.authSetting['scope.userLocation'])),
          fail: () => resolve(false)
        });
      }
    });
  });
}

function getGpsLocation() {
  return new Promise((resolve) => {
    wx.getLocation({
      type: 'gcj02',
      isHighAccuracy: true,
      success: (res) => {
        const loc = saveChosenLocation({
          name: '当前位置',
          address: '',
          latitude: res.latitude,
          longitude: res.longitude
        });
        resolve(loc);
      },
      fail: (err) => {
        console.warn('[location] getLocation fail:', err);
        resolve(null);
      }
    });
  });
}

async function getCurrentLocation(options = {}) {
  const saved = getSavedLocation();
  if (saved && !options.force) return saved;
  const gps = await getGpsLocation();
  if (gps) return gps;
  if (options.askSetting) {
    const ok = await askOpenSetting();
    if (ok) {
      const again = await getGpsLocation();
      if (again) return again;
    }
  }
  return saved;
}

function chooseLocationOnMap() {
  return new Promise((resolve) => {
    const openPicker = () => {
      wx.chooseLocation({
        success: (res) => {
          resolve(saveChosenLocation({
            name: res.name || '',
            address: res.address || res.name || '',
            latitude: res.latitude,
            longitude: res.longitude
          }));
        },
        fail: (err) => {
          const msg = (err && err.errMsg) || '';
          if (msg.indexOf('cancel') >= 0) return resolve(null);
          if (msg.indexOf('auth deny') >= 0 || msg.indexOf('authorize') >= 0) {
            askOpenSetting().then(() => resolve(null));
            return;
          }
          wx.showToast({ title: '打开地图失败', icon: 'none' });
          resolve(null);
        }
      });
    };
    wx.getSetting({
      success: (setting) => {
        if (setting.authSetting && setting.authSetting['scope.userLocation'] === false) {
          askOpenSetting().then((ok) => { if (ok) openPicker(); else resolve(null); });
          return;
        }
        openPicker();
      },
      fail: () => openPicker()
    });
  });
}

function openInMaps({ latitude, longitude, name, address }) {
  const lat = toNum(latitude);
  const lng = toNum(longitude);
  const title = name || '球场';
  const addr = address || '';

  const copyAndHint = (hint) => {
    const text = [title, addr, (lat != null && lng != null) ? `${lat},${lng}` : ''].filter(Boolean).join(' ');
    wx.setClipboardData({
      data: text || addr || title,
      success: () => wx.showToast({ title: hint || '地址已复制，可粘贴到地图', icon: 'none' })
    });
  };

  const openSystem = () => {
    if (lat == null || lng == null) {
      copyAndHint('该球场暂无坐标，已复制地址');
      return;
    }
    wx.openLocation({
      latitude: lat,
      longitude: lng,
      name: title,
      address: addr,
      scale: 16,
      fail: () => copyAndHint('无法打开系统地图，已复制地址')
    });
  };

  wx.showActionSheet({
    itemList: ['系统地图导航', '复制地址去高德', '复制地址去百度'],
    success: (res) => {
      if (res.tapIndex === 0) openSystem();
      else if (res.tapIndex === 1) copyAndHint('已复制，请打开高德地图搜索');
      else copyAndHint('已复制，请打开百度地图搜索');
    }
  });
}

module.exports = {
  DEFAULT_GUANGZHOU,
  haversineKm,
  formatDistance,
  getSavedLocation,
  saveChosenLocation,
  clearSavedLocation,
  getGpsLocation,
  getCurrentLocation,
  chooseLocationOnMap,
  openInMaps
};
