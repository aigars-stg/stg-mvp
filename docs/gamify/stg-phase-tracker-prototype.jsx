import { useState, useEffect, useCallback, useRef } from "react";

// ─── STG Design Tokens ───
const tokens = {
  polar: { dark: "#2e3440", base: "#3b4252", light: "#434c5e", lighter: "#4c566a" },
  snow: { dark: "#d8dee9", base: "#e5e9f0", light: "#eceff4", white: "#ffffff" },
  frost: { deep: "#5e81ac", base: "#81a1c1", polar: "#88c0d0", light: "#8fbcbb" },
  aurora: { red: "#bf616a", orange: "#d08770", yellow: "#ebcb8b", green: "#a3be8c", purple: "#b48ead" },
};

// ─── Phase Definitions ───
const PHASES = [
  {
    id: "research",
    name: "Research Phase",
    subtitle: "Find your game",
    icon: "🔍",
    description: "Search BGG's 170,000+ games database",
    completionMsg: "Game found! Moving to market.",
  },
  {
    id: "market",
    name: "Market Phase",
    subtitle: "Set your price & condition",
    icon: "💰",
    description: "Price, condition grade, edition & language",
    completionMsg: "Price set! Time for action.",
  },
  {
    id: "action",
    name: "Action Phase",
    subtitle: "Show off your game",
    icon: "📸",
    description: "Upload photos and add description",
    completionMsg: "Looking good! Final review.",
  },
  {
    id: "score",
    name: "Score Phase",
    subtitle: "Review & list",
    icon: "✨",
    description: "Review everything and publish",
    completionMsg: "Your game is now in play!",
  },
];

// ─── Milestone Toast Component ───
function MilestoneToast({ message, subtext, visible, onDismiss }) {
  useEffect(() => {
    if (visible) {
      const t = setTimeout(onDismiss, 4500);
      return () => clearTimeout(t);
    }
  }, [visible, onDismiss]);

  return (
    <div
      style={{
        position: "fixed",
        bottom: 32,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : 100}px)`,
        opacity: visible ? 1 : 0,
        transition: "all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        zIndex: 200,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        style={{
          background: tokens.polar.dark,
          color: tokens.snow.light,
          borderRadius: 12,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
          borderLeft: `4px solid ${tokens.aurora.green}`,
          maxWidth: 380,
          fontFamily: "'Lato', sans-serif",
        }}
      >
        {/* Turni placeholder */}
        <div
          style={{
            width: 40,
            height: 40,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${tokens.frost.polar}, ${tokens.frost.deep})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
            flexShrink: 0,
          }}
        >
          🎲
        </div>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>{message}</div>
          {subtext && (
            <div style={{ fontSize: 12, color: tokens.snow.dark, opacity: 0.8 }}>{subtext}</div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sparkle Burst (micro-celebration) ───
function SparkleBurst({ active, x, y }) {
  const particles = useRef(
    Array.from({ length: 8 }, (_, i) => ({
      angle: (i / 8) * Math.PI * 2,
      distance: 20 + Math.random() * 15,
      size: 3 + Math.random() * 3,
      delay: Math.random() * 100,
    }))
  ).current;

  if (!active) return null;

  return (
    <div style={{ position: "absolute", left: x, top: y, pointerEvents: "none", zIndex: 10 }}>
      {particles.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: p.size,
            height: p.size,
            borderRadius: "50%",
            background: [tokens.aurora.orange, tokens.aurora.yellow, tokens.frost.polar][i % 3],
            animation: `sparkle-fly 600ms ${p.delay}ms cubic-bezier(0.34, 1.56, 0.64, 1) forwards`,
            "--tx": `${Math.cos(p.angle) * p.distance}px`,
            "--ty": `${Math.sin(p.angle) * p.distance}px`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Die Token (game piece that moves along the board track) ───
function DieToken({ size = 28 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.25,
        background: `linear-gradient(135deg, ${tokens.aurora.orange}, #c97862)`,
        boxShadow: `0 2px 8px rgba(208, 135, 112, 0.5)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "white",
        fontSize: size * 0.5,
        fontWeight: 700,
        fontFamily: "'Comfortaa', sans-serif",
        transition: "all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      2
    </div>
  );
}

// ─── MOBILE TRACKER: Clean segmented bar ───
function MobileTracker({ currentPhase, completedPhases }) {
  return (
    <div
      style={{
        background: tokens.snow.white,
        borderBottom: `1px solid ${tokens.snow.dark}`,
        padding: "12px 16px 14px",
        position: "sticky",
        top: 0,
        zIndex: 20,
      }}
    >
      {/* Segmented bar */}
      <div style={{ display: "flex", gap: 4, marginBottom: 10 }}>
        {PHASES.map((phase, i) => {
          const isCompleted = completedPhases.includes(phase.id);
          const isCurrent = currentPhase === i;
          return (
            <div
              key={phase.id}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 2,
                background: isCompleted
                  ? tokens.frost.deep
                  : isCurrent
                  ? tokens.aurora.orange
                  : tokens.snow.dark,
                transition: "all 300ms ease",
                position: "relative",
                overflow: "hidden",
              }}
            >
              {isCurrent && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)`,
                    animation: "shimmer 2s infinite",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Current phase info */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div
            style={{
              fontFamily: "'Comfortaa', sans-serif",
              fontWeight: 700,
              fontSize: 13,
              color: tokens.polar.dark,
              letterSpacing: "0.02em",
            }}
          >
            {PHASES[currentPhase].name}
          </div>
          <div
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: 12,
              color: tokens.polar.lighter,
              marginTop: 1,
            }}
          >
            {PHASES[currentPhase].subtitle}
          </div>
        </div>
        <div
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: 11,
            color: tokens.polar.lighter,
            background: tokens.snow.light,
            padding: "3px 8px",
            borderRadius: 10,
            fontWeight: 500,
          }}
        >
          {currentPhase + 1} / {PHASES.length}
        </div>
      </div>
    </div>
  );
}

