"use client";
import { useState, useEffect } from "react";
import { useTenant } from "@/lib/tenant/context";
import { useAuth } from "@/lib/auth/context";
import {
  Users, Home, Heart, Droplets, HandHeart, Accessibility, GraduationCap, AlertTriangle,
  Loader2, Filter, Info,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, ReferenceLine, ComposedChart, Line,
} from "recharts";

const COLORS = ["#6366f1","#06b6d4","#f59e0b","#ef4444","#10b981","#8b5cf6","#ec4899","#f97316"];
const fmt = (n: number) => n?.toLocaleString("id-ID") ?? "0";
const fmtRp = (n: number | null | undefined) => `Rp ${((n ?? 0)/1e6).toFixed(0)} Jt`;
const badge = (v: number, lo: number, hi: number) =>
  v >= hi ? "bg-red-100 text-red-700" : v >= lo ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";

type DashData = {
  tenant_nama: string; perspective: string; kelurahan_id: string|null;
  stat_cards: any; piramida_penduduk: any[]; stunting_per_kelurahan: any[];
  sanitasi_per_kelurahan: any[]; bansos_distribusi: any[]; rtlh_per_kelurahan: any[];
  dtsen: any; putus_sekolah_per_kelurahan: any[]; scoreboard: any[];
  kelurahans: {id:string;nama:string}[]; periodes: {id:number;tahun:number;semester:number}[];
};

