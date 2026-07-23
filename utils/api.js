// utils/api.js
// 模拟接口数据 - 真实环境替换为 wx.request 调用后端

const MOCK_COURTS = [
  {
    id: 1, name: '天河体育中心 11人场', type: '11人制', price: 1200,
    distance: 1.2, rating: 4.8, freeSlots: ['今晚19:00', '今晚20:00', '明晚19:00'],
    address: '广州市天河区天河路299号', phone: '020-12345678',
    img: 'https://images.unsplash.com/photo-1551958219-acbc608c6377?w=400',
    tags: ['天然草', '灯光夜场', '停车场'],
    openTime: '08:00-23:00'
  },
  {
    id: 2, name: '番禺五人球场A', type: '5人制', price: 280,
    distance: 3.5, rating: 4.6, freeSlots: ['今晚21:00', '明天下午14:00', '后天19:00'],
    address: '广州市番禺区市桥镇西丽路', phone: '020-23456789',
    img: 'https://images.unsplash.com/photo-1459865264687-595d652de67e?w=400',
    tags: ['人工草', '夜场', '淋浴'],
    openTime: '10:00-23:30'
  },
  {
    id: 3, name: '海珠7人制球场', type: '7人制', price: 580,
    distance: 5.2, rating: 4.7, freeSlots: ['周四19:00', '周五20:00', '周六下午'],
    address: '广州市海珠区滨江东路', phone: '020-34567890',
    img: 'https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=400',
    tags: ['人工草', '夜场', '休息区'],
    openTime: '09:00-22:00'
  },
  {
    id: 4, name: '白云山体育公园', type: '5人制', price: 220,
    distance: 7.8, rating: 4.5, freeSlots: ['周末全天', '周一晚'],
    address: '广州市白云区同泰路', phone: '020-45678901',
    img: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=400',
    tags: ['人工草', '便宜', '周边餐饮'],
    openTime: '08:00-22:00'
  }
];

const MOCK_LFG = [
  {
    id: 1, type: '找人顶', teamName: '越秀老炮队', logo: '',
    location: '天河体育中心', time: '今晚 20:00', need: 2,
    level: '业余', contact: '微信同名', status: '招募中',
    desc: '周三夜场友谊赛，缺前锋和中场，欢迎业余水平加入！',
    publishTime: '2小时前'
  },
  {
    id: 2, type: '约战', teamName: '海珠飓风队', logo: '',
    location: '海珠7人场', time: '周六下午 15:00', need: 1,
    level: '业余校队', contact: '王队长', status: '等待对手',
    desc: '海珠飓风队发起约战，7人制，欢迎同水平球队挑战！',
    publishTime: '5小时前'
  },
  {
    id: 3, type: '凑局', teamName: '散客组队', logo: '',
    location: '番禺5人场', time: '明晚 21:00', need: 3,
    level: '新手友好', contact: '现场报名', status: '招募中',
    desc: '新手友好局，缺3人，AA制，欢迎所有水平！',
    publishTime: '1天前'
  }
];

const MOCK_TEAMS = [
  {
    id: 1, name: '越秀老炮队', logo: '', level: 5, members: 18,
    attendance: 85, wins: 12, draws: 3, losses: 2,
    recruitment: true, district: '越秀区',
    founded: '2020-03', motto: '老炮不老，踢球到老'
  },
  {
    id: 2, name: '海珠飓风队', logo: '', level: 4, members: 15,
    attendance: 78, wins: 9, draws: 5, losses: 4,
    recruitment: true, district: '海珠区',
    founded: '2021-06', motto: '飓风来袭，势不可挡'
  },
  {
    id: 3, name: '天河新星队', logo: '', level: 3, members: 22,
    attendance: 72, wins: 7, draws: 4, losses: 6,
    recruitment: false, district: '天河区',
    founded: '2022-09', motto: '新星闪耀，未来可期'
  }
];

// 模拟接口
const api = {
  // 附近场地
  getNearbyCourts(params = {}) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ code: 0, data: MOCK_COURTS }), 300);
    });
  },

  // 场地详情
  getCourtDetail(id) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const court = MOCK_COURTS.find(c => c.id === Number(id)) || MOCK_COURTS[0];
        resolve({ code: 0, data: court });
      }, 200);
    });
  },

  // 场地排期
  getCourtSchedule(id) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const slots = [];
        const hours = ['08:00', '10:00', '12:00', '14:00', '16:00', '18:00', '20:00', '22:00'];
        for (let d = 0; d < 7; d++) {
          const day = new Date();
          day.setDate(day.getDate() + d);
          slots.push({
            date: `${day.getMonth() + 1}/${day.getDate()}`,
            hours: hours.map((h, i) => ({
              time: h,
              status: Math.random() > 0.4 ? 'free' : 'booked'
            }))
          });
        }
        resolve({ code: 0, data: slots });
      }, 200);
    });
  },

  // 凑人列表
  getLfgList(params = {}) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ code: 0, data: MOCK_LFG }), 300);
    });
  },

  // 发布凑人
  publishLfg(data) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ code: 0, data: { id: Date.now(), ...data } }), 500);
    });
  },

  // 球队列表
  getTeamList() {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ code: 0, data: MOCK_TEAMS }), 300);
    });
  },

  // 创建球队
  createTeam(data) {
    return new Promise((resolve) => {
      setTimeout(() => resolve({ code: 0, data: { id: Date.now(), ...data } }), 500);
    });
  },

  // 创建订单
  createOrder(data) {
    return new Promise((resolve) => {
      setTimeout(() => {
        const order = {
          id: 'O' + Date.now(),
          ...data,
          status: '待支付',
          createdAt: new Date().toISOString()
        };
        resolve({ code: 0, data: order });
      }, 300);
    });
  },

  // 订单列表
  getOrderList() {
    return new Promise((resolve) => {
      setTimeout(() => {
        const orders = [
          { id: 'O1001', courtName: '天河体育中心', date: '今晚 20:00', price: 1200, status: '已支付' },
          { id: 'O1002', courtName: '番禺五人球场A', date: '周六 14:00', price: 280, status: '待支付' },
          { id: 'O1003', courtName: '海珠7人制球场', date: '上周日 19:00', price: 580, status: '已完成' }
        ];
        resolve({ code: 0, data: orders });
      }, 300);
    });
  },

  // 微信登录
  wxLogin(code) {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          code: 0,
          data: {
            token: 'mock_token_' + Date.now(),
            userInfo: {
              id: 1001,
              nickName: '广州老炮',
              avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200',
              phone: '138****8888',
              city: '广州'
            }
          }
        });
      }, 300);
    });
  }
};

module.exports = api;