import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, getDocs, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Users, CalendarDays, Key, Settings, Trash2 } from 'lucide-react';
import { useAuth, UserProfile } from '../context/AuthContext';

interface EventData {
  id: string;
  title: string;
  category: string;
  date: any;
  currentAttendees: number;
  maxAttendees: number;
  status: string;
  hostName: string;
}

export default function AdminDashboard() {
  const { profile } = useAuth();
  const [events, setEvents] = useState<EventData[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Admin needs full access, so we just query everything
    const fetchAdminData = async () => {
      try {
        const eventsQ = query(collection(db, 'events'), orderBy('date', 'desc'));
        const usersQ = query(collection(db, 'users'), orderBy('createdAt', 'desc'));

        // Realtime for events
        const unsubEvents = onSnapshot(eventsQ, (snapshot) => {
          setEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as EventData[]);
        });

        // Realtime for users
        const unsubUsers = onSnapshot(usersQ, (snapshot) => {
          setUsers(snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() })) as UserProfile[]);
          setLoading(false);
        });

        return () => {
          unsubEvents();
          unsubUsers();
        };
      } catch (err) {
        console.error("Admin fetch error", err);
        setLoading(false);
      }
    };

    fetchAdminData();
  }, []);

  if (loading) {
    return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div></div>;
  }

  const roleCounts = {
    admin: users.filter(u => u.role === 'admin').length,
    host: users.filter(u => u.role === 'host').length,
    user: users.filter(u => u.role === 'user').length,
  };

  return (
    <div className="w-full space-y-8">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center">
          <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mr-5">
             <Users className="w-7 h-7 text-indigo-600" />
          </div>
          <div>
            <div className="text-slate-500 text-sm font-bold mb-1">총 가입자</div>
            <div className="text-3xl font-extrabold text-slate-800">{users.length}명</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center">
          <div className="w-14 h-14 bg-emerald-50 rounded-2xl flex items-center justify-center mr-5">
             <CalendarDays className="w-7 h-7 text-emerald-600" />
          </div>
          <div>
            <div className="text-slate-500 text-sm font-bold mb-1">등록된 행사</div>
            <div className="text-3xl font-extrabold text-slate-800">{events.length}건</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center">
          <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mr-5">
             <Key className="w-7 h-7 text-amber-600" />
          </div>
          <div>
            <div className="text-slate-500 text-sm font-bold mb-1">주최자 수</div>
            <div className="text-3xl font-extrabold text-slate-800">{roleCounts.host}명</div>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex items-center">
          <div className="w-14 h-14 bg-rose-50 rounded-2xl flex items-center justify-center mr-5">
             <Settings className="w-7 h-7 text-rose-600" />
          </div>
          <div>
            <div className="text-slate-500 text-sm font-bold mb-1">관리자 수</div>
            <div className="text-3xl font-extrabold text-slate-800">{roleCounts.admin}명</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {/* Events Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-800">모든 행사 현황</h2>
          </div>
          
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-slate-500 text-[12px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-bold">행사명</th>
                  <th className="p-4 font-bold">주최자</th>
                  <th className="p-4 font-bold">일시</th>
                  <th className="p-4 font-bold">관리</th>
                </tr>
              </thead>
              <tbody>
                {events.map(event => {
                  const dateObj = event.date?.toDate ? event.date.toDate() : new Date();
                  return (
                    <tr key={event.id} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 font-bold text-slate-800 text-sm">{event.title}</td>
                      <td className="p-4 text-slate-600 text-sm">{event.hostName}</td>
                      <td className="p-4 text-slate-600 text-sm">{format(dateObj, 'yyyy.MM.dd', { locale: ko })}</td>
                      <td className="p-4 text-right">
                        <Link to={`/event/${event.id}`} className="text-indigo-600 font-bold hover:text-indigo-800 text-sm px-3 py-1.5 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition-colors">
                          보기
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Users Management */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xl font-extrabold text-slate-800">모든 회원 현황</h2>
          </div>
          
          <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 z-10">
                <tr className="text-slate-500 text-[12px] uppercase tracking-wider border-b border-slate-200">
                  <th className="p-4 font-bold">사용자</th>
                  <th className="p-4 font-bold">이메일</th>
                  <th className="p-4 font-bold">유형</th>
                  <th className="p-4 font-bold">가입일</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => {
                  const createdAt = u.createdAt?.toDate ? u.createdAt.toDate() : new Date();
                  return (
                    <tr key={u.uid} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                      <td className="p-4 flex items-center gap-3">
                        {u.photoURL ? (
                          <img src={u.photoURL} className="w-8 h-8 rounded-full border border-slate-200" alt="profile" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 text-xs font-bold">?</div>
                        )}
                        <span className="font-bold text-slate-800 text-sm">{u.displayName || '이름 없음'}</span>
                      </td>
                      <td className="p-4 text-slate-600 text-sm">{u.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-md text-[11px] font-bold ${
                          u.role === 'admin' ? 'bg-rose-100 text-rose-700' :
                          u.role === 'host' ? 'bg-amber-100 text-amber-700' :
                          'bg-slate-100 text-slate-700'
                        }`}>
                          {u.role === 'admin' ? '관리자' : u.role === 'host' ? '주최자' : '참여자'}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-xs">
                        {format(createdAt, 'yy.MM.dd', { locale: ko })}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
