"use client";
import "@/styles/globals.css";
import Link from "next/link";
import { useState } from "react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <html lang="tr">
      <body className={`layout${collapsed ? " collapsed" : ""}`}>
        <aside className={`sidebar${collapsed ? " collapsed" : ""}`}>
          <div className="brand" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingRight: 12 }}>
            <span>Exam Evaluator</span>
            <button className="btn" aria-label="Menüyü aç/kapat" onClick={() => setCollapsed(v => !v)} style={{ padding: "6px 10px" }}>☰</button>
          </div>
          <div className="nav">
            <Link href="/">Dashboard</Link>
            <Link href="/insights">Analiz</Link>
          </div>
        </aside>
        <main>
          <div className="topbar">
            <div className="inner">
              <div className="muted">Kullanıcı deneyimi odaklı değerlendirme paneli</div>
              <div />
            </div>
          </div>
          <div className="content">{children}</div>
        </main>
      </body>
    </html>
  );
}
