"use client";
import UploadForm from "@/components/UploadForm";
import ProgressItem from "@/components/ProgressItem";
import SummaryCard from "@/components/SummaryCard";
import ErrorBanner from "@/components/ErrorBanner";
import { useAssessment } from "@/hooks/useAssessment";

export default function Home() {
  const { assess, loading, error, progress, summary } = useAssessment();
  const [selected, setSelected] = (require("react") as typeof import("react")).useState<{student?: File|null; key?: File|null}>({});

  return (
    <div>
      <div className="grid cards">
        <div className="stat">
          <div className="title">Toplam Değerlendirme <span className="info" data-tip="Bu koşunun toplam puanı (0–100)"><span className="info-icon">i</span></span></div>
          <div className="value">{summary ? Number(summary.total_score || 0).toFixed(2) : "—"}</div>
        </div>
        <div className="stat">
          <div className="title">En Yüksek Skor <span className="info" data-tip="Soru bazında alınan en yüksek puan"><span className="info-icon">i</span></span></div>
          <div className="value">{(progress.length ? Math.max(...progress.map(p => Number(p.payload?.normalized_score || 0))).toFixed(2) : "—")}</div>
        </div>
        <div className="stat">
          <div className="title">Ortalama (Soru Başına) <span className="info" data-tip="Soru başına ortalama puan"><span className="info-icon">i</span></span></div>
          <div className="value">{summary ? Number(summary.average_score || 0).toFixed(2) : "—"}</div>
        </div>
      </div>

      <div className="row-3" style={{ marginTop: 16 }}>
        <div>
          <div className="panel">
            <h3>Başlangıç <span className="info" data-tip="PDF’leri yükleyin ve değerlendirmeyi başlatın."><span className="info-icon">i</span></span></h3>
            <p className="muted">PDF’leri yükleyin ve değerlendirmeyi başlatın.</p>
            <div className="uploadDrop" style={{ marginTop: 12 }}>
              <UploadForm onSubmit={assess} disabled={loading} onFilesChange={setSelected} />
              <div style={{ textAlign: "left", marginTop: 12 }}>
                <div className="muted">Seçili Dosyalar</div>
                <div className="item" style={{ marginTop: 8 }}>
                  <div><b>Öğrenci PDF:</b> {selected.student ? selected.student.name : "—"}</div>
                  <div style={{ marginTop: 4 }}><b>Cevap Anahtarı:</b> {selected.key ? selected.key.name : "—"}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="panel" style={{ marginTop: 16 }}>
            <h3>Analiz <span className="info" data-tip="Soru bazında puanlar ve model yorumları akış olarak gelir."><span className="info-icon">i</span></span></h3>
            <div className="list">
              {progress.map((m, i) => (
                <ProgressItem key={i} msg={m} />
              ))}
            </div>
          </div>
        </div>
        <div>
          <SummaryCard payload={summary as any} />
          <div style={{ marginTop: 12 }}>
            <ErrorBanner message={error} />
          </div>
        </div>
      </div>
    </div>
  );
}
