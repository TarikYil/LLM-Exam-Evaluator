"use client";
import { useEffect, useMemo, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { getRunsDedup, palette, clearRuns } from "@/lib/runs";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Tooltip, Legend);

export default function InsightsPage() {
  const [runs, setRuns] = useState<any[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => { setRuns(getRunsDedup()); }, []);

  const { labels, datasetsLine, datasetsBar, maxPerQ, totalLabels, totalValues } = useMemo(() => {
    const allQ = new Set<string>();
    runs.forEach((r: any) => (r.progress || []).forEach((p: any) => allQ.add(String(p.payload.question_id))));
    const qList = Array.from(allQ).sort((a, b) => Number(a) - Number(b));
    const labels = qList.map(q => `S${q}`);
    const perQ = runs[0]?.summary?.meta?.per_question_full || (qList.length ? 100 / qList.length : 20);

    const datasetsLine = runs.map((r: any, idx: number) => {
      const map: Record<string, number> = {};
      (r.progress || []).forEach((p: any) => { map[String(p.payload.question_id)] = p.payload.normalized_score || 0; });
      const color = palette[idx % palette.length];
      return { label: r.student_name || r.job_id, data: qList.map(q => map[q] ?? 0), borderColor: color, backgroundColor: color + "33", tension: 0.3, fill: false };
    });

    const datasetsBar = runs.map((r: any, idx: number) => {
      const map: Record<string, number> = {};
      (r.progress || []).forEach((p: any) => { map[String(p.payload.question_id)] = p.payload.normalized_score || 0; });
      const color = palette[idx % palette.length];
      return { label: r.student_name || r.job_id, data: qList.map(q => map[q] ?? 0), backgroundColor: color };
    });

    // Toplam puan karşılaştırması (çizgi): X ekseninde öğrenciler
    const totalLabels = runs.map((r: any) => r.student_name || r.job_id);
    const totalValues = runs.map((r: any) => Number(r.summary?.total_score ?? 0));

    return { labels, datasetsLine, datasetsBar, maxPerQ: perQ, totalLabels, totalValues };
  }, [runs]);

  const options = { responsive: true, plugins: { legend: { display: true } } } as const;

  const toggled = (id: string) => selected.includes(id);
  const toggle = (id: string) => setSelected(prev => toggled(id) ? prev.filter(x => x !== id) : [...prev, id]);

  const filteredRuns = selected.length ? runs.filter(r => selected.includes(r.student_name || r.job_id)) : runs;

  const insights = useMemo(() => {
    const totals = filteredRuns.map((r:any) => Number(r.summary?.total_score || 0));
    const overallAvg = totals.length ? totals.reduce((a:number,b:number)=>a+b,0)/totals.length : 0;
    const std = totals.length ? Math.sqrt(totals.reduce((a:number,b:number)=>a+Math.pow(b-overallAvg,2),0)/totals.length) : 0;
    const top = [...filteredRuns].sort((a:any,b:any)=>Number(b.summary?.total_score||0)-Number(a.summary?.total_score||0))[0];
    const bottom = [...filteredRuns].sort((a:any,b:any)=>Number(a.summary?.total_score||0)-Number(b.summary?.total_score||0))[0];

    // Soru bazlı ortalamalar
    const qMap: Record<string, number[]> = {};
    filteredRuns.forEach((r:any)=>{
      (r.progress||[]).forEach((p:any)=>{
        const q = String(p.payload.question_id);
        if (!qMap[q]) qMap[q] = [];
        qMap[q].push(Number(p.payload.normalized_score||0));
      });
    });
    const qAvgEntries = Object.entries(qMap).map(([q, arr])=>[q, arr.reduce((a,b)=>a+b,0)/(arr.length||1)] as [string, number]);
    const bestQ = qAvgEntries.sort((a,b)=>b[1]-a[1])[0];
    const worstQ = qAvgEntries.sort((a,b)=>a[1]-b[1])[0];

    return { overallAvg, std, top, bottom, bestQ, worstQ, count: filteredRuns.length };
  }, [filteredRuns]);

  return (
    <div className="container">
      <h2>Raporlar + Analiz</h2>
      
      {/* Üst satır: KPI kartları */}
      <div className="grid cards" style={{ marginTop: 12 }}>
        <div className="stat"><div className="title">Toplam Öğrenci <span className="info" data-tip="Analizde dikkate alınan benzersiz öğrenci sayısı."><span className="info-icon">i</span></span></div><div className="value">{runs.length || "—"}</div></div>
        <div className="stat"><div className="title">Ortalama Toplam Puan <span className="info" data-tip="Seçili öğrencilerin toplam puanlarının ortalaması."><span className="info-icon">i</span></span></div><div className="value">{(runs.reduce((a:number,r:any)=>a+Number(r.summary?.total_score||0),0)/(runs.length||1)).toFixed(2)}</div></div>
        <div className="stat"><div className="title">En Yüksek Puan <span className="info" data-tip="Seçili öğrenciler arasında ulaşılan en yüksek toplam puan."><span className="info-icon">i</span></span></div><div className="value">{(Math.max(0, ...runs.map((r:any)=>Number(r.summary?.total_score||0)))).toFixed(2)}</div></div>
        <div className="stat"><div className="title">Soru Sayısı <span className="info" data-tip="Tüm koşular genelinde birleşik soru adedi."><span className="info-icon">i</span></span></div><div className="value">{labels.length || "—"}</div></div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="panel">
          <h3>Öğrenci Toplam Puan Karşılaştırması (Bar) <span className="info" data-tip="Her öğrenci için 0–100 ölçeğinde toplam puan."><span className="info-icon">i</span></span></h3>
          <Bar data={{ labels: totalLabels, datasets: [{ label: "Toplam /100", data: totalValues, backgroundColor: "#3b82f6" }] }} options={options} />
        </div>
        <div className="panel">
          <h3>Öğrenci Seçimi <span className="info" data-tip="Kart ve tablolarda görüntülenecek öğrencileri seçin."><span className="info-icon">i</span></span></h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {runs.map((r: any) => {
              const id = (r.student_name || r.job_id) as string;
              return (
                <label key={id} className="item" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" checked={toggled(id)} onChange={() => toggle(id)} />
                  <span>{r.student_name || r.job_id}</span>
                </label>
              );
            })}
          </div>
          <div style={{ marginTop: 12 }}>
            <button className="btn" onClick={() => { clearRuns(); setRuns([]); setSelected([]); }}>Analizi Sıfırla</button>
          </div>
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: "2fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="panel">
          <h3>Tüm Öğrenciler — Soru Bazlı Karşılaştırma (Bar) <span className="info" data-tip="Her soru için öğrencilerin aldığı puanların karşılaştırması."><span className="info-icon">i</span></span></h3>
          <Bar data={{ labels, datasets: [ ...filteredRuns.map((r: any, idx) => {
            const map: Record<string, number> = {};
            (r.progress || []).forEach((p: any) => { map[String(p.payload.question_id)] = p.payload.normalized_score || 0; });
            const color = palette[idx % palette.length];
            return { label: r.student_name || r.job_id, data: labels.map((l: string) => map[l.replace('S','')] ?? 0), backgroundColor: color };
          }), { label: "Tam Puan", data: labels.map(() => maxPerQ), backgroundColor: "#10b981" } ] }} options={options} />
        </div>
        <div className="panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3>Seçili Öğrenciler — Detay <span className="info" data-tip="Kartları açarak soru bazında puan ve kısa yorumları görün."><span className="info-icon">i</span></span></h3>
            <div style={{ display: "flex", gap: 8 }}>
              <button className="btn" onClick={() => setSelected(filteredRuns.map((r:any)=> r.student_name || r.job_id))}>Tümünü Aç</button>
              <button className="btn" onClick={() => setSelected([])}>Temizle</button>
            </div>
          </div>
          {filteredRuns.length ? (
            <div className="grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12, marginTop: 8 }}>
              {filteredRuns.map((r: any, cardIdx: number) => (
                <div key={r.job_id} className="item" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 600 }}>{r.student_name || r.job_id}</div>
                    <div className="muted">Toplam: {(Number(r.summary?.total_score ?? 0)).toFixed(2)}</div>
                  </div>
                  <details>
                    <summary style={{ cursor: "pointer" }}>Soru Bazlı Tablo</summary>
                    <div style={{ maxHeight: 220, overflow: "auto", marginTop: 8 }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid var(--border)" }}>Soru</th>
                            <th style={{ textAlign: "right", padding: 6, borderBottom: "1px solid var(--border)" }}>Puan</th>
                            <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid var(--border)" }}>Model Yorumu</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(r.progress || []).map((p: any, i: number) => (
                            <tr key={i}>
                              <td style={{ padding: 6, borderBottom: "1px solid var(--border)" }}>S{p.payload.question_id}</td>
                              <td style={{ padding: 6, borderBottom: "1px solid var(--border)", textAlign: "right" }}>{(p.payload.normalized_score ?? 0).toFixed(2)}</td>
                              <td style={{ padding: 6, borderBottom: "1px solid var(--border)" }}>{p.payload.reasoning_tr || ""}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                </div>
              ))}
            </div>
          ) : <div className="muted">Seçim yapın veya tüm öğrenciler için boş bırakın.</div>}
        </div>
      </div>

      {/* Alt satır: dağılım ve ısı haritası placeholder */}
      <div className="grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 16 }}>
        <div className="panel">
          <h3>Soru Puan Dağılımı (Özet) <span className="info" data-tip="Her soru için seçili öğrenci grubunun ortalama puanı."><span className="info-icon">i</span></span></h3>
          <ul>
            {labels.map((l, i) => {
              const arr = filteredRuns.map((r: any) => {
                const p = (r.progress||[]).find((x:any)=>String(x.payload.question_id)===l.replace('S',''));
                return Number(p?.payload?.normalized_score||0);
              });
              const avg = arr.reduce((a:number,b:number)=>a+b,0)/(arr.length||1);
              return <li key={l} className="item">{l}: Ortalama {avg.toFixed(2)}</li>
            })}
          </ul>
        </div>
        <div className="panel">
          <h3>Notlar <span className="info" data-tip="Toplam puanlar ve soru bazlı ortalamalara dayalı otomatik özet."><span className="info-icon">i</span></span></h3>
          <ul>
            <li className="item">Analizdeki öğrenci sayısı: <b>{insights.count}</b></li>
            <li className="item">Ortalama toplam puan: <b>{insights.overallAvg.toFixed(2)}</b></li>
            {insights.top ? (
              <li className="item">En yüksek: <b>{insights.top.student_name || insights.top.job_id}</b> — {Number(insights.top.summary?.total_score||0).toFixed(2)}</li>
            ) : null}
            {insights.bottom ? (
              <li className="item">En düşük: <b>{insights.bottom.student_name || insights.bottom.job_id}</b> — {Number(insights.bottom.summary?.total_score||0).toFixed(2)}</li>
            ) : null}
            {insights.bestQ ? (
              <li className="item">En yüksek ortalamalı soru: <b>S{insights.bestQ[0]}</b> — {insights.bestQ[1].toFixed(2)}</li>
            ) : null}
            {insights.worstQ ? (
              <li className="item">En düşük ortalamalı soru: <b>S{insights.worstQ[0]}</b> — {insights.worstQ[1].toFixed(2)}</li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}

