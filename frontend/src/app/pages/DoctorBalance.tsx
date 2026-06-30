import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { DollarSign, TrendingUp, Clock, ChevronLeft, Calendar, Users, Wallet, ArrowUpRight, ArrowDownRight, Sparkles, Filter, Receipt } from "lucide-react";
import { motion } from "motion/react";

interface PendingCredit {
  patientName: string;
  amount: number;
  daysRemaining: number;
  originalDate: string;
}

interface CommitmentLogEntry {
  name: string;
  mode: string;
  time: string;
  status: string;
  val: string;
}

export default function DoctorBalance() {
  const navigate = useNavigate();
  const apiUrl = (import.meta as any).env.VITE_API_URL || "https://online-queue-project.onrender.com";

  const [revenue, setRevenue] = useState({
    collectedToday: 0,
    missedAppointments: 0,
    totalPatients: 0,
    completedSessions: 0,
  });

  const [pendingCredits, setPendingCredits] = useState<PendingCredit[]>([]);
  const [commitmentLog, setCommitmentLog] = useState<CommitmentLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const storedUser = localStorage.getItem("user") || localStorage.getItem("currentUser");
    const u = storedUser ? JSON.parse(storedUser) : null;
    if (!u) {
      navigate("/login");
      return;
    }
    
    const fetchLedger = async () => {
      const docId = u.doctorId || u.id;
      const token = u.token;

      try {
        const [statsResp, logResp] = await Promise.all([
          fetch(`${apiUrl}/api/finance/stats/${docId}`, {
            headers: { "Authorization": token ? `Bearer ${token}` : "" }
          }),
          fetch(`${apiUrl}/api/finance/commitment-log/${docId}`, {
            headers: { "Authorization": token ? `Bearer ${token}` : "" }
          })
        ]);

        if (statsResp.ok) {
          const stats = await statsResp.json();
          setRevenue({
            collectedToday: stats.todayRevenue || 0,
            missedAppointments: 0,
            totalPatients: stats.processedPatients || 0,
            completedSessions: stats.processedPatients || 0
          });
        }

        if (logResp.ok) {
          const logData = await logResp.json();
          if (Array.isArray(logData)) {
            setCommitmentLog(logData.map((entry: any) => ({
              name: entry.patientName || "Unknown",
              mode: entry.paymentMode || "UPI/CASH",
              time: entry.appointmentTime || "N/A",
              status: entry.status || "SUCCESS",
              val: `₹${entry.amount} Credited`
            })));
          }
        }
      } catch (e) {
        console.error("Ledger sync failed", e);
      } finally {
        setLoading(false);
      }
    };
    fetchLedger();
  }, [apiUrl, navigate]);

  const totalPendingCredits = pendingCredits.reduce((sum, credit) => sum + credit.amount, 0);
  const totalRevenue = revenue.collectedToday + revenue.missedAppointments + totalPendingCredits;

  return (
    <div className="w-full min-h-screen bg-[#020617] text-white selection:bg-sky-500/30 overflow-x-hidden">
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[20%] right-[-10%] w-[60%] h-[60%] bg-blue-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[10%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="relative max-w-lg mx-auto px-4 sm:px-6 py-4 sm:py-8 pb-32">
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4 sm:gap-0">
          <button
            onClick={() => navigate("/doctor")}
            className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
          >
            <ChevronLeft size={24} />
          </button>
          
          <div className="flex flex-col items-start sm:items-end w-full sm:w-auto mt-4 sm:mt-0">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Financial Terminal</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500" />
              <span className="font-black text-xl sm:text-2xl tracking-tight text-blue-400">Live Ledger v4.0</span>
            </div>
          </div>
        </header>

        <section className="space-y-8 animate-in fade-in slide-in-from-bottom duration-700">
          {/* Main Balance Card */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative overflow-hidden glass-card-dark p-4 sm:p-8 border-white/5 bg-gradient-to-br from-blue-600/10 to-transparent"
          >
            <div className="absolute top-0 right-0 p-6 opacity-10 rotate-12">
              <Wallet size={120} />
            </div>

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-8">
                <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest leading-none">
                  Settled Today
                </div>
                <div className="flex items-center gap-1 text-emerald-400 text-[10px] font-black uppercase tracking-widest leading-none">
                  <ArrowUpRight size={12} /> +12.5%
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">Total Accrued Revenue</p>
                <h2 className="text-3xl sm:text-6xl font-black text-white tracking-tighter">₹{totalRevenue.toLocaleString()}</h2>
                <div className="flex items-center gap-2 mt-4">
                  <span className="text-emerald-400 text-[10px] font-black uppercase tracking-widest bg-emerald-400/10 px-2 py-1 rounded-md border border-emerald-400/20">Secured</span>
                  <p className="text-white/40 text-[10px] font-black uppercase tracking-widest leading-none">Final reconciliation at 23:59</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-10">
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-none">Throughput</p>
                  <div className="flex items-end gap-2">
                    <span className="text-xl font-black">{revenue.completedSessions}</span>
                    <span className="text-[10px] font-bold text-slate-500 mb-1 uppercase leading-none">Patients</span>
                  </div>
                </div>
                <div className="bg-white/5 rounded-2xl p-4 border border-white/5">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1 leading-none">Efficiency</p>
                  <div className="flex items-end gap-2">
                    <span className="text-xl font-black">₹{revenue.completedSessions > 0 ? Math.round(revenue.collectedToday / revenue.completedSessions) : 0}</span>
                    <span className="text-[10px] font-bold text-slate-500 mb-1 uppercase leading-none">Avg/Sess</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Revenue Breakdown */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Revenue Distribution</h3>
              <Filter size={16} className="text-slate-500" />
            </div>

            <div className="glass-card-dark p-6 border-white/5 space-y-6">
              {[
                { label: "Direct Realization", desc: "Completed consultations", amount: revenue.collectedToday, color: "emerald", icon: <TrendingUp size={16} /> },
                { label: "Commitment Retainer", desc: "From missed appointments", amount: revenue.missedAppointments, color: "amber", icon: <Receipt size={16} /> },
                { label: "Pending Credits", desc: "Awaiting 7-day window", amount: totalPendingCredits, color: "slate", icon: <Clock size={16} /> }
              ].map((item, i) => (
                <div key={i} className="flex flex-col sm:flex-row items-start sm:items-center justify-between group gap-2 sm:gap-0">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-xl bg-${item.color}-500/10 flex items-center justify-center text-${item.color}-400 group-hover:scale-110 transition-transform`}>
                      {item.icon}
                    </div>
                    <div>
                      <p className="text-sm font-black tracking-tight">{item.label}</p>
                      <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{item.desc}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={`text-lg font-black text-${item.color}-400`}>₹{item.amount}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Protocol Alert */}
          <div className="p-6 rounded-[32px] bg-sky-500/10 border border-sky-500/20 relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform">
              <Sparkles size={64} />
            </div>
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-2xl bg-sky-500/20 text-sky-400">
                <Clock size={24} />
              </div>
              <div>
                <h5 className="text-xs font-black text-sky-400 uppercase tracking-widest mb-2 leading-none">Credit Protocol v2.1</h5>
                <p className="text-[11px] font-bold text-sky-100/60 leading-relaxed">
                  Total Consultation Fee: <span className="text-white">₹500</span>. Patients not seen are refunded ₹400, while ₹100 is retained as commitment credit for 7 days.
                </p>
              </div>
            </div>
          </div>

          {/* Not Seen Transactions */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2">
              <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-500">Commitment Log</h3>
              <Users size={16} className="text-slate-500" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {commitmentLog.length === 0 ? (
                <div className="py-12 text-center rounded-[28px] border border-dashed border-white/10 bg-white/[0.01]">
                  <Receipt size={32} className="mx-auto text-slate-700 mb-3" />
                  <p className="text-xs font-black uppercase tracking-widest text-slate-600">No Records Found</p>
                  <p className="text-[10px] text-slate-700 mt-1">The commitment log is empty.</p>
                </div>
              ) : (
                commitmentLog.map((p, i) => (
                  <div key={i} className="glass-card-dark p-5 border-white/5 flex items-center justify-between hover:bg-white/5 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-black text-xs text-slate-500">
                        {(p.name || "?").slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-black tracking-tight">{p.name}</p>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">{p.time} • {p.mode}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-rose-400 mb-1">{p.val}</p>
                      <span className="text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md bg-white/5 text-slate-400 border border-white/10">
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Expiring Credits */}
          {pendingCredits.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between px-2">
                <h3 className="text-xs font-black uppercase tracking-[0.2em] text-rose-500">Active Risk Credits</h3>
                <span className="bg-rose-500/10 text-rose-400 text-[10px] font-black px-3 py-1 rounded-full border border-rose-500/20 uppercase tracking-widest">
                  {pendingCredits.length} Pending
                </span>
              </div>

              <div className="space-y-4">
                {pendingCredits.map((credit, index) => (
                  <div
                    key={index}
                    className={`glass-card-dark p-6 border ${credit.daysRemaining <= 1 ? 'border-rose-500/30 bg-rose-500/5' : 'border-white/5'}`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="text-sm font-black tracking-tight">{credit.patientName}</h4>
                        <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wider leading-none mt-1">Missed on {credit.originalDate}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black text-white leading-none">₹{credit.amount}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${credit.daysRemaining <= 1 ? 'bg-rose-500 animate-pulse' : 'bg-slate-700'}`} />
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                          {credit.daysRemaining} DAY{credit.daysRemaining !== 1 ? 'S' : ''} UNTIL EXPIRY
                        </span>
                      </div>
                      {credit.daysRemaining <= 1 && (
                        <span className="text-[9px] font-black uppercase tracking-widest text-rose-400">Final Call</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {/* Bottom Floating Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] bg-gradient-to-t from-[#020617] via-[#020617]/90 to-transparent pt-20 pointer-events-none z-50">
        <div className="max-w-md mx-auto pointer-events-auto">
          <button
            onClick={() => navigate("/doctor")}
            className="w-full h-16 rounded-2xl bg-white text-[#020617] font-black text-sm uppercase tracking-[0.2em] hover:bg-slate-200 active:scale-95 transition-all shadow-2xl shadow-white/5"
          >
            Review Sessions
          </button>
        </div>
      </div>
    </div>
  );
}
