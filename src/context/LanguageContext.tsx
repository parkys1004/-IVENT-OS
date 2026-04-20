import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'ko' | 'en' | 'ja' | 'zh' | 'th' | 'vi';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Basic UI translations
const translations: Record<Language, Record<string, string>> = {
  ko: {
    'nav.explore': '행사 찾기',
    'nav.tickets': '내 예매내역',
    'nav.favorites': '찜/팔로잉',
    'nav.community': '커뮤니티',
    'nav.profile': '마이페이지',
    'event.translate': '자동 번역',
    'event.translating': '번역 중...',
    'event.original': '원문 보기',
    'event.details': '행사 상세 정보',
    'event.date': '날짜',
    'event.location': '장소',
    'event.attendees': '참여자',
    'event.price': '참가비',
    'event.register': '참여 신청하기',
    'event.cancel': '참여 취소하기',
    'event.full': '정원 초과',
    'event.registered': '참여 중',
    'event.calendar.add': '캘린더 추가',
    'event.directions': '길찾기',
    'event.map.loading': '지도를 불러오는 중...',
    'event.host': '주최자',
    'search.placeholder': '도구 검색...',
    'search.category.all': '전체',
    'search.category.party': '파티',
    'search.category.lesson': '강습',
    'search.visibility.all': '전체',
    'search.visibility.public': '공개',
    'search.visibility.members': '회원전용',
    'search.sort.latest': '최신순',
    'search.sort.upcoming': '날짜순',
    'search.sort.popular': '인기순',
  },
  en: {
    'nav.explore': 'Explore Events',
    'nav.tickets': 'My Tickets',
    'nav.favorites': 'Favorites',
    'nav.community': 'Community',
    'nav.profile': 'Profile',
    'event.translate': 'Auto Translate',
    'event.translating': 'Translating...',
    'event.original': 'View Original',
    'event.details': 'Event Details',
    'event.date': 'Date',
    'event.location': 'Location',
    'event.attendees': 'Attendees',
    'event.price': 'Price',
    'event.register': 'Register Now',
    'event.cancel': 'Cancel Registration',
    'event.full': 'Fully Booked',
    'event.registered': 'Registered',
    'event.calendar.add': 'Add to Calendar',
    'event.directions': 'Directions',
    'event.map.loading': 'Loading Map...',
    'event.host': 'Host',
    'search.placeholder': 'Search tools...',
    'search.category.all': 'All',
    'search.category.party': 'Party',
    'search.category.lesson': 'Lesson',
    'search.visibility.all': 'All',
    'search.visibility.public': 'Public',
    'search.visibility.members': 'Members Only',
    'search.sort.latest': 'Latest',
    'search.sort.upcoming': 'Upcoming',
    'search.sort.popular': 'Popular',
  },
  ja: {
    'nav.explore': 'イベントを探す',
    'nav.tickets': '予約履歴',
    'nav.favorites': 'お気に入り',
    'nav.community': 'コミュニティ',
    'nav.profile': 'プロフィール',
    'event.translate': '自動翻訳',
    'event.translating': '翻訳中...',
    'event.original': '原文を表示',
    'event.details': 'イベント詳細',
    'event.date': '日付',
    'event.location': '場所',
    'event.attendees': '参加者',
    'event.price': '参加費',
    'event.register': '参加を申し込む',
    'event.cancel': '参加をキャンセル',
    'event.full': '定員オーバー',
    'event.registered': '参加中',
    'event.calendar.add': 'カレンダーに追加',
    'event.directions': '道案内',
    'event.map.loading': '地図を読み込み中...',
    'event.host': '主催者',
    'search.placeholder': 'ツールを検索...',
    'search.category.all': '全部',
    'search.category.party': 'パティー',
    'search.category.lesson': 'レッスン',
    'search.visibility.all': '全部',
    'search.visibility.public': '公開',
    'search.visibility.members': '会員専用',
    'search.sort.latest': '最新順',
    'search.sort.upcoming': '日付順',
    'search.sort.popular': '人気順',
  },
  zh: {
    'nav.explore': '查找活动',
    'nav.tickets': '我的订单',
    'nav.favorites': '收藏',
    'nav.community': '社区',
    'nav.profile': '个人主页',
    'event.translate': '自动翻译',
    'event.translating': '翻译中...',
    'event.original': '查看原文',
    'event.details': '活动详情',
    'event.date': '日期',
    'event.location': '地点',
    'event.attendees': '参加者',
    'event.price': '参加费',
    'event.register': '立即报名',
    'event.cancel': '取消报名',
    'event.full': '名额已满',
    'event.registered': '已报名',
    'event.calendar.add': '添加到日历',
    'event.directions': '路线',
    'event.map.loading': '地图加载中...',
    'event.host': '主办方',
    'search.placeholder': '搜索工具...',
    'search.category.all': '全部',
    'search.category.party': '派对',
    'search.category.lesson': '授课',
    'search.visibility.all': '全部',
    'search.visibility.public': '公开',
    'search.visibility.members': '会员专用',
    'search.sort.latest': '最新',
    'search.sort.upcoming': '近期',
    'search.sort.popular': '热门',
  },
  th: {
    'nav.explore': 'ค้นหากิจกรรม',
    'nav.tickets': 'ตั๋วของฉัน',
    'nav.favorites': 'รายการโปรด',
    'nav.community': 'ชุมชน',
    'nav.profile': 'โปรไฟล์',
    'event.translate': 'แปลอัตโนมัติ',
    'event.translating': 'กำลังแปล...',
    'event.original': 'ดูต้นฉบับ',
    'event.details': 'รายละเอียดกิจกรรม',
    'event.date': 'วันที่',
    'event.location': 'สถานที่',
    'event.attendees': 'ผู้เข้าร่วม',
    'event.price': 'ราคา',
    'event.register': 'ลงทะเบียนตอนนี้',
    'event.cancel': 'ยกเลิกการลงทะเบียน',
    'event.full': 'เต็มแล้ว',
    'event.registered': 'ลงทะเบียนแล้ว',
    'event.calendar.add': 'เพิ่มในปฏิทิน',
    'event.directions': 'เส้นทาง',
    'event.map.loading': 'กำลังโหลดแผนที่...',
    'event.host': 'เจ้าภาพ',
    'search.placeholder': 'ค้นหาเครื่องมือ...',
    'search.category.all': 'ทั้งหมด',
    'search.category.party': 'ปาร์ตี้',
    'search.category.lesson': 'บทเรียน',
    'search.visibility.all': 'ทั้งหมด',
    'search.visibility.public': 'สาธารณะ',
    'search.visibility.members': 'สมาชิกเท่านั้น',
    'search.sort.latest': 'ล่าสุด',
    'search.sort.upcoming': 'เร็วๆ นี้',
    'search.sort.popular': 'ยอดนิยม',
  },
  vi: {
    'nav.explore': 'Khám phá sự kiện',
    'nav.tickets': 'Vé của tôi',
    'nav.favorites': 'Yêu thích',
    'nav.community': 'Cồng đồng',
    'nav.profile': 'Hồ sơ',
    'event.translate': 'Tự động dịch',
    'event.translating': 'Đang dịch...',
    'event.original': 'Xem bản gốc',
    'event.details': 'Chi tiết sự kiện',
    'event.date': 'Ngày',
    'event.location': 'Địa điểm',
    'event.attendees': 'Người tham dự',
    'event.price': 'Giá',
    'event.register': 'Đăng ký ngay',
    'event.cancel': 'Hủy đăng ký',
    'event.full': 'Đã hết chỗ',
    'event.registered': 'Đã đăng ký',
    'event.calendar.add': 'Thêm vào lịch',
    'event.directions': 'Chỉ đường',
    'event.map.loading': 'Đang tải bản đồ...',
    'event.host': 'Ban tổ chức',
    'search.placeholder': 'Tìm kiếm công cụ...',
    'search.category.all': 'Tất cả',
    'search.category.party': 'Tiệc tùng',
    'search.category.lesson': 'Bài học',
    'search.visibility.all': 'Tất cả',
    'search.visibility.public': 'Công khai',
    'search.visibility.members': 'Chỉ dành cho thành viên',
    'search.sort.latest': 'Mới nhất',
    'search.sort.upcoming': 'Sắp tới',
    'search.sort.popular': 'Phổ biến',
  },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguage] = useState<Language>(() => {
    const saved = localStorage.getItem('app-language');
    return (saved as Language) || 'ko';
  });

  useEffect(() => {
    localStorage.setItem('app-language', language);
  }, [language]);

  const t = (key: string) => {
    return translations[language][key] || translations['ko'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
