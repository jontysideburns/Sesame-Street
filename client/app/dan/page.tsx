"use client";

import { useEffect, useState } from "react";

const BALLOON_COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12", "#9b59b6", "#1abc9c", "#e67e22", "#e84393"];

function Balloon({ delay, left, color }: { delay: number; left: number; color: string }) {
  return (
    <div
      style={{
        position: "fixed",
        left: `${left}%`,
        bottom: -120,
        animation: `balloonFloat ${6 + Math.random() * 4}s ease-in ${delay}s forwards`,
        zIndex: 0,
        pointerEvents: "none",
      }}
    >
      <div style={{
        width: 50, height: 65, borderRadius: "50% 50% 50% 50% / 40% 40% 60% 60%",
        background: `radial-gradient(circle at 30% 30%, ${color}dd, ${color})`,
        boxShadow: `inset -8px -8px 20px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1)`,
        position: "relative",
      }}>
        <div style={{
          position: "absolute", bottom: -30, left: "50%", width: 1,
          height: 30, background: `${color}88`, transform: "translateX(-50%)",
        }} />
        <div style={{
          position: "absolute", bottom: -4, left: "50%", width: 8, height: 8,
          background: color, borderRadius: "0 0 50% 50%",
          transform: "translateX(-50%)",
        }} />
      </div>
    </div>
  );
}

export default function DanPage() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    setShow(true);
  }, []);

  const balloons = Array.from({ length: 20 }, (_, i) => ({
    delay: Math.random() * 3,
    left: 5 + Math.random() * 90,
    color: BALLOON_COLORS[i % BALLOON_COLORS.length],
  }));

  return (
    <>
      <style>{`
        @keyframes balloonFloat {
          0% { transform: translateY(0) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          100% { transform: translateY(-120vh) rotate(${Math.random() > 0.5 ? "" : "-"}15deg); opacity: 0.8; }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes sparkle {
          0%, 100% { opacity: 0.3; transform: scale(0.8); }
          50% { opacity: 1; transform: scale(1.2); }
        }
      `}</style>

      {show && balloons.map((b, i) => (
        <Balloon key={i} delay={b.delay} left={b.left} color={b.color} />
      ))}

      <main className="shell" style={{ position: "relative", zIndex: 1 }}>
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", minHeight: "80vh", textAlign: "center",
          padding: "40px 20px",
        }}>
          <div style={{
            animation: "fadeInUp 1s ease-out",
            background: "rgba(255,255,255,0.92)",
            borderRadius: 28,
            padding: "48px 56px",
            maxWidth: 600,
            boxShadow: "0 20px 60px rgba(0,0,0,0.08)",
            border: "1px solid var(--line)",
          }}>
            <div style={{ fontSize: "4rem", marginBottom: 16 }}>
              {"🎂"}
            </div>
            <h1 style={{
              fontSize: "2.5rem", fontWeight: 800,
              background: "linear-gradient(135deg, #e74c3c, #f39c12, #2ecc71, #3498db, #9b59b6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: 24,
              lineHeight: 1.2,
            }}>
              Happy Birthday, Dan!
            </h1>

            <div style={{
              fontSize: "1.05rem", lineHeight: 1.9, color: "var(--ink)",
              fontStyle: "italic", animation: "fadeInUp 1.2s ease-out",
            }}>
              <p style={{ marginBottom: 16 }}>
                Another year of wisdom, deals, and spread,<br />
                Of covenants reviewed and dashboards read.<br />
                From DSCR floors to headroom heights,<br />
                You keep the portfolio sleeping nights.
              </p>
              <p style={{ marginBottom: 16 }}>
                Through waterfalls and lockup tiers,<br />
                Through Moody&apos;s scales and fiscal years,<br />
                You track each basis point with care,<br />
                And spot the risks before they&apos;re there.
              </p>
              <p style={{ marginBottom: 16 }}>
                So raise a glass (or raise the grade),<br />
                For all the clever calls you&apos;ve made.<br />
                May your reserves be fully funded,<br />
                And every trend line leave you stunted!
              </p>
              <p style={{ marginBottom: 0, fontWeight: 600, fontStyle: "normal", color: "var(--accent)" }}>
                Wishing you a Baa1 kind of year <br />
                {"🎈🎉🥂"}
              </p>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