export default function ExecutiveDashboardPage() {
  const { tenant } = useTenant();
  const { profile } = useAuth();
  const [data, setData] = useState<DashData|null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [kelId, setKelId] = useState<string>("");
  const [tahun, setTahun] = useState<string>("");

  useEffect(() => {
    if (!tenant) return;
    setLoading(true); setErr("");
    const params = new URLSearchParams();
    if (kelId) params.set("kelurahanId", kelId);
    if (tahun) params.set("tahun", tahun);
    fetch(`/api/tenants/${tenant.slug}/executive-dashboard?${params}`)
      .then(r => r.json()).then(j => { if (j.error) throw new Error(j.error); setData(j.data ?? j); })
      .catch(e => setErr(e.message)).finally(() => setLoading(false));
  }, [tenant, kelId, tahun]);

  if (loading) return <div className="flex items-center justify-center h-[60vh] gap-3 text-slate-500"><Loader2 className="w-6 h-6 animate-spin"/>Memuat data executive...</div>;
  if (err) return <div className="text-center py-20 text-red-500">{err}</div>;
  if (!data) return null;

  const s = data.stat_cards;
  const years = [...new Set(data.periodes.map(p=>p.tahun))].sort((a,b)=>b-a);

  return (
    <div className="space-y-6">
      {/* Header + Filters */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-800">Dashboard Eksekutif</h1>
          <p className="text-sm text-slate-500 mt-0.5">{data.tenant_nama} — {data.perspective === "kelurahan" ? "Perspektif Kelurahan" : "Perspektif Kecamatan"}</p>
        </div>
        <div className="flex items-center gap-3">
          <Filter className="w-4 h-4 text-slate-400"/>
          <select value={kelId} onChange={e=>setKelId(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
            <option value="">Semua Kelurahan</option>
            {data.kelurahans.map(k=><option key={k.id} value={k.id}>{k.nama}</option>)}
          </select>
          <select value={tahun} onChange={e=>setTahun(e.target.value)} className="text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500">
            <option value="">Tahun Terbaru</option>
            {years.map(y=><option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* 1. KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Penduduk" value={fmt(s.total_penduduk)} sub={`${fmt(s.penduduk_lk)} L / ${fmt(s.penduduk_pr)} P`} color="blue"/>
        <StatCard icon={Home} label="Jumlah KK" value={fmt(s.total_kk)} color="indigo"/>
        <StatCard icon={Heart} label="Prevalensi Stunting" value={`${s.prevalensi_stunting}%`} sub={`${fmt(s.balita_stunting)} / ${fmt(s.balita_total)} balita`} color="rose" alert={s.prevalensi_stunting>20?"high":s.prevalensi_stunting>10?"mid":"low"}/>
        <StatCard icon={Droplets} label="Sanitasi Layak" value={`${s.avg_sanitasi}%`} sub={`Air Bersih: ${s.avg_air_bersih}%`} color="cyan" alert={s.avg_sanitasi<60?"high":s.avg_sanitasi<80?"mid":"low"}/>
        <StatCard icon={HandHeart} label="Penerima Bansos" value={fmt(s.total_penerima_bansos)} sub={fmtRp(s.total_anggaran_bansos)} color="amber"/>
        <StatCard icon={Accessibility} label="Disabilitas" value={fmt(s.total_disabilitas)} color="purple"/>
        <StatCard icon={GraduationCap} label="Putus Sekolah" value={fmt(s.total_putus_sekolah)} color="orange" alert={s.total_putus_sekolah>50?"high":s.total_putus_sekolah>20?"mid":"low"}/>
        <StatCard icon={AlertTriangle} label="Warga Miskin (Desil 1-2)" value={fmt(s.dtsen_miskin)} sub={`dari ${fmt(s.dtsen_total)} DTSEN`} color="red" alert="high"/>
      </div>

      {/* Empty State Banner */}
      {data.piramida_penduduk.length === 0 && data.stunting_per_kelurahan.length === 0 &&
       data.sanitasi_per_kelurahan.length === 0 && data.bansos_distribusi.length === 0 &&
       data.scoreboard.length === 0 && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-amber-700">
          <Info className="w-5 h-5 shrink-0"/>
          <div>
            <p className="text-sm font-semibold">Belum ada data visualisasi</p>
            <p className="text-xs mt-0.5 text-amber-600">Data grafik dan tabel belum tersedia. Pastikan data sudah diinput melalui panel admin.</p>
          </div>
        </div>
      )}

      {/* 2. Piramida Penduduk */}
      {data.piramida_penduduk.length > 0 && (() => {
        const piramidaReversed = [...data.piramida_penduduk].reverse();
        return (
        <Card title="Piramida Penduduk" subtitle="Distribusi penduduk berdasarkan kelompok umur dan jenis kelamin">
          {/* Legend */}
          <div className="flex items-center justify-end gap-5 mb-3">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#5B93D3] inline-block"/> <span className="text-xs text-slate-600 font-medium">Laki-laki</span></div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#F087A0] inline-block"/> <span className="text-xs text-slate-600 font-medium">Perempuan</span></div>
          </div>
          <div className="flex gap-6">
            {/* Chart */}
            <div className="flex-1 h-[560px] min-w-0">
              <ResponsiveContainer>
                <BarChart layout="vertical" data={piramidaReversed} margin={{left:10,right:10,top:5,bottom:5}} barSize={14} stackOffset="sign">
                  <CartesianGrid horizontal={false} stroke="#f1f5f9"/>
                  <XAxis type="number" tick={{fontSize:10,fill:"#94a3b8"}} tickFormatter={(v:number)=>{const a=Math.abs(v);return a>=1000?`${(a/1000).toFixed(0)}rb`:String(a);}} axisLine={{stroke:"#e2e8f0"}} tickLine={false}/>
                  <YAxis type="category" dataKey="label" tick={{fontSize:11,fill:"#64748b"}} width={50} axisLine={false} tickLine={false}/>
                  <Tooltip
                    formatter={(v:number,name:string)=>[fmt(Math.abs(v)),name==="lk"?"Laki-laki":"Perempuan"]}
                    labelFormatter={(l:string)=>`Kelompok ${l}`}
                    contentStyle={{borderRadius:10,border:"1px solid #e2e8f0",boxShadow:"0 4px 12px rgba(0,0,0,.08)",fontSize:12}}
                  />
                  <ReferenceLine x={0} stroke="#cbd5e1"/>
                  <Bar dataKey="lk" name="lk" fill="#5B93D3" stackId="pyramid" radius={[4,0,0,4]}/>
                  <Bar dataKey="pr" name="pr" fill="#F087A0" stackId="pyramid" radius={[0,4,4,0]}/>
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Data Table */}
            <div className="hidden lg:block w-[320px] shrink-0">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left py-2 px-2 font-bold text-slate-600">Kelompok</th>
                    <th className="text-right py-2 px-2 font-bold text-[#5B93D3]">LK</th>
                    <th className="text-right py-2 px-2 font-bold text-[#F087A0]">PR</th>
                    <th className="text-right py-2 px-2 font-bold text-slate-700">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.piramida_penduduk.map((row:any,i:number)=>(
                    <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/60 transition-colors">
                      <td className="py-1.5 px-2 font-medium text-slate-600">{row.label}</td>
                      <td className="py-1.5 px-2 text-right text-[#5B93D3] font-semibold">{fmt(Math.abs(row.lk))}</td>
                      <td className="py-1.5 px-2 text-right text-[#F087A0] font-semibold">{fmt(row.pr)}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-slate-700">{fmt(Math.abs(row.lk)+row.pr)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Card>
        );
      })()}

      {/* 3. Stunting per Kelurahan */}
      {data.stunting_per_kelurahan.length > 0 && (
        <Card title="Prevalensi Stunting per Kelurahan" subtitle="Standar WHO: 🟢 <10%  🟡 10-20%  🔴 >20%">
          <div className="h-[350px]">
            <ResponsiveContainer>
              <ComposedChart data={data.stunting_per_kelurahan} margin={{bottom:60}}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                <XAxis dataKey="kelurahan" tick={{fontSize:10}} angle={-45} textAnchor="end"/>
                <YAxis yAxisId="left" tick={{fontSize:11}}/>
                <YAxis yAxisId="right" orientation="right" unit="%" tick={{fontSize:11}} domain={[0,50]}/>
                <Tooltip/>
                <Legend/>
                <Bar yAxisId="left" dataKey="balita_total" name="Total Balita" fill="#93c5fd" radius={[4,4,0,0]}/>
                <Bar yAxisId="left" dataKey="balita_stunting" name="Stunting" fill="#ef4444" radius={[4,4,0,0]}/>
                <Line yAxisId="right" type="monotone" dataKey="prevalensi" name="Prevalensi %" stroke="#f59e0b" strokeWidth={2.5} dot={{r:4}}/>
                <ReferenceLine yAxisId="right" y={20} stroke="#ef4444" strokeDasharray="5 5" label={{value:"Batas WHO 20%",fontSize:10,fill:"#ef4444"}}/>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. Sanitasi */}
        {data.sanitasi_per_kelurahan.length > 0 && (
          <Card title="Sanitasi & Air Bersih" subtitle="Target SDGs: 100% akses">
            <div className="h-[320px]">
              <ResponsiveContainer>
                <BarChart data={data.sanitasi_per_kelurahan} margin={{bottom:50}}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                  <XAxis dataKey="kelurahan" tick={{fontSize:10}} angle={-35} textAnchor="end"/>
                  <YAxis domain={[0,100]} unit="%" tick={{fontSize:11}}/>
                  <Tooltip/>
                  <Legend/>
                  <Bar dataKey="sanitasi" name="Sanitasi %" fill="#06b6d4" radius={[4,4,0,0]}/>
                  <Bar dataKey="air_bersih" name="Air Bersih %" fill="#3b82f6" radius={[4,4,0,0]}/>
                  <ReferenceLine y={100} stroke="#10b981" strokeDasharray="5 5"/>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}

        {/* 5. Bantuan Sosial */}
        {data.bansos_distribusi.length > 0 && (
          <Card title="Distribusi Bantuan Sosial" subtitle="Komposisi penerima berdasarkan jenis bantuan">
            <div className="h-[320px] flex items-center">
              <div className="w-1/2 h-full">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={data.bansos_distribusi} dataKey="penerima" nameKey="jenis_bantuan" cx="50%" cy="50%" outerRadius={100} innerRadius={50} paddingAngle={3} label={({jenis_bantuan,percent})=>`${(jenis_bantuan||'').slice(0,10)} ${(percent*100).toFixed(0)}%`} labelLine={false} style={{fontSize:10}}>
                      {data.bansos_distribusi.map((_:any,i:number)=><Cell key={i} fill={COLORS[i%COLORS.length]}/>)}
                    </Pie>
                    <Tooltip formatter={(v:number)=>fmt(v)}/>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="w-1/2 space-y-2 pr-4">
                {data.bansos_distribusi.slice(0,6).map((b:any,i:number)=>(
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{backgroundColor:COLORS[i%COLORS.length]}}/>
                    <span className="flex-1 truncate text-slate-600">{b.jenis_bantuan}</span>
                    <span className="font-semibold text-slate-800">{fmt(b.penerima)}</span>
                  </div>
                ))}
              </div>
            </div>
          </Card>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 6. RTLH + DTSEN */}
        <Card title="Perumahan & Kemiskinan" subtitle="RTLH per kelurahan + Distribusi Desil DTSEN">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {data.rtlh_per_kelurahan.length > 0 && (
              <div className="h-[250px]">
                <p className="text-xs font-semibold text-slate-500 mb-2">RTLH per Kelurahan</p>
                <ResponsiveContainer>
                  <BarChart layout="vertical" data={data.rtlh_per_kelurahan.slice(0,8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                    <XAxis type="number" tick={{fontSize:10}}/>
                    <YAxis type="category" dataKey="kelurahan" tick={{fontSize:10}} width={80}/>
                    <Tooltip/>
                    <Bar dataKey="jumlah_rtlh" name="RTLH" fill="#f97316" radius={[0,4,4,0]}/>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {data.dtsen?.distribusi_desil?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-500 mb-2">Distribusi Desil DTSEN</p>
                <div className="h-[180px]">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={data.dtsen.distribusi_desil} dataKey="jumlah" nameKey="desil" cx="50%" cy="50%" outerRadius={70} innerRadius={30} label={({desil,percent})=>`D${desil} ${(percent*100).toFixed(0)}%`} style={{fontSize:10}}>
                        {data.dtsen.distribusi_desil.map((_:any,i:number)=><Cell key={i} fill={["#ef4444","#f97316","#f59e0b","#06b6d4","#10b981"][i]||COLORS[i]}/>)}
                      </Pie>
                      <Tooltip formatter={(v:number)=>fmt(v)}/>
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-center">
                  <MiniStat label="PBI-JK" value={fmt(data.dtsen.pbi_jk)}/>
                  <MiniStat label="PKH" value={fmt(data.dtsen.bansos_pkh)}/>
                  <MiniStat label="Sembako" value={fmt(data.dtsen.bansos_sembako)}/>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* 7. Putus Sekolah */}
        {data.putus_sekolah_per_kelurahan.length > 0 && (
          <Card title="Angka Putus Sekolah per Kelurahan" subtitle="Ranking tertinggi — data terbaru">
            <div className="h-[300px]">
              <ResponsiveContainer>
                <ComposedChart layout="vertical" data={data.putus_sekolah_per_kelurahan.slice(0,10)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                  <XAxis type="number" tick={{fontSize:10}}/>
                  <YAxis type="category" dataKey="kelurahan" tick={{fontSize:10}} width={80}/>
                  <Tooltip/>
                  <Legend/>
                  <Bar dataKey="putus_sekolah" name="Putus Sekolah" fill="#f59e0b" radius={[0,4,4,0]}/>
                  <Line type="monotone" dataKey="melek_huruf" name="Melek Huruf %" stroke="#6366f1" strokeWidth={2} dot={{r:3}}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </Card>
        )}
      </div>

      {/* 9. Scoreboard */}
      {data.scoreboard.length > 0 && (
        <Card title="Scoreboard Kelurahan" subtitle="Ringkasan performa lintas indikator">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-slate-200">
                  <th className="text-left py-3 px-3 text-slate-600 font-bold">Kelurahan</th>
                  <th className="text-right py-3 px-3 text-slate-600 font-bold">Penduduk</th>
                  <th className="text-right py-3 px-3 text-slate-600 font-bold">Stunting</th>
                  <th className="text-right py-3 px-3 text-slate-600 font-bold">Sanitasi</th>
                  <th className="text-right py-3 px-3 text-slate-600 font-bold">Air Bersih</th>
                  <th className="text-right py-3 px-3 text-slate-600 font-bold">RTLH</th>
                  <th className="text-right py-3 px-3 text-slate-600 font-bold">Putus Sekolah</th>
                </tr>
              </thead>
              <tbody>
                {data.scoreboard.map((r:any,i:number)=>(
                  <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-3 font-semibold text-slate-700">{r.kelurahan}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{fmt(r.penduduk)}</td>
                    <td className="py-2.5 px-3 text-right"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${badge(r.stunting_pct,10,20)}`}>{r.stunting_pct}%</span></td>
                    <td className="py-2.5 px-3 text-right"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${badge(100-r.sanitasi,20,40)}`}>{r.sanitasi}%</span></td>
                    <td className="py-2.5 px-3 text-right"><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${badge(100-r.air_bersih,20,40)}`}>{r.air_bersih}%</span></td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{r.rtlh}</td>
                    <td className="py-2.5 px-3 text-right text-slate-600">{r.putus_sekolah}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ═══════════ Sub-Components ═══════════ */

function StatCard({icon:Icon,label,value,sub,color,alert}:{icon:any;label:string;value:string;sub?:string;color:string;alert?:"high"|"mid"|"low"}) {
  const bg = {blue:"from-blue-500 to-blue-600",indigo:"from-indigo-500 to-indigo-600",rose:"from-rose-500 to-rose-600",cyan:"from-cyan-500 to-cyan-600",amber:"from-amber-500 to-amber-600",purple:"from-purple-500 to-purple-600",orange:"from-orange-500 to-orange-600",red:"from-red-500 to-red-600"}[color]||"from-slate-500 to-slate-600";
  const alertDot = alert==="high"?"bg-red-400 animate-pulse":alert==="mid"?"bg-amber-400":"";
  return (
    <div className="relative bg-white rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-shadow p-4 overflow-hidden group">
      {alert && alertDot && <div className={`absolute top-3 right-3 w-2.5 h-2.5 rounded-full ${alertDot}`}/>}
      <div className={`inline-flex p-2.5 rounded-xl bg-gradient-to-br ${bg} text-white shadow-sm mb-3`}><Icon className="w-5 h-5"/></div>
      <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-extrabold text-slate-800 mt-0.5 leading-tight">{value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function Card({title,subtitle,children}:{title:string;subtitle?:string;children:React.ReactNode}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/60 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <h3 className="text-sm font-bold text-slate-800">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function MiniStat({label,value}:{label:string;value:string}) {
  return (
    <div className="bg-slate-50 rounded-lg p-2">
      <p className="text-[10px] font-semibold text-slate-400 uppercase">{label}</p>
      <p className="text-sm font-bold text-slate-700">{value}</p>
    </div>
  );
}
