"use client";
import { useState } from "react";

type Props = {
  onSubmit: (student: File, key: File) => void;
  disabled?: boolean;
  onFilesChange?: (files: { student?: File | null; key?: File | null }) => void;
};

export default function UploadForm({ onSubmit, disabled, onFilesChange }: Props) {
  const [student, setStudent] = useState<File | null>(null);
  const [key, setKey] = useState<File | null>(null);

  return (
    <div className="panel">
      <h3>Dosya Yükleme</h3>
      <div className="row">
        <div>
          <label className="muted">Öğrenci PDF</label>
          <input
            className="input"
            type="file"
            accept="application/pdf"
            onChange={e => {
              const f = e.target.files?.[0] || null;
              setStudent(f);
              onFilesChange?.({ student: f, key });
            }}
          />
        </div>
        <div>
          <label className="muted">Cevap Anahtarı PDF</label>
          <input
            className="input"
            type="file"
            accept="application/pdf"
            onChange={e => {
              const f = e.target.files?.[0] || null;
              setKey(f);
              onFilesChange?.({ student, key: f });
            }}
          />
        </div>
      </div>
      <div style={{ marginTop: 12 }}>
        <button className="btn" disabled={!student || !key || disabled} onClick={() => student && key && onSubmit(student, key)}>
          Değerlendirmeyi Başlat
        </button>
      </div>
    </div>
  );
}
