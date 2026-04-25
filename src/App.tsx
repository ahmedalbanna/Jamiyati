/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Plus, 
  Users, 
  Mic, 
  CheckCircle2, 
  History, 
  Settings, 
  Wallet, 
  ChevronRight, 
  Info,
  Calendar,
  DollarSign,
  User,
  ArrowRight,
  LogOut,
  Play,
  Square,
  Bell,
  Scale
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, db } from './firebase';
import { 
  signInWithPopup, 
  GoogleAuthProvider, 
  onAuthStateChanged, 
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  getDocs,
  serverTimestamp,
  orderBy
} from 'firebase/firestore';
import { Association, Member, Payment, Payout, Dispute, Notification as AppNotification } from './types';

// Global Error Handler for Firestore
function handleFirestoreError(error: any, op: string, path: string) {
  console.error(`Firestore Error [${op}] at ${path}:`, error);
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [activeAssociation, setActiveAssociation] = useState<Association | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [view, setView] = useState<'dashboard' | 'association' | 'members'>('dashboard');
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!user) {
      setAssociations([]);
      setNotifications([]);
      return;
    }

    const q = query(
      collection(db, 'associations'), 
      where('directorUid', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Association));
      setAssociations(list);
    }, (err) => handleFirestoreError(err, 'list', 'associations'));

    const notifQ = query(
      collection(db, 'users', user.uid, 'notifications'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeNotif = onSnapshot(notifQ, (snapshot) => {
      setNotifications(snapshot.docs.map(d => ({ id: d.id, ...d.data() } as AppNotification)));
    }, (err) => handleFirestoreError(err, 'list', 'notifications'));

    return () => {
      unsubscribe();
      unsubscribeNotif();
    };
  }, [user]);

  const login = async () => {
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const logout = () => signOut(auth);

  if (loading) return (
    <div className="flex h-screen items-center justify-center bg-stone-50">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-primary-green"></div>
    </div>
  );

  if (!user) return <LandingPage login={login} />;

  return (
    <div className="min-h-screen bg-stone-50 text-stone-800 font-sans pb-20" dir="rtl">
      {/* Header */}
      <header className="bg-stone-50 px-6 py-6 flex items-center justify-between sticky top-0 z-50">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-primary-green">جمعيتي</h1>
            <span className="text-[10px] uppercase tracking-widest font-bold text-stone-400 mt-1">| الحافظ الأمين</span>
          </div>
          {activeAssociation && view === 'association' && (
            <p className="text-sm text-stone-500 font-medium">{activeAssociation.name}</p>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-white px-4 py-2 rounded-2xl border border-stone-200 shadow-sm hidden sm:block">
             <p className="text-[10px] text-stone-400 font-black uppercase tracking-widest">إجمالي الصندوق</p>
             <p className="text-lg font-black text-primary-green">
               {associations.reduce((acc, a) => acc + (a.totalAmount || 0), 0).toLocaleString()} <span className="text-[10px]">ريال</span>
             </p>
          </div>
          <div className="relative">
            <button 
              onClick={() => setShowNotifications(!showNotifications)}
              className="p-2 text-stone-400 hover:text-stone-800 transition-colors relative"
            >
              <Bell className="w-5 h-5" />
              {notifications.some(n => !n.isRead) && (
                <span className="absolute top-2 left-2 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
            <AnimatePresence>
              {showNotifications && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  className="absolute left-0 mt-2 w-72 bg-white rounded-2xl shadow-xl border border-stone-100 overflow-hidden z-50 text-right"
                >
                  <div className="p-4 border-b border-stone-100 flex items-center justify-between">
                    <h3 className="font-black text-stone-800 text-sm">التنبيهات</h3>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="p-4 text-center text-xs font-bold text-stone-400">
                        لا توجد تنبيهات جديدة
                      </div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} className={`p-4 border-b border-stone-50 ${n.isRead ? 'opacity-50' : 'bg-primary-green/5'}`} onClick={async () => {
                          if (!n.isRead) await updateDoc(doc(db, 'users', user.uid, 'notifications', n.id!), { isRead: true });
                        }}>
                          <p className="font-bold text-stone-800 text-xs">{n.title}</p>
                          <p className="text-[10px] text-stone-500 mt-1">{n.body}</p>
                        </div>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-primary-green p-0.5">
            <img src={user.photoURL || ''} alt={user.displayName || ''} className="w-full h-full rounded-full" referrerPolicy="no-referrer" />
          </div>
          <button 
            onClick={logout}
            className="p-2 text-stone-400 hover:text-stone-800 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          {isCreating ? (
            <motion.div key="create" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CreateAssociation 
                onCancel={() => setIsCreating(false)} 
                onCreated={(assoc) => {
                  setIsCreating(false);
                  setActiveAssociation(assoc);
                  setView('association');
                }}
                user={user}
              />
            </motion.div>
          ) : view === 'dashboard' ? (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard 
                associations={associations} 
                onSelect={(a) => {
                  setActiveAssociation(a);
                  setView('association');
                }}
                onCreate={() => setIsCreating(true)}
              />
            </motion.div>
          ) : view === 'association' && activeAssociation ? (
            <motion.div key="association" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AssociationDetail 
                assoc={activeAssociation} 
                onBack={() => setView('dashboard')}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>
      </main>

      {/* Navigation Rail for Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-md border-t border-stone-100 px-8 py-4 flex justify-around items-center z-50 shadow-[0_-10px_30px_rgba(0,0,0,0.03)]">
        <button 
          onClick={() => setView('dashboard')}
          className={`flex flex-col items-center gap-1 transition-all ${view === 'dashboard' ? 'text-primary-green scale-110' : 'text-stone-300 hover:text-stone-500'}`}
        >
          <Wallet className="w-6 h-6" />
          <span className="text-[10px] uppercase tracking-widest font-black">الرئيسية</span>
        </button>
        <button 
          onClick={() => setIsCreating(true)}
          className="bg-primary-green p-4 rounded-3xl -mt-12 shadow-2xl shadow-primary-green/30 text-white transform hover:scale-110 transition-transform active:scale-95"
        >
          <Plus className="w-8 h-8 outline-none" />
        </button>
        <button 
          className="flex flex-col items-center gap-1 text-stone-300 hover:text-stone-500 transition-all"
        >
          <History className="w-6 h-6" />
          <span className="text-[10px] uppercase tracking-widest font-black">الأرشيف</span>
        </button>
      </nav>
    </div>
  );
}

function LandingPage({ login }: { login: () => void }) {
  return (
    <div className="min-h-screen bg-stone-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-sm w-full space-y-12"
      >
        <div className="space-y-6">
          <div className="w-24 h-24 bg-primary-green rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-primary-green/20 relative">
            <Wallet className="w-12 h-12 text-white" />
            <div className="absolute -bottom-2 -right-2 bg-secondary-orange text-white p-2 rounded-full shadow-lg">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <h1 className="text-5xl font-black text-stone-900 tracking-tighter">جمعيتي</h1>
            <p className="text-xl text-stone-500 font-medium italic mt-2">"جمعيتكم… بالنظام، بالذمة، وبصوتكم"</p>
          </div>
        </div>

        <div className="p-10 bg-white rounded-[3rem] shadow-2xl shadow-stone-200 border border-stone-100 space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-stone-50/50 rounded-full blur-3xl -mr-10 -mt-10"></div>
          <p className="text-stone-600 leading-relaxed font-bold text-lg relative z-10">
            وثّق ذمم الناس بصورهم وأصواتهم. لا دفتر يضيع ولا صديق يُحرج.
          </p>
          <button 
            onClick={login}
            className="w-full bg-primary-green text-white rounded-3xl py-5 font-black text-lg flex items-center justify-center gap-4 hover:bg-primary-green-dark transition-all shadow-xl shadow-primary-green/10 active:scale-95 relative z-10"
          >
            <div className="w-7 h-7 bg-white rounded-full flex items-center justify-center">
              <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
            </div>
            الدخول عبر جوجل
          </button>
        </div>

        <p className="text-stone-400 text-sm font-black uppercase tracking-[0.2em] opacity-50">
          نظام يمني بنكهة عالمية
        </p>
      </motion.div>
    </div>
  );
}

function DashboardAssociationCard({ a, onSelect }: { a: Association, onSelect: (a: Association) => void }) {
  const [payments, setPayments] = useState<Payment[]>([]);
  
  useEffect(() => {
    if (!a.id) return;
    const q = collection(db, 'associations', a.id, 'payments');
    const unsubscribe = onSnapshot(q, (s) => {
      setPayments(s.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
    }, (err) => handleFirestoreError(err, 'list', 'payments'));
    return unsubscribe;
  }, [a.id]);

  const totalExpectedPayments = a.memberCount * a.memberCount;
  const progressPercent = totalExpectedPayments > 0 ? (payments.length / totalExpectedPayments) * 100 : 0;

  return (
    <motion.div
      layoutId={a.id}
      onClick={() => onSelect(a)}
      className="group bento-card p-6 cursor-pointer hover:border-primary-green/30 space-y-4"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <div className="w-16 h-16 bg-stone-50 rounded-[1.5rem] border border-stone-100 flex items-center justify-center group-hover:bg-primary-green/5 transition-colors">
            <span className="text-2xl font-black text-primary-green">{a.name.charAt(0)}</span>
          </div>
          <div>
            <h3 className="text-xl font-black text-stone-800 tracking-tight">{a.name}</h3>
            <div className="flex items-center gap-3 text-stone-500 text-xs font-black uppercase tracking-widest mt-2">
              <span className="flex items-center gap-1 text-primary-green"><Users className="w-3 h-3" /> {a.memberCount} عضو</span>
              <span className="w-1 h-1 bg-stone-200 rounded-full"></span>
              <span className="text-stone-400">{a.totalAmount.toLocaleString()} ريال</span>
            </div>
          </div>
        </div>
        <div className="w-10 h-10 rounded-full bg-stone-50 flex items-center justify-center group-hover:bg-primary-green group-hover:text-white transition-all">
          <ChevronRight className="w-5 h-5 flip-h" />
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-stone-400">
          <span>{payments.length} الدفعات</span>
          <span>{Math.round(progressPercent)}%</span>
        </div>
        <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
          <div style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} className="h-full bg-primary-green rounded-full transition-all duration-1000"></div>
        </div>
      </div>
    </motion.div>
  );
}

function Dashboard({ associations, onSelect, onCreate }: { 
  associations: Association[], 
  onSelect: (a: Association) => void,
  onCreate: () => void
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-stone-900 tracking-tight">نشاطك</h2>
          <p className="text-stone-500 font-medium italic">لديك {associations.length} جمعيات نشطة</p>
        </div>
        <button 
          onClick={async () => {
            const userId = auth.currentUser?.uid;
            if (!userId) return;
            await addDoc(collection(db, 'users', userId, 'notifications'), {
              userId,
              associationId: 'simulator',
              title: 'تذكير بموعد القسط',
              body: 'اقترب موعد سداد القسط الشهري. حافظ على التزامك لتتجنب الإحراج.',
              createdAt: new Date().toISOString(),
              isRead: false
            });
          }}
          className="bg-stone-100 text-stone-500 p-3 rounded-2xl hover:bg-stone-200 transition-colors"
          title="محاكاة إشعار"
        >
          <Bell className="w-5 h-5" />
        </button>
      </div>

      <div className="space-y-6">
        {associations.length === 0 ? (
          <div className="p-16 bento-card text-center space-y-6 bg-white/50 border-dashed border-2">
            <div className="w-20 h-20 bg-stone-100 rounded-[2rem] flex items-center justify-center mx-auto">
              <Users className="w-10 h-10 text-stone-300" />
            </div>
            <div>
              <p className="font-black text-stone-800 text-2xl tracking-tighter">لا توجد جمعيات بعد</p>
              <p className="text-stone-500 font-medium mt-1">ابدأ بتأسيس أول جمعية لك الآن</p>
            </div>
            <button 
              onClick={onCreate}
              className="bg-primary-green text-white px-8 py-4 rounded-3xl font-black hover:bg-primary-green-dark transition-all shadow-xl shadow-primary-green/10 active:scale-95"
            >
              تأسيس جمعية جديدة
            </button>
          </div>
        ) : (
          associations.map((a) => (
            <DashboardAssociationCard key={a.id} a={a} onSelect={onSelect} />
          ))
        )}
      </div>
    </motion.div>
  );
}

function CreateAssociation({ onCancel, onCreated, user }: { 
  onCancel: () => void, 
  onCreated: (a: Association) => void,
  user: FirebaseUser
}) {
  const [formData, setFormData] = useState({
    name: '',
    totalAmount: '',
    monthlyContribution: '',
    memberCount: '',
    startDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const assoc: Association = {
      name: formData.name,
      totalAmount: Number(formData.totalAmount),
      monthlyContribution: Number(formData.monthlyContribution),
      memberCount: Number(formData.memberCount),
      startDate: formData.startDate,
      status: 'active',
      directorUid: user.uid,
      rotationOrder: []
    };

    try {
      const docRef = await addDoc(collection(db, 'associations'), assoc);
      onCreated({ ...assoc, id: docRef.id });
    } catch (err) {
      handleFirestoreError(err, 'create', 'associations');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-stone-900 tracking-tight">تأسيس جمعية</h2>
        <button onClick={onCancel} className="p-2 text-stone-400 hover:text-stone-800">إلغاء</button>
      </div>

      <form onSubmit={handleSubmit} className="bento-card p-10 space-y-8">
        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.2em] font-black text-stone-400 block px-1">اسم الجمعية</label>
          <input 
            required
            placeholder="مثال: جمعية إخوان المحابشة"
            className="w-full bg-stone-50 border-stone-100 rounded-[1.5rem] py-5 px-6 font-bold text-lg focus:ring-2 focus:ring-primary-green/20 outline-none transition-all"
            value={formData.name}
            onChange={e => setFormData({ ...formData, name: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[0.2em] font-black text-stone-400 block px-1">عدد الأعضاء</label>
            <input 
              required
              type="number"
              placeholder="10"
              className="w-full bg-stone-50 border-stone-100 rounded-[1.5rem] py-5 px-6 font-bold focus:ring-2 focus:ring-primary-green/20 outline-none transition-all"
              value={formData.memberCount}
              onChange={e => setFormData({ ...formData, memberCount: e.target.value })}
            />
          </div>
          <div className="space-y-3">
            <label className="text-[10px] uppercase tracking-[0.2em] font-black text-stone-400 block px-1">تاريخ البدء</label>
            <input 
              required
              type="date"
              className="w-full bg-stone-50 border-stone-100 rounded-[1.5rem] py-5 px-6 font-bold focus:ring-2 focus:ring-primary-green/20 outline-none transition-all"
              value={formData.startDate}
              onChange={e => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] uppercase tracking-[0.2em] font-black text-stone-400 block px-1">القسط الشهري (ريال)</label>
          <input 
            required
            type="number"
            placeholder="30,000"
            className="w-full bg-stone-50 border-stone-100 rounded-[1.5rem] py-6 px-8 font-black text-3xl focus:ring-2 focus:ring-primary-green/20 outline-none text-primary-green transition-all"
            value={formData.monthlyContribution}
            onChange={e => setFormData({ ...formData, monthlyContribution: e.target.value })}
          />
        </div>

        <div className="p-6 bg-stone-900 rounded-[2rem] text-white flex items-center justify-between shadow-2xl shadow-stone-900/10">
          <span className="font-bold text-stone-400 text-sm">المبلغ الإجمالي للاستلام:</span>
          <span className="text-3xl font-black text-secondary-orange">
            {(Number(formData.monthlyContribution) * Number(formData.memberCount)).toLocaleString() || 0} <span className="text-xs font-medium">ر.ي</span>
          </span>
        </div>

        <button 
          type="submit"
          className="w-full bg-primary-green text-white py-6 rounded-[2rem] font-black text-xl shadow-2xl shadow-primary-green/20 hover:bg-primary-green-dark transition-all active:scale-95"
        >
          تأكيد التأسيس
        </button>
      </form>
    </motion.div>
  );
}

function AssociationDetail({ assoc, onBack }: { assoc: Association, onBack: () => void }) {
  const [members, setMembers] = useState<Member[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [showVoiceRecorder, setShowVoiceRecorder] = useState<{ isOpen: boolean, type: 'agreement' | 'payment' | 'dispute' | 'dispute_response' | 'payout_receipt', targetId?: string }>({ isOpen: false, type: 'agreement' });

  useEffect(() => {
    const q = collection(db, 'associations', assoc.id!, 'members');
    return onSnapshot(q, (s) => {
      setMembers(s.docs.map(d => ({ id: d.id, ...d.data() } as Member)));
    });
  }, [assoc.id]);

  useEffect(() => {
    const q = collection(db, 'associations', assoc.id!, 'payments');
    return onSnapshot(q, (s) => {
      setPayments(s.docs.map(d => ({ id: d.id, ...d.data() } as Payment)));
    });
  }, [assoc.id]);

  useEffect(() => {
    const q = collection(db, 'associations', assoc.id!, 'disputes');
    return onSnapshot(q, (s) => {
      setDisputes(s.docs.map(d => ({ id: d.id, ...d.data() } as Dispute)));
    });
  }, [assoc.id]);

  useEffect(() => {
    const q = collection(db, 'associations', assoc.id!, 'payouts');
    return onSnapshot(q, (s) => {
      setPayouts(s.docs.map(d => ({ id: d.id, ...d.data() } as Payout)));
    });
  }, [assoc.id]);

  const [activeTab, setActiveTab] = useState<'members' | 'payments' | 'payouts' | 'disputes' | 'settings'>('members');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [memberSearchQuery, setMemberSearchQuery] = useState('');

  const filteredMembers = members.filter(m => m.name.toLowerCase().includes(memberSearchQuery) || m.phone.includes(memberSearchQuery));

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-8"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={onBack} className="p-3 bg-white rounded-full shadow-sm hover:bg-stone-50 transition-colors">
            <ArrowRight className="w-5 h-5 ml-2" />
          </button>
          <div>
            <h2 className="text-3xl font-black text-stone-900 tracking-tight flex items-center gap-2">
              {assoc.name}
              {assoc.isEmergencyFund && <span className="text-[10px] bg-red-100 text-red-600 px-2 py-1 rounded-full uppercase tracking-widest leading-none mt-1">حالة طوارئ</span>}
            </h2>
            <p className="text-stone-500 font-medium">{assoc.isEmergencyFund ? 'صندوق טوارئ إنساني' : `الميزانية الكلية: ${assoc.totalAmount.toLocaleString()} ر.ي`}</p>
          </div>
        </div>

        {assoc.directorUid === auth.currentUser?.uid && !assoc.isEmergencyFund && (
          <button 
            onClick={async () => {
              if (window.confirm('هل أنت متأكد من تحويل هذه الجمعية إلى صندوق طوارئ خيري؟')) {
                await updateDoc(doc(db, 'associations', assoc.id!), { isEmergencyFund: true });
              }
            }}
            className="flex items-center gap-2 bg-red-50 text-red-600 p-3 rounded-2xl font-black text-xs hover:bg-red-100 transition-colors shadow-sm"
          >
            <Scale className="w-4 h-4" />
            تفعيل كحالة طوارئ
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-stone-100 p-1 rounded-2xl overflow-x-auto">
        {[
          { id: 'members', label: 'الأعضاء', icon: Users },
          { id: 'payments', label: 'الأقساط', icon: DollarSign },
          { id: 'payouts', label: 'الاستلام', icon: Wallet },
          { id: 'disputes', label: 'المنازعات', icon: Info },
          ...(assoc.directorUid === auth.currentUser?.uid ? [{ id: 'settings', label: 'إعدادات', icon: Settings }] : [])
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 py-3 rounded-xl transition-all font-bold text-sm ${
              activeTab === tab.id 
              ? 'bg-white text-stone-900 shadow-sm' 
              : 'text-stone-400 hover:text-stone-600'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'members' && (
          <motion.div 
            key="members"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xl font-black text-stone-900">إدارة الأعضاء ({members.length}/{assoc.memberCount})</h3>
              <button 
                onClick={() => setIsAddingMember(true)}
                className="text-primary-green font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-stone-50 px-4 py-2 rounded-2xl transition-all border border-stone-100"
              >
                <Plus className="w-4 h-4" /> إضافة عضو
              </button>
            </div>

            <div className="relative">
              <input 
                placeholder="البحث بالاسم أو رقم الهاتف..."
                className="w-full bg-stone-50 border-stone-100 rounded-2xl py-3 px-5 font-bold outline-none focus:ring-2 focus:ring-primary-green/20 text-sm transition-all text-right"
                value={memberSearchQuery}
                onChange={(e) => setMemberSearchQuery(e.target.value.toLowerCase())}
              />
            </div>

            <AnimatePresence>
              {isAddingMember && (
                <AddMemberForm 
                  assocId={assoc.id!} 
                  onClose={() => setIsAddingMember(false)} 
                />
              )}
            </AnimatePresence>

            <div className="space-y-3">
              {filteredMembers.map((m) => (
                <div key={m.id} data-name={m.name} data-phone={m.phone} onClick={() => setSelectedMember(m)} className="member-row bg-white p-5 rounded-3xl border border-stone-100 shadow-sm flex items-center justify-between group cursor-pointer hover:border-primary-green/30 transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-stone-100 rounded-full flex items-center justify-center text-stone-400 group-hover:bg-primary-green/5 group-hover:text-primary-green transition-colors">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h4 className="font-bold text-stone-800">{m.name}</h4>
                      <p className="text-xs text-stone-400 font-medium">{m.phone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {m.voiceAgreement ? (
                      <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-primary-green">
                        <CheckCircle2 className="w-5 h-5" />
                      </div>
                    ) : (
                      <button 
                        onClick={(e) => { e.stopPropagation(); setShowVoiceRecorder({ isOpen: true, type: 'agreement', targetId: m.id }); }}
                        className="p-4 bg-stone-50 text-stone-400 rounded-2xl hover:text-primary-green hover:bg-emerald-50 transition-all opacity-100"
                      >
                        <Mic className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'payments' && (
          <motion.div 
            key="payments"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <PaymentsList 
              assoc={assoc} 
              members={members} 
              payments={payments}
              onMarkPaid={(mId, month) => setShowVoiceRecorder({ isOpen: true, type: 'payment', targetId: `${mId}:${month}` })}
            />
          </motion.div>
        )}

        {activeTab === 'payouts' && (
          <motion.div 
            key="payouts"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <PayoutsList 
              assoc={assoc} 
              members={members} 
              payouts={payouts}
              onMarkReceived={(mId, month) => setShowVoiceRecorder({ isOpen: true, type: 'payout_receipt', targetId: `${mId}:${month}` })} 
            />
          </motion.div>
        )}

        {activeTab === 'disputes' && (
          <motion.div 
            key="disputes"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xl font-black text-stone-900">سجل المنازعات</h3>
              <button 
                onClick={() => setShowVoiceRecorder({ isOpen: true, type: 'dispute' })}
                className="text-red-500 font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-red-50 px-4 py-2 rounded-2xl transition-all border border-red-100"
              >
                <Plus className="w-4 h-4" /> رفع ملاحظة / نزاع
              </button>
            </div>
            
            <div className="space-y-4">
              {disputes.length === 0 ? (
                <div className="p-10 bento-card text-center border-dashed border-2">
                  <Info className="w-10 h-10 text-stone-300 mx-auto mb-3" />
                  <p className="font-bold text-stone-500">لا توجد منازعات أو ملاحظات مسجلة.</p>
                </div>
              ) : (
                disputes.map(d => (
                  <div key={d.id} className="bento-card p-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-black text-stone-800">{d.title}</h4>
                        <p className="text-xs font-bold text-stone-400 mt-1">{new Date(d.createdAt).toLocaleDateString()}</p>
                      </div>
                      <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        d.status === 'resolved' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {d.status === 'resolved' ? 'تم الحل' : 'مفتوح'}
                      </span>
                    </div>
                    
                    {d.voiceStatement && (
                      <div className="bg-stone-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-stone-400 uppercase tracking-widest mb-2">تسجيل الشكوى</p>
                        <audio src={d.voiceStatement} controls className="w-full h-10" />
                      </div>
                    )}

                    {d.voiceResponse ? (
                      <div className="bg-emerald-50 p-4 rounded-2xl">
                        <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-2">رد الإدارة (الحل)</p>
                        <audio src={d.voiceResponse} controls className="w-full h-10" />
                      </div>
                    ) : (
                      assoc.directorUid === auth.currentUser?.uid && (
                        <button 
                          onClick={() => setShowVoiceRecorder({ isOpen: true, type: 'dispute_response', targetId: d.id })}
                          className="w-full bg-stone-100 text-stone-600 py-3 rounded-xl font-bold text-xs hover:bg-stone-200 transition-colors"
                        >
                          إضافة رد صوتي للإغلاق
                        </button>
                      )
                    )}
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'settings' && assoc.directorUid === auth.currentUser?.uid && (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            <div className="bento-card p-8 space-y-6">
              <div>
                <h3 className="text-xl font-black text-stone-900 tracking-tight mb-2">إعدادات الإشعارات</h3>
                <p className="text-stone-500 font-bold text-sm">تخصيص نغمة الإشعارات الافتراضية لهذه الجمعية.</p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-black text-stone-400">نغمة الإشعار الأساسية</label>
                  <select 
                    value={assoc.notificationSound || 'default'}
                    onChange={async (e) => {
                      await updateDoc(doc(db, 'associations', assoc.id!), {
                        notificationSound: e.target.value
                      });
                    }}
                    className="w-full bg-stone-50 border-stone-100 rounded-2xl py-4 px-5 font-bold outline-none focus:ring-2 focus:ring-primary-green/20 transition-all text-sm"
                  >
                    <option value="default">الافتراضية (رنين هادئ)</option>
                    <option value="urgent">عاجل (تنبيه قوي)</option>
                    <option value="success">نجاح (رنين مبهج)</option>
                    <option value="chime">رنين جرس (كلاسيكي)</option>
                    <option value="silent">صامت</option>
                  </select>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <VoiceRecorderModal 
        isOpen={showVoiceRecorder.isOpen}
        type={showVoiceRecorder.type}
        onClose={() => setShowVoiceRecorder({ ...showVoiceRecorder, isOpen: false })}
        onSave={async (base64, title, desc) => {
          if (showVoiceRecorder.type === 'agreement' && showVoiceRecorder.targetId) {
            await updateDoc(doc(db, 'associations', assoc.id!, 'members', showVoiceRecorder.targetId), {
              voiceAgreement: base64
            });
          } else if (showVoiceRecorder.type === 'payment' && showVoiceRecorder.targetId) {
            const [mId, month] = showVoiceRecorder.targetId.split(':');
            await addDoc(collection(db, 'associations', assoc.id!, 'payments'), {
              associationId: assoc.id!,
              memberId: mId,
              month,
              amount: assoc.monthlyContribution,
              status: 'paid',
              paidAt: new Date().toISOString(),
              voiceConfirmation: base64
            });
          } else if (showVoiceRecorder.type === 'payout_receipt' && showVoiceRecorder.targetId) {
            const [mId, month] = showVoiceRecorder.targetId.split(':');
            await addDoc(collection(db, 'associations', assoc.id!, 'payouts'), {
              associationId: assoc.id!,
              memberId: mId,
              month,
              amount: assoc.totalAmount,
              status: 'received',
              receivedAt: new Date().toISOString(),
              voiceReceipt: base64
            });
          } else if (showVoiceRecorder.type === 'dispute') {
            await addDoc(collection(db, 'associations', assoc.id!, 'disputes'), {
              associationId: assoc.id!,
              reporterId: auth.currentUser?.uid,
              status: 'open',
              title: title || 'بدون عنوان',
              description: desc || '',
              voiceStatement: base64,
              createdAt: new Date().toISOString()
            });
          } else if (showVoiceRecorder.type === 'dispute_response' && showVoiceRecorder.targetId) {
            await updateDoc(doc(db, 'associations', assoc.id!, 'disputes', showVoiceRecorder.targetId), {
              voiceResponse: base64,
              status: 'resolved',
              resolvedAt: new Date().toISOString()
            });
          }
          setShowVoiceRecorder({ ...showVoiceRecorder, isOpen: false });
        }}
      />

      <AnimatePresence>
        {selectedMember && (
          <MemberProfileModal 
            member={selectedMember}
            assoc={assoc}
            payments={payments}
            onClose={() => setSelectedMember(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function PaymentsList({ assoc, members, payments, onMarkPaid }: { 
  assoc: Association, 
  members: Member[], 
  payments: Payment[],
  onMarkPaid: (mId: string, month: string) => void 
}) {
  const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
  const paidCount = payments.filter(p => p.month === currentMonth).length;
  const progress = (paidCount / members.length) * 100 || 0;

  const isEmergency = assoc.isEmergencyFund;

  return (
    <div className="space-y-8">
      <div className="bento-card p-10">
        <div className="flex justify-between items-start mb-8">
          <h2 className="text-xl font-black text-stone-800 tracking-tight">{isEmergency ? 'حالة التبرعات الطارئة' : 'حالة الدفع الشهري'}</h2>
          <span className="bg-[#E8F5E9] text-[#2E7D32] px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">
            {isEmergency ? `شارك ${paidCount} عضو` : `مكتمل بنسبة ${Math.round(progress)}%`}
          </span>
        </div>
        
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-8">
          {members.map((m) => {
            const isPaid = payments.some(p => p.memberId === m.id && p.month === currentMonth);
            return (
              <div key={m.id} className="flex flex-col items-center gap-3">
                <div className="relative">
                  <div className={`w-16 h-16 rounded-full border-4 flex items-center justify-center bg-stone-50 overflow-hidden transition-all ${
                    isPaid ? 'border-primary-green' : 'border-stone-100 opacity-50'
                  }`}>
                    <span className="font-black text-xl text-stone-800">{m.name.charAt(0)}</span>
                  </div>
                  {isPaid && (
                    <div className="absolute -bottom-1 -right-1 bg-primary-green text-white p-1 rounded-full shadow-lg">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
                <div className="text-center">
                  <p className="text-xs font-black text-stone-800 tracking-tight">{m.name}</p>
                  <p className={`text-[9px] mt-1 font-bold ${isPaid ? 'text-stone-400' : (isEmergency ? 'text-stone-400' : 'text-red-500 underline underline-offset-2')}`}>
                    {isPaid ? (isEmergency ? 'تبرع' : 'تم الدفع') : (isEmergency ? 'لم يتبرع' : 'لم يدفع بعد')}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-[10px] uppercase tracking-[0.2em] font-black text-stone-400 px-2">{isEmergency ? 'قائمة التبرعات التفصيلية' : 'قائمة السداد التفصيلية'}</h3>
        <div className="space-y-3">
          {members.map(m => {
            const isPaid = payments.some(p => p.memberId === m.id && p.month === currentMonth);
            return (
              <div key={m.id} className="bento-card p-5 flex items-center justify-between group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    isPaid ? 'bg-emerald-50 text-primary-green' : 'bg-stone-50 text-stone-300'
                  }`}>
                    {isPaid ? <CheckCircle2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <h5 className="font-black text-stone-800 text-sm">{m.name}</h5>
                    <p className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">{currentMonth}</p>
                  </div>
                </div>
                {isPaid ? (
                  <div className="bg-emerald-50 px-5 py-2 rounded-2xl">
                    <span className="text-primary-green text-[10px] font-black uppercase tracking-widest">{isEmergency ? 'تم التبرع' : 'وصل رقمي'}</span>
                  </div>
                ) : (
                  <button 
                    onClick={() => onMarkPaid(m.id!, currentMonth)}
                    className={`${isEmergency ? 'bg-red-500 shadow-red-500/10' : 'bg-primary-green shadow-primary-green/10'} text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all`}
                  >
                    {isEmergency ? 'تسجيل تبرع' : 'تسجيل دفع'}
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function PayoutsList({ assoc, members, payouts, onMarkReceived }: { assoc: Association, members: Member[], payouts: Payout[], onMarkReceived: (mId: string, month: string) => void }) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const isDirector = auth.currentUser?.uid === assoc.directorUid;
  const rotationOrder = assoc.rotationOrder || [];
  const unassignedMembers = members.filter(m => !rotationOrder.includes(m.id!));
  
  const handleAssignToOrder = async (memberId: string) => {
    if (!isDirector) return;
    const newOrder = [...rotationOrder, memberId];
    await updateDoc(doc(db, 'associations', assoc.id!), { rotationOrder: newOrder });
  };

  const handleRemoveFromOrder = async (memberId: string) => {
    if (!isDirector) return;
    const newOrder = rotationOrder.filter(id => id !== memberId);
    await updateDoc(doc(db, 'associations', assoc.id!), { rotationOrder: newOrder });
  };

  const currentReceiverId = rotationOrder[0];
  const currentReceiver = members.find(m => m.id === currentReceiverId) || members[0];
  const hasReceived = currentReceiver ? payouts.some(p => p.memberId === currentReceiver.id && p.month === currentMonth) : false;

  return (
    <div className="space-y-8">
      {currentReceiver ? (
        <div className="bento-card-primary p-10 min-h-[300px] flex flex-col justify-between relative overflow-hidden">
          <div className="relative z-10 flex flex-col justify-between h-full">
            <div>
              <h4 className="text-emerald-200 uppercase tracking-[0.2em] text-[10px] font-black mb-6">الدور القادم</h4>
              <p className="text-5xl font-black mb-3 tracking-tighter">{currentReceiver.name}</p>
              <p className="text-emerald-100/60 font-bold">تاريخ الاستحقاق المتوقع: {currentMonth}</p>
              
              <div className="mt-12 bg-white/10 backdrop-blur-xl rounded-3xl p-6 border border-white/20 inline-block w-full">
                <p className="text-[10px] mb-2 text-emerald-200 uppercase tracking-widest font-black">المبلغ المتوقع تسليمه</p>
                <p className="text-4xl font-black">{assoc.totalAmount.toLocaleString()} <span className="text-lg font-medium">ريال</span></p>
              </div>
            </div>
            
            <div className="mt-8">
              {hasReceived ? (
                <div className="bg-white/20 backdrop-blur text-white px-6 py-4 rounded-2xl flex items-center justify-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                  <span className="font-bold">تم تسليم واستلام المبلغ بنجاح</span>
                </div>
              ) : (
                <button 
                  onClick={() => onMarkReceived(currentReceiver.id!, currentMonth)}
                  className="bg-white text-primary-green w-full py-4 rounded-2xl font-black shadow-xl active:scale-95 transition-all flex justify-center items-center gap-2"
                >
                  <Mic className="w-5 h-5" /> توثيق صوتي للاستلام
                </button>
              )}
            </div>
          </div>
          
          <div className="absolute -bottom-12 -left-12 w-64 h-64 bg-emerald-700/50 rounded-full blur-3xl"></div>
          <div className="absolute -top-12 -right-12 w-48 h-48 bg-emerald-400/10 rounded-full blur-3xl"></div>
        </div>
      ) : null}

      <div className="bento-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-black text-stone-800 text-lg">ترتيب الاستلام</h3>
          {isDirector && <span className="text-[10px] text-stone-400 font-bold uppercase tracking-widest">المشرف فقط</span>}
        </div>
        
        <div className="space-y-4">
          {rotationOrder.map((mId, idx) => {
            const m = members.find(mem => mem.id === mId);
            if (!m) return null;
            return (
              <div key={mId} className="flex items-center justify-between bg-stone-50 p-4 rounded-2xl border border-stone-100">
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-primary-green text-white flex items-center justify-center font-black text-sm">
                    {idx + 1}
                  </div>
                  <span className="font-bold text-stone-800">{m.name}</span>
                </div>
                {isDirector && (
                  <button onClick={() => handleRemoveFromOrder(mId)} className="text-red-500 hover:bg-red-50 p-2 rounded-xl transition-colors">
                    إزالة
                  </button>
                )}
              </div>
            );
          })}
          
          {rotationOrder.length === 0 && (
            <p className="text-stone-400 text-xs font-bold text-center py-4">لم يتم تحديد ترتيب الاستلام بعد</p>
          )}
        </div>

        {isDirector && unassignedMembers.length > 0 && (
          <div className="mt-8 pt-6 border-t border-stone-100">
            <h4 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">أعضاء لم يحدد دورهم</h4>
            <div className="flex flex-wrap gap-2">
              {unassignedMembers.map(m => (
                <button 
                  key={m.id}
                  onClick={() => handleAssignToOrder(m.id!)}
                  className="bg-white border border-stone-200 px-4 py-2 rounded-full text-xs font-bold text-stone-600 hover:border-primary-green hover:text-primary-green transition-colors"
                >
                  + {m.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bento-card-secondary p-8 flex flex-col justify-between aspect-square">
          <div>
            <h3 className="text-orange-100 text-[10px] font-black uppercase tracking-widest mb-3">رصيد الصندوق</h3>
            <p className="text-4xl font-black">270,000</p>
            <p className="text-[10px] text-orange-100/60 mt-1 font-bold">متبقي قسط واحد</p>
          </div>
          
          <div className="space-y-4">
            <div className="w-full h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div className="bg-white h-full w-[90%] rounded-full shadow-[0_0_10px_white]"></div>
            </div>
            <button className="bg-white text-secondary-orange w-full py-4 rounded-2xl font-black text-xs shadow-xl active:scale-95 transition-all">
              تحصيل الأقساط
            </button>
          </div>
        </div>

        <div className="bento-card p-8 flex flex-col items-center justify-center text-center gap-4 aspect-square">
           <div className="w-16 h-16 bg-stone-50 rounded-[1.5rem] flex items-center justify-center">
              <Mic className="w-8 h-8 text-primary-green" />
           </div>
           <div>
             <p className="text-xs font-black text-stone-400 uppercase tracking-widest">الأرشيف</p>
             <p className="text-sm font-bold text-stone-800 mt-1">سجل الشهادات الصوتية</p>
           </div>
           <button className="text-primary-green text-[10px] font-black underline underline-offset-4 tracking-widest uppercase">
              فتح الأرشيف
           </button>
        </div>
      </div>
    </div>
  );
}

function MemberProfileModal({ 
  member, 
  assoc, 
  onClose,
  payments
}: { 
  member: Member, 
  assoc: Association, 
  onClose: () => void,
  payments: Payment[]
}) {
  const memberPayments = payments.filter(p => p.memberId === member.id && p.voiceConfirmation);

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-end sm:items-center justify-center p-0 sm:p-6">
      <motion.div 
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="bg-stone-50 w-full max-w-lg rounded-t-[2.5rem] sm:rounded-[2.5rem] p-6 sm:p-8 space-y-6 shadow-2xl h-[85vh] sm:h-auto overflow-y-auto"
      >
        <div className="flex items-center justify-between sticky top-0 bg-stone-50 pt-2 pb-4 z-10 border-b border-stone-200">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-primary-green rounded-full flex items-center justify-center text-white">
              <span className="text-2xl font-black">{member.name.charAt(0)}</span>
            </div>
            <div>
              <h2 className="text-2xl font-black text-stone-900">{member.name}</h2>
              <p className="text-sm font-bold text-stone-500">{member.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-3 bg-white rounded-full text-stone-400 hover:bg-stone-200 transition-colors">
            <LogOut className="w-5 h-5 flip-h" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="bento-card p-6">
            <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">التزام العضو</h3>
            {member.voiceAgreement ? (
              <div className="bg-emerald-50 rounded-2xl p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-emerald-600">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-bold text-sm">موافق على الشروط</span>
                </div>
                <audio src={member.voiceAgreement} controls className="w-full h-10" />
              </div>
            ) : (
              <p className="text-sm font-bold text-stone-500">لم يتم تسجيل الالتزام الصوتي بعد.</p>
            )}
          </div>

          <div className="bento-card p-6">
            <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">سجل التأكيدات الصوتية (الدفع)</h3>
            <div className="space-y-4">
              {memberPayments.length === 0 ? (
                <p className="text-sm font-bold text-stone-500">لا توجد تسجيلات دفع.</p>
              ) : (
                memberPayments.map(p => (
                  <div key={p.id} className="bg-stone-50 p-4 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-stone-800 tracking-widest uppercase">تأكيد دفع القسط</span>
                      <span className="text-[10px] font-black text-stone-400">{p.month}</span>
                    </div>
                    <audio src={p.voiceConfirmation} controls className="w-full h-10" />
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bento-card p-6">
            <h3 className="text-xs font-black text-stone-400 uppercase tracking-widest mb-4">نغمة الإشعارات المخصصة</h3>
            <select 
              value={member.notificationSound || 'default'}
              onChange={async (e) => {
                await updateDoc(doc(db, 'associations', assoc.id!, 'members', member.id!), {
                  notificationSound: e.target.value
                });
              }}
              className="w-full bg-stone-50 border-stone-100 rounded-2xl py-3 px-4 font-bold outline-none focus:ring-2 focus:ring-primary-green/20 text-sm"
            >
              <option value="default">الافتراضية (رنين هادئ)</option>
              <option value="urgent">عاجل (تنبيه قوي)</option>
              <option value="success">نجاح (رنين مبهج)</option>
              <option value="chime">رنين جرس (كلاسيكي)</option>
              <option value="silent">صامت</option>
            </select>
            <p className="text-xs text-stone-400 font-bold mt-3">سيتم استخدام هذه النغمة عند إرسال إشعارات لهذا العضو تحديداً.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function AddMemberForm({ assocId, onClose }: { assocId: string, onClose: () => void }) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, 'associations', assocId, 'members'), {
        associationId: assocId,
        name,
        phone,
        role: 'member',
        joinedAt: new Date().toISOString()
      });
      onClose();
    } catch (err) {
      handleFirestoreError(err, 'add', 'members');
    }
  };

  return (
    <motion.form 
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      onSubmit={handleSubmit}
      className="bg-white p-8 rounded-[2rem] border border-stone-100 shadow-xl shadow-stone-200/50 space-y-5 overflow-hidden"
    >
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-stone-400 px-1">الاسم الكامل</label>
          <input 
            required
            placeholder="مثال: صالح علي"
            className="w-full bg-stone-50 border-stone-100 rounded-2xl py-4 px-5 font-bold outline-none focus:ring-2 focus:ring-primary-green/10 transition-all"
            value={name}
            onChange={e => setName(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <label className="text-[10px] uppercase font-black text-stone-400 px-1">رقم الهاتف</label>
          <input 
            required
            placeholder="77xxxxxxx"
            className="w-full bg-stone-50 border-stone-100 rounded-2xl py-4 px-5 font-bold outline-none focus:ring-2 focus:ring-primary-green/10 transition-all"
            value={phone}
            onChange={e => setPhone(e.target.value)}
          />
        </div>
      </div>
      <div className="flex items-center gap-4 pt-2">
        <button type="submit" className="flex-1 bg-primary-green text-white font-black py-4 rounded-2xl shadow-lg shadow-primary-green/10 active:scale-95 transition-all">إضافة العضو</button>
        <button type="button" onClick={onClose} className="px-6 py-4 font-bold text-stone-400 hover:text-stone-800 transition-colors">إلغاء</button>
      </div>
    </motion.form>
  );
}

function VoiceRecorderModal({ isOpen, type, onClose, onSave }: {
  isOpen: boolean,
  type: 'agreement' | 'payment' | 'dispute' | 'dispute_response' | 'payout_receipt',
  onClose: () => void,
  onSave: (base64: string, title?: string, description?: string) => void
}) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [base64, setBase64] = useState<string | null>(null);
  const [disputeTitle, setDisputeTitle] = useState('');
  const [disputeDesc, setDisputeDesc] = useState('');

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;
    chunksRef.current = [];

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      setAudioUrl(URL.createObjectURL(blob));
      
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = () => {
        setBase64(reader.result as string);
      };
    };

    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setIsRecording(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white w-full max-w-sm rounded-[2.5rem] p-8 text-center space-y-4 shadow-2xl overflow-y-auto max-h-[90vh]"
      >
        <div className="w-20 h-20 bg-[#E8F5E9] rounded-[2rem] flex items-center justify-center mx-auto relative">
          <Mic className={`w-8 h-8 ${isRecording ? 'text-red-600 animate-pulse' : 'text-primary-green'}`} />
          {isRecording && (
            <div className="absolute top-0 right-0 w-3 h-3 bg-red-600 rounded-full animate-ping"></div>
          )}
        </div>

        <div className="space-y-3">
          <h3 className="text-2xl font-black text-stone-900 tracking-tighter">
            {type === 'agreement' ? 'تسجيل الالتزام' 
             : type === 'payment' ? 'توثيق الدفع'
             : type === 'payout_receipt' ? 'استلام القسط'
             : type === 'dispute' ? 'تسجيل الخلاف / الملاحظة'
             : 'تسجيل الرد'}
          </h3>
          <p className="text-stone-500 font-bold px-4 leading-relaxed bg-stone-50 py-3 rounded-2xl text-xs flex justify-center items-center h-full border border-stone-100">
            {type === 'agreement' 
              ? 'قل بلهجة واضحة: "قبلت وأنا ملتزم بالدفع..." ' 
              : type === 'payment'
              ? 'قل بلهجة واضحة: "أقر بأني سلمت القسط..."'
              : type === 'payout_receipt'
              ? 'قل بلهجة واضحة: "أقر بأني استلمت المبلغ كاملاً..."'
              : type === 'dispute'
              ? 'الرجاء توضيح تفاصيل المشكلة بصوتك.'
              : 'قم بالرد على النزاع بصوتك لحل المشكلة.'}
          </p>
        </div>

        {type === 'dispute' && (
          <div className="space-y-3 text-right">
            <input 
              placeholder="عنوان المشكلة"
              className="w-full bg-stone-50 border-stone-100 rounded-2xl py-3 px-4 font-bold outline-none focus:ring-2 focus:ring-red-500/20 text-sm"
              value={disputeTitle}
              onChange={e => setDisputeTitle(e.target.value)}
            />
            <textarea 
              placeholder="وصف المشكلة"
              className="w-full bg-stone-50 border-stone-100 rounded-2xl py-3 px-4 font-bold outline-none focus:ring-2 focus:ring-red-500/20 text-sm min-h-[80px]"
              value={disputeDesc}
              onChange={e => setDisputeDesc(e.target.value)}
            />
          </div>
        )}

        <div className="py-4">
          {audioUrl ? (
            <div className="space-y-4">
              <audio src={audioUrl} controls className="w-full h-10 bg-stone-100 rounded-full" />
              <button 
                onClick={() => { setAudioUrl(null); setBase64(null); }}
                className="text-stone-400 text-sm font-bold hover:text-stone-800 transition-colors"
              >
                إعادة التسجيل
              </button>
            </div>
          ) : (
            <button 
              onClick={isRecording ? stopRecording : startRecording}
              className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-xl active:scale-95 mx-auto ${
                isRecording ? 'bg-red-600 text-white shadow-red-100' : 'bg-stone-900 text-white shadow-stone-200'
              }`}
            >
              {isRecording ? <Square className="w-6 h-6" /> : <Play className="w-6 h-6 ml-1" />}
            </button>
          )}
        </div>

        <div className="flex gap-4 pt-2">
          <button 
            disabled={!base64 || (type === 'dispute' && !disputeTitle)}
            onClick={() => onSave(base64!, disputeTitle, disputeDesc)}
            className="flex-1 bg-primary-green text-white py-4 rounded-[1.2rem] font-black disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-xl shadow-primary-green/10 active:scale-95"
          >
            حفظ
          </button>
          <button 
            onClick={onClose}
            className="px-6 py-4 font-black text-stone-400 hover:text-stone-800 transition-colors"
          >
            خروج
          </button>
        </div>
      </motion.div>
    </div>
  );
}
