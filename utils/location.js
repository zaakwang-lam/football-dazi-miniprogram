// utils/location.js
// 仅使用已开通的 wx.chooseLocation（不要调用 wx.getLocation，公众平台未开通会无法提审）

const STORAGE_KEY = 'user_chosen_location';

const DEFAULT_GUANGZHOU = {
  latitude: 23.1291,
  longitude: 113.2644,
  name: '广州市'
};

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
    name: loc.name || loc.address || '已选位置',
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

function chooseLocationOnMap() {
  return new Promise((resolve) => {
    const openPicker = () => {
      wx.chooseLocation({
        success: (res) => {
          const loc = {
            name: res.name || '',
            address: res.address || res.name || '',
            latitude: res.latitude,
            longitude: res.longitude
          };
          saveChosenLocation(loc);
          resolve(loc);
        },
        fail: (err) => {
          console.warn('[location] chooseLocation fail:', err);
          const msg = (err && err.errMsg) || '';
          if (msg.indexOf('cancel') >= 0) {
            resolve(null);
            return;
          }
          if (msg.indexOf('auth deny') >= 0 || msg.indexOf('authorize') >= 0) {
            wx.showModal({
              title: '需要位置权限',
              content: '请允许使用位置信息，以便计算到球场的距离',
              confirmText: '去设置',
              success: (m) => { if (m.confirm) wx.openSetting({}); }
            });
          } else {
            wx.showToast({ title: '打开地图失败', icon: 'none' });
          }
          resolve(null);
        }
      });
    };
    wx.getSetting({
      success: (setting) => {
        const authed = setting.authSetting && setting.authSetting['scope.userLocation'];
        if (authed === false) {
          wx.showModal({
            title: '需要位置权限',
            content: '请允许使用位置信息后重试',
            confirmText: '去设置',
            success: (m) => {
              if (m.confirm) {
                wx.openSetting({
                  success: (s) => {
                    if (s.authSetting && s.authSetting['scope.userLocation']) openPicker();
                    else resolve(null);
                  }
                });
              } else resolve(null);
            }
          });
          return;
        }
        openPicker();
      },
      fail: () => openPicker()
    });
  });
}

async function getCurrentLocation() {
  return getSavedLocation();
}

module.exports = {
  DEFAULT_GUANGZHOU,
  getCurrentLocation,
  chooseLocationOnMap,
  getSavedLocation,
  saveChosenLocation,
  clearSavedLocation,
  formatDistance
};