// ─── DESKTOP TRACKER: Game-board round track ───
function DesktopTracker({ currentPhase, completedPhases, sparklePhase }) {
  return (
    <div
      style={{
        background: tokens.snow.white,
        borderBottom: `1px solid ${tokens.snow.dark}`,
        padding: "20px 32px 24px",
      }}
    >
      {/* Header */}
      <div
        style={{
          fontFamily: "'Comfortaa', sans-serif",
          fontSize: 11,
          fontWeight: 700,
          color: tokens.polar.lighter,
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: 20,
        }}
      >
        Your Turn — List a Game
      </div>

      {/* Track */}
      <div style={{ display: "flex", alignItems: "center", position: "relative" }}>
        {PHASES.map((phase, i) => {
          const isCompleted = completedPhases.includes(phase.id);
          const isCurrent = currentPhase === i;
          const isPast = i < currentPhase;
          const isLast = i === PHASES.length - 1;

          return (
            <div key={phase.id} style={{ display: "flex", alignItems: "center", flex: 1 }}>
              {/* Phase node */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", position: "relative", zIndex: 2 }}>
                {/* Die token on current phase */}
                {isCurrent && (
                  <div
                    style={{
                      position: "absolute",
                      top: -36,
                      animation: "gentle-bounce 2s infinite",
                    }}
                  >
                    <DieToken size={26} />
                  </div>
                )}

                {/* Node circle */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: isCompleted
                      ? tokens.frost.deep
                      : isCurrent
                      ? tokens.snow.white
                      : tokens.snow.light,
                    border: isCurrent
                      ? `2px solid ${tokens.aurora.orange}`
                      : isCompleted
                      ? `2px solid ${tokens.frost.deep}`
                      : `2px solid ${tokens.snow.dark}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: isCompleted ? 16 : 18,
                    transition: "all 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
                    position: "relative",
                    boxShadow: isCurrent ? `0 0 0 4px rgba(208, 135, 112, 0.15)` : "none",
                  }}
                >
                  {isCompleted ? (
                    <span style={{ color: tokens.snow.white, fontSize: 18 }}>✓</span>
                  ) : (
                    <span style={{ filter: isPast ? "grayscale(1) opacity(0.4)" : "none" }}>
                      {phase.icon}
                    </span>
                  )}

                  {/* Sparkle burst on completion */}
                  <SparkleBurst active={sparklePhase === phase.id} x={22} y={22} />
                </div>

                {/* Phase name */}
                <div
                  style={{
                    fontFamily: "'Comfortaa', sans-serif",
                    fontWeight: isCurrent ? 700 : isCompleted ? 600 : 400,
                    fontSize: 12,
                    color: isCurrent
                      ? tokens.aurora.orange
                      : isCompleted
                      ? tokens.frost.deep
                      : tokens.polar.lighter,
                    marginTop: 8,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    transition: "all 300ms ease",
                  }}
                >
                  {phase.name.replace(" Phase", "")}
                </div>

                {/* Subtitle */}
                <div
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: 11,
                    color: isCurrent ? tokens.polar.lighter : "transparent",
                    marginTop: 2,
                    textAlign: "center",
                    whiteSpace: "nowrap",
                    transition: "all 300ms ease",
                  }}
                >
                  {phase.subtitle}
                </div>
              </div>

              {/* Connector path */}
              {!isLast && (
                <div
                  style={{
                    flex: 1,
                    height: 3,
                    margin: "0 -2px",
                    marginBottom: 36,
                    background: isPast || isCompleted
                      ? `linear-gradient(90deg, ${tokens.frost.deep}, ${
                          completedPhases.includes(PHASES[i + 1]?.id) || currentPhase === i + 1
                            ? tokens.frost.deep
                            : tokens.snow.dark
                        })`
                      : tokens.snow.dark,
                    borderRadius: 2,
                    transition: "all 500ms ease",
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  {/* Animated fill for active connector */}
                  {isCurrent && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        bottom: 0,
                        width: "30%",
                        background: `linear-gradient(90deg, ${tokens.frost.deep}, transparent)`,
                        opacity: 0.4,
                        animation: "pulse-width 2s infinite ease-in-out",
                      }}
                    />
                  )}

                  {/* Small decorative dots on connector */}
                  <div
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      transform: "translate(-50%, -50%)",
                      width: 5,
                      height: 5,
                      borderRadius: "50%",
                      background: isPast ? tokens.frost.polar : tokens.snow.dark,
                      opacity: 0.5,
                      transition: "all 300ms ease",
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Phase Content Panel (simulated form content) ───
function PhaseContent({ phase, onComplete }) {
  const content = {
    research: (
      <div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: tokens.polar.dark, marginBottom: 6, fontFamily: "'Lato', sans-serif" }}>
            Search BoardGameGeek
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              placeholder="e.g. Wingspan, Brass Birmingham..."
              defaultValue="Brass: Birmingham"
              style={{
                flex: 1,
                height: 44,
                padding: "0 12px",
                border: `1px solid ${tokens.snow.dark}`,
                borderRadius: 8,
                fontSize: 16,
                fontFamily: "'Lato', sans-serif",
                color: tokens.polar.dark,
                outline: "none",
              }}
            />
          </div>
        </div>
        <div
          style={{
            background: tokens.snow.light,
            borderRadius: 12,
            padding: 16,
            display: "flex",
            gap: 14,
            border: `2px solid ${tokens.frost.deep}`,
          }}
        >
          <div
            style={{
              width: 60,
              height: 60,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${tokens.aurora.yellow}40, ${tokens.aurora.orange}40)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
              flexShrink: 0,
            }}
          >
            🏭
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 15, color: tokens.polar.dark, fontFamily: "'Lato', sans-serif" }}>
              Brass: Birmingham
            </div>
            <div style={{ fontSize: 13, color: tokens.polar.lighter, fontFamily: "'Lato', sans-serif", marginTop: 2 }}>
              2018 · Roxley · 2-4 players · Strategy
            </div>
            <div style={{ fontSize: 12, color: tokens.frost.deep, fontFamily: "'Lato', sans-serif", marginTop: 4, fontWeight: 500 }}>
              ✓ Matched from BGG
            </div>
          </div>
        </div>
      </div>
    ),
    market: (
      <div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: tokens.polar.dark, marginBottom: 6, fontFamily: "'Lato', sans-serif" }}>
            Your price
          </label>
          <div style={{ position: "relative", width: 160 }}>
            <span
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: tokens.polar.lighter,
                fontWeight: 600,
                fontSize: 16,
                fontFamily: "'Lato', sans-serif",
              }}
            >
              €
            </span>
            <input
              type="text"
              defaultValue="35.00"
              style={{
                width: "100%",
                height: 44,
                padding: "0 12px 0 28px",
                border: `1px solid ${tokens.snow.dark}`,
                borderRadius: 8,
                fontSize: 18,
                fontWeight: 600,
                fontFamily: "'Lato', sans-serif",
                color: tokens.polar.dark,
                outline: "none",
                fontVariantNumeric: "tabular-nums",
              }}
            />
          </div>
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: tokens.polar.dark, marginBottom: 8, fontFamily: "'Lato', sans-serif" }}>
            Condition
          </label>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { label: "Like New", color: tokens.aurora.green },
              { label: "Very Good", color: tokens.frost.polar, active: true },
              { label: "Good", color: tokens.aurora.yellow },
              { label: "Acceptable", color: tokens.aurora.orange },
            ].map((c) => (
              <div
                key={c.label}
                style={{
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: c.active ? `2px solid ${c.color}` : `1px solid ${tokens.snow.dark}`,
                  background: c.active ? `${c.color}15` : tokens.snow.white,
                  fontSize: 13,
                  fontWeight: c.active ? 600 : 400,
                  color: c.active ? tokens.polar.dark : tokens.polar.lighter,
                  fontFamily: "'Lato', sans-serif",
                  cursor: "pointer",
                }}
              >
                {c.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    ),
    action: (
      <div>
        <label style={{ display: "block", fontSize: 14, fontWeight: 500, color: tokens.polar.dark, marginBottom: 8, fontFamily: "'Lato', sans-serif" }}>
          Photos
        </label>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          {["📦 Box front", "🎲 Components", "📖 Rulebook"].map((label, i) => (
            <div
              key={i}
              style={{
                width: 100,
                height: 100,
                borderRadius: 10,
                border: `2px dashed ${i === 0 ? tokens.frost.deep : tokens.snow.dark}`,
                background: i === 0 ? `${tokens.frost.deep}08` : tokens.snow.light,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: 4,
                fontSize: 22,
                cursor: "pointer",
              }}
            >
              <span>{label.split(" ")[0]}</span>
              <span style={{ fontSize: 10, color: tokens.polar.lighter, fontFamily: "'Lato', sans-serif" }}>
                {label.split(" ").slice(1).join(" ")}
              </span>
            </div>
          ))}
          <div
            style={{
              width: 100,
              height: 100,
              borderRadius: 10,
              border: `2px dashed ${tokens.snow.dark}`,
              background: tokens.snow.light,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              color: tokens.polar.lighter,
              cursor: "pointer",
            }}
          >
            +
          </div>
        </div>
      </div>
    ),
    score: (
      <div>
        <div
          style={{
            background: tokens.snow.light,
            borderRadius: 12,
            padding: 20,
            border: `1px solid ${tokens.snow.dark}`,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: tokens.polar.lighter, fontFamily: "'Lato', sans-serif" }}>Game</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: tokens.polar.dark, fontFamily: "'Lato', sans-serif" }}>Brass: Birmingham</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: tokens.polar.lighter, fontFamily: "'Lato', sans-serif" }}>Condition</span>
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                background: `${tokens.frost.polar}25`,
                color: tokens.polar.dark,
                padding: "2px 8px",
                borderRadius: 4,
                fontFamily: "'Lato', sans-serif",
              }}
            >
              Very Good
            </span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
            <span style={{ fontSize: 14, color: tokens.polar.lighter, fontFamily: "'Lato', sans-serif" }}>Your price</span>
            <span style={{ fontSize: 18, fontWeight: 700, color: tokens.polar.dark, fontFamily: "'Lato', sans-serif", fontVariantNumeric: "tabular-nums" }}>€35.00</span>
          </div>
          <div
            style={{
              borderTop: `1px solid ${tokens.snow.dark}`,
              paddingTop: 12,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span style={{ fontSize: 13, color: tokens.polar.lighter, fontFamily: "'Lato', sans-serif" }}>You'll receive after sale</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: tokens.aurora.green, fontFamily: "'Lato', sans-serif", fontVariantNumeric: "tabular-nums" }}>€31.50</span>
          </div>
          <div style={{ fontSize: 11, color: tokens.polar.lighter, textAlign: "right", marginTop: 2, fontFamily: "'Lato', sans-serif" }}>
            10% platform commission
          </div>
        </div>
      </div>
    ),
  };

  return (
    <div style={{ padding: "24px 20px" }}>
      {/* Phase header */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            fontFamily: "'Comfortaa', sans-serif",
            fontSize: 20,
            fontWeight: 700,
            color: tokens.polar.dark,
            marginBottom: 4,
          }}
        >
          {phase.name}
        </div>
        <div
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: 14,
            color: tokens.polar.lighter,
          }}
        >
          {phase.description}
        </div>
      </div>

      {/* Form content */}
      {content[phase.id]}

      {/* Action button */}
      <button
        onClick={onComplete}
        style={{
          marginTop: 24,
          width: "100%",
          height: 48,
          background: tokens.aurora.orange,
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: 15,
          fontWeight: 600,
          fontFamily: "'Lato', sans-serif",
          cursor: "pointer",
          transition: "all 150ms ease",
          boxShadow: `0 2px 8px rgba(208, 135, 112, 0.3)`,
        }}
        onMouseEnter={(e) => {
          e.target.style.background = "#c97862";
          e.target.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.target.style.background = tokens.aurora.orange;
          e.target.style.transform = "translateY(0)";
        }}
      >
        {phase.id === "score" ? "🎲 List your game" : `Complete ${phase.name.replace(" Phase", "")} →`}
      </button>
    </div>
  );
}

// ─── Final Celebration Screen ───
function CelebrationScreen({ onReset, isFirstListing }) {
  const [show, setShow] = useState(false);
  useEffect(() => {
    requestAnimationFrame(() => setShow(true));
  }, []);

  return (
    <div
      style={{
        textAlign: "center",
        padding: "48px 24px",
        opacity: show ? 1 : 0,
        transform: show ? "translateY(0)" : "translateY(20px)",
        transition: "all 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
      }}
    >
      {/* Animated die */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 18,
          background: `linear-gradient(135deg, ${tokens.aurora.orange}, #c97862)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          fontSize: 32,
          fontWeight: 700,
          fontFamily: "'Comfortaa', sans-serif",
          margin: "0 auto 20px",
          boxShadow: `0 8px 24px rgba(208, 135, 112, 0.4)`,
          animation: "celebrate-bounce 600ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        2
      </div>

      <div
        style={{
          fontFamily: "'Comfortaa', sans-serif",
          fontSize: 24,
          fontWeight: 700,
          color: tokens.polar.dark,
          marginBottom: 8,
        }}
      >
        Your game is now in play!
      </div>

      {isFirstListing && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: `${tokens.aurora.green}18`,
            color: tokens.aurora.green,
            padding: "6px 14px",
            borderRadius: 20,
            fontSize: 13,
            fontWeight: 600,
            fontFamily: "'Lato', sans-serif",
            marginBottom: 12,
          }}
        >
          🏆 First Turn — Achievement unlocked
        </div>
      )}

      <div
        style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: 15,
          color: tokens.polar.lighter,
          lineHeight: 1.5,
          maxWidth: 340,
          margin: "0 auto 24px",
        }}
      >
        Brass: Birmingham is listed at €35.00. We'll notify you when someone makes a move.
      </div>

      {/* Listing preview card */}
      <div
        style={{
          background: tokens.snow.white,
          borderRadius: 12,
          border: `1px solid ${tokens.snow.dark}`,
          padding: 16,
          maxWidth: 280,
          margin: "0 auto 28px",
          textAlign: "left",
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
        }}
      >
        <div
          style={{
            width: "100%",
            height: 140,
            borderRadius: 8,
            background: `linear-gradient(135deg, ${tokens.snow.light}, ${tokens.snow.base})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            marginBottom: 12,
          }}
        >
          🏭
        </div>
        <div style={{ fontSize: 18, fontWeight: 600, color: tokens.polar.dark, fontFamily: "'Lato', sans-serif", fontVariantNumeric: "tabular-nums" }}>
          €35.00
        </div>
        <div
          style={{
            display: "inline-block",
            fontSize: 11,
            fontWeight: 500,
            background: `${tokens.frost.polar}25`,
            color: tokens.polar.dark,
            padding: "2px 6px",
            borderRadius: 4,
            marginTop: 4,
            fontFamily: "'Lato', sans-serif",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
          }}
        >
          Very Good
        </div>
        <div style={{ fontSize: 14, fontWeight: 500, color: tokens.polar.dark, fontFamily: "'Lato', sans-serif", marginTop: 6 }}>
          Brass: Birmingham
        </div>
        <div style={{ fontSize: 12, color: tokens.polar.lighter, fontFamily: "'Lato', sans-serif", marginTop: 2 }}>
          2018 · Roxley
        </div>
      </div>

      <button
        onClick={onReset}
        style={{
          height: 44,
          padding: "0 24px",
          background: tokens.frost.deep,
          color: "white",
          border: "none",
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          fontFamily: "'Lato', sans-serif",
          cursor: "pointer",
          transition: "all 150ms ease",
        }}
        onMouseEnter={(e) => (e.target.style.background = "#4f7399")}
        onMouseLeave={(e) => (e.target.style.background = tokens.frost.deep)}
      >
        ↺ Replay demo
      </button>
    </div>
  );
}

// ─── MAIN COMPONENT ───
export default function PhaseTrackerDemo() {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [completedPhases, setCompletedPhases] = useState([]);
  const [sparklePhase, setSparklePhase] = useState(null);
  const [toast, setToast] = useState(null);
  const [viewMode, setViewMode] = useState("desktop");
  const [isFinished, setIsFinished] = useState(false);
  const [isFirstListing] = useState(true);

  const completePhase = useCallback(() => {
    const phase = PHASES[currentPhase];

    // Trigger sparkle
    setSparklePhase(phase.id);
    setTimeout(() => setSparklePhase(null), 700);

    // Mark completed
    setCompletedPhases((prev) => [...prev, phase.id]);

    if (currentPhase < PHASES.length - 1) {
      // Show micro-completion toast
      setToast({ message: phase.completionMsg, subtext: `${PHASES[currentPhase + 1].name} up next` });

      // Advance after brief pause
      setTimeout(() => setCurrentPhase((p) => p + 1), 500);
    } else {
      // Final phase complete — celebration
      setToast({
        message: "First Turn complete!",
        subtext: "You're officially a player.",
      });
      setTimeout(() => setIsFinished(true), 800);
    }
  }, [currentPhase]);

  const reset = useCallback(() => {
    setCurrentPhase(0);
    setCompletedPhases([]);
    setSparklePhase(null);
    setToast(null);
    setIsFinished(false);
  }, []);

  return (
    <div
      style={{
        fontFamily: "'Lato', sans-serif",
        minHeight: "100vh",
        background: `linear-gradient(180deg, ${tokens.snow.light} 0%, ${tokens.snow.base} 100%)`,
      }}
    >
      {/* Google Fonts */}
      <link
        href="https://fonts.googleapis.com/css2?family=Comfortaa:wght@300;400;700&family=Lato:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />

      {/* Animations */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes gentle-bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
        @keyframes celebrate-bounce {
          0% { transform: scale(0.3) rotate(-20deg); opacity: 0; }
          60% { transform: scale(1.1) rotate(5deg); }
          100% { transform: scale(1) rotate(0); opacity: 1; }
        }
        @keyframes sparkle-fly {
          0% { transform: translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
        @keyframes pulse-width {
          0%, 100% { width: 0%; opacity: 0; }
          50% { width: 60%; opacity: 0.5; }
        }
        @keyframes fade-up {
          0% { opacity: 0; transform: translateY(10px); }
          100% { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header bar */}
      <div
        style={{
          background: tokens.snow.white,
          padding: "12px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${tokens.snow.dark}`,
        }}
      >
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: `linear-gradient(135deg, ${tokens.aurora.orange}, #c97862)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: 16,
              fontWeight: 700,
              fontFamily: "'Comfortaa', sans-serif",
            }}
          >
            2
          </div>
          <div>
            <span
              style={{
                fontFamily: "'Comfortaa', sans-serif",
                fontWeight: 300,
                fontSize: 11,
                color: tokens.frost.deep,
                letterSpacing: "0.01em",
              }}
            >
              every game deserves a{" "}
            </span>
            <span
              style={{
                fontFamily: "'Comfortaa', sans-serif",
                fontWeight: 700,
                fontSize: 11,
                color: tokens.aurora.orange,
              }}
            >
              second turn
            </span>
          </div>
        </div>

        {/* View toggle */}
        <div
          style={{
            display: "flex",
            background: tokens.snow.light,
            borderRadius: 8,
            padding: 3,
            gap: 2,
          }}
        >
          {["mobile", "desktop"].map((mode) => (
            <button
              key={mode}
              onClick={() => setViewMode(mode)}
              style={{
                padding: "6px 14px",
                borderRadius: 6,
                border: "none",
                background: viewMode === mode ? tokens.snow.white : "transparent",
                color: viewMode === mode ? tokens.polar.dark : tokens.polar.lighter,
                fontSize: 12,
                fontWeight: viewMode === mode ? 600 : 400,
                fontFamily: "'Lato', sans-serif",
                cursor: "pointer",
                boxShadow: viewMode === mode ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                transition: "all 150ms ease",
                textTransform: "capitalize",
              }}
            >
              {mode === "mobile" ? "📱 Mobile" : "🖥 Desktop"}
            </button>
          ))}
        </div>
      </div>

      {/* Device frame */}
      <div
        style={{
          maxWidth: viewMode === "mobile" ? 390 : 740,
          margin: "24px auto",
          background: tokens.snow.white,
          borderRadius: 16,
          border: `1px solid ${tokens.snow.dark}`,
          overflow: "hidden",
          boxShadow: "0 8px 32px rgba(0,0,0,0.08)",
          transition: "max-width 400ms cubic-bezier(0.34, 1.56, 0.64, 1)",
        }}
      >
        {/* Tracker */}
        {!isFinished && (
          viewMode === "mobile" ? (
            <MobileTracker currentPhase={currentPhase} completedPhases={completedPhases} />
          ) : (
            <DesktopTracker
              currentPhase={currentPhase}
              completedPhases={completedPhases}
              sparklePhase={sparklePhase}
            />
          )
        )}

        {/* Content */}
        {isFinished ? (
          <CelebrationScreen onReset={reset} isFirstListing={isFirstListing} />
        ) : (
          <div style={{ animation: "fade-up 300ms ease" }} key={currentPhase}>
            <PhaseContent phase={PHASES[currentPhase]} onComplete={completePhase} />
          </div>
        )}
      </div>

      {/* Annotation panel */}
      <div
        style={{
          maxWidth: viewMode === "mobile" ? 390 : 740,
          margin: "0 auto 40px",
          padding: "16px 20px",
          background: `${tokens.polar.dark}08`,
          borderRadius: 12,
          border: `1px dashed ${tokens.snow.dark}`,
        }}
      >
        <div
          style={{
            fontFamily: "'Comfortaa', sans-serif",
            fontSize: 11,
            fontWeight: 700,
            color: tokens.polar.lighter,
            textTransform: "uppercase",
            letterSpacing: "0.08em",
            marginBottom: 8,
          }}
        >
          Design Notes
        </div>
        <div style={{ fontSize: 13, color: tokens.polar.lighter, lineHeight: 1.6, fontFamily: "'Lato', sans-serif" }}>
          {viewMode === "mobile" ? (
            <>
              <strong style={{ color: tokens.polar.dark }}>Mobile tracker:</strong> Compact 48px sticky header.
              Segmented bar with shimmer on active phase.
              Phase name in Comfortaa Bold 13px, subtitle in Lato 12px.
              Counter badge provides orientation without consuming space.
              Identical information to desktop, just compressed.
            </>
          ) : (
            <>
              <strong style={{ color: tokens.polar.dark }}>Desktop tracker:</strong> Game-board round track with die
              token marker. Nodes are 44px rounded squares (matching STG's radius-lg).
              Connector paths with decorative midpoint dots echo euro-game scoring tracks.
              Phase labels in Comfortaa, subtitles reveal on active phase only.
              Sparkle burst on phase completion uses Aurora palette particles.
            </>
          )}
        </div>
      </div>

      {/* Toast */}
      <MilestoneToast
        message={toast?.message}
        subtext={toast?.subtext}
        visible={!!toast}
        onDismiss={() => setToast(null)}
      />
    </div>
  );
}
