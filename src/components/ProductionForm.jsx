{/* STEP 4 */}
<div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-2.5">
  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
    <span className="text-xs font-bold text-cyan-400 flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-slate-950">4</span>
      STEP 4: Pose & Angle Final Inspection
    </span>
    <span className="text-[10px] text-slate-400 font-mono">Check tilt angle & tank limits</span>
  </div>

  <div className="space-y-2 text-xs">
    {/* Safety Item 1: Rigging Angle & Depth Limits */}
    <div className="p-2.5 bg-rose-950/30 border-l-2 border-l-rose-500 rounded-r text-[11px] text-slate-300">
      <div className="flex items-center justify-between mb-0.5">
        <div className="font-bold text-rose-300">🛡️ Safety: Rack, Hanging Depth & Rigging Angle Limits</div>
        <button
          type="button"
          onClick={() => setShowRiggingGuide(true)}
          className="flex items-center gap-1 text-[10px] font-mono text-rose-300 bg-rose-900/50 hover:bg-rose-800 border border-rose-500/40 px-2 py-0.5 rounded transition-colors"
        >
          <span>⚖️</span>
          <span className="underline decoration-rose-400/50">Rigging Angle & Load Guide</span>
        </button>
      </div>
      <div>
        Maintain top clearance &ge; 30cm to ensure the workpiece fully immerses in the acid tanks/zinc kettle. Control hanging depth &le; 300cm to ensure the rack clears other racks during transfer. Keep wires/chains as vertical as possible (&le; 15&deg;). Derate working load capacity to <strong>85%</strong> for angles between 15&deg;&ndash;30&deg;, and to <strong>70%</strong> for angles between 30&deg;&ndash;45&deg;. Rigging angles &gt; 45&deg; from vertical are <strong className="text-rose-400 underline decoration-rose-500">strictly prohibited</strong>.
      </div>
    </div>

    {/* Safety Item 2: Workpiece Stability & Anti-Sway Control */}
    <div className="p-2.5 bg-rose-950/30 border-l-2 border-l-rose-500 rounded-r text-[11px] text-slate-300">
      <div className="flex items-center justify-between mb-0.5">
        <div className="font-bold text-rose-300">🛡️ Safety: Workpiece Stability & Anti-Sway Control</div>
        <button
          type="button"
          onClick={() => setShowAntiSwayGuide(true)}
          className="flex items-center gap-1 text-[10px] font-mono text-rose-300 bg-rose-900/50 hover:bg-rose-800 border border-rose-500/40 px-2 py-0.5 rounded transition-colors"
        >
          <span>🪢</span>
          <span className="underline decoration-rose-400/50">Anti-Sway & Waist-Tie Guide</span>
        </button>
      </div>
      <div>
        Prohibit single-point hanging for large/flat plates. Mandatory dual-point suspension with waist binding wire through mid-body holes of adjacent workpieces to lock them into a single rigid row, preventing relative sway and collisions during dipping and transfer. Ensure &ge; 20cm lateral clearance from tank walls.
      </div>
    </div>

    {/* Quality Item 1: Hanging Pitch Angle */}
    <div className="p-2.5 bg-cyan-950/30 border-l-2 border-l-cyan-500 rounded-r text-[11px] text-slate-300">
      <div className="flex items-center justify-between mb-0.5">
        <div className="font-bold text-cyan-300">💎 Quality: Hanging Pitch Angle</div>
        <button
          type="button"
          onClick={() => setShowPitchGuide(true)}
          className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/40 px-2 py-0.5 rounded transition-colors"
        >
          <span>📐</span>
          <span className="underline decoration-cyan-400/50">Pitch Guide & Wire Length Calculator</span>
        </button>
      </div>
      <div>
        Maintain 15° to 30° tilt angle for rapid, uniform zinc drainage, fast run-off, and zero ash trapping on flat surfaces.
      </div>
    </div>

    {/* ===== 新增：4个质量控制项入口 (来自 Gemini) ===== */}

    {/* Entry 1: 孔位定向 */}
    <div className="p-2.5 bg-cyan-950/30 border-l-2 border-l-cyan-500 rounded-r text-[11px] text-slate-300">
      <div className="flex items-center justify-between mb-0.5">
        <div className="font-bold text-cyan-300">💎 Quality: Vent & Drain Hole Orientation (Large Low / Small High)</div>
        <button
          type="button"
          onClick={() => setShowDrainHoleGuide(true)}
          className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/40 px-2 py-0.5 rounded transition-colors"
        >
          <span>🕳️</span>
          <span className="underline decoration-cyan-400/50">Drain/Vent Hole Guide</span>
        </button>
      </div>
      <div>Always orient workpieces so larger holes are at the lowest point (for zinc drainage) and smaller holes are at the highest point (for air venting).</div>
    </div>

    {/* Entry 2: 盲端大倾角 */}
    <div className="p-2.5 bg-cyan-950/30 border-l-2 border-l-cyan-500 rounded-r text-[11px] text-slate-300">
      <div className="flex items-center justify-between mb-0.5">
        <div className="font-bold text-cyan-300">💎 Quality: Blind-End Workpiece Hanging Pose</div>
        <button
          type="button"
          onClick={() => setShowBlindEndGuide(true)}
          className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/40 px-2 py-0.5 rounded transition-colors"
        >
          <span>🪣</span>
          <span className="underline decoration-cyan-400/50">Blind-End Pose Guide</span>
        </button>
      </div>
      <div>For single-opening/blind-end workpieces, enforce a steep 35°–45° tilt with the open mouth facing downwards to serve as the lowest drainage point.</div>
    </div>

    {/* Entry 3: 最低滴锌角避让 */}
    <div className="p-2.5 bg-cyan-950/30 border-l-2 border-l-cyan-500 rounded-r text-[11px] text-slate-300">
      <div className="flex items-center justify-between mb-0.5">
        <div className="font-bold text-cyan-300">💎 Quality: Lowest Drip-Corner Clearance</div>
        <button
          type="button"
          onClick={() => setShowDripCornerGuide(true)}
          className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/40 px-2 py-0.5 rounded transition-colors"
        >
          <span>📍</span>
          <span className="underline decoration-cyan-400/50">Drip Corner Clearance Guide</span>
        </button>
      </div>
      <div>Never tie wire or attach rigging directly over the lowest drip corner. Keep the lowest tip 100% unobstructed.</div>
    </div>

    {/* Entry 4: 角孔穿线 */}
    <div className="p-2.5 bg-cyan-950/30 border-l-2 border-l-cyan-500 rounded-r text-[11px] text-slate-300">
      <div className="flex items-center justify-between mb-0.5">
        <div className="font-bold text-cyan-300">💎 Quality: Wire Tie-In Location & Contour Line</div>
        <button
          type="button"
          onClick={() => setShowCornerTieGuide(true)}
          className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/40 px-2 py-0.5 rounded transition-colors"
        >
          <span>🔗</span>
          <span className="underline decoration-cyan-400/50">Corner Tie-In & Contour Guide</span>
        </button>
      </div>
      <div>Pass tie-wires through corner or edge holes rather than mid-body holes. Keep wires pulled tight against workpiece contours.</div>
    </div>
  </div>

  {/* ============ 原有 3 个 Modal ============ */}

  {/* Rigging Angle & Derating Guide Modal (Safety Modal) */}
  {showRiggingGuide && (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-500/30 rounded-xl max-w-lg w-full p-4 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">⚖️</span>
            <h3 className="text-sm font-bold text-rose-300">
              Rigging Angle & Load Derating Standard (&le; 45&deg;)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowRiggingGuide(false)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800 transition-colors"
          >
            ✕ Close
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 max-h-[65vh] overflow-y-auto pr-1">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="font-bold text-rose-300 text-[11px]">
              1. Rigging Angle (&theta;) Reference Diagram
            </div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              Rigging Angle (&theta;) is measured between the wire/chain and the <strong>vertical line</strong>. Larger angles increase tension and reduce working load limit (WLL).
            </div>
            <div className="w-full h-56 bg-slate-900/90 rounded border border-slate-800/80 flex items-center justify-center p-2">
              <svg viewBox="0 0 320 150" className="w-full h-full">
                <rect x="30" y="12" width="260" height="12" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
                <text x="160" y="21" fill="#cbd5e1" fontSize="11" fontWeight="normal" textAnchor="middle" className="font-mono">
                  Beam Rack
                </text>

                <line x1="100" y1="24" x2="100" y2="125" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="105" y="40" fill="#cbd5e1" fontSize="11" fontWeight="normal" className="font-mono">0° Vertical Line</text>

                <line x1="100" y1="24" x2="60" y2="110" stroke="#f43f5e" strokeWidth="2" />
                <circle cx="100" cy="24" r="3" fill="#f43f5e" />
                <circle cx="60" cy="110" r="3" fill="#f43f5e" />

                <line x1="220" y1="24" x2="260" y2="110" stroke="#f43f5e" strokeWidth="2" />
                <circle cx="220" cy="24" r="3" fill="#f43f5e" />
                <circle cx="260" cy="110" r="3" fill="#f43f5e" />

                <path d="M 100 65 A 41 41 0 0 0 81 60" fill="none" stroke="#f59e0b" strokeWidth="2" />
                <text x="82" y="76" fill="#f59e0b" fontSize="13" fontWeight="bold" className="font-mono">
                  θ (Rigging Angle)
                </text>

                <rect x="40" y="110" width="240" height="18" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="160" y="122" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
                  Workpiece
                </text>
              </svg>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="font-bold text-rose-300 text-[11px]">
              2. Load Capacity Derating Rules
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-emerald-950/20 p-2 rounded border border-emerald-500/30 space-y-0.5">
                <div className="font-bold text-emerald-400 flex justify-between">
                  <span>&le; 15&deg; (Optimal)</span>
                  <span>100% WLL</span>
                </div>
                <div className="text-[9px] text-slate-400">Normal operating load. Minimal tension increase.</div>
              </div>

              <div className="bg-amber-950/20 p-2 rounded border border-amber-500/30 space-y-0.5">
                <div className="font-bold text-amber-400 flex justify-between">
                  <span>15&deg;&ndash;30&deg; (Caution)</span>
                  <span>Derate to 85%</span>
                </div>
                <div className="text-[9px] text-slate-400">Wire/chain tension increases ~15%. Reduce max load.</div>
              </div>

              <div className="bg-orange-950/20 p-2 rounded border border-orange-500/30 space-y-0.5">
                <div className="font-bold text-orange-400 flex justify-between">
                  <span>30&deg;&ndash;45&deg; (Warning)</span>
                  <span>Derate to 70%</span>
                </div>
                <div className="text-[9px] text-slate-400">High lateral tension forces. Strict weight checking required.</div>
              </div>

              <div className="bg-rose-950/30 p-2 rounded border border-rose-500/40 space-y-0.5">
                <div className="font-bold text-rose-400 flex justify-between">
                  <span>&gt; 45&deg; (DANGER)</span>
                  <span className="underline">PROHIBITED</span>
                </div>
                <div className="text-[9px] text-slate-400">Extreme risk of wire failure, slip or workpiece damage.</div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => setShowRiggingGuide(false)}
            className="bg-rose-600 hover:bg-rose-500 text-slate-950 font-bold px-4 py-1.5 rounded text-xs transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  )}

  {/* Anti-Sway & Waist-Tie Guide Modal */}
  {showAntiSwayGuide && (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-rose-500/30 rounded-xl max-w-2xl w-full p-4 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">🪢</span>
            <h3 className="text-sm font-bold text-rose-300">
              Anti-Sway & Waist-Tie Operational Standard
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowAntiSwayGuide(false)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800 transition-colors"
          >
            ✕ Close
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 max-h-[70vh] overflow-y-auto pr-1">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="font-bold text-rose-300 text-[11px]">
              1. Interconnecting Anti-Sway Diagram
            </div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              Use dual-point suspension for large plates. Connect adjacent workpieces with tie wire to form a single rigid row and eliminate relative movement.
            </div>

            <div className="w-full h-72 bg-slate-900/90 rounded border border-slate-800/80 flex items-center justify-center p-2">
              <svg viewBox="0 0 850 420" className="w-full h-full">
                <defs>
                  <pattern id="grid-sway-correct" width="25" height="25" patternUnits="userSpaceOnUse">
                    <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                  </pattern>
                </defs>

                <rect width="850" height="420" fill="url(#grid-sway-correct)" rx="4" />

                <rect x="50" y="25" width="750" height="28" rx="6" fill="#2563eb" stroke="#3b82f6" strokeWidth="1.5" />
                <text x="425" y="44" fill="#cbd5e1" fontSize="14" fontWeight="normal" textAnchor="middle" className="font-mono">
                  BEAM RACK
                </text>

                <rect x="100" y="70" width="180" height="30" rx="15" fill="#022c22" stroke="#10b981" strokeWidth="2" />
                <text x="190" y="90" fill="#34d399" fontSize="18" fontWeight="bold" textAnchor="middle">
                  Dual-Point Suspension
                </text>

                <line x1="145" y1="53" x2="140" y2="155" stroke="#94a3b8" strokeWidth="2.5" />
                <line x1="225" y1="53" x2="228" y2="170" stroke="#94a3b8" strokeWidth="2.5" />

                <line x1="385" y1="53" x2="380" y2="155" stroke="#94a3b8" strokeWidth="2.5" />
                <line x1="465" y1="53" x2="468" y2="170" stroke="#94a3b8" strokeWidth="2.5" />

                <line x1="625" y1="53" x2="620" y2="155" stroke="#94a3b8" strokeWidth="2.5" />
                <line x1="705" y1="53" x2="708" y2="170" stroke="#94a3b8" strokeWidth="2.5" />

                <g transform="translate(185, 230) rotate(-10)">
                  <rect x="-65" y="-75" width="130" height="150" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
                  <text x="0" y="-5" fill="#cbd5e1" fontSize="13" fontWeight="normal" textAnchor="middle">
                    Plate #1
                  </text>
                </g>

                <g transform="translate(425, 230) rotate(-10)">
                  <rect x="-65" y="-75" width="130" height="150" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
                  <text x="0" y="-5" fill="#cbd5e1" fontSize="13" fontWeight="normal" textAnchor="middle">
                    Plate #2
                  </text>
                </g>

                <g transform="translate(665, 230) rotate(-10)">
                  <rect x="-65" y="-75" width="130" height="150" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
                  <text x="0" y="-5" fill="#cbd5e1" fontSize="13" fontWeight="normal" textAnchor="middle">
                    Plate #3
                  </text>
                </g>

                <path d="M 127 276 L 255 253 L 367 276 L 495 253 L 607 276 L 735 253" fill="none" stroke="#f59e0b" strokeWidth="3.5" />

                <circle cx="255" cy="253" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                <circle cx="367" cy="276" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                <circle cx="495" cy="253" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
                <circle cx="607" cy="276" r="6" fill="#10b981" stroke="#ffffff" strokeWidth="2" />

                <line x1="311" y1="264" x2="311" y2="340" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="551" y1="264" x2="551" y2="340" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />

                <rect x="115" y="336" width="620" height="48" rx="8" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
                <text x="425" y="366" fill="#fbbf24" fontSize="15" fontWeight="bold" textAnchor="middle" className="font-mono">
                  Interconnecting Tie Wire (Connecting Adjacent Workpieces)
                </text>
              </svg>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="font-bold text-rose-300 text-[11px]">
              2. Mandatory Safety & Rigging Controls
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              <div className="bg-emerald-950/20 p-2 rounded border border-emerald-500/30 space-y-0.5">
                <div className="font-bold text-emerald-400">
                  ✓ Dual-Point Suspension
                </div>
                <div className="text-[9px] text-slate-400">
                  Large or flat plates must use at least two vertical hanging points to limit axial tilting.
                </div>
              </div>

              <div className="bg-emerald-950/20 p-2 rounded border border-emerald-500/30 space-y-0.5">
                <div className="font-bold text-emerald-400">
                  ✓ Interconnecting Tie Wire
                </div>
                <div className="text-[9px] text-slate-400">
                  Connect adjacent workpieces using tie wire to form a unified row, eliminating relative sway & collisions.
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => setShowAntiSwayGuide(false)}
            className="bg-rose-600 hover:bg-rose-500 text-slate-950 font-bold px-4 py-1.5 rounded text-xs transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  )}

  {/* Pitch Angle Guide Modal */}
  {showPitchGuide && (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl max-w-lg w-full p-4 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">📐</span>
            <h3 className="text-sm font-bold text-cyan-400">
              Hanging Pitch Angle & Drainage Standard (15°–30°)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowPitchGuide(false)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800 transition-colors"
          >
            ✕ Close
          </button>
        </div>

        <div className="space-y-3 text-xs text-slate-300 max-h-[65vh] overflow-y-auto pr-1">
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="font-bold text-cyan-300 text-[11px]">
              1. Optimal 15°–30° Pitch Angle Dynamics
            </div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              Hanging at <strong className="text-amber-400">15° to 30°</strong> ensures smooth air purging upon entry and rapid molten zinc run-off upon exit, preventing zinc tears, spikes, and ash trapping.
            </div>

            <div className="w-full h-52 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-center p-2">
              <svg viewBox="0 0 320 140" className="w-full h-full">
                <line x1="30" y1="95" x2="280" y2="95" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 4" />

                <line x1="80" y1="10" x2="80" y2="35" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="240" y1="10" x2="240" y2="92" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />

                <g transform="rotate(20 80 35)">
                  <rect x="70" y="25" width="200" height="20" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                  <circle cx="78" cy="25" r="3.5" fill="#ef4444" />
                  <circle cx="262" cy="45" r="3.5" fill="#38bdf8" />
                </g>

                <path d="M 160 95 A 55 55 0 0 1 164 76" fill="none" stroke="#f59e0b" strokeWidth="2" />
                <text x="148" y="90" fill="#f59e0b" fontSize="12" fontWeight="bold" fontFamily="sans-serif" textAnchor="end">
                  15°–30°
                </text>

                <path d="M 80 30 L 80 18" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2" />
                <text x="80" y="12" fill="#ef4444" fontSize="11" fontWeight="bold" textAnchor="middle">Air Escape ↑ (Highest Vent)</text>

                <path d="M 260 88 L 260 105" stroke="#38bdf8" strokeWidth="2" strokeDasharray="2 2" />
                <text x="260" y="121" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">Rapid Run-off ↓</text>
                <text x="260" y="135" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">(Lowest Drain)</text>

                <line x1="20" y1="120" x2="180" y2="120" stroke="#0284c7" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                <text x="25" y="115" fill="#38bdf8" fontSize="12" fontWeight="bold" opacity="1">Zinc Kettle Bath Line</text>
              </svg>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="font-bold text-cyan-300 text-[11px]">
              2. Pitch Angle Impact Comparison
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="bg-rose-950/20 p-2 rounded border border-rose-500/30 space-y-1">
                <div className="text-[10px] font-bold text-rose-400">
                  ❌ Too Flat (&lt; 15°)
                </div>
                <div className="text-[9px] text-slate-400 leading-tight">
                  • Traps air pockets under flat surfaces.<br/>
                  • Slow drainage leads to thick zinc tears, spikes & ash inclusion.
                </div>
              </div>

              <div className="bg-emerald-950/20 p-2 rounded border border-emerald-500/30 space-y-1">
                <div className="text-[10px] font-bold text-emerald-400">
                  ✓ Optimal (15°–30°)
                </div>
                <div className="text-[9px] text-slate-400 leading-tight">
                  • Instant air purging upon immersion.<br/>
                  • Clean, uniform coating with minimal post-dip touch-up needed.
                </div>
              </div>
            </div>
          </div>

          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
              <div className="font-bold text-cyan-300 text-[11px] flex items-center gap-1.5">
                <span>🧮</span> 3. Wire & Chain Length Calculator
              </div>
              <span className="text-[9px] font-mono text-slate-400">Formula: L<sub>2</sub> = L<sub>1</sub> + D × sin(θ)</span>
            </div>

            <div className="w-full h-40 bg-slate-900/90 rounded border border-slate-800/80 flex items-center justify-center p-2">
              <svg viewBox="0 0 320 110" className="w-full h-full">
                <line x1="20" y1="15" x2="300" y2="15" stroke="#475569" strokeWidth="3" />
                <text x="25" y="10" fill="#cbd5e1" fontSize="11" fontWeight="normal" className="font-mono">Beam Rack</text>

                <line x1="80" y1="15" x2="80" y2="40" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
                <text x="65" y="30" fill="#38bdf8" fontSize="13" fontWeight="bold" className="font-mono">L₁</text>

                <line x1="240" y1="15" x2="240" y2="90" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
                <text x="246" y="55" fill="#f59e0b" fontSize="13" fontWeight="bold" className="font-mono">L₂</text>

                <g transform="rotate(18 80 40)">
                  <rect x="70" y="32" width="180" height="14" rx="2" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="80" cy="32" r="3" fill="#ef4444" />
                  <circle cx="240" cy="32" r="3" fill="#ef4444" />

                  <line x1="80" y1="22" x2="240" y2="22" stroke="#a855f7" strokeWidth="1.5" />
                  <line x1="80" y1="18" x2="80" y2="26" stroke="#a855f7" strokeWidth="1" />
                  <line x1="240" y1="18" x2="240" y2="26" stroke="#a855f7" strokeWidth="1" />
                  <text x="150" y="18" fill="#c084fc" fontSize="13" fontWeight="bold" textAnchor="middle" className="font-mono">Distance D</text>
                </g>

                <line x1="80" y1="90" x2="280" y2="90" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />
                <path d="M 190 90 A 45 45 0 0 1 193 78" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="180" y="85" fill="#f59e0b" fontSize="11" fontWeight="bold">θ</text>
              </svg>
            </div>

            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <div>
                <label className="block text-slate-400 mb-1">Pick Point Distance D (cm)</label>
                <input
                  type="number"
                  value={pointDistance}
                  onChange={(e) => setPointDistance(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  placeholder="Enter distance"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Front Wire Length L<sub>1</sub> (cm)</label>
                <input
                  type="number"
                  value={frontWireLen}
                  onChange={(e) => setFrontWireLen(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-100 font-mono text-xs focus:outline-none focus:border-cyan-500"
                  placeholder="Enter length"
                />
              </div>

              <div>
                <label className="block text-slate-400 mb-1">Target Pitch Angle θ (°)</label>
                <input
                  type="number"
                  min="15"
                  max="30"
                  value={targetAngle}
                  onChange={(e) => setTargetAngle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-amber-400 font-bold font-mono text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="bg-slate-900/90 border border-cyan-500/30 rounded p-2.5 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400">Recommended Rear Wire Length L<sub>2</sub>:</div>
                <div className={`text-base font-bold font-mono ${rearWireLen > 300 ? 'text-red-400' : 'text-amber-400'}`}>
                  {rearWireLen} <span className="text-xs font-normal text-slate-400">cm</span>
                </div>
              </div>
              <div className="text-right border-l border-slate-800 pl-3">
                <div className="text-[9px] text-slate-400">Offset ΔL (L<sub>2</sub> - L<sub>1</sub>): <span className="font-mono text-cyan-300">+{deltaL} cm</span></div>
                <div className="text-[9px] text-slate-400">15°–30° Optimal Range: <span className="font-mono text-emerald-400">{minRear} ~ {maxRear} cm</span></div>
              </div>
            </div>

            {rearWireLen > 300 && (
              <div className="bg-red-950/80 border border-red-500/60 rounded p-2 text-[10px] text-red-200 flex items-start gap-2">
                <span className="text-red-400 text-sm leading-none">⚠️</span>
                <div className="space-y-0.5">
                  <div className="font-bold text-red-400">Exceeds Max Hanging Depth Limit (300 cm / 3m)!</div>
                  <div>
                    Calculated L₂ (<strong>{rearWireLen} cm</strong>) exceeds the 3m safety limit.
                    Please <strong>reduce target pitch angle θ</strong> (e.g. towards 15°) or <strong>shorten front wire length L₁</strong> (min. 30 cm) to lower L₂.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => setShowPitchGuide(false)}
            className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-4 py-1.5 rounded text-xs transition-colors"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  )}

  {/* ============ 新增的 4 个 Modal (来自 Gemini) ============ */}

  {/* MODAL 1: 大下小上 */}
  {showDrainHoleGuide && (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl max-w-lg w-full p-4 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-sm font-bold text-cyan-400">🕳️ Drain & Vent Hole Orientation Guide</h3>
          <button type="button" onClick={() => setShowDrainHoleGuide(false)} className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800">✕ Close</button>
        </div>
        <div className="w-full h-52 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-center p-2">
          <svg viewBox="0 0 320 150" className="w-full h-full">
            <g transform="rotate(20 160 75)">
              <rect x="50" y="55" width="220" height="40" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="70" cy="75" r="4" fill="#38bdf8" stroke="#ffffff" strokeWidth="1.5" />
              <circle cx="250" cy="75" r="11" fill="#0f172a" stroke="#10b981" strokeWidth="2.5" />
            </g>
            <text x="90" y="20" fill="#38bdf8" fontSize="11" fontWeight="bold">Air Vent (Small Hole ↑)</text>
            <text x="220" y="128" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">Zinc Run-off ↓</text>
            <text x="220" y="142" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">(Large Hole)</text>
          </svg>
        </div>
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button type="button" onClick={() => setShowDrainHoleGuide(false)} className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-4 py-1.5 rounded text-xs">Got It</button>
        </div>
      </div>
    </div>
  )}

  {/* MODAL 2: 盲端大倾角 */}
  {showBlindEndGuide && (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl max-w-lg w-full p-4 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-sm font-bold text-cyan-400">🪣 Blind-End Pose Standard (35°–45°)</h3>
          <button type="button" onClick={() => setShowBlindEndGuide(false)} className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800">✕ Close</button>
        </div>
        <div className="w-full h-52 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-center p-2">
          <svg viewBox="0 0 320 150" className="w-full h-full">
            <g transform="rotate(35 160 75)">
              <path d="M 60 50 L 220 50 L 220 100 L 60 100 Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
              <rect x="55" y="50" width="10" height="50" fill="#f43f5e" />
              <line x1="220" y1="50" x2="220" y2="100" stroke="#10b981" strokeWidth="3" strokeDasharray="3 3" />
            </g>
            <text x="80" y="30" fill="#f43f5e" fontSize="12" fontWeight="bold">Sealed Blind End (Top High)</text>
            <text x="200" y="126" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">Open Mouth</text>
            <text x="200" y="140" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">(Lowest Point Drainage)</text>
          </svg>
        </div>
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button type="button" onClick={() => setShowBlindEndGuide(false)} className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-4 py-1.5 rounded text-xs">Got It</button>
        </div>
      </div>
    </div>
  )}

  {/* MODAL 3: 最低滴锌角避让 */}
  {showDripCornerGuide && (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl max-w-lg w-full p-4 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-sm font-bold text-cyan-400">📍 Drip Corner Clearance Guide</h3>
          <button type="button" onClick={() => setShowDripCornerGuide(false)} className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800">✕ Close</button>
        </div>
        <div className="w-full h-52 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-center p-2">
          <svg viewBox="0 0 320 160" className="w-full h-full">
            <g transform="rotate(25 160 80)">
              <rect x="70" y="40" width="180" height="80" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="100" cy="55" r="4" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
              <circle cx="250" cy="120" r="4" fill="#10b981" />
            </g>
            <text x="170" y="144" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle">100% Free Lowest Tip</text>
            <text x="170" y="157" fill="#10b981" fontSize="10" fontWeight="bold" textAnchor="middle">(Clean Single Drip)</text>
          </svg>
        </div>
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button type="button" onClick={() => setShowDripCornerGuide(false)} className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-4 py-1.5 rounded text-xs">Got It</button>
        </div>
      </div>
    </div>
  )}

  {/* MODAL 4: 角孔穿线 */}
  {showCornerTieGuide && (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl max-w-lg w-full p-4 space-y-4 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <h3 className="text-sm font-bold text-cyan-400">🔗 Corner Tie-In & Contour Alignment Standard</h3>
          <button type="button" onClick={() => setShowCornerTieGuide(false)} className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800">✕ Close</button>
        </div>
        <div className="w-full h-52 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-center p-2">
          <svg viewBox="0 0 320 150" className="w-full h-full">
            <g transform="rotate(20 160 75)">
              <rect x="60" y="35" width="200" height="80" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
              <circle cx="75" cy="48" r="4" fill="#10b981" />
              <circle cx="160" cy="75" r="4" fill="#f43f5e" />
            </g>
            <text x="50" y="22" fill="#10b981" fontSize="10" fontWeight="bold">✓ Corner/Edge Hole</text>
            <text x="50" y="35" fill="#10b981" fontSize="10" fontWeight="bold">(Tight Contour Wire)</text>
            <line x1="163" y1="72" x2="232" y2="52" stroke="#f43f5e" strokeWidth="1" strokeDasharray="2 2" />
            <text x="310" y="50" fill="#f43f5e" fontSize="10" fontWeight="bold" textAnchor="end">❌ Mid-Body Hole</text>
            <text x="310" y="63" fill="#f43f5e" fontSize="10" fontWeight="bold" textAnchor="end">(Blocks Flow)</text>
          </svg>
        </div>
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button type="button" onClick={() => setShowCornerTieGuide(false)} className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-4 py-1.5 rounded text-xs">Got It</button>
        </div>
      </div>
    </div>
  )}
</div>
