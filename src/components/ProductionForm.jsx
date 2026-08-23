import React, { useState, useEffect, useRef } from 'react';

// Standard Galvanizing Workpiece Types
const WORKPIECE_TYPES = [
  'Anchor', 'Angle', 'Beam', 'Bend Plate', 'Box', 'Bracket', 'Channel', 'Embed Plate', 'Frame',
  'Grating', 'Ladder', 'Lid', 'Mesh', 'Pipe', 'Plate', 'Pole', 'Railing', 'Rebar', 'Rod', 'Round Plate',
  'Trangular Frame', 'Tube', 'Washer', 'Others'
];

// Quantity Unit Options
const QTY_UNITS = [
  { value: 'pcs', label: 'pcs' },
  { value: 'bag', label: 'bag' },
  { value: 'box', label: 'box' }
];

// 99 Fixed (Beam) Racks, plus a "No Rack" option for single large pieces
// transported directly by crane (no rack used at all, no rack occupancy event).
const NO_RACK_VALUE = 'NONE';
const RACK_OPTIONS = [
  { value: NO_RACK_VALUE, label: 'No Rack' },
  ...Array.from({ length: 99 }, (_, i) => {
    const num = String(i + 1).padStart(2, '0');
    return { value: num, label: `Rack #${num}` };
  })
];

// Hook Rack is a permanently-mounted rigging FIXTURE on top of a numbered
// Beam Rack (Rack #01-99) — not an alternative to selecting a rack. Only
// relevant when a numbered rack is selected; irrelevant for "No Rack".
// NOTE: Comb Rack used to live here as a third global option, but it isn't a
// whole-rack attribute — a given Beam Rack can have one Job hung with a
// Railing Comb Rack while other Jobs on the same rack hang normally. Comb
// Rack now lives per-workpiece (see "Railing Comb Rack" checkbox below).
const RACK_FIXTURE_STANDARD = 'STANDARD';
const RACK_FIXTURE_HOOK = 'HOOK_RACK';
const RACK_FIXTURE_OPTIONS = [
  { value: RACK_FIXTURE_STANDARD, label: 'Standard (No Fixture)' },
  { value: RACK_FIXTURE_HOOK, label: 'Hook Rack' },
];


// ============================================================
// RIGGING HARDWARE SPECIFICATIONS - shop-confirmed data only
// Wire: shop operating standard (12 Gauge only, 75 lb/strand SWL)
// Chain & Anchor Shackle: per official supplier spec sheets provided
// (Suncor Stainless - Grade 50 Lifting Chain S5 316L;
//  Suncor Stainless - Anchor Shackle w/ Oversize Screw Pin 316-NM,
//  WLL values below already reflect the 20% reduction shown on the sheet)
// ============================================================
const RIGGING_SPECS = [
  { id: '12_WIRE',    label: '12 Gauge Wire',      type: 'WIRE',  swl: 75 },
  { id: 'CHAIN_3_16', label: '3/16" Chain',        type: 'CHAIN', swl: 880 },
  { id: 'CHAIN_1_4',  label: '1/4" (9/32) Chain',  type: 'CHAIN', swl: 1760 },
  { id: 'CHAIN_5_16', label: '5/16" Chain',        type: 'CHAIN', swl: 2160 },
  { id: 'CHAIN_3_8',  label: '3/8" Chain',         type: 'CHAIN', swl: 3520 },
  { id: 'CHAIN_1_2',  label: '1/2" Chain',         type: 'CHAIN', swl: 5840 },
  { id: 'CHAIN_5_8',  label: '5/8" Chain',         type: 'CHAIN', swl: 7840 },
];

const WIRE_SPEC = RIGGING_SPECS[0]; // 12 Gauge Wire, 75 lb/strand

// Preset reasons for a manual "force release" of a Rack # that still shows
// as occupied - kept short/preset so this stays fast, not a typing exercise.
const RELEASE_REASON_PRESETS = [
  { value: 'FORGOT_RELEASE', label: 'Unloading finished, forgot to release' },
  { value: 'RACK_SHORTAGE', label: 'Rack shortage - workpieces set aside' },
  { value: 'OTHER', label: 'Other (specify below)' },
];

// Anchor Shackle w/ Oversize Screw Pin, 316-NM Stainless (WLL after 20% reduction)
const ANCHOR_SHACKLE_SPECS = [
  { id: 'NONE',          label: '-- None (Direct Chain / Slot Hooking) --', wll: null },
  { id: 'SHACKLE_3_16',  label: '3/16" Anchor Shackle',   wll: 520 },
  { id: 'SHACKLE_1_4',   label: '1/4" Anchor Shackle',    wll: 800 },
  { id: 'SHACKLE_5_16',  label: '5/16" Anchor Shackle',   wll: 1040 },
  { id: 'SHACKLE_3_8',   label: '3/8" Anchor Shackle',    wll: 1200 },
  { id: 'SHACKLE_7_16',  label: '7/16" Anchor Shackle',   wll: 1600 },
  { id: 'SHACKLE_1_2',   label: '1/2" Anchor Shackle',    wll: 2400 },
  { id: 'SHACKLE_5_8',   label: '5/8" Anchor Shackle',    wll: 3200 },
  { id: 'SHACKLE_3_4',   label: '3/4" Anchor Shackle',    wll: 4800 },
  { id: 'SHACKLE_7_8',   label: '7/8" Anchor Shackle',    wll: 6400 },
  { id: 'SHACKLE_1',     label: '1" Anchor Shackle',      wll: 8000 },
  { id: 'SHACKLE_1_1_4', label: '1-1/4" Anchor Shackle',  wll: 11200 },
];

// Reo Engineering & Testing - Job No. 23-R-4105 "Wire Hangers Capacity Certification"
// (30-Mar-2023, PEng stamped) - recommended 12 Ga wire count by workpiece weight bracket.
// The UPPER bound of the matched bracket is what the app should check against.
// Scheme One - Single Hanger (1 hanging point)
const WIRE_BRACKETS_SINGLE = [
  { minLb: 0,   maxLb: 75,  wires: 1 },
  { minLb: 75,  maxLb: 150, wires: 2 },
  { minLb: 150, maxLb: 250, wires: 3 },
  { minLb: 250, maxLb: 350, wires: 4 },
  { minLb: 350, maxLb: 450, wires: 5 },
  { minLb: 450, maxLb: 550, wires: 6 },
  { minLb: 550, maxLb: 650, wires: 7 },
];

// Scheme Two - Double Hanger (2 hanging points, symmetric each side)
const WIRE_BRACKETS_DOUBLE = [
  { minLb: 0,   maxLb: 150,  wires: 2,  perSide: 1 },
  { minLb: 150, maxLb: 350,  wires: 4,  perSide: 2 },
  { minLb: 350, maxLb: 550,  wires: 6,  perSide: 3 },
  { minLb: 550, maxLb: 750,  wires: 8,  perSide: 4 },
  { minLb: 750, maxLb: 950,  wires: 10, perSide: 5 },
  { minLb: 950, maxLb: 1150, wires: 12, perSide: 6 }, // confirmed on-site: 950-1150 lb
];

// Looks up the certified wire-count bracket for a given design weight + hanging point count.
// Falls back to a generic 75 lb/strand calc only if the weight exceeds the certified table range.
function getRequiredWireCount(designWeightLb, hangingPoints) {
  if (hangingPoints === 2) {
    const match = WIRE_BRACKETS_DOUBLE.find(b => designWeightLb <= b.maxLb);
    if (match) return { total: match.wires, perPoint: match.perSide };
    const perPoint = Math.max(1, Math.ceil((designWeightLb / 2) / WIRE_SPEC.swl));
    return { total: perPoint * 2, perPoint };
  }
  const match = WIRE_BRACKETS_SINGLE.find(b => designWeightLb <= b.maxLb);
  if (match) return { total: match.wires, perPoint: match.wires };
  const perPoint = Math.max(1, Math.ceil(designWeightLb / WIRE_SPEC.swl));
  return { total: perPoint, perPoint };
}

// ============================================================
// RACK / BEAM STRUCTURAL CAPACITY (shop-confirmed)
// Beam itself rated 18,000 lb; the two end support frames are the tighter limit at
// 6,750 lb each (13,500 lb combined). The usable rack load is further reduced by the
// beam's own self-weight (3,990 lb) and a 85% safety factor, then rounded down to a
// conservative shop figure - that net figure (8,000 lb) is the binding constraint.
// ============================================================
const BEAM_CAPACITY_LBS = 18000;
const SUPPORT_FRAME_CAPACITY_LBS = 6750; // per-side Support Frame capacity
const BEAM_SELF_WEIGHT_LBS = 3990; // beam's own weight, not available for workpiece load
const SAFETY_FACTOR = 0.85; // shop-confirmed safety factor
// Raw calc: (SUPPORT_FRAME_CAPACITY_LBS * 2 - BEAM_SELF_WEIGHT_LBS) * SAFETY_FACTOR ≈ 8,083.5 lb,
// rounded down to a conservative round-number shop limit.
const RACK_LIMIT_LBS = 8000; // hard submission block

// Railing Comb Rack: a certified shop fixture used in PAIRS - unlike a normal
// 1 or 2-point wire/chain hang, a comb rack pair has multiple hanging points
// (typically 4, occasionally more for long/heavy railings). It's not exempt
// from load checks - the operator enters the actual point count used, and the
// wire/chain spec at those points is still checked against the load each
// point carries (see the RAILING_COMB_RACK branch in checkSafetyDeficiencies).
// Railing Comb Rack fields are split into two dimensions: how many comb rack
// fixtures are used (default 2, since they're normally used in pairs), and
// how many hanging points EACH one has (default 2) - total points = the
// product of the two (default 2 x 2 = 4).
const COMB_MIN_RACK_COUNT = 1;
const COMB_DEFAULT_RACK_COUNT = '2';
const COMB_MIN_POINTS_PER_RACK = 2;
const COMB_DEFAULT_POINTS_PER_RACK = '2';

// Resolves a workpiece line's weight, accounting for both weight-input modes:
// - isUniformWeight (default true): operator enters either the TOTAL weight for the line, or a
//   single-piece weight (weightInputMode) which the app multiplies out by quantity.
// - Not uniform: pieces vary, so instead of weighing each one the operator selects a certified
//   weight bracket (Reo table) and the app conservatively uses the UPPER bound of that bracket.
function getWorkpieceTotalWeight(wp) {
  const qty = parseInt(wp.quantity, 10) || 0;

  if (wp.isUniformWeight === false) {
    // Not uniform: operator weighs the whole batch for the real total
    // (used for Rack Support Frame Load), and separately picks a certified
    // weight bracket for the heaviest single piece (used for wire/chain spec choice).
    const pts = wp.hangingPoints === '2' ? 2 : 1;
    const brackets = pts === 2 ? WIRE_BRACKETS_DOUBLE : WIRE_BRACKETS_SINGLE;
    const bracket = brackets.find(b => String(b.maxLb) === String(wp.weightBracketId));

    const totalW = parseFloat(wp.variedTotalWeightInput) || 0;   // 真实过秤总重
    const unitW = bracket ? bracket.maxLb : 0;                   // 最重单件（档位上限）

    return { totalW, unitW };
  }

  if (wp.weightInputMode === 'PER_UNIT') {
    const unitW = parseFloat(wp.unitWeightInput) || 0;
    return { totalW: unitW * qty, unitW };
  }

  const totalW = parseFloat(wp.weightLb) || 0;
  return { totalW, unitW: qty > 0 ? totalW / qty : 0 };
}
// Surface Condition Rating Options (Clean & Standardized)
const SURFACE_CONDITION_OPTIONS = [
  { value: 'NONE', label: 'None (Clean)' },
  { value: 'LIGHT', label: 'Light' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HEAVY', label: 'Heavy' }
];

// Corrosion grade lookup (A = lightest, D = heaviest) - used to flag mixed-batch warnings
// when workpieces on the same rack span too wide a rust/corrosion range.
const SURFACE_CONDITION_GRADE = { NONE: 'A', LIGHT: 'B', MEDIUM: 'C', HEAVY: 'D' };

// If the max and min levels on the rack are this many steps apart or more (on the
// NONE < LIGHT < MEDIUM < HEAVY scale), warn the operator about mixed-corrosion batching.
const SURFACE_SPREAD_WARNING_THRESHOLD = 2;

export default function ProductionForm({ currentUser, supabase }) {

  const [showPitchGuide, setShowPitchGuide] = React.useState(false);
// Rigging Calculator State & Calculations (Unit: cm)
  const [pointDistance, setPointDistance] = useState(''); // Pick point distance D (cm)
  const [frontWireLen, setFrontWireLen] = useState('');   // Front wire length L1 (cm)
  const [targetAngle, setTargetAngle] = useState(30);      // Default target pitch angle θ (30°)

  const distNum = Number(pointDistance) || 0;
  const frontNum = Number(frontWireLen) || 0;
  const angleNum = Number(targetAngle) || 0;

  const rad = (angleNum * Math.PI) / 180;
  const deltaL = Math.round(distNum * Math.sin(rad));
  const rearWireLen = frontNum + deltaL;

  const minDelta = Math.round(distNum * Math.sin((15 * Math.PI) / 180));
  const maxDelta = Math.round(distNum * Math.sin((30 * Math.PI) / 180));
  const minRear = frontNum + minDelta;
  const maxRear = frontNum + maxDelta;

  const [showClearanceLoopingModal, setShowClearanceLoopingModal] = useState(false);

  const [showSocketSpigotModal, setShowSocketSpigotModal] = useState(false);

  const [showRiggingGuide, setShowRiggingGuide] = useState(false);

  const [showAntiSwayGuide, setShowAntiSwayGuide] = useState(false);

  const [showDrainHoleGuide, setShowDrainHoleGuide] = useState(false);
  const [showBlindEndGuide, setShowBlindEndGuide] = useState(false);
  const [showDripCornerGuide, setShowDripCornerGuide] = useState(false);
  const [showCornerTieGuide, setShowCornerTieGuide] = useState(false);
  const [showUniqueLowPointGuide, setShowUniqueLowPointGuide] = useState(false);

  // 控制 ASTM A385 图解弹窗的开关
  const [showGuide, setShowGuide] = useState(false);

  // Global Rack & Load Session
  const [rackNo, setRackNo] = useState('');
  const [rackFixtureType, setRackFixtureType] = useState(RACK_FIXTURE_STANDARD);
  const [loadId, setLoadId] = useState('');
  const [autoLoadId, setAutoLoadId] = useState(''); 
  const [isGeneratingLoadId, setIsGeneratingLoadId] = useState(false);

  // Racks currently occupied (assigned but not yet released) - queried from
  // production_rack_current_status so the dropdown can disable them.
  const [occupiedRacks, setOccupiedRacks] = useState(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);
  // isSubmitting (state) drives the button's disabled/label UI, but state updates
  // aren't synchronous - two clicks in the same tick can both read the old `false`
  // before React commits the first setIsSubmitting(true). This ref is checked/set
  // synchronously in handleSubmit so a genuine double-click can't both get through.
  const isSubmittingRef = useRef(false);

  const refreshOccupiedRacks = async () => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase
        .from('production_rack_current_status')
        .select('rack_no, event_type')
        .eq('event_type', 'assigned');
      if (error) throw error;
      setOccupiedRacks(new Set((data || []).map(r => String(r.rack_no).padStart(2, '0'))));
    } catch (err) {
      console.warn('Could not fetch rack occupancy status:', err);
    }
  };

  useEffect(() => {
    refreshOccupiedRacks();
  }, []);

  // Rack # Contextual Help Tooltip + "force release a stuck rack" flow
  const [showRackHelp, setShowRackHelp] = useState(false);
  // Rack Support Frame Load Contextual Help Tooltip (separate toggle, own field)
  const [showRackLoadHelp, setShowRackLoadHelp] = useState(false);
  // Load ID Contextual Help Tooltip (separate toggle, own field)
  const [showLoadIdHelp, setShowLoadIdHelp] = useState(false);
  // Inline help bubbles inside the repeating Job/Workpiece rows (Identical↔Varied,
  // Total↔Unit, etc). One shared toggle keyed by a per-row+field id, so only ONE
  // bubble is ever open at a time - these buttons live inside a .map() over every
  // workpiece line, so a plain per-field boolean would open/close every row's
  // bubble together instead of just the one the operator clicked.
  const [activeInlineHelp, setActiveInlineHelp] = useState(null);
  const [showReleaseModal, setShowReleaseModal] = useState(false);
  const [releaseRackNo, setReleaseRackNo] = useState('');
  const [releaseReason, setReleaseReason] = useState('FORGOT_RELEASE');
  const [releaseReasonOther, setReleaseReasonOther] = useState('');
  const [releaseOperatorId, setReleaseOperatorId] = useState('');
  const [releasePin, setReleasePin] = useState('');
  const [isReleasing, setIsReleasing] = useState(false);

  const openReleaseModal = () => {
    setShowRackHelp(false);
    setReleaseRackNo('');
    setReleaseReason('FORGOT_RELEASE');
    setReleaseReasonOther('');
    setReleaseOperatorId('');
    setReleasePin('');
    setShowReleaseModal(true);
  };

  // Force-release a Rack # that still shows occupied (event_type = 'assigned')
  // even though it's actually free - e.g. Unloading was done physically but
  // never submitted in the system. This is a deliberate manual override
  // (event_type = 'released_forced'), so it's exempt from the load_id-match
  // race described in UnloadingStation.jsx's TODO - that race only applies to
  // an *automatic* release-on-Unloading-submit path, which doesn't exist yet.
  const handleForceRelease = async () => {
    if (!supabase) return;
    if (!releaseRackNo) {
      alert('⚠️ Please select which Rack # to release.');
      return;
    }
    const reasonText = releaseReason === 'OTHER'
      ? releaseReasonOther.trim()
      : (RELEASE_REASON_PRESETS.find(r => r.value === releaseReason)?.label || '');
    if (releaseReason === 'OTHER' && !reasonText) {
      alert('⚠️ Please describe the reason for releasing this rack.');
      return;
    }
    if (!releaseOperatorId.trim() || !releasePin.trim()) {
      alert('⚠️ Please enter your Employee ID and PIN to confirm.');
      return;
    }

    setIsReleasing(true);
    try {
      const check = await verifyOperator(releaseOperatorId.trim(), releasePin.trim());
      if (!check.ok) {
        alert(`❌ Release failed: ${check.reason}`);
        return;
      }

      // production_rack_events.load_id is NOT NULL - the release event has to
      // reference the load that's currently (per the DB) occupying this rack.
      const { data: statusRow, error: statusErr } = await supabase
        .from('production_rack_current_status')
        .select('rack_no, event_type, load_id')
        .eq('rack_no', parseInt(releaseRackNo, 10))
        .maybeSingle();
      if (statusErr) throw statusErr;

      if (!statusRow || statusRow.event_type !== 'assigned' || !statusRow.load_id) {
        alert(`⚠️ Rack #${releaseRackNo} doesn't currently show as occupied — nothing to release.`);
        await refreshOccupiedRacks();
        setShowReleaseModal(false);
        return;
      }

      const { error: insertErr } = await supabase
        .from('production_rack_events')
        .insert([{
          rack_no: parseInt(releaseRackNo, 10),
          event_type: 'released_forced',
          load_id: statusRow.load_id,
          operator_id: check.operator.id,
          reason: reasonText
        }]);
      if (insertErr) throw insertErr;

      await refreshOccupiedRacks();
      setShowReleaseModal(false);

      // Convenience: since the whole point of releasing it right now is
      // almost always "I want to use it immediately", auto-select it.
      await handleRackSelect(releaseRackNo);
    } catch (err) {
      alert('⚠️ Error releasing rack: ' + err.message);
    } finally {
      setIsReleasing(false);
    }
  };

  // Sign-off State
const [primaryOperatorId, setPrimaryOperatorId] = useState('');
const [primaryPin, setPrimaryPin] = useState(''); 
const MAX_ASSISTANT_OPERATORS = 4;
const [assistants, setAssistants] = useState([{ uid: Date.now(), employeeId: '', pin: '' }]);

const handleAssistantFieldChange = (uid, field, value) => {
  setAssistants(prev => prev.map(a => a.uid === uid ? { ...a, [field]: value } : a));
};

const addAssistantOperator = () => {
  setAssistants(prev => prev.length >= MAX_ASSISTANT_OPERATORS
    ? prev
    : [...prev, { uid: Date.now() + Math.random(), employeeId: '', pin: '' }]
  );
};

const removeAssistantOperator = (uid) => {
  setAssistants(prev => prev.length <= 1 ? prev : prev.filter(a => a.uid !== uid));
};

  // Global Job Safety & Submersion Checklist (SOP Inspection) - shared across ALL jobs on this load
  const [safetyChecklist, setSafetyChecklist] = useState({
    hasEnclosedCavity: false,      // 1. Enclosed cavity/pipe structure
    hasAdequateVenting: true,      // 2. Adequate venting/drainage holes
    drilledOnsite: true            // 3. Drilled on site if missing
  });

  const handleSafetyFieldChange = (field, value) => {
    setSafetyChecklist(prev => ({ ...prev, [field]: value }));
  };

  // Global Surface Assessment (Oil, Paint & Rust Level) - operator selects the observed Min/Max
  // level across all workpieces on this Load once, here (not per workpiece/per job).
  const [surfaceAssessment, setSurfaceAssessment] = useState({
    minOilPaintLevel: '',
    maxOilPaintLevel: '',
    minRustLevel: '',
    maxRustLevel: ''
  });

  const handleSurfaceAssessmentChange = (field, value) => {
    setSurfaceAssessment(prev => ({ ...prev, [field]: value }));
  };

  // Formatted Current Date & Day of Week
  const currentDateFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Initial Job State
  const createNewJob = () => ({
    id: Date.now() + Math.random(),
    customerName: '',
    customerOrderNo: '',
    customerBatchNo: '',
    // Note: Surface Assessment (Oil, Paint & Rust Level) is captured once globally via the
    // `surfaceAssessment` state (Min/Max selects), not per Job. SOP & Safety Checklist is
    // also global (shared `safetyChecklist` state).
    workpieces: [
      {
        id: Date.now() + 1,
        workpieceType: '',
        workpieceTypeOther: '',
        quantity: '',
        unit: 'pcs',
        weightLb: '',
        isUniformWeight: true,      // false = pieces vary; use a certified weight bracket instead
        weightInputMode: 'TOTAL',   // 'TOTAL' | 'PER_UNIT'
        unitWeightInput: '',
        weightBracketId: '',
        useRailingCombRack: false,   // checked = dedicated multi-point comb rack model below
        combRackCount: COMB_DEFAULT_RACK_COUNT,
        combPointsPerRack: COMB_DEFAULT_POINTS_PER_RACK,
        combMediumType: 'CHAIN',     // 'CHAIN' | 'WIRE'
        combSpecId: '',
        combStrands: '',
        hangingMode: 'INDIVIDUAL',
        hangingPoints: '2',
        point1SpecId: '12_WIRE',
        point1Strands: '',
        point2SpecId: '12_WIRE',
        point2Strands: ''
      }
    ]
  });

  // Jobs List State
  const [jobs, setJobs] = useState([createNewJob()]);

  const getNextDailySequence = async () => {
    const todayStr = new Date().toISOString().split('T')[0];

    if (!supabase) {
      return Math.floor(Math.random() * 5) + 1;
    }

    // Atomic, row-locked UPSERT on the server — guarantees no two concurrent
    // callers can ever get the same sequence number for the same date.
    // Do NOT silently fall back to a fixed number on error: that would
    // reintroduce duplicate Load IDs (e.g. if the day's 99-load cap is hit).
    const { data, error } = await supabase.rpc('get_next_daily_seq', { p_date: todayStr });
    if (error) {
      throw error;
    }
    return data;
  };

  // Load ID letter suffix: R = numbered Rack #01-99 with a standard beam
  // (no fixture), H = numbered rack fitted with a permanently-mounted Hook
  // Rack fixture, N = No Rack. The 'C' (Comb Rack) letter is retired: Comb
  // Rack is now a per-workpiece attribute, not a whole-rack fixture, so it
  // no longer changes what the Rack itself is identified as.
  const getLoadIdLetter = (rackVal, fixtureVal) => {
    if (rackVal === NO_RACK_VALUE) return 'N';
    if (fixtureVal === RACK_FIXTURE_HOOK) return 'H';
    return 'R';
  };

  const regenerateLoadId = async (rackVal, fixtureVal, preserveManualEdit) => {
    if (!rackVal) {
      setLoadId('');
      setAutoLoadId('');
      return;
    }
    setIsGeneratingLoadId(true);
    try {
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');
      const dateStr = `${year}${month}${day}`; // 8-digit, zero-padded

      const dailySeq = await getNextDailySequence();
      const seqStr = String(dailySeq).padStart(2, '0'); // 2-digit, zero-padded

      const letter = getLoadIdLetter(rackVal, fixtureVal);
      const generated = `${dateStr}-${seqStr}-${letter}`;

      // Always refresh the "auto" value (so Reset Auto ID offers the latest
      // one), but don't stomp on a Load ID the operator already typed by
      // hand — e.g. matching a paper record's number during the transition
      // period before this system fully replaces the paper log.
      setAutoLoadId(generated);
      if (!preserveManualEdit) {
        setLoadId(generated);
      }
    } catch (err) {
      console.error('Load ID sequence generation failed:', err);
      alert(`❌ Could not generate Load ID: ${err.message || err}\n\nYou may need to enter a Load ID manually.`);
      setAutoLoadId('');
      if (!preserveManualEdit) {
        setLoadId('');
      }
    } finally {
      setIsGeneratingLoadId(false);
    }
  };

  const handleRackSelect = async (selectedVal) => {
    // Was the current Load ID typed/edited by hand rather than left as the
    // last auto-generated value? If so, preserve it through this change.
    const hadManualEdit = loadId.trim() !== '' && loadId !== autoLoadId;

    setRackNo(selectedVal);

    // Fixture type only applies to a numbered rack; reset it for No Rack
    // (and whenever the rack changes away from a fixture-bearing selection
    // isn't required — the fixture just stays until the user changes it,
    // except No Rack where it's forced back to Standard).
    const nextFixture = selectedVal === NO_RACK_VALUE ? RACK_FIXTURE_STANDARD : rackFixtureType;
    if (selectedVal === NO_RACK_VALUE) {
      setRackFixtureType(RACK_FIXTURE_STANDARD);
    }

    await regenerateLoadId(selectedVal, nextFixture, hadManualEdit);
  };

  const handleFixtureTypeSelect = async (selectedFixture) => {
    const hadManualEdit = loadId.trim() !== '' && loadId !== autoLoadId;
    setRackFixtureType(selectedFixture);
    await regenerateLoadId(rackNo, selectedFixture, hadManualEdit);
  };

  const handleResetLoadId = () => {
    if (autoLoadId) {
      setLoadId(autoLoadId);
    }
  };

  const handleJobFieldChange = (jobIndex, field, value) => {
    const updated = [...jobs];
    updated[jobIndex][field] = value;
    setJobs(updated);
  };

  const addJobRow = () => {
    setJobs([...jobs, createNewJob()]);
  };

  const removeJobRow = (jobIndex) => {
    if (jobs.length === 1) return;
    setJobs(jobs.filter((_, i) => i !== jobIndex));
  };

  const handleWorkpieceChange = (jobIndex, wpIndex, field, value) => {
    const updated = [...jobs];
    updated[jobIndex].workpieces[wpIndex][field] = value;
    setJobs(updated);
  };
// 切换 stringingMethod 时，联动重置该 workpiece 的规格/绑丝相关字段，
  // 防止残留上一个模式的 ID/数值导致 <select> 显示异常或复核算错
  const handleStringingMethodChange = (jobIndex, wpIndex, newMethod) => {
    const updated = [...jobs];
    const wp = updated[jobIndex].workpieces[wpIndex];

    wp.stringingMethod = newMethod;
    wp.point1SpecId = '';
    wp.point1Strands = '';
    wp.point2SpecId = '';
    wp.point2Strands = '';
    wp.tieWireSpecId = '';
    wp.tieWireStrands = '';
    wp.tieWireSpecId2 = '';
    wp.tieWireStrands2 = '';

    setJobs(updated);
  };
  const addWorkpieceRow = (jobIndex) => {
    const updated = [...jobs];
    updated[jobIndex].workpieces.push({
      id: Date.now() + Math.random(),
      workpieceType: '',
      workpieceTypeOther: '',
      quantity: '',
      unit: 'pcs',
      weightLb: '',
      isUniformWeight: true,
      weightInputMode: 'TOTAL',
      unitWeightInput: '',
      weightBracketId: '',
      variedTotalWeightInput: '',   // 新增：重量不均模式下，整批实测总重 
      useRailingCombRack: false,
      combRackCount: COMB_DEFAULT_RACK_COUNT,
      combPointsPerRack: COMB_DEFAULT_POINTS_PER_RACK,
      combMediumType: 'CHAIN',
      combSpecId: '',
      combStrands: '',
      hangingMode: 'INDIVIDUAL',
      hangingPoints: '2',
      point1SpecId: '12_WIRE',
      point1Strands: '',
      point2SpecId: '12_WIRE',
      point2Strands: ''
    });
    setJobs(updated);
  };

  const removeWorkpieceRow = (jobIndex, wpIndex) => {
    const updated = [...jobs];
    if (updated[jobIndex].workpieces.length === 1) return;
    updated[jobIndex].workpieces = updated[jobIndex].workpieces.filter((_, i) => i !== wpIndex);
    setJobs(updated);
  };

  const getShiftDisplay = () => {
    const rawShift = currentUser?.shift || 'Evening';
    return rawShift.toLowerCase().includes('shift') ? rawShift : `${rawShift} Shift`;
  };

  // Rigging Safety Check Warnings (Non-blocking warning - operator can override & confirm)
  // WIRE points are checked against the Reo-certified weight-bracket tables (upper bound of the
  // matched bracket, per Scheme One/Two). CHAIN points and Anchor Shackle are checked against the
  // supplier WLL figures directly.
  //
  // String Hanging has three physically different rigging setups, so the weight basis used for
  // each point's WIRE check depends on which Stringing Method is selected:
  //  - Full Chain: chain is the only structural member; both points (chain) are checked against
  //    the string's shared total weight, split across however many top points there are.
  //  - Chain + Wire: the CHAIN point(s) still carry the shared total weight as above. Any point
  //    marked WIRE here represents a short wire tie used to lash ONE individual workpiece onto the
  //    backbone chain. Because a tie only ever holds the one workpiece it's tied to, it is checked
  //    against a SINGLE workpiece's weight, not the string's shared total.
  //  - Pure Wire: each workpiece is hung from the one below it using the SAME hanging-point pattern
  //    (e.g. every link is a 2-point wire hang) all the way down to the last piece, then the whole
  //    daisy chain is hung from the rack. Every one of those links carries some or all of the
  //    weight below it, so - rather than track each link's exact position - every link's wire
  //    strand count is conservatively checked as if it alone were carrying the FULL total weight of
  //    the whole string, still split across however many points that link actually uses (1 or 2).
  const checkSafetyDeficiencies = () => {
    let deficiencies = [];
    // 单点绑丝安全根数上限（超出此上限提示改用铁链）— shared by both the normal
    // WIRE_CHAIN point check and the Railing Comb Rack check below.
    const MAX_SAFE_WIRE_STRANDS = 8;
    jobs.forEach((job, jIdx) => {
      job.workpieces.forEach((wp, wIdx) => {
        const { totalW, unitW } = getWorkpieceTotalWeight(wp);
        const workpieceTypeLabelForComb = wp.workpieceType === 'Others' && wp.workpieceTypeOther
          ? `Others: ${wp.workpieceTypeOther}`
          : wp.workpieceType;
        const combLabel = `Job #${jIdx + 1} Line #${wIdx + 1} (${workpieceTypeLabelForComb || 'Item'})`;

        // Railing Comb Rack: a paired fixture. Total hanging points = number
        // of comb racks used x hanging points on each one (both operator-
        // entered; default 2 x 2 = 4). It is NOT exempt from load checks -
        // the whole line's total weight is what the comb racks' points
        // actually carry, split evenly across all of them combined.
        if (wp.useRailingCombRack) {
          const rackCount = Math.max(COMB_MIN_RACK_COUNT, parseInt(wp.combRackCount, 10) || 0);
          const pointsPerRack = Math.max(COMB_MIN_POINTS_PER_RACK, parseInt(wp.combPointsPerRack, 10) || 0);
          const points = rackCount * pointsPerRack;
          const loadPerPt = points > 0 ? totalW / points : totalW;
          const specObj = RIGGING_SPECS.find(r => r.id === wp.combSpecId);
          const strands = parseInt(wp.combStrands, 10) || 0;

          if (!wp.combSpecId) {
            // 操作员还没选规格，先不报警——跟strands为空时的守卫逻辑一致，
            // 刚勾上Use Comb Rack、字段还是空的那一刻不该立刻弹警告
          } else if (!specObj) {
            deficiencies.push(`${combLabel}: Railing Comb Rack has an invalid ${wp.combMediumType === 'WIRE' ? 'wire' : 'chain'} spec selection.`);
          } else if (wp.combMediumType === 'CHAIN') {
            if (specObj.swl < loadPerPt) {
              deficiencies.push(
                `${combLabel}: Comb Rack point capacity (${specObj.swl} lb WLL, ${points} pts total = ${rackCount} rack(s) x ${pointsPerRack} pts) is below required load (${Math.round(loadPerPt)} lb/pt). Please upgrade chain size or add more points.`
              );
            }
          } else if (wp.combMediumType === 'WIRE' && strands <= 0) {
            // 操作员还没填根数，先不报警（与普通挂架 checkPoint 的守卫逻辑一致）
          } else {
            // WIRE medium: the certified Reo Engineering bracket table (WIRE_BRACKETS_SINGLE /
            // WIRE_BRACKETS_DOUBLE) was only validated for 1 and 2-point rigging schemes, so it
            // is NOT applied here for a >2-point comb rack. Instead this uses the same generic
            // SWL-based fallback the app already uses when a design weight falls outside the
            // certified table range (see getRequiredWireCount) - conservative, but not a
            // certified bracket, so flag that explicitly in the message.
            const reqStrands = Math.max(1, Math.ceil(loadPerPt / WIRE_SPEC.swl));
            if (reqStrands > MAX_SAFE_WIRE_STRANDS) {
              // 只要这个载荷本身需要超过安全上限的根数，就该换铁链——跟操作员实际
              // 打了几根铁丝无关，即使已经填够甚至填超要求根数，铁丝本身也不适合
              // 承担这个载荷
              deficiencies.push(
                `${combLabel}: Comb Rack point load (${Math.round(loadPerPt)} lb/pt, ${points} pts) requires ${reqStrands} wires, exceeding safe wire limit (${MAX_SAFE_WIRE_STRANDS}). Strongly recommend switching to CHAIN. (Generic calc, not a certified bracket.)`
              );
            } else if (strands < reqStrands) {
              deficiencies.push(
                `${combLabel}: Comb Rack wire count (${strands}) is below the generic-calc recommendation (${reqStrands}, ${points} pts @ ${Math.round(loadPerPt)} lb/pt) - not a certified bracket.`
              );
            }
          }
          return; // Railing Comb Rack lines don't go through the WIRE_CHAIN point-based checks below
        }

        const pts = parseInt(wp.hangingPoints, 10) || 1;
        const isString = wp.hangingMode === 'STRING';
        const stringingMethod = wp.stringingMethod || 'FULL_CHAIN';

        // designW = the weight actually carried by the shared structural points (chain / top
        // rigging): String mode -> whole batch shares one set of points; Individual mode -> one
        // piece's own points. (When isUniformWeight is false, totalW/unitW are already both the
        // same bracket ceiling.)
        const designW = isString ? totalW : unitW;
        const loadPerPt = designW / pts;
        const workpieceTypeLabel = wp.workpieceType === 'Others' && wp.workpieceTypeOther
          ? `Others: ${wp.workpieceTypeOther}`
          : wp.workpieceType;
        const label = `Job #${jIdx + 1} Line #${wIdx + 1} (${workpieceTypeLabel || 'Item'})`;

        // Wire recommendation basis differs by stringing method (see notes above).
        let wireRec;
        let wireBasisNote;
        if (isString && stringingMethod === 'CHAIN_WIRE') {
          // Tie wire secures ONE workpiece to the backbone chain(s). How many
          // separate wire attachment points it needs matches the selected hanging
          // point count (1 or 2) - just like the backbone chain itself - and each
          // point is checked individually against the per-point bracket value,
          // so there's no ambiguity about "per point" vs "combined total".
          wireRec = getRequiredWireCount(unitW, pts);
          wireBasisNote = `tying a single workpiece (${Math.round(unitW)} lb)`;
        } else if (isString && stringingMethod === 'PURE_WIRE') {
          // Conservative: every link's wire count is checked as if it alone carried the full string
          // weight, but still split across however many points (1 or 2) that link actually uses.
          wireRec = getRequiredWireCount(totalW, pts);
          wireBasisNote = `the full string weight (${Math.round(totalW)} lb, conservative)`;
        } else {
          wireRec = getRequiredWireCount(designW, pts); // Individual hanging, or String + Full Chain
          wireBasisNote = `a design weight of ${Math.round(designW)} lb`;
        }

        const checkPoint = (specId, userStrandsRaw, pointLabel) => {
          const specObj = RIGGING_SPECS.find(r => r.id === specId) || RIGGING_SPECS[0];
          const userStrands = parseInt(userStrandsRaw, 10) || 0;
          if (userStrands <= 0) return;

      if (specObj.type === 'WIRE') {
        const reqStrands = wireRec.perPoint;
        if (reqStrands > MAX_SAFE_WIRE_STRANDS) {
          // 只要这个载荷本身需要超过安全上限的根数，就该换铁链——跟操作员实际打了
          // 几根铁丝无关，哪怕操作员已经打够甚至打超了要求根数，铁丝本身也不适合
          // 承担这个载荷，必须提醒切换铁链
          deficiencies.push(
            `${label}: ${pointLabel} load (${Math.round(loadPerPt)} lb) requires ${reqStrands} wires, exceeding safe wire limit (${MAX_SAFE_WIRE_STRANDS}). Strongly recommend switching to CHAIN.`
          );
        } else if (userStrands < reqStrands) {
          // 安全范围内，但操作员填的根数不够，提示增加铁丝根数
          deficiencies.push(
            `${label}: ${pointLabel} wire count (${userStrands}) is below recommendation (${reqStrands}) for ${wireBasisNote}.`
          );
        }
      } else if (specObj.type === 'CHAIN') {
        // 铁链逻辑：直接对比 WLL 与挂点载荷
        const reqLoad = Math.round(loadPerPt);
        if (specObj.swl < loadPerPt) {
          deficiencies.push(
            `${label}: ${pointLabel} capacity (${specObj.swl} lb WLL) is below required load (${reqLoad} lb) for ${specObj.label}. Please upgrade chain size.`
          );
        }
      }
        };

        checkPoint(wp.point1SpecId, wp.point1Strands, 'Point 1');
        if (pts === 2) {
          checkPoint(wp.point2SpecId, wp.point2Strands, 'Point 2');
        }

      // CHAIN_WIRE 模式下，绑丝要单独复核承载力 - 现在跟主链一样按悬挂点数分别校验，
      // 2 个悬挂点时绑丝也拆成 Tie Wire Point 1 / Point 2 两个点分别核对，
      // 避免"到底是每点几根还是总共几根"的歧义。
      if (stringingMethod === 'CHAIN_WIRE') {
        checkPoint(wp.tieWireSpecId, wp.tieWireStrands, pts === 2 ? 'Tie Wire Point 1' : 'Tie Wire');
        if (pts === 2) {
          checkPoint(wp.tieWireSpecId2, wp.tieWireStrands2, 'Tie Wire Point 2');
        }
      }
      // Anchor Shackle WLL check ...
        // Anchor Shackle WLL check - the shackle attaches the chain/wire assembly to the rack at a
        // single point, so it's checked against that point's share of the structural load
        // (loadPerPt), same basis as the CHAIN check above, regardless of stringing method.
        if (wp.anchorShackle && wp.anchorShackle !== 'NONE') {
          const shackleSpec = ANCHOR_SHACKLE_SPECS.find(s => s.id === wp.anchorShackle);
          if (shackleSpec && shackleSpec.wll != null && loadPerPt > shackleSpec.wll) {
            deficiencies.push(`${label}: Anchor Shackle (${shackleSpec.label}, ${shackleSpec.wll} lb WLL) is under the ${Math.round(loadPerPt)} lb load it would carry at each point.`);
          }
        }
      });
    });
    return deficiencies;
  };

  // Sums the design weight of every workpiece line on this Load (all Jobs, both WIRE_CHAIN and
  // Railing Comb Rack lines) - this is what the Beam Rack's support frames actually have to carry.
  const getRackTotalWeight = () => {
    let total = 0;
    jobs.forEach(job => {
      job.workpieces.forEach(wp => {
        const { totalW } = getWorkpieceTotalWeight(wp);
        total += totalW;
      });
    });
    return total;
  };

  // Resolves the operator-selected Min/Max Oil-Paint and Rust levels (from the global
  // `surfaceAssessment` state) and flags whether the spread between them is wide enough to
  // warrant a mixed-corrosion batching warning.
  const getSurfaceAssessmentSummary = () => {
    const levelIndex = (val) => SURFACE_CONDITION_OPTIONS.findIndex(o => o.value === val);
    const buildRange = (minVal, maxVal) => {
      const minIdx = levelIndex(minVal);
      const maxIdx = levelIndex(maxVal);
      if (minIdx < 0 || maxIdx < 0) return { min: null, max: null, spread: 0, hasWarning: false };
      return {
        min: SURFACE_CONDITION_OPTIONS[minIdx],
        max: SURFACE_CONDITION_OPTIONS[maxIdx],
        spread: maxIdx - minIdx,
        hasWarning: (maxIdx - minIdx) >= SURFACE_SPREAD_WARNING_THRESHOLD
      };
    };

    return {
      oilPaint: buildRange(surfaceAssessment.minOilPaintLevel, surfaceAssessment.maxOilPaintLevel),
      rust: buildRange(surfaceAssessment.minRustLevel, surfaceAssessment.maxRustLevel)
    };
  };

  // Severe Safety Violations Check (Hard Blocking Logic) - now based on the single global checklist
  const checkCriticalSafetyViolations = () => {
    let severeErrors = [];
    // Check 1: Cavity without venting & without onsite drilling
    if (safetyChecklist.hasEnclosedCavity && (!safetyChecklist.hasAdequateVenting && !safetyChecklist.drilledOnsite)) {
      severeErrors.push(`Enclosed cavity detected without sufficient venting/drainage holes, and not drilled on site! (Explosion Risk in Kettle)`);
    }
    // Check 2: Rack support-frame capacity (8,000 lb net, after beam self-weight & safety factor) - hard limit, no override
    const rackTotal = getRackTotalWeight();
    if (rackTotal > RACK_LIMIT_LBS) {
      severeErrors.push(`Total rack load (${Math.round(rackTotal).toLocaleString()} lb) exceeds the rack's usable load capacity of ${RACK_LIMIT_LBS.toLocaleString()} lb. Remove workpieces or split onto another rack before submitting.`);
    }
    return severeErrors;
  };

  const deficiencies = checkSafetyDeficiencies();
  const criticalViolations = checkCriticalSafetyViolations();
  const isFormBlocked = criticalViolations.length > 0;
  const rackTotalWeight = getRackTotalWeight();
  const surfaceAssessmentSummary = getSurfaceAssessmentSummary();

  // Look up an operator by Employee ID + PIN against the operators table.
  // Used both to verify sign-off credentials and to get the operator's UUID
  // for operator_id / signature records.
  const verifyOperator = async (employeeId, pin) => {
    const { data, error } = await supabase
      .from('operators')
      .select('id, name, role, pin')
      .eq('name', `Employee ${employeeId}`)
      .maybeSingle();

    if (error) throw error;
    if (!data) return { ok: false, reason: `Employee ID ${employeeId} not found` };
    if (String(data.pin) !== String(pin)) return { ok: false, reason: `Incorrect PIN for Employee ${employeeId}` };
    return { ok: true, operator: data };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Guard FIRST, before any other check - a fast double-click can fire two
    // handleSubmit calls before React re-renders the disabled submit button.
    // Without this, both calls can pass all the way through PIN verification
    // and both attempt to insert the same load_id, with the second one
    // failing on the production_loads_load_id_key unique constraint.
    if (isSubmittingRef.current) return;

    if (!rackNo || !loadId.trim()) {
      alert('Please select a Rack # first.');
      return;
    }

    if (isFormBlocked) {
      alert(`❌ CANNOT SUBMIT DUE TO SEVERE SAFETY VIOLATIONS:\n\n` + criticalViolations.join('\n'));
      return;
    }

    if (!primaryOperatorId.trim() || !primaryPin.trim()) {
      alert('Please enter the Primary Operator Employee ID and PIN to Confirm & Sign-off before submitting.');
      return;
    }

    if (deficiencies.length > 0) {
      const isConfirmed = window.confirm(
        `⚠️ SAFETY WARNING:\n\n` +
        deficiencies.join('\n') +
        `\n\nPlease confirm if you want to proceed with these values?`
      );
      if (!isConfirmed) return;
    }

    if (!supabase) {
      alert('Database connection is not available. Cannot submit.');
      return;
    }

    isSubmittingRef.current = true;
    setIsSubmitting(true);
    try {
      // 1. Verify the primary sign-off operator's PIN
      const primaryCheck = await verifyOperator(primaryOperatorId.trim(), primaryPin.trim());
      if (!primaryCheck.ok) {
        alert(`❌ Sign-off failed: ${primaryCheck.reason}`);
        isSubmittingRef.current = false;
        setIsSubmitting(false);
        return;
      }

      // 2. Verify each assistant operator's PIN (any filled-in assistant must be valid)
      const filledAssistants = assistants.filter(a => a.employeeId.trim());
      const assistantOperators = [];
      for (const a of filledAssistants) {
        const check = await verifyOperator(a.employeeId.trim(), (a.pin || '').trim());
        if (!check.ok) {
          alert(`❌ Assistant sign-off failed: ${check.reason}`);
          isSubmittingRef.current = false;
        setIsSubmitting(false);
          return;
        }
        assistantOperators.push(check.operator);
      }

      const isCraneDirect = rackNo === NO_RACK_VALUE;
      const isNumberedRack = /^\d+$/.test(rackNo);
      const rackNoInt = isNumberedRack ? parseInt(rackNo, 10) : null;
      // Fixture only applies when an actual numbered rack is in use.
      const fixtureForSubmit = isCraneDirect ? null : rackFixtureType;

      // 3. Create the Load record
      const { data: loadRow, error: loadErr } = await supabase
        .from('production_loads')
        .insert({
          load_id: loadId.trim(),
          loading_method: isCraneDirect ? 'crane_direct' : 'rack',
          rack_no: rackNoInt,
          rack_fixture_type: fixtureForSubmit,
          current_location: isCraneDirect ? 'n_a_crane_direct' : 'on_rack',
          current_stage_code: 'stage_01',
          workflow_status: 'in_progress'
        })
        .select()
        .single();
      if (loadErr) throw loadErr;

      // 4. Log the Rack assignment event (only when an actual rack is used)
      // A DB trigger (enforce_rack_exclusive_assignment) rejects this insert if
      // someone else's submission already claimed this rack_no in the meantime
      // (two people opening the form around the same time, both seeing the
      // rack as free). If that happens, the Load row from step 3 above is now
      // an orphan — it was never actually assigned this rack — so it must be
      // deleted rather than left behind with a rack_no it doesn't really hold.
      if (!isCraneDirect) {
        const { error: rackEventErr } = await supabase
          .from('production_rack_events')
          .insert({
            rack_no: rackNoInt,
            load_id: loadRow.id,
            event_type: 'assigned',
            operator_id: primaryCheck.operator.id
          });
        if (rackEventErr) {
          await supabase.from('production_loads').delete().eq('id', loadRow.id);
          await refreshOccupiedRacks();
          const takenByOther = (rackEventErr.message || '').includes('already assigned');
          alert(
            takenByOther
              ? `⚠️ Rack #${rackNo} was just taken by someone else. Please pick a different rack and try again.`
              : `⚠️ Could not assign Rack #${rackNo}: ${rackEventErr.message}`
          );
          isSubmittingRef.current = false;
        setIsSubmitting(false);
          return;
        }
      }

      // 5. Create Job + Workpiece records
      for (const job of jobs) {
        const { data: jobRow, error: jobErr } = await supabase
          .from('production_jobs')
          .insert({
            load_id: loadRow.id,
            customer_name: job.customerName,
            customer_order_no: job.customerOrderNo,
            customer_batch_no: job.customerBatchNo || '#1'
          })
          .select()
          .single();
        if (jobErr) throw jobErr;

        const workpieceRows = job.workpieces.map(wp => {
          const { totalW, unitW } = getWorkpieceTotalWeight(wp);
          const qty = parseInt(wp.quantity, 10) || 0;
          const rigging = wp.useRailingCombRack
            ? {
                category: 'RAILING_COMB_RACK',
                combRackCount: parseInt(wp.combRackCount, 10) || 2,
                pointsPerRack: parseInt(wp.combPointsPerRack, 10) || 2,
                totalHangingPoints: (parseInt(wp.combRackCount, 10) || 2) * (parseInt(wp.combPointsPerRack, 10) || 2),
                medium: wp.combMediumType,
                spec: wp.combSpecId || null,
                strandsPerPoint: wp.combMediumType === 'WIRE' ? (parseInt(wp.combStrands, 10) || 0) : null
              }
            : {
                category: 'WIRE_CHAIN',
                hangingMode: wp.hangingMode,
                hangingPoints: parseInt(wp.hangingPoints, 10),
                stringingMethod: wp.hangingMode === 'STRING' ? (wp.stringingMethod || 'FULL_CHAIN') : null,
                point1: { spec: wp.point1SpecId, strands: parseInt(wp.point1Strands, 10) || 0 },
                point2: wp.hangingPoints === '2' ? { spec: wp.point2SpecId, strands: parseInt(wp.point2Strands, 10) || 0 } : null,
                tieWire: (wp.hangingMode === 'STRING' && wp.stringingMethod === 'CHAIN_WIRE')
                  ? { point1: { spec: wp.tieWireSpecId, strands: parseInt(wp.tieWireStrands, 10) || 0 },
                      point2: wp.hangingPoints === '2' ? { spec: wp.tieWireSpecId2, strands: parseInt(wp.tieWireStrands2, 10) || 0 } : null }
                  : null,
                anchorShackle: wp.anchorShackle && wp.anchorShackle !== 'NONE' ? wp.anchorShackle : null
              };

          return {
            job_id: jobRow.id,
            workpiece_type: wp.workpieceType === 'Others' ? (wp.workpieceTypeOther || 'Others') : wp.workpieceType,
            quantity: qty,
            unit: wp.unit || 'pcs',
            total_weight_lb: Math.round(totalW),
            unit_weight_lb: Math.round(unitW),
            rigging
          };
        });

        const { error: wpErr } = await supabase.from('production_workpieces').insert(workpieceRows);
        if (wpErr) throw wpErr;
      }

      // 6. Create the Stage 01 log entry (the actual SOP data captured on this form)
      const { data: stageLogRow, error: stageLogErr } = await supabase
        .from('production_stage_logs')
        .insert({
          load_id: loadRow.id,
          stage_code: 'stage_01',
          operator_id: primaryCheck.operator.id,
          attempt_no: 1,
          is_final_for_stage: true,
          status: 'completed',
          data: {
            shift: getShiftDisplay(),
            entryDate: currentDateFormatted,
            safetyChecklist: { ...safetyChecklist },
            rackCapacityCheck: {
              totalLoadLb: Math.round(rackTotalWeight),
              limitLb: RACK_LIMIT_LBS
            },
            surfaceAssessmentSummary: {
              oilPaint: {
                min: surfaceAssessmentSummary.oilPaint.min?.value || null,
                max: surfaceAssessmentSummary.oilPaint.max?.value || null,
                mixedBatchWarning: surfaceAssessmentSummary.oilPaint.hasWarning
              },
              rust: {
                min: surfaceAssessmentSummary.rust.min?.value || null,
                max: surfaceAssessmentSummary.rust.max?.value || null,
                mixedBatchWarning: surfaceAssessmentSummary.rust.hasWarning
              }
            }
          }
        })
        .select()
        .single();
      if (stageLogErr) throw stageLogErr;

      // 7. Record signatures: primary operator + any assistants
      const signatureRows = [
        { stage_log_id: stageLogRow.id, operator_id: primaryCheck.operator.id },
        ...assistantOperators.map(op => ({ stage_log_id: stageLogRow.id, operator_id: op.id }))
      ];
      const { error: sigErr } = await supabase.from('production_stage_signatures').insert(signatureRows);
      if (sigErr) throw sigErr;

      alert(`✅ Load [${loadId.trim()}] recorded and signed off by ID [${primaryOperatorId.trim()}] successfully!`);
      refreshOccupiedRacks();

      // Reset the form back to a clean state for the next Load, instead of
      // leaving this one's data sitting on screen (which invites accidentally
      // re-submitting the same Load, or an operator having to manually clear
      // every field before starting the next one).
      setRackNo('');
      setRackFixtureType(RACK_FIXTURE_STANDARD);
      setLoadId('');
      setAutoLoadId('');
      setPrimaryOperatorId('');
      setPrimaryPin('');
      setAssistants([{ uid: Date.now(), employeeId: '', pin: '' }]);
      setSafetyChecklist({
        hasEnclosedCavity: false,
        hasAdequateVenting: true,
        drilledOnsite: true
      });
      setSurfaceAssessment({
        minOilPaintLevel: '',
        maxOilPaintLevel: '',
        minRustLevel: '',
        maxRustLevel: ''
      });
      setJobs([createNewJob()]);
    } catch (err) {
      console.error('Failed to submit production load:', err);

      // A duplicate load_id means this exact Load ID was already used by an
      // earlier (likely successful) submission - e.g. a double-click, or a
      // stale second tab still holding the same auto-generated ID. Give a
      // clearer explanation than the raw Postgres error, and hand the
      // operator a fresh Load ID right away instead of leaving the stale
      // one in the field (which would just fail again the same way).
      const isDuplicateLoadId = (err?.code === '23505') || /production_loads_load_id_key/.test(err?.message || '');
      if (isDuplicateLoadId) {
        alert(
          `⚠️ Load ID [${loadId.trim()}] was already used by a previous submission - it looks like this one already went through.\n\n` +
          `Please check if your data was already saved before re-entering it. A new Load ID has been generated for you below.`
        );
        if (rackNo) {
          await regenerateLoadId(rackNo, rackFixtureType, false);
        }
      } else {
        alert(`❌ Submission failed: ${err.message || err}`);
      }

      isSubmittingRef.current = false;
      setIsSubmitting(false);
      return;
    }
    isSubmittingRef.current = false;
    setIsSubmitting(false);

    // Reset Form
    setRackNo('');
    setLoadId('');
    setAutoLoadId('');
    setPrimaryOperatorId('');
    setPrimaryPin('');
    setAssistants([{ uid: Date.now(), employeeId: '', pin: '' }]);
    setSafetyChecklist({
      hasEnclosedCavity: false,
      hasAdequateVenting: true,
      drilledOnsite: true
    });
    setSurfaceAssessment({
      minOilPaintLevel: '',
      maxOilPaintLevel: '',
      minRustLevel: '',
      maxRustLevel: ''
    });
    setJobs([createNewJob()]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl font-sans text-slate-100">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 mb-6 flex justify-between items-center">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            Stage 01: Loading Station
          </span>
          <h2 className="text-xl font-extrabold text-white">New Load Entry</h2>
        </div>

        <div className="text-right space-y-0.5">
          <div className="text-xs font-semibold text-slate-300">
            📅 {currentDateFormatted}
          </div>
          <div className="text-xs font-bold text-cyan-300 font-mono">
            🕒 {getShiftDisplay()}
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">

{/* MANDATORY PPE PRE-CHECK BAR (Placed right above STEP 1) */}
<div className="bg-slate-900/90 border border-amber-500/30 rounded-lg p-3 space-y-2">
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-1.5 text-amber-400 font-mono text-[11px] font-bold uppercase tracking-wider">
      <span>🛡️</span> Mandatory PPE Gear Requirements (Loading Station)
    </div>
    <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/30 px-1.5 py-0.5 rounded font-mono">
      PRE-START CHECK
    </span>
  </div>

  {/* 6-Grid Visual Equipment Layout */}
  <div className="grid grid-cols-2 md:grid-cols-6 gap-2 text-[10px]">
    {/* Body-Zone 1 */}
    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex flex-col items-center text-center">
      <span className="text-base mb-1">🥽</span>
      <span className="text-slate-200 font-bold">Safety Glasses</span>
      <span className="text-[9px] text-slate-500">Impact Protection</span>
    </div>

    {/* Body-Zone 2 */}
    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex flex-col items-center text-center">
      <span className="text-base mb-1">🎧</span>
      <span className="text-slate-200 font-bold">Earplugs</span>
      <span className="text-[9px] text-slate-500">Noise Reduction</span>
    </div>

    {/* Body-Zone 3 */}
    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex flex-col items-center text-center">
      <span className="text-base mb-1">😷</span>
      <span className="text-slate-200 font-bold">Dust Mask</span>
      <span className="text-[9px] text-slate-500">Particle Filter</span>
    </div>

    {/* Body-Zone 4 */}
    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex flex-col items-center text-center">
      <span className="text-base mb-1">🥼</span>
      <span className="text-slate-200 font-bold">Hi-Vis Cut Jacket</span>
      <span className="text-[9px] text-slate-500">Long Sleeve & Strip</span>
    </div>

    {/* Body-Zone 5 */}
    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex flex-col items-center text-center">
      <span className="text-base mb-1">🧤</span>
      <span className="text-slate-200 font-bold">Cut & Puncture Gloves</span>
      <span className="text-[9px] text-slate-500">ANSI A5 / Anti-Wire</span>
    </div>

    {/* Body-Zone 6 */}
    <div className="bg-slate-950 p-2 rounded border border-slate-800 flex flex-col items-center text-center">
      <span className="text-base mb-1">🥾</span>
      <span className="text-slate-200 font-bold">Steel-Toe Boots</span>
      <span className="text-[9px] text-slate-500">Anti-Crush & Pierce</span>
    </div>
  </div>
</div>
{/* WORKFLOW STEPPER CONTAINER - FLEXIBLE STACKED LAYOUT */}
<div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
  
  {/* PIPELINE HEADER */}
  <div className="flex items-center justify-between pb-3 border-b border-slate-800">
    <div className="flex items-center gap-2">
      <span className="text-sm">📋</span>
      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
        Standard Operating Guidelines (5-Step Workflow)
      </h3>
    </div>
    <span className="text-[10px] bg-slate-900 text-cyan-400 px-2 py-0.5 rounded border border-slate-700 font-mono">
      LOADING STATION SOP
    </span>
  </div>

 {/* STEP 1 */}
<div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-2.5">
  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
    <span className="text-xs font-bold text-cyan-400 flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-slate-950">1</span>
      STEP 1: Raw Steel Weigh-In & Form Entry
    </span>
    <span className="text-[10px] text-slate-400 font-mono">Log job details & weigh raw steel</span>
  </div>
  
  <div className="space-y-2 text-xs">
    {/* Safety Item */}
    <div className="p-2.5 bg-rose-950/30 border-l-2 border-l-rose-500 rounded-r text-[11px] text-slate-300">
      <div className="font-bold text-rose-300 mb-0.5">🛡️ Safety: Weight Input & Rigging Match</div>
      Input accurate scale weight into form. Essential for determining required wire strand count or chain gauge, enforcing the 8,000 lb rack load limit.
    </div>

    {/* Quality Item with Integrated Photo Buttons */}
    <div className="p-2.5 bg-cyan-950/30 border-l-2 border-l-cyan-500 rounded-r text-[11px] text-slate-300 space-y-2">
      <div>
        <div className="font-bold text-cyan-300 mb-0.5">💎 Quality: Custom Packaging & Bundling Photo Record</div>
        Inspect incoming customer bundling. Capture photos of any unusual or custom packaging setups to serve as an exact reference for downstream unloading and re-bundling.
      </div>

      {/* 按钮区域 (上传按钮 & 手机扫码协同按钮) */}
      <div className="flex items-center gap-2 pt-1">
        <label className="cursor-pointer bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 px-3 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors">
          <span>📷</span>
          <span>Snap / Upload Photo</span>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            onChange={(e) => console.log(e.target.files[0])}
          />
        </label>

        <button 
          type="button"
          onClick={() => alert("Displays temporary QR code for mobile photo sync")}
          className="bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded text-[11px] font-mono transition-colors"
        >
          📱 Scan via Phone
        </button>
      </div>
    </div>

    {/* Incoming Damage Photo Record - separate photo set from packaging record above, so
        liability-evidence photos never get mixed in with packaging-reference photos */}
    <div className="p-2.5 bg-amber-950/30 border-l-2 border-l-amber-500 rounded-r text-[11px] text-slate-300 space-y-2">
      <div>
        <div className="font-bold text-amber-300 mb-0.5">⚠️ Quality: Incoming Material Damage Record</div>
        Inspect incoming steel for pre-existing structural damage (dents, bends, deformation, breaks, cracks). Capture photos as evidence, before any handling, to protect against downstream customer disputes.
      </div>

      {/* 按钮区域 (独立的一套，避免与上面的包装参考照片混在一起) */}
      <div className="flex items-center gap-2 pt-1">
        <label className="cursor-pointer bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/40 px-3 py-1 rounded text-[11px] font-mono flex items-center gap-1.5 transition-colors">
          <span>📷</span>
          <span>Snap / Upload Photo</span>
          <input 
            type="file" 
            accept="image/*" 
            capture="environment" 
            className="hidden" 
            onChange={(e) => console.log(e.target.files[0])}
          />
        </label>

        <button 
          type="button"
          onClick={() => alert("Displays temporary QR code for mobile photo sync")}
          className="bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-700 px-2.5 py-1 rounded text-[11px] font-mono transition-colors"
        >
          📱 Scan via Phone
        </button>
      </div>
    </div>
  </div>
</div>

{/* STEP 2 */}
<div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-2.5">
  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
    <span className="text-xs font-bold text-cyan-400 flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-slate-950">2</span>
      STEP 2: Cavity Venting & Surface Inspection
    </span>
    <span className="text-[10px] text-slate-400 font-mono">Verify vent holes & surface condition</span>
  </div>
  
  <div className="space-y-2 text-xs">
    {/* Safety Item */}
    <div className="p-2.5 bg-rose-950/30 border-l-2 border-l-rose-500 rounded-r text-[11px] text-slate-300">
      <div className="font-bold text-rose-300 mb-0.5">🛡️ Safety: Explosion Hazard Venting</div>
      Hollow/pipe sections MUST have vent holes (min 1/2" / 13mm) at highest points to allow air escape and prevent catastrophic kettle explosions / zinc splash.
    </div>

    {/* Quality Item 1: 带有 ASTM A385 图解弹窗 */}
    <div className="p-2.5 bg-cyan-950/30 border-l-2 border-l-cyan-500 rounded-r text-[11px] text-slate-300">
      <div className="flex items-center justify-between mb-0.5">
        <span className="font-bold text-cyan-300">💎 Quality: Vent & Drain Hole Verification</span>
        
        <button
          type="button"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/40 px-2 py-0.5 rounded transition-colors"
        >
          <span>📐</span>
          <span className="underline decoration-cyan-400/50">ASTM A385 Diagrams</span>
        </button>
      </div>
      <div>
        Confirm presence and size of required vent and drain holes at highest/lowest points to ensure smooth air escape, acid flow, and molten zinc drainage.
      </div>
    </div>

    {/* Quality Item 2 */}
    <div className="p-2.5 bg-cyan-950/30 border-l-2 border-l-cyan-500 rounded-r text-[11px] text-slate-300">
      <div className="font-bold text-cyan-300 mb-0.5">💎 Quality: Surface Condition Inspection</div>
      Inspect and log surface contaminants (oil, grease, paint) and rust severity in form as a reference for downstream degreasing and acid pickling processes.
    </div>

    {/* Quality Item 3 */}
    <div className="p-2.5 bg-cyan-950/30 border-l-2 border-l-cyan-500 rounded-r text-[11px] text-slate-300">
      <div className="font-bold text-cyan-300 mb-0.5">💎 Quality: Masking / Stop-off Agent Check</div>
      If masked, position zones at BOTTOM or SIDES during racking to prevent pre-treatment runoff from dripping onto unmasked steel surfaces.
    </div>
  </div>

  {/* ASTM A385 图解说明弹窗 (Modal) */}
  {showGuide && (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl max-w-lg w-full p-4 space-y-4 shadow-2xl">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <span className="text-base">📐</span>
            <h3 className="text-sm font-bold text-cyan-400">
              Venting & Draining Standards (ASTM A385)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowGuide(false)}
            className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800 transition-colors"
          >
            ✕ Close
          </button>
        </div>

        {/* Modal Content */}
        <div className="space-y-3 text-xs text-slate-300 max-h-[65vh] overflow-y-auto pr-1">
          
          {/* 图解 1: 右端优先下池 (Leading Right / Trailing Left) */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="font-bold text-cyan-300 text-[11px]">
              1. Vent/Drain Locations Relative to Racking Angle
            </div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              Venting MUST be at the highest point (Trailing / Left) and Draining at the lowest point (Leading / Right) <strong className="text-amber-400">when the rack enters kettle (typically 30°–45°)</strong>.
            </div>
            
            {/* SVG 示意图 1 (右低左高) */}
            <div className="w-full h-36 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-center p-2">
              <svg viewBox="0 0 320 120" className="w-full h-full">
                {/* 吊索 (左长右短/右侧先下) */}
                <path d="M 100 10 L 100 35" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />
                <path d="M 220 10 L 220 75" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />
                
                {/* 顺时针倾斜：右侧先进入锌池 */}
                <g transform="rotate(18 160 60)">
                  {/* 管件主体 */}
                  <rect x="50" y="40" width="220" height="40" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                  
                  {/* 左上角最高点 - 排气孔 (Vent Hole) */}
                  <circle cx="60" cy="40" r="4" fill="#ef4444" stroke="#f87171" strokeWidth="1.5" />

                  {/* 右下角最低点 - 排水/进锌孔 (Drain Hole) */}
                  <circle cx="260" cy="80" r="4" fill="#38bdf8" stroke="#7dd3fc" strokeWidth="1.5" />
                </g>

                {/* 文字标注：左上排气 */}
                <path d="M 70 30 L 70 18" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2" />
                <text x="70" y="12" fill="#ef4444" fontSize="9" fontWeight="bold" textAnchor="middle">Vent Hole (High Point / Air Escape)</text>

                {/* 文字标注：右下进锌 */}
                <path d="M 270 92 L 270 102" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="2 2" />
                <text x="270" y="112" fill="#38bdf8" fontSize="9" fontWeight="bold" textAnchor="middle">Drain Hole (Low Point / Zinc In)</text>

                {/* 锌池液位线 */}
                <line x1="20" y1="95" x2="300" y2="95" stroke="#0284c7" strokeWidth="1" strokeDasharray="4 4" opacity="0.4" />
                <text x="25" y="90" fill="#0284c7" fontSize="8" opacity="0.6">Zinc Kettle Bath Line →</text>
              </svg>
            </div>
          </div>

          {/* 图解 2: 内部筋板切角 */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="font-bold text-cyan-300 text-[11px]">
              2. Internal Gusset & Stiffener Coping
            </div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              Internal plates must have clipped corners (min 1" / 25mm) to prevent trapped air pockets inside sealed chambers.
            </div>
            
            {/* SVG 示意图 2 */}
            <div className="w-full h-32 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-center p-2">
              <svg viewBox="0 0 320 100" className="w-full h-full">
                {/* 外部框体 */}
                <rect x="60" y="15" width="200" height="70" fill="none" stroke="#475569" strokeWidth="2" />
                
                {/* 内部加强筋板 */}
                <path d="M 160 15 L 160 30 L 160 70 L 160 85" stroke="#38bdf8" strokeWidth="2" />
                
                {/* 顶部切角 */}
                <path d="M 160 30 L 175 15" stroke="#f59e0b" strokeWidth="2" strokeDasharray="2 2" />
                <circle cx="160" cy="22" r="8" fill="none" stroke="#f59e0b" strokeWidth="1" />
                <text x="210" y="25" fill="#f59e0b" fontSize="9" fontWeight="bold">Min 1" (25mm) Clipped Corner</text>

                {/* 底部切角 */}
                <path d="M 160 70 L 175 85" stroke="#f59e0b" strokeWidth="2" strokeDasharray="2 2" />
                
                {/* 穿流指示 */}
                <path d="M 145 28 C 155 20, 165 20, 175 28" stroke="#10b981" strokeWidth="1.5" fill="none" />
                <text x="110" y="55" fill="#10b981" fontSize="9" textAnchor="middle">Air/Zinc Passage</text>
              </svg>
            </div>
          </div>

          {/* 图解 3: 现场连通性快速实操检查 */}
          <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
            <div className="font-bold text-cyan-300 text-[11px] flex items-center justify-between">
              <span>3. Internal Passage & Continuity Verification</span>
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-1.5 py-0.5 rounded">Shop Floor Practical Tips</span>
            </div>
            <div className="text-[10px] text-slate-400 leading-relaxed">
              Verify internal cavities, pipes, and stiffeners are fully connected to prevent internal air pockets, explosive acid trapping, or ungalvanized raw steel.
            </div>
            
            {/* 双图对比：手电筒照光 vs 倒水流动 */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              
              {/* 方法 A：手电筒照光法 */}
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800 space-y-1.5 text-center">
                <div className="text-[10px] font-bold text-amber-300">
                  🔦 Method A: Flashlight Light-Thru
                </div>
                <div className="w-full h-28 bg-slate-950 rounded flex items-center justify-center p-1">
                  <svg viewBox="0 0 140 80" className="w-full h-full">
                    {/* 管件 */}
                    <rect x="20" y="25" width="100" height="30" fill="#1e293b" stroke="#475569" strokeWidth="1.5" />
                    {/* 内部障碍筋板与过锌孔 */}
                    <line x1="70" y1="25" x2="70" y2="35" stroke="#0284c7" strokeWidth="2" />
                    <line x1="70" y1="45" x2="70" y2="55" stroke="#0284c7" strokeWidth="2" />
                    <circle cx="70" cy="40" r="4" fill="none" stroke="#38bdf8" strokeWidth="1" strokeDasharray="1 1" />
                    
                    {/* 手电筒与光束 */}
                    <rect x="5" y="32" width="10" height="16" fill="#f59e0b" rx="1" />
                    <polygon points="15,35 66,37 66,43 15,45" fill="#fef08a" opacity="0.6" />
                    <polygon points="74,38 125,28 125,52 74,42" fill="#fef08a" opacity="0.4" />
                    
                    {/* 光线穿透出孔 */}
                    <path d="M 125 40 L 135 40" stroke="#fef08a" strokeWidth="2" strokeDasharray="1 1" />
                    <text x="70" y="70" fill="#10b981" fontSize="7" fontWeight="bold" textAnchor="middle">✓ Light Pass-through</text>
                  </svg>
                </div>
                <p className="text-[9px] text-slate-400">
                  Shine light into trailing vent hole; verify visible light at leading drain hole to confirm line-of-sight.
                </p>
              </div>

              {/* 方法 B：水流灌注测试 */}
              <div className="bg-slate-900/90 p-2 rounded border border-slate-800 space-y-1.5 text-center">
                <div className="text-[10px] font-bold text-cyan-300">
                  🌊 Method B: Water Flow Test
                </div>
                <div className="w-full h-28 bg-slate-950 rounded flex items-center justify-center p-1">
                  <svg viewBox="0 0 140 80" className="w-full h-full">
                    {/* 弯管/复杂腔体 */}
                    <path d="M 25 20 Q 70 20 70 45 T 115 60" fill="none" stroke="#334155" strokeWidth="16" strokeLinecap="round" />
                    <path d="M 25 20 Q 70 20 70 45 T 115 60" fill="none" stroke="#1e293b" strokeWidth="12" strokeLinecap="round" />
                    
                    {/* 进水水流 */}
                    <path d="M 25 10 L 25 22" stroke="#38bdf8" strokeWidth="2" strokeDasharray="2 2" />
                    <text x="25" y="8" fill="#38bdf8" fontSize="7" textAnchor="middle">Pour Water</text>

                    {/* 出水水流 */}
                    <path d="M 115 60 C 118 68, 120 72, 122 78" stroke="#38bdf8" strokeWidth="2.5" fill="none" />
                    <text x="70" y="70" fill="#10b981" fontSize="7" fontWeight="bold" textAnchor="middle">✓ Smooth Exit Flow</text>
                  </svg>
                </div>
                <p className="text-[9px] text-slate-400">
                  Pour water into highest vent. Continuous flow from lowest drain ensures no air traps or blockage inside.
                </p>
              </div>

            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="pt-2 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={() => setShowGuide(false)}
            className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-4 py-1.5 rounded text-xs transition-colors"
          >
            Got It
          </button>
        </div>

      </div>
    </div>
  )}
</div>

{/* STEP 3 */}
<div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-2.5">
  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
    <span className="text-xs font-bold text-cyan-400 flex items-center gap-2">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-slate-950">3</span>
      STEP 3: Rigging Selection & Chain Locking
    </span>
    <span className="text-[10px] text-slate-400 font-mono">Match chain gauge & secure load</span>
  </div>
  
  <div className="space-y-2 text-xs">

 {/* Safety Item */}
<div className="p-2.5 bg-rose-950/30 border-l-2 border-l-rose-500 rounded-r text-[11px] text-slate-300 leading-relaxed">
  <div className="font-bold text-rose-300 mb-0.5">🛡️ Safety: Chain Spec, Wire Laps & Anti-Slippage</div>
  Match wire strand count or chain gauge strictly to workpiece weight. Wire ties MUST wrap <strong className="text-amber-300">min 4 full laps</strong>; chains require min 1 full loop & 2 notches. If chain slides, wrap loop & lock end with an <strong className="text-cyan-300">approved Anchor Shackle as a stopper</strong> — <strong className="text-rose-400 underline decoration-rose-500">NEVER substitute with tie wire</strong>. If chain length is insufficient, join rated chains with an <strong className="text-cyan-300">approved Anchor Shackle</strong> — <strong className="text-rose-400 underline decoration-rose-500">NEVER extend or splice chains with tie wire</strong>.
</div>

    {/* Quality Item 1 */}
    <div className="p-2.5 bg-cyan-950/30 border-l-2 border-l-cyan-500 rounded-r text-[11px] text-slate-300 leading-relaxed">
      <div className="flex items-center justify-between mb-0.5">
        <div className="font-bold text-cyan-300">💎 Quality: Minimizing Rigging Touch-Marks</div>
        <button 
          type="button"
          onClick={() => setShowClearanceLoopingModal(true)}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-cyan-950/80 border border-cyan-500/40 hover:border-cyan-400 rounded text-[10px] text-cyan-300 hover:text-cyan-100 transition-colors cursor-pointer shadow-sm shrink-0"
        >
          <span className="text-amber-400 text-[11px]">📐</span> Clearance Looping Guide
        </button>
      </div>
      Position wires and chains through existing bolt/mounting holes, non-critical visual surfaces, or secondary edges to minimize touch-mark repair after dipping. Utilize "Clearance Looping" for workpieces with natural mechanical constraints. Strictly distinguish this from rigid binding; do not use loose loops where tight wrapping is required to prevent hazardous shifting.
    </div>

    {/* Quality Item 2 */}
    <div className="p-2.5 bg-cyan-950/30 border-l-2 border-l-cyan-500 rounded-r text-[11px] text-slate-300 leading-relaxed">
      <div className="flex items-center justify-between mb-0.5">
        <div className="font-bold text-cyan-300">💎 Quality: Orientation & Workpiece Clearance</div>
        <button 
          type="button"
          onClick={() => setShowSocketSpigotModal(true)}
          className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-cyan-950/80 border border-cyan-500/40 hover:border-cyan-400 rounded text-[10px] text-cyan-300 hover:text-cyan-100 transition-colors cursor-pointer shadow-sm shrink-0"
        >
          <span className="text-amber-400 text-[11px]">📐</span> Socket/Spigot Guide
        </button>
      </div>
      Channel openings must face down/slanted to prevent acid pockets or air traps. For Socket & Spigot joints, hang with Spigot end high and Socket end low to prevent zinc buildup and fitment failure. Maintain ≥ 50mm clearance between adjacent workpieces to to prevent sticking, air pockets, and uneven zinc coverage. 
    </div>
  </div>

  {/* Modal 1: Socket & Spigot Guide */}
  {showSocketSpigotModal && (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm min-w-0">
            <span className="text-amber-400 shrink-0">📐</span>
            <span className="break-words">Socket & Spigot Galvanizing Racking Standards</span>
          </div>
          <button 
            type="button"
            onClick={() => setShowSocketSpigotModal(false)}
            className="shrink-0 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs transition-colors cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        {/* Modal Content / Diagram Section */}
        <div className="space-y-3 text-xs text-slate-300">
          <p className="leading-relaxed">
            To prevent excessive zinc accumulation (dross/runs) on the male/inserted portion, strictly control the hanging tilt angle:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Incorrect Orientation: Left High (Socket), Right Low (Spigot) */}
            <div className="p-3 bg-rose-950/20 border border-rose-800/60 rounded-lg space-y-2">
              <div className="font-bold text-rose-400 flex items-center gap-1.5">
                <span>✕</span> INCORRECT: Spigot End Low
              </div>
              <div className="bg-slate-950/80 p-3 rounded border border-rose-950 flex justify-center">
                <svg className="w-full h-24" viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Left High, Right Low (15deg) */}
                  <g transform="rotate(15 80 40)">
                    {/* Socket End (Left - Large Opening, High Point) */}
                    <rect x="20" y="30" width="15" height="20" rx="1" fill="#1e293b" stroke="#f43f5e" strokeWidth="1.5"/>
                    {/* Main Pipe Body */}
                    <rect x="35" y="33" width="80" height="14" fill="#0f172a" stroke="#f43f5e" strokeWidth="1.5"/>
                    {/* Spigot End (Right - Reduced Male Plug, Low Point) */}
                    <rect x="115" y="36" width="25" height="8" rx="1" fill="#f43f5e" fillOpacity="0.2" stroke="#f43f5e" strokeWidth="1.5"/>
                    {/* Zinc Dross Protrusion at Low Point */}
                    <circle cx="140" cy="44" r="3.5" fill="#f43f5e"/>
                    <path d="M138 44 Q140 49 141 46" stroke="#f43f5e" strokeWidth="1.5"/>
                  </g>
                </svg>
              </div>
              <div className="text-[10px] text-rose-300/80 leading-tight">
                Zinc drains toward the reduced spigot, creating heavy dross/protrusions and preventing fitment.
              </div>
            </div>

            {/* Correct Orientation: Left High (Spigot), Right Low (Socket) */}
            <div className="p-3 bg-cyan-950/20 border border-cyan-800/60 rounded-lg space-y-2">
              <div className="font-bold text-cyan-400 flex items-center gap-1.5">
                <span>✓</span> CORRECT: Socket End Low
              </div>
              <div className="bg-slate-950/80 p-3 rounded border border-cyan-950 flex justify-center">
                <svg className="w-full h-24" viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                  {/* Left High, Right Low (15deg) - Swapped Ends */}
                  <g transform="rotate(15 80 40)">
                    {/* Spigot End (Left - Reduced Male Plug, High Point) */}
                    <rect x="20" y="36" width="25" height="8" rx="1" fill="#1e293b" stroke="#22d3ee" strokeWidth="1.5"/>
                    {/* Main Pipe Body */}
                    <rect x="45" y="33" width="80" height="14" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.5"/>
                    {/* Socket End (Right - Large Opening, Low Point) */}
                    <rect x="125" y="30" width="15" height="20" rx="1" fill="#22d3ee" fillOpacity="0.2" stroke="#22d3ee" strokeWidth="1.5"/>
                    {/* Smooth Zinc Runoff Indicator */}
                    <path d="M140 50 Q142 54 144 58" stroke="#22d3ee" strokeWidth="1.2" strokeDasharray="2 2"/>
                  </g>
                </svg>
              </div>
              <div className="text-[10px] text-cyan-300/80 leading-tight">
                Zinc drains off the larger socket mouth, leaving the reduced spigot clean and smooth for assembly.
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex justify-end pt-2 border-t border-slate-800">
          <button 
            type="button"
            onClick={() => setShowSocketSpigotModal(false)}
            className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer"
          >
            Got It
          </button>
        </div>
      </div>
    </div>
  )}

{/* Modal 2: Clearance Looping vs. Rigid Binding Standards */}
{showClearanceLoopingModal && (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 overflow-y-auto">
    <div className="transform-gpu bg-slate-900 border border-cyan-500/30 rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4 max-h-[90vh] flex flex-col my-auto">
      {/* Modal Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3 shrink-0">
        <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm min-w-0">
          <span className="text-amber-400 shrink-0">📐</span>
          <span className="break-words">Rigging Standards: Clearance Looping vs. Rigid Binding</span>
        </div>
        <button 
          type="button"
          onClick={() => setShowClearanceLoopingModal(false)}
          className="transform-gpu shrink-0 relative z-10 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs transition-colors cursor-pointer"
        >
          ✕ Close
        </button>
      </div>

      {/* Modal Content */}
      <div className="space-y-3 text-xs text-slate-300 overflow-y-auto pr-1 grow">
        {/* Top Comparison: Same Constrained Workpiece */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Incorrect: Tight Rigid Binding on Constrained Workpiece */}
          <div className="p-3 bg-rose-950/20 border border-rose-800/60 rounded-lg space-y-2">
            <div className="font-bold text-rose-400 flex items-center gap-1.5">
              <span>✕</span> INCORRECT: Tight Rigid Binding on Constrained Workpieces
            </div>
            <div className="bg-slate-950/80 p-3 rounded border border-rose-950 flex justify-center">
              <svg className="w-full h-24" viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Constrained Workpiece Body */}
                <path d="M30 20 H65 C73 20 80 27 80 35 V45 C80 53 73 60 65 60 H30 C24 60 20 56 20 50 V30 C20 24 24 20 30 20 Z" fill="#0f172a" stroke="#f43f5e" strokeWidth="1.5"/>
                {/* Bolt Hole Constraint */}
                <circle cx="62" cy="40" r="10" fill="#020617" stroke="#f43f5e" strokeWidth="1.5"/>
                {/* Red Heat/Touch-Mark Damage Glow */}
                <circle cx="62" cy="40" r="14" fill="#f43f5e" fillOpacity="0.25"/>
                {/* Tight Wire Wrapping (Incorrect) */}
                <path d="M 140 36 H 72 C 67 36 62 33 62 30 C 62 27 67 24 72 24 L 140 24" stroke="#f43f5e" strokeWidth="2"/>
                <path d="M 80 20 V 44 M 86 20 V 44 M 92 20 V 44 M 98 20 V 44" stroke="#f43f5e" strokeWidth="2"/>
              </svg>
            </div>
            <div className="text-[10px] text-rose-300/80 leading-tight">
              Tight wrapping on workpieces with existing holes/constraints causes deep touch-marks, impedes zinc drainage, and risks wire snapping due to thermal expansion.
            </div>
          </div>

          {/* Correct: Clearance Looping on Constrained Workpiece */}
          <div className="p-3 bg-cyan-950/20 border border-cyan-800/60 rounded-lg space-y-2">
            <div className="font-bold text-cyan-400 flex items-center gap-1.5">
              <span>✓</span> CORRECT: Clearance Looping on Constrained Workpieces
            </div>
            <div className="bg-slate-950/80 p-3 rounded border border-cyan-950 flex justify-center">
              <svg className="w-full h-24" viewBox="0 0 160 80" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Constrained Workpiece Body */}
                <path d="M30 20 H65 C73 20 80 27 80 35 V45 C80 53 73 60 65 60 H30 C24 60 20 56 20 50 V30 C20 24 24 20 30 20 Z" fill="#0f172a" stroke="#22d3ee" strokeWidth="1.5"/>
                {/* Bolt Hole Constraint */}
                <circle cx="62" cy="40" r="10" fill="#020617" stroke="#22d3ee" strokeWidth="1.5"/>
                {/* Oversized Loose Loop (Clearance Looping) */}
                <path d="M 62 30 C 62 10 145 10 145 40 C 145 70 62 70 62 50" stroke="#22d3ee" strokeWidth="2" fill="none"/>
                {/* Single Minimal Contact Point */}
                <circle cx="62" cy="30" r="2.5" fill="#38bdf8"/>
              </svg>
            </div>
            <div className="text-[10px] text-cyan-300/80 leading-tight">
              Utilize Clearance Looping for workpieces with natural mechanical constraints. Large, loose loop minimizes contact area, ensures free drainage, and accommodates thermal movement.
            </div>
          </div>
        </div>

        {/* Bottom Warning: Mandatory Rigid Binding for Smooth Workpieces */}
        <div className="p-3 bg-amber-950/20 border border-amber-800/60 rounded-lg space-y-2">
          <div className="font-bold text-amber-400 flex items-center gap-1.5">
            <span>⚠️</span> CRITICAL SAFETY: Rigid Binding Requirement
          </div>
          <div className="bg-slate-950/80 p-2.5 rounded border border-amber-950 flex justify-center">
            <svg className="w-full h-14" viewBox="0 0 320 50" fill="none" xmlns="http://www.w3.org/2000/svg">
              {/* Smooth Shaft Workpiece (No Natural Constraints) */}
              <rect x="20" y="18" width="280" height="14" rx="3" fill="#0f172a" stroke="#94a3b8" strokeWidth="1.5"/>
              {/* Tight Wrapping (Mandatory Rigid Binding) */}
              <path d="M 130 14 V 36 M 136 14 V 36 M 142 14 V 36 M 148 14 V 36 M 154 14 V 36 M 160 14 V 36" stroke="#fbbf24" strokeWidth="2"/>
              <path d="M 20 25 H 130 M 160 25 H 300" stroke="#fbbf24" strokeWidth="1.5" strokeDasharray="3 2"/>
            </svg>
          </div>
          <div className="text-[10px] text-amber-300/80 leading-tight">
            NEVER use loose loops on smooth surfaces or workpieces without geometric constraints. Tight Rigid Binding is MANDATORY here to prevent hazardous shifting during dipping and draining.
          </div>
        </div>
      </div>

      {/* Modal Footer */}
      <div className="flex justify-end pt-2 border-t border-slate-800 shrink-0">
        <button 
          type="button"
          onClick={() => setShowClearanceLoopingModal(false)}
          className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold rounded text-xs transition-colors cursor-pointer"
        >
          Got It
        </button>
      </div>
    </div>
  </div>
)}
</div>

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
      <div>For single-opening/blind-end workpieces, if blind-end vent drilling is permitted, position the drilled blind end highest and the open end lowest as the main drain; otherwise, rig with differential slings to force a 35°–45° inclination with the open end facing down, orienting the opening so its highest edge vents air during immersion and its lowest corner drains zinc during withdrawal.</div>
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

{/* Quality Item: Corner-Down Tilt & Single Vertex Lowest Point */}
<div className="p-2.5 bg-cyan-950/30 border-l-2 border-l-cyan-500 rounded-r text-[11px] text-slate-300">
  <div className="flex items-center justify-between mb-0.5">
    <div className="font-bold text-cyan-300">💎 Quality: Corner-Down Tilt & Single Vertex Lowest Point</div>
    <button
      type="button"
      onClick={() => setShowUniqueLowPointGuide(true)}
      className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 bg-cyan-900/50 hover:bg-cyan-800 border border-cyan-500/40 px-2 py-0.5 rounded transition-colors"
    >
      <span>📐</span>
      <span className="underline decoration-cyan-400/50">Single-Point Guide</span>
    </button>
  </div>
  <div>
    Hang the workpiece with a diagonal/corner-down tilt. Ensure zinc drainage converges strictly to a single lowest corner vertex (one point) rather than an entire lower edge (line), minimizing zinc icicles and drips.
  </div>
</div>

{/* ================= MODAL: Single Vertex Lowest Point Guide ================= */}
{showUniqueLowPointGuide && (
  <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
    <div className="bg-slate-900 border border-cyan-500/30 rounded-xl max-w-2xl w-full p-4 space-y-4 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <h3 className="text-sm font-bold text-cyan-400">📐 Corner-Down Tilt (Correct) vs. Flat Bottom Edge (Incorrect)</h3>
        <button
          type="button"
          onClick={() => setShowUniqueLowPointGuide(false)}
          className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded bg-slate-800 transition-colors"
        >
          ✕ Close
        </button>
      </div>

      <div className="space-y-3 text-xs text-slate-300">
        <div className="w-full h-64 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-center p-2">
          <svg viewBox="0 0 560 200" className="w-full h-full">
            {/* Center Divider */}
            <line x1="280" y1="15" x2="280" y2="185" stroke="#334155" strokeWidth="1" strokeDasharray="4 4" />

            {/* ================= LEFT SIDE: CORRECT (Diamond / Corner-Down) ================= */}
            <g>
              {/* Beam */}
              <line x1="40" y1="25" x2="240" y2="25" stroke="#475569" strokeWidth="3" />
              <text x="140" y="17" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle" className="font-mono">Beam Rack</text>

              {/* Hanging Wires */}
              <line x1="140" y1="25" x2="140" y2="55" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
              {/* Diamond Plate */}
              <polygon points="140,55 190,105 140,155 90,105" fill="#1e293b" stroke="#38bdf8" strokeWidth="2.5" />

              {/* Single Lowest Corner Vertex Highlight */}
              <circle cx="140" cy="155" r="7" fill="none" stroke="#10b981" strokeWidth="2.5" />
              <circle cx="140" cy="155" r="3" fill="#10b981" />

              {/* Labels */}
              <text x="140" y="47" fill="#38bdf8" fontSize="10" fontWeight="bold" textAnchor="middle">Top Vent Corner ↑</text>
              <text x="140" y="178" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">✓ Correct: Corner-Down</text>
              <text x="140" y="192" fill="#94a3b8" fontSize="9" textAnchor="middle">Single lowest vertex = Clean run-off</text>
            </g>

            {/* ================= RIGHT SIDE: INCORRECT (Square / Flat Bottom) ================= */}
            <g>
              {/* Beam */}
              <line x1="320" y1="25" x2="520" y2="25" stroke="#475569" strokeWidth="3" />
              <text x="420" y="17" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle" className="font-mono">Beam Rack</text>

              {/* Hanging Wires */}
              <line x1="370" y1="25" x2="370" y2="65" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="470" y1="25" x2="470" y2="65" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3 3" />

              {/* Square Rect Plate */}
              <rect x="350" y="65" width="140" height="90" rx="2" fill="#1e293b" stroke="#f43f5e" strokeWidth="2.5" />

              {/* Bottom Edge Line Highlight (Error / Pooling) */}
              <line x1="350" y1="155" x2="490" y2="155" stroke="#f43f5e" strokeWidth="4" />

              {/* Labels */}
              <text x="420" y="55" fill="#94a3b8" fontSize="10" fontWeight="bold" textAnchor="middle">Horizontal Top Edge</text>
              <text x="420" y="178" fill="#f43f5e" fontSize="11" fontWeight="bold" textAnchor="middle">❌ Incorrect: Flat Bottom</text>
              <text x="420" y="192" fill="#94a3b8" fontSize="9" textAnchor="middle">Full edge line = Heavy zinc icicles</text>
            </g>
          </svg>
        </div>

        <div className="bg-slate-950 p-2.5 rounded border border-slate-800 text-[11px] space-y-1 text-slate-300">
          <div className="font-bold text-cyan-300 flex items-center gap-1">
            <span>💡</span> Industry Best Practice:
          </div>
          <div className="text-[10px] text-slate-400 leading-relaxed">
            1. <strong>Left (Correct - Corner-Down / Diamond)</strong>: Workpiece is tilted diagonally, ensuring zinc drainage converges strictly to a single lowest corner vertex for clean run-off.<br/>
            2. <strong>Right (Incorrect - Flat Bottom Edge)</strong>: Hanging with a flat horizontal bottom edge causes zinc to pool across the entire lower edge line, creating severe zinc icicles and coating defects.
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-slate-800 flex justify-end">
        <button
          type="button"
          onClick={() => setShowUniqueLowPointGuide(false)}
          className="bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold px-4 py-1.5 rounded text-xs transition-colors"
        >
          Got It
        </button>
      </div>
    </div>
  </div>
)}  
{/* Rigging Angle & Load Guide Modal */}
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
            Rigging Angle (&theta;) is measured between the wire/chain and the vertical line. Larger angles increase tension and reduce working load limit (WLL).
          </div>
          <div className="w-full h-56 bg-slate-900/90 rounded border border-slate-800/80 flex items-center justify-center p-2">
            <svg viewBox="0 0 320 150" className="w-full h-full">
              {/* Beam Rack */}
              <rect x="30" y="12" width="260" height="12" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
              <text x="160" y="21" fill="#94a3b8" fontSize="11" fontWeight="bold" textAnchor="middle" className="font-mono">
                Beam Rack
              </text>

              {/* Dotted Vertical Line (Without text) */}
              <line x1="100" y1="24" x2="100" y2="125" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />

              {/* Left Rigging Line */}
              <line x1="100" y1="24" x2="60" y2="105" stroke="#f43f5e" strokeWidth="2" />
              <circle cx="100" cy="24" r="3" fill="#f43f5e" />
              <circle cx="60" cy="105" r="3" fill="#f43f5e" />

              {/* Right Rigging Line (Extended to contact tilted workpiece) */}
              <line x1="220" y1="24" x2="260" y2="122" stroke="#f43f5e" strokeWidth="2" />
              <circle cx="220" cy="24" r="3" fill="#f43f5e" />
              <circle cx="260" cy="122" r="3" fill="#f43f5e" />

              {/* Rigging Angle Arc & Text */}
              <path d="M 100 65 A 41 41 0 0 0 81 60" fill="none" stroke="#f59e0b" strokeWidth="2" />
              <text x="82" y="76" fill="#f59e0b" fontSize="13" fontWeight="bold" className="font-mono">
                θ (Rigging Angle)
              </text>

              {/* Workpiece (Group rotated clockwise around center to tilt right side down) */}
              <g transform="rotate(5, 160, 114)">
                <rect x="40" y="105" width="240" height="18" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="160" y="118" fill="#38bdf8" fontSize="11" fontWeight="bold" textAnchor="middle">
                  Workpiece
                </text>
              </g>
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
          {/* 1. 水平参考线 (往左大幅延长至 x=30) */}
          <line x1="30" y1="105" x2="270" y2="105" stroke="#64748b" strokeWidth="1.5" strokeDasharray="4 4" />
          <text x="215" y="118" fill="#64748b" fontSize="9" fontWeight="500">Horizontal Level</text>

          {/* 2. 管体 (旋转 35°) */}
          <g transform="rotate(35 160 75)">
            {/* 管身中心轴线 */}
            <line x1="50" y1="75" x2="230" y2="75" stroke="#38bdf8" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
            <path d="M 60 50 L 220 50 L 220 100 L 60 100 Z" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
            <rect x="55" y="50" width="10" height="50" fill="#f43f5e" />
            <line x1="220" y1="50" x2="220" y2="100" stroke="#10b981" strokeWidth="3" strokeDasharray="3 3" />
          </g>

          {/* 3. 倾角弧线与 35°–45° 角度标注 (整体往左移动) */}
          <path d="M 129.2 105 A 30 30 0 0 0 134.6 87.8" fill="none" stroke="#facc15" strokeWidth="2" />
          <text x="82" y="93" fill="#facc15" fontSize="12" fontWeight="bold">35°–45°</text>

          {/* 4. 盲端与开口文字标注 */}
          <text x="60" y="18" fill="#f43f5e" fontSize="11" fontWeight="bold">Sealed Blind End (Top High)</text>
          <text x="200" y="130" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">Open Mouth</text>
          <text x="200" y="144" fill="#10b981" fontSize="11" fontWeight="bold" textAnchor="middle">(Lowest Point Drainage)</text>
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


  {/* STEP 5 */}
  <div className="p-3.5 bg-slate-900/80 border border-slate-800 rounded-lg space-y-2.5">
    <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
      <span className="text-xs font-bold text-cyan-400 flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-bold text-slate-950">5</span>
        STEP 5: System Verification & Handoff
      </span>
      <span className="text-[10px] text-slate-400 font-mono">Sign-off form & release to pickling</span>
    </div>
    <div className="space-y-2 text-xs">
      {/* Safety Item */}
      <div className="p-2.5 bg-rose-950/30 border-l-2 border-l-rose-500 rounded-r text-[11px] text-slate-300">
        <div className="font-bold text-rose-300 mb-0.5">🛡️ Safety: Center of Gravity Balance</div>
        Perform 10cm test-lift to verify center of gravity. Ensure zero unexpected tilting or slippage during overhead crane movement.
      </div>
      {/* Quality Item 1 */}
      <div className="p-2.5 bg-cyan-950/30 border-l-2 border-l-cyan-500 rounded-r text-[11px] text-slate-300">
        <div className="font-bold text-cyan-300 mb-0.5">💎 Quality: Digital Form Sign-Off & Release</div>
        Complete digital form sign-off to push load record to system and release rack to pre-treatment/pickling station.
      </div>
    </div>
  </div>

</div>
        {/* 1. RACK & LOAD ID BOX */}
        <div className="bg-slate-950 p-5 rounded-xl border border-cyan-800/60 relative">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 rounded-l-xl"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="relative">
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase mb-1">
                Rack # <span className="text-rose-400">*</span>
                <button
                  type="button"
                  onClick={() => setShowRackHelp(v => !v)}
                  className="w-4 h-4 rounded-full bg-slate-800 border border-slate-600 text-cyan-300 text-[10px] font-bold flex items-center justify-center hover:bg-slate-700 normal-case"
                  aria-label="Rack # help"
                >
                  ?
                </button>
              </label>

              {showRackHelp && (
                <div className="absolute z-20 top-full left-0 mt-1 w-72 bg-slate-950 border border-cyan-800 rounded-lg shadow-2xl p-3 text-[11px] text-slate-300 normal-case">
                  <button
                    type="button"
                    onClick={() => setShowRackHelp(false)}
                    className="absolute top-1.5 right-2 text-slate-500 hover:text-slate-300 text-xs"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                  <p>
                    Select the assigned beam rack number (#01-99), or choose "No Rack" if handling directly by crane.
                  </p>
                  <div className="mt-2 pt-2 border-t border-slate-800">
                    <p className="text-amber-300/90">
                      Physically empty, but its number won't select above? That means someone forgot to release it after Unloading.
                    </p>
                    <button
                      type="button"
                      onClick={openReleaseModal}
                      className="mt-1.5 text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-2"
                    >
                      🔓 Release a stuck Rack # now
                    </button>
                  </div>
                </div>
              )}

              <select
                value={rackNo}
                onChange={(e) => handleRackSelect(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-cyan-300 font-mono font-bold text-base focus:outline-none focus:border-cyan-400"
                required
              >
                <option value="">-- Select Rack # --</option>
                {RACK_OPTIONS.map((opt) => {
                  const isOccupied = opt.value !== NO_RACK_VALUE && occupiedRacks.has(opt.value);
                  return (
                    <option key={opt.value} value={opt.value} disabled={isOccupied}>
                      {opt.label}{isOccupied ? ' (In Use)' : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="relative">
              <div className="flex justify-between items-center mb-1">
                <label className="flex items-center gap-1.5 text-xs font-bold text-slate-300 uppercase">
                  Load ID <span className="text-rose-400">*</span>
                  <button
                    type="button"
                    onClick={() => setShowLoadIdHelp(v => !v)}
                    className="w-4 h-4 rounded-full bg-slate-800 border border-slate-600 text-cyan-300 text-[10px] font-bold flex items-center justify-center hover:bg-slate-700 normal-case"
                    aria-label="Load ID help"
                  >
                    ?
                  </button>
                </label>
                {autoLoadId && loadId !== autoLoadId && (
                  <button
                    type="button"
                    onClick={handleResetLoadId}
                    className="text-[10px] text-cyan-400 hover:underline uppercase font-bold"
                  >
                    Reset Auto ID
                  </button>
                )}
              </div>

              {showLoadIdHelp && (
                <div className="absolute z-20 top-full left-0 mt-1 w-72 bg-slate-950 border border-cyan-800 rounded-lg shadow-2xl p-3 text-[11px] text-slate-300 normal-case font-normal">
                  <button
                    type="button"
                    onClick={() => setShowLoadIdHelp(false)}
                    className="absolute top-1.5 right-2 text-slate-500 hover:text-slate-300 text-xs"
                    aria-label="Close"
                  >
                    ✕
                  </button>
                  <p>
                    Unique identifier for this load, auto-generated based on date, sequence, and rack fixture.
                  </p>
                </div>
              )}

              <input
                type="text"
                placeholder={
                  isGeneratingLoadId 
                    ? "Generating Load ID..." 
                    : rackNo 
                    ? "Enter custom ID" 
                    : "Select Rack # first..."
                }
                value={loadId}
                onChange={(e) => setLoadId(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-cyan-300 font-mono font-bold text-base focus:outline-none focus:border-cyan-400"
                required
              />
              <span className="text-[10px] text-slate-500 block mt-1">
                Auto-generated. Editable if needed.
              </span>
            </div>
          </div>

          {/* Rack Fixture Type - Hook Rack is a permanently-mounted fixture on top
              of a numbered Beam Rack, not a substitute for selecting one. Not
              applicable to "No Rack" (crane direct, no rack occupied). Comb Rack
              is NOT here - it's a per-workpiece attribute now (see the "Railing
              Comb Rack" checkbox on each workpiece line below), since a single
              rack can have one Job on a comb rack and other Jobs hung normally. */}
          {rackNo && rackNo !== NO_RACK_VALUE && (
            <div className="mt-4 pt-4 border-t border-slate-800/80">
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Rack Fixture
              </label>
              <div className="flex flex-wrap gap-2">
                {RACK_FIXTURE_OPTIONS.map((opt) => {
                  const isActive = rackFixtureType === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleFixtureTypeSelect(opt.value)}
                      className={`px-3 py-2 rounded-lg text-xs font-bold uppercase border transition-colors ${
                        isActive
                          ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                          : 'bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
              <span className="text-[10px] text-slate-500 block mt-1">
                Select if this rack has a permanently-mounted Hook Rack fixture on it.
              </span>
            </div>
          )}

          {/* Rack Support Frame Capacity Gauge - live total across every Job/Workpiece on this Load */}
          {(() => {
            const pct = Math.min(100, (rackTotalWeight / RACK_LIMIT_LBS) * 100);
            const isOver = rackTotalWeight > RACK_LIMIT_LBS;
            const isWarn = !isOver && pct >= 70;
            const barColor = isOver ? 'bg-rose-500' : isWarn ? 'bg-amber-500' : 'bg-emerald-500';
            const textColor = isOver ? 'text-rose-300' : isWarn ? 'text-amber-300' : 'text-emerald-300';
            return (
              <div className="mt-4 pt-3 border-t border-slate-800/80">
                <div className="flex justify-between items-center mb-1">
              <div className="relative inline-flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  ⚖️ Rack Support Frame Load
                </span>
                <button
                  type="button"
                  onClick={() => setShowRackLoadHelp(v => !v)}
                  className="w-3.5 h-3.5 rounded-full bg-slate-800 border border-slate-600 text-cyan-300 text-[9px] font-bold flex items-center justify-center hover:bg-slate-700 normal-case"
                  aria-label="Rack Support Frame Load help"
                >
                  ?
                </button>

                {showRackLoadHelp && (
                  <div className="absolute z-20 top-full left-0 mt-1 w-64 bg-slate-950 border border-cyan-800 rounded-lg shadow-2xl p-3 text-[11px] text-slate-300 normal-case font-normal">
                    <button
                      type="button"
                      onClick={() => setShowRackLoadHelp(false)}
                      className="absolute top-1.5 right-2 text-slate-500 hover:text-slate-300 text-xs"
                      aria-label="Close"
                    >
                      ✕
                    </button>
                    <p>
                      The 8,000 lb usable limit is derived from the dual-side support frame (6,750 lb/side rating) minus Beam Rack tare weight (3,990 lb) and applying an 85% safety factor.
                    </p>
                  </div>
                )}
              </div>
                  <span className={`text-xs font-mono font-bold ${textColor}`}>
                    {Math.round(rackTotalWeight).toLocaleString()} / {RACK_LIMIT_LBS.toLocaleString()} lb
                  </span>
                </div>
                <div className="w-full h-2 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                  <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
                </div>
                {isOver && (
                  <p className="text-[10px] text-rose-400 font-semibold mt-1">
                    🚨 Over the rack's usable load capacity of {RACK_LIMIT_LBS.toLocaleString()} lb ({SUPPORT_FRAME_CAPACITY_LBS.toLocaleString()} lb/side support frame, net of beam self-weight & safety factor) - submission blocked until reduced.
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        {/* 2. JOB BREAKDOWN SECTION */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Loaded Material Breakdown ({jobs.length} {jobs.length === 1 ? 'Job' : 'Jobs'})
            </span>
            <button
              type="button"
              onClick={addJobRow}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold rounded-lg border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
            >
              + Add Another Customer Job
            </button>
          </div>

          {jobs.map((job, jobIndex) => (
            <div key={job.id} className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
              
              <div className="flex justify-between items-center pb-2 border-b border-slate-800/60">
                <span className="text-xs font-bold text-cyan-400 font-mono uppercase tracking-wider">
                  Job #{jobIndex + 1}
                </span>
                {jobs.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeJobRow(jobIndex)}
                    className="text-xs text-rose-400 hover:text-rose-300 font-bold"
                  >
                    Remove Job
                  </button>
                )}
              </div>

              {/* Basic Job Info */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Customer Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ABC Steel / West Coast Fab"
                    value={job.customerName}
                    onChange={(e) => handleJobFieldChange(jobIndex, 'customerName', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Customer Order # <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    pattern="\d*"
                    maxLength={10}
                    placeholder="e.g. 102384"
                    value={job.customerOrderNo}
                    onChange={(e) => handleJobFieldChange(jobIndex, 'customerOrderNo', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1">
                    Customer Batch # <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. #5, If first batch enter #1"
                    value={job.customerBatchNo}
                    onChange={(e) => handleJobFieldChange(jobIndex, 'customerBatchNo', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-500"
                    required
                  />
                </div>
<div>
    <label className="block text-xs text-slate-400 mb-1">Priority</label>
    <button
      type="button"
      onClick={() => handleJobFieldChange(jobIndex, 'isRush', !job.isRush)}
      className={`w-full py-2 px-3 text-xs font-bold rounded-lg border transition-all flex items-center justify-between ${
        job.isRush 
          ? 'bg-rose-600/20 border-rose-500 text-rose-400 shadow-lg shadow-rose-900/20' 
          : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700'
      }`}
    >
      <span className="flex items-center gap-1">⚡ RUSH ORDER</span>
      <span className={`px-2 py-0.5 rounded text-[10px] ${job.isRush ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-500'}`}>
        {job.isRush ? 'YES' : 'NO'}
      </span>
    </button>
  </div>              
              </div>

              {/* Note: Surface Assessment (Oil, Paint & Rust Level) is captured once globally
                  (Min/Max Oil-Paint & Rust selects), shown near the Safety Checklist below -
                  not per Job or per Workpiece. */}

              {/* Dynamic Workpiece Lines */}
              <div className="pt-2 space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Workpiece Items on this Job
                  </span>
                  <button
                    type="button"
                    onClick={() => addWorkpieceRow(jobIndex)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    + Add Workpiece Line
                  </button>
                </div>

                {job.workpieces.map((wp, wpIndex) => {
                  const { totalW, unitW } = getWorkpieceTotalWeight(wp);
                  const linePrefix = `Job #${jobIndex + 1} Line #${wpIndex + 1}`;
                  const lineDeficiencies = deficiencies.filter(d => d.startsWith(linePrefix));

                  return (
                    <div key={wp.id} className="bg-slate-900/60 p-3.5 rounded-lg border border-slate-800 space-y-3 relative">
                      
                      {/* Top Bar: Basic Workpiece Info */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        <div className="md:col-span-1">
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Workpiece Type <span className="text-rose-400">*</span>
                          </label>
                          <select
                            value={wp.workpieceType}
                            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'workpieceType', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
                            required
                          >
                            <option value="">-- Select --</option>
                            {WORKPIECE_TYPES.map((type) => (
                              <option key={type} value={type}>{type}</option>
                            ))}
                          </select>
                          {wp.workpieceType === 'Others' && (
                            <input
                              type="text"
                              value={wp.workpieceTypeOther}
                              onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'workpieceTypeOther', e.target.value)}
                              placeholder="if other please specify."
                              className="mt-1.5 w-full bg-slate-900 border border-cyan-700/60 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                              required
                            />
                          )}
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">
                            Qty <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={wp.quantity}
                            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'quantity', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Unit</label>
                          <select
                            value={wp.unit}
                            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'unit', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500 font-mono"
                          >
                            {QTY_UNITS.map((u) => (
                              <option key={u.value} value={u.value}>{u.label}</option>
                            ))}
                          </select>
                        </div>

                        <div className="relative">
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[11px] text-slate-400">
                              {wp.isUniformWeight === false ? 'Weight Bracket' : (wp.weightInputMode === 'PER_UNIT' ? 'Unit Weight (lb)' : 'Total Weight (lb)')}
                            </label>
                            <span className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleWorkpieceChange(jobIndex, wpIndex, 'isUniformWeight', wp.isUniformWeight === false)}
                                className="text-[9px] font-bold flex items-center gap-0.5"
                                title="Are all pieces on this line the same weight?"
                              >
                                <span className={wp.isUniformWeight === false ? 'text-slate-500' : 'text-amber-300'}>Identical</span>
                                <span className="text-slate-600 px-0.5 normal-case">or</span>
                                <span className={wp.isUniformWeight === false ? 'text-amber-300' : 'text-slate-500'}>Varied</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveInlineHelp(v => v === `uniform-${jobIndex}-${wpIndex}` ? null : `uniform-${jobIndex}-${wpIndex}`)}
                                className="w-3.5 h-3.5 shrink-0 rounded-full bg-slate-800 border border-slate-600 text-cyan-300 text-[9px] font-bold flex items-center justify-center hover:bg-slate-700"
                                aria-label="Identical vs Varied weight help"
                              >
                                ?
                              </button>
                            </span>
                          </div>

                          {activeInlineHelp === `uniform-${jobIndex}-${wpIndex}` && (
                            <div className="absolute z-20 top-full right-0 mt-1 w-64 bg-slate-950 border border-cyan-800 rounded-lg shadow-2xl p-3 text-[11px] text-slate-300 normal-case font-normal">
                              <button
                                type="button"
                                onClick={() => setActiveInlineHelp(null)}
                                className="absolute top-1.5 right-2 text-slate-500 hover:text-slate-300 text-xs"
                                aria-label="Close"
                              >
                                ✕
                              </button>
                              <p>
                                <strong className="text-slate-200">Identical</strong>: all pieces on this line weigh the same — enter one weight (total or per-piece) and the app converts using Qty.
                              </p>
                              <p className="mt-1.5">
                                <strong className="text-slate-200">Varied</strong>: pieces differ in weight but are still similar overall — enter the real scale total (for the Rack Support Frame Load check), and pick the heaviest single piece's weight bracket separately (rigging must be sized for the heaviest piece, not the average). This only works for a modest spread — e.g. one piece needing 5 wires, another needing 3 is fine. If the spread is wide — e.g. 5 wires vs. 1 — split them into separate workpiece lines instead.
                              </p>
                            </div>
                          )}

{wp.isUniformWeight === false ? (
  <div className="flex flex-col gap-1.5">
    <div>
      <label className="block text-[9px] text-slate-500 mb-0.5">Total Weight (scale, lb) *</label>
      <input
        type="number"
        min="0"
        placeholder="e.g. 2100"
        value={wp.variedTotalWeightInput || ''}
        onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'variedTotalWeightInput', e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        required
      />
    </div>
    <div>
      <label className="block text-[9px] text-slate-500 mb-0.5">Heaviest Piece Bracket *</label>
      <select
        value={wp.weightBracketId || ''}
        onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'weightBracketId', e.target.value)}
        className="w-full bg-slate-900 border border-amber-700/60 rounded-lg px-2 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
        required
      >
        <option value="">-- Select Weight Range --</option>
        {(wp.hangingPoints === '2' ? WIRE_BRACKETS_DOUBLE : WIRE_BRACKETS_SINGLE).map(b => (
          <option key={b.maxLb} value={b.maxLb}>
            {b.minLb}-{b.maxLb} lb
          </option>
        ))}
      </select>
    </div>
  </div>
                          ) : (
                            <div className="relative flex gap-1">
                              <input
                                type="number"
                                placeholder={wp.weightInputMode === 'PER_UNIT' ? 'Unit lbs' : 'Total lbs'}
                                value={wp.weightInputMode === 'PER_UNIT' ? (wp.unitWeightInput || '') : wp.weightLb}
                                onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, wp.weightInputMode === 'PER_UNIT' ? 'unitWeightInput' : 'weightLb', e.target.value)}
                                className="flex-1 w-full min-w-0 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                type="button"
                                onClick={() => handleWorkpieceChange(jobIndex, wpIndex, 'weightInputMode', wp.weightInputMode === 'PER_UNIT' ? 'TOTAL' : 'PER_UNIT')}
                                className="shrink-0 px-1.5 rounded border border-slate-700 text-[9px] font-bold flex items-center gap-0.5"
                                title="Switch between total weight and per-unit weight entry"
                              >
                                <span className={wp.weightInputMode === 'PER_UNIT' ? 'text-slate-500' : 'text-amber-300'}>Total</span>
                                <span className="text-slate-600 px-0.5 normal-case">or</span>
                                <span className={wp.weightInputMode === 'PER_UNIT' ? 'text-amber-300' : 'text-slate-500'}>Unit</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveInlineHelp(v => v === `weightmode-${jobIndex}-${wpIndex}` ? null : `weightmode-${jobIndex}-${wpIndex}`)}
                                className="w-3.5 h-3.5 shrink-0 self-center rounded-full bg-slate-800 border border-slate-600 text-cyan-300 text-[9px] font-bold flex items-center justify-center hover:bg-slate-700"
                                aria-label="Total vs Unit weight help"
                              >
                                ?
                              </button>

                              {activeInlineHelp === `weightmode-${jobIndex}-${wpIndex}` && (
                                <div className="absolute z-20 top-full right-0 mt-1 w-64 bg-slate-950 border border-cyan-800 rounded-lg shadow-2xl p-3 text-[11px] text-slate-300 normal-case font-normal">
                                  <button
                                    type="button"
                                    onClick={() => setActiveInlineHelp(null)}
                                    className="absolute top-1.5 right-2 text-slate-500 hover:text-slate-300 text-xs"
                                    aria-label="Close"
                                  >
                                    ✕
                                  </button>
                                  <p>
                                    Switches whether you type the <strong className="text-slate-200">combined weight</strong> of all {wp.quantity || 'N'} pieces on this line, or the weight of <strong className="text-slate-200">one piece</strong>. The app converts between them automatically using Qty.
                                  </p>
                                </div>
                              )}
                            </div>
                          )}

                          {wp.isUniformWeight !== false && unitW > 0 && (
                            <span className="text-[10px] text-cyan-400 font-mono font-bold block mt-0.5">
                              {wp.weightInputMode === 'PER_UNIT' ? `= ${Math.round(totalW)} lb total` : `${Math.round(unitW)} lb/pc`}
                            </span>
                          )}
                        </div>
{job.workpieces.length > 1 && (
  <button
    type="button"
    onClick={() => removeWorkpieceRow(jobIndex, wpIndex)}
    className="absolute -top-2 -right-2 w-5 h-5 flex items-center justify-center rounded-full bg-slate-800 border border-slate-600 text-xs text-rose-400 hover:text-rose-300 hover:border-rose-500 font-bold z-10"
    title="Delete line"
  >
    ×
  </button>
)}
                      </div>

{/* Rigging & Hanging Setup for THIS Workpiece */}
<div className="pt-2.5 border-t border-slate-800/80 bg-slate-950/40 p-3 rounded-lg space-y-3">

  {/* Railing Comb Rack: only one custom-fixture type remains, so it's a
      checkbox rather than a dropdown. Checking it swaps the whole line into
      a dedicated multi-point hanging model instead of the normal 1/2-point
      Wire/Chain flow - so the Wire/Chain toggle button is gone too. */}
  <label className="flex items-center gap-2 cursor-pointer select-none">
    <input
      type="checkbox"
      checked={!!wp.useRailingCombRack}
      onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'useRailingCombRack', e.target.checked)}
      className="w-3.5 h-3.5 accent-cyan-500"
    />
    <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wide">
      🧱 Use Comb Rack
    </span>
  </label>

  {wp.useRailingCombRack ? (
    <div className="space-y-2.5 pt-1">
      <p className="text-[10px] text-slate-500">
        Used in pairs by default - enter how many comb racks are in use and how many hanging points each one has.
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5"># of Comb Racks *</label>
          <input
            type="number"
            min={COMB_MIN_RACK_COUNT}
            step="1"
            placeholder={COMB_DEFAULT_RACK_COUNT}
            value={wp.combRackCount || ''}
            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'combRackCount', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-cyan-300 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            required
          />
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">Hanging Points per Rack *</label>
          <input
            type="number"
            min={COMB_MIN_POINTS_PER_RACK}
            step="1"
            placeholder={COMB_DEFAULT_POINTS_PER_RACK}
            value={wp.combPointsPerRack || ''}
            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'combPointsPerRack', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-cyan-300 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            required
          />
        </div>
      </div>

      <p className="text-[10px] text-slate-500">
        Total hanging points: <span className="text-cyan-300 font-mono font-bold">
          {(Math.max(COMB_MIN_RACK_COUNT, parseInt(wp.combRackCount, 10) || 0)) * (Math.max(COMB_MIN_POINTS_PER_RACK, parseInt(wp.combPointsPerRack, 10) || 0))}
        </span>
      </p>

      <div className="grid grid-cols-1 gap-2">
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">Rigging Medium *</label>
          <div className="inline-flex bg-slate-900 p-0.5 rounded border border-slate-800 w-full">
            <button
              type="button"
              onClick={() => handleWorkpieceChange(jobIndex, wpIndex, 'combMediumType', 'CHAIN')}
              className={`flex-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                wp.combMediumType !== 'WIRE' ? 'bg-cyan-600 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Chain
            </button>
            <button
              type="button"
              onClick={() => handleWorkpieceChange(jobIndex, wpIndex, 'combMediumType', 'WIRE')}
              className={`flex-1 px-2 py-1 rounded text-[10px] font-bold transition-all ${
                wp.combMediumType === 'WIRE' ? 'bg-cyan-600 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Wire
            </button>
          </div>
        </div>
      </div>

      <div className={`grid ${wp.combMediumType === 'WIRE' ? 'grid-cols-2' : 'grid-cols-1'} gap-2 bg-slate-900/80 p-2 rounded border border-slate-800`}>
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">
            {wp.combMediumType === 'WIRE' ? 'Wire Spec *' : 'Chain Spec *'}
          </label>
          <select
            value={wp.combSpecId || ''}
            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'combSpecId', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100"
            required
          >
            <option value="">{wp.combMediumType === 'WIRE' ? 'Select Wire...' : 'Select Chain...'}</option>
            {RIGGING_SPECS.filter(r => r.type === wp.combMediumType).map(r => (
              <option key={r.id} value={r.id}>{r.label} ({r.swl.toLocaleString()} lb WLL)</option>
            ))}
          </select>
        </div>
        {wp.combMediumType === 'WIRE' && (
          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">Strands per Point *</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 2"
              value={wp.combStrands || ''}
              onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'combStrands', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-cyan-300 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              required
            />
          </div>
        )}
      </div>

      {wp.combMediumType === 'WIRE' && (
        <p className="text-[10px] text-slate-600">
          Note: strand count here uses a generic SWL calc (75 lb/strand), not certified data.
        </p>
      )}

      {lineDeficiencies.length > 0 && criticalViolations.length === 0 && (
        <div className="p-3 bg-amber-950/70 border border-amber-800 rounded-lg text-amber-200 text-xs space-y-1">
          <div className="font-bold text-amber-300 flex items-center gap-1.5">
            ⚠️ NOTICE: Insufficient Rigging Load Capacity
          </div>
          <p className="text-[11px] text-amber-200/90">
          One or more attachment points do not meet the minimum load safety requirement. Please increase wire strand count or switch to a higher-rated chain.
          </p>
          <ul className="list-disc list-inside text-[10px] space-y-0.5 text-amber-200/80 mt-1">
            {lineDeficiencies.map((detail, idx) => (
              <li key={idx}>{detail.replace(`${linePrefix}: `, '')}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  ) : (
    <>
  {/* Top Mode Selection */}
  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-2 border-b border-slate-800/60">
    <span className="text-[11px] font-bold text-cyan-400 flex items-center gap-1">
      ⚙️ Hanging & Rigging for {wp.workpieceType || `Line #${wpIndex + 1}`}
    </span>

    <div className="flex flex-wrap items-center gap-3">
      {/* Hanging Mode Toggle */}
      <div className="inline-flex bg-slate-900 p-0.5 rounded border border-slate-800">
        <button
          type="button"
          onClick={() => handleWorkpieceChange(jobIndex, wpIndex, 'hangingMode', 'INDIVIDUAL')}
          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
            wp.hangingMode !== 'STRING'
              ? 'bg-cyan-600 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          🎯 Individual Hanging
        </button>
        <button
          type="button"
          onClick={() => handleWorkpieceChange(jobIndex, wpIndex, 'hangingMode', 'STRING')}
          className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
            wp.hangingMode === 'STRING'
              ? 'bg-cyan-600 text-slate-950 shadow'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          ⛓️ String Hanging
        </button>
      </div>

      {/* Hanging Points Toggle */}
      <div className="flex gap-1">
        <button
          type="button"
          onClick={() => handleWorkpieceChange(jobIndex, wpIndex, 'hangingPoints', '1')}
          className={`px-2 py-1 rounded text-[10px] font-bold border ${
            wp.hangingPoints === '1'
              ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
        >
          📍 1 Point
        </button>
        <button
          type="button"
          onClick={() => handleWorkpieceChange(jobIndex, wpIndex, 'hangingPoints', '2')}
          className={`px-2 py-1 rounded text-[10px] font-bold border ${
            wp.hangingPoints === '2'
              ? 'bg-cyan-950 border-cyan-500 text-cyan-300'
              : 'bg-slate-900 border-slate-800 text-slate-500'
          }`}
        >
          📍📍 2 Points
        </button>
      </div>
    </div>
  </div>

  {wp.hangingMode === 'STRING' && (
    <div className="text-[10px] text-amber-300/90 bg-amber-950/40 border border-amber-900/60 px-2 py-1 rounded">
      💡 <strong>String Mode Active:</strong> All {wp.quantity || 'N'} pcs are chained together; total weight is loaded onto the top rigging points.
    </div>
  )}

  {/* 1. Stringing Method dynamic switcher */}
  <div className="space-y-1.5 pt-1">
    <label className="block text-[10px] font-semibold text-slate-300 uppercase tracking-wide">
      Stringing Method
    </label>
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
      {[
        { id: 'FULL_CHAIN', label: 'Full Chain', desc: 'High Safety' },
        { id: 'CHAIN_WIRE', label: 'Chain + Wire', desc: 'Wire ties each piece to one chain' },
        { id: 'PURE_WIRE', label: 'Pure Wire', desc: 'Weight Limited' },
      ].map((method) => {
        const isSelected = (wp.stringingMethod || 'FULL_CHAIN') === method.id;
        return (
          <button
            key={method.id}
            type="button"
        onClick={() => handleStringingMethodChange(jobIndex, wpIndex, method.id)}
            className={`p-2 rounded border text-left transition-all ${
              isSelected
                ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/50'
                : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <div className="text-[11px] font-bold">{method.label}</div>
            <div className="text-[9px] opacity-75">{method.desc}</div>
          </button>
        );
      })}
    </div>

    {wp.stringingMethod === 'PURE_WIRE' && (
      <div className="p-2 rounded bg-amber-950/40 border border-amber-500/50 text-amber-200 text-[10px] flex items-start gap-2">
        <span>⚠️</span>
        <div>
          <strong className="font-semibold">Full Cumulative Load Calculation Enabled:</strong>
          Pure wire loses tensile strength faster in high-temp zinc — the system has automatically lowered the safety margin!
        </div>
      </div>
    )}

    {lineDeficiencies.length > 0 && criticalViolations.length === 0 && (
      <div className="p-3 bg-amber-950/70 border border-amber-800 rounded-lg text-amber-200 text-xs space-y-1">
        <div className="font-bold text-amber-300 flex items-center gap-1.5">
          ⚠️ NOTICE: Insufficient Rigging Load Capacity
        </div>
        <p className="text-[11px] text-amber-200/90">
        One or more attachment points do not meet the minimum load safety requirement. Please increase wire strand count or switch to a higher-rated chain.
        </p>
        <ul className="list-disc list-inside text-[10px] space-y-0.5 text-amber-200/80 mt-1">
          {lineDeficiencies.map((detail, idx) => (
            <li key={idx}>{detail.replace(`${linePrefix}: `, '')}</li>
          ))}
        </ul>
      </div>
    )}
  </div>
{/* Spec & Strands Inputs */}
{(wp.stringingMethod || 'FULL_CHAIN') === 'CHAIN_WIRE' ? (
  <div className="space-y-2.5 pt-1">
    {/* Main Backbone Chain — 主链，字段名 point1SpecId/point1Strands 不变，走原有复核逻辑 */}
    <div className="bg-slate-900/90 p-2.5 rounded border border-cyan-900/50 space-y-2">
      <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
        <span>🔗</span> Main Backbone Chain
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">
            {wp.hangingPoints === '2' ? 'Point 1 Chain Spec *' : 'Chain Spec *'}
          </label>
          <select
            value={wp.point1SpecId || ''}
            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point1SpecId', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100"
            required
          >
            <option value="">Select Chain...</option>
            {RIGGING_SPECS.filter(r => (r.type || '').toUpperCase() === 'CHAIN').map(r => (
              <option key={r.id} value={r.id}>{r.label} ({r.swl.toLocaleString()} lb WLL)</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">Strands / Lines *</label>
          <input
            type="number"
            min="1"
            placeholder="e.g. 1"
            value={wp.point1Strands || ''}
            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point1Strands', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-cyan-300 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            required
          />
        </div>
      </div>

      {wp.hangingPoints === '2' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">Point 2 Chain Spec *</label>
            <select
              value={wp.point2SpecId || ''}
              onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point2SpecId', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100"
              required
            >
              <option value="">Select Chain...</option>
              {RIGGING_SPECS.filter(r => (r.type || '').toUpperCase() === 'CHAIN').map(r => (
                <option key={r.id} value={r.id}>{r.label} ({r.swl.toLocaleString()} lb WLL)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">Strands / Lines *</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 1"
              value={wp.point2Strands || ''}
              onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point2Strands', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-cyan-300 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              required
            />
          </div>
        </div>
      )}
    </div>

    {/* Piece Tie Wire — 绑丝，2 个悬挂点时拆成 Point 1 / Point 2 两组字段，
        跟 Main Backbone Chain 的结构保持一致，配合 checkPoint 分别复核 */}
    <div className="bg-slate-900/90 p-2.5 rounded border border-amber-900/50 space-y-2">
      <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
        <span>🪢</span> Piece Tie Wire
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">
            {wp.hangingPoints === '2' ? 'Point 1 Tie Wire Spec *' : 'Tie Wire Spec *'}
          </label>
          <select
            value={wp.tieWireSpecId || ''}
            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'tieWireSpecId', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100"
            required
          >
            <option value="">Select Wire...</option>
            {RIGGING_SPECS.filter(r => (r.type || '').toUpperCase() === 'WIRE').map(r => (
              <option key={r.id} value={r.id}>{r.label} ({r.swl.toLocaleString()} lb WLL)</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">
            {wp.hangingPoints === '2' ? 'Wires at Point 1 *' : 'Wires per Piece *'}
          </label>
          <input
            type="number"
            min="1"
            placeholder="e.g. 2"
            value={wp.tieWireStrands || ''}
            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'tieWireStrands', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-amber-300 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            required
          />
        </div>
      </div>

      {wp.hangingPoints === '2' && (
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">Point 2 Tie Wire Spec *</label>
            <select
              value={wp.tieWireSpecId2 || ''}
              onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'tieWireSpecId2', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100"
              required
            >
              <option value="">Select Wire...</option>
              {RIGGING_SPECS.filter(r => (r.type || '').toUpperCase() === 'WIRE').map(r => (
                <option key={r.id} value={r.id}>{r.label} ({r.swl.toLocaleString()} lb WLL)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] text-slate-400 mb-0.5">Wires at Point 2 *</label>
            <input
              type="number"
              min="1"
              placeholder="e.g. 2"
              value={wp.tieWireStrands2 || ''}
              onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'tieWireStrands2', e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-amber-300 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              required
            />
          </div>
        </div>
      )}
    </div>
  </div>

) : (wp.stringingMethod || 'FULL_CHAIN') === 'FULL_CHAIN' ? (
  /* FULL_CHAIN 模式：只显示 Chain，字段名不变，原有复核不受影响 */
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
    <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2 rounded border border-slate-800">
      <div>
        <label className="block text-[10px] text-slate-400 mb-0.5">
          {wp.hangingPoints === '2' ? 'Point 1 Chain Spec *' : 'Chain Spec *'}
        </label>
        <select
          value={wp.point1SpecId || ''}
          onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point1SpecId', e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100"
          required
        >
          <option value="">Select Chain...</option>
          {RIGGING_SPECS.filter(r => (r.type || '').toUpperCase() === 'CHAIN').map(r => (
            <option key={r.id} value={r.id}>{r.label} ({r.swl.toLocaleString()} lb WLL)</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-slate-400 mb-0.5">Strands / Lines *</label>
        <input
          type="number"
          min="1"
          placeholder="e.g. 1"
          value={wp.point1Strands || ''}
          onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point1Strands', e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-cyan-300 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          required
        />
      </div>
    </div>

    {wp.hangingPoints === '2' && (
      <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2 rounded border border-slate-800">
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">Point 2 Chain Spec *</label>
          <select
            value={wp.point2SpecId || ''}
            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point2SpecId', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100"
            required
          >
            <option value="">Select Chain...</option>
            {RIGGING_SPECS.filter(r => (r.type || '').toUpperCase() === 'CHAIN').map(r => (
              <option key={r.id} value={r.id}>{r.label} ({r.swl.toLocaleString()} lb WLL)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">Strands / Lines *</label>
          <input
            type="number"
            min="1"
            placeholder="e.g. 1"
            value={wp.point2Strands || ''}
            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point2Strands', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-cyan-300 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            required
          />
        </div>
      </div>
    )}
  </div>

) : (
  /* PURE_WIRE 模式：只显示 Wire，字段名不变 */
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
    <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2 rounded border border-slate-800">
      <div>
        <label className="block text-[10px] text-slate-400 mb-0.5">
          {wp.hangingPoints === '2' ? 'Point 1 Wire Spec *' : 'Wire Spec *'}
        </label>
        <select
          value={wp.point1SpecId || ''}
          onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point1SpecId', e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100"
          required
        >
          <option value="">Select Wire...</option>
          {RIGGING_SPECS.filter(r => (r.type || '').toUpperCase() === 'WIRE').map(r => (
            <option key={r.id} value={r.id}>{r.label} ({r.swl.toLocaleString()} lb WLL)</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-[10px] text-slate-400 mb-0.5">Wire Strands *</label>
        <input
          type="number"
          min="1"
          placeholder="e.g. 3"
          value={wp.point1Strands || ''}
          onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point1Strands', e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-cyan-300 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          required
        />
      </div>
    </div>

    {wp.hangingPoints === '2' && (
      <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2 rounded border border-slate-800">
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">Point 2 Wire Spec *</label>
          <select
            value={wp.point2SpecId || ''}
            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point2SpecId', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100"
            required
          >
            <option value="">Select Wire...</option>
            {RIGGING_SPECS.filter(r => (r.type || '').toUpperCase() === 'WIRE').map(r => (
              <option key={r.id} value={r.id}>{r.label} ({r.swl.toLocaleString()} lb WLL)</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">Wire Strands *</label>
          <input
            type="number"
            min="1"
            placeholder="e.g. 3"
            value={wp.point2Strands || ''}
            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point2Strands', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] font-mono text-cyan-300 font-bold [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            required
          />
        </div>
      </div>
    )}
  </div>
)}
  {/* 2. Anchor Shackle */}
  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-800/80">
    <div>
      <label className="block text-[10px] font-semibold text-slate-300 mb-1">
        Anchor Shackle (Optional)
      </label>
      <select
        value={wp.anchorShackle || 'NONE'}
        onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'anchorShackle', e.target.value)}
        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500"
      >
        {ANCHOR_SHACKLE_SPECS.map(s => (
          <option key={s.id} value={s.id}>
            {s.wll != null ? `${s.label} (${s.wll.toLocaleString()} lb WLL)` : s.label}
          </option>
        ))}
      </select>
    </div>

  </div>
    </>
  )}

</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* 3. SIGN-OFF & SUBMIT SECTION */}
        <div className="pt-4 border-t border-slate-800 space-y-4">

              {/* Global Surface Assessment Summary (Oil, Paint & Rust Level) - operator selects the
                  observed Min/Max level across all workpieces on this Load, once for the whole page */}
              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                  Surface Assessment (Oil, Paint & Rust Level)
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {[
                    { key: 'oilPaint', label: 'Oil / Paint Level', minField: 'minOilPaintLevel', maxField: 'maxOilPaintLevel' },
                    { key: 'rust', label: 'Rust Level', minField: 'minRustLevel', maxField: 'maxRustLevel' }
                  ].map(({ key, label, minField, maxField }) => {
                    const s = surfaceAssessmentSummary[key];
                    return (
                      <div key={key} className="bg-slate-950 p-2.5 rounded border border-slate-800 space-y-2">
                        <span className="text-slate-300 font-semibold block">{label}</span>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">Min</label>
                            <select
                              value={surfaceAssessment[minField]}
                              onChange={(e) => handleSurfaceAssessmentChange(minField, e.target.value)}
                              className="w-full bg-slate-900 border border-emerald-700/60 rounded px-2 py-1 text-[11px] text-emerald-200"
                            >
                              <option value="">-- Select --</option>
                              {SURFACE_CONDITION_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] text-slate-500 mb-0.5">Max</label>
                            <select
                              value={surfaceAssessment[maxField]}
                              onChange={(e) => handleSurfaceAssessmentChange(maxField, e.target.value)}
                              className={`w-full bg-slate-900 rounded px-2 py-1 text-[11px] border ${
                                s.hasWarning ? 'border-rose-600 text-rose-200' : 'border-slate-700 text-slate-200'
                              }`}
                            >
                              <option value="">-- Select --</option>
                              {SURFACE_CONDITION_OPTIONS.map(opt => (
                                <option key={opt.value} value={opt.value}>{opt.label}</option>
                              ))}
                            </select>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(surfaceAssessmentSummary.oilPaint.hasWarning || surfaceAssessmentSummary.rust.hasWarning) && (
                  <div className="p-3 bg-rose-950/60 border border-rose-700 rounded-lg text-rose-200 text-[11px] space-y-2">
                    <div className="font-bold text-rose-300 flex items-center gap-1.5">
                      ⚠️ Wide Surface Condition Spread Detected
                    </div>
                    <p>
                      <strong>Local Pre-Treatment:</strong> For individual workpieces with severe localized corrosion, perform manual grinding pre-treatment before hanging to reduce the corrosion gap among workpieces sharing the same rack.
                    </p>
                    <p>
                      <strong>Batch by Corrosion Grade at the Source:</strong> Do not mix lightly rusted workpieces with heavily scaled/rusted workpieces on the same rack. Before hanging, group workpieces into batches by corrosion grade (Grade A/B/C/D).
                    </p>
                  </div>
                )}
              </div>

              {/* Critical Safety Check (Fatal Risk Items) - applies to the whole load, confirmed once at sign-off */}
              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                  🛡️ Critical Safety Check (Fatal Risk Items)
                </span>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  
                  {/* 1. Cavity Check */}
                  <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-300">1. Has enclosed cavity / hollow structure?</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSafetyFieldChange('hasEnclosedCavity', true)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          safetyChecklist.hasEnclosedCavity ? 'bg-amber-600 text-slate-950' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        YES
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSafetyFieldChange('hasEnclosedCavity', false)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          !safetyChecklist.hasEnclosedCavity ? 'bg-slate-700 text-slate-200' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  {/* 2 & 3. Venting & Drilling (Only if Cavity = YES) */}
                  {safetyChecklist.hasEnclosedCavity ? (
                    <div className="space-y-2 col-span-1 md:col-span-1">
                      <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
                        <span className="text-slate-300">2. All cavities have adequate vent/drain holes?</span>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleSafetyFieldChange('hasAdequateVenting', true)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                              safetyChecklist.hasAdequateVenting ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            YES
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSafetyFieldChange('hasAdequateVenting', false)}
                            className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                              !safetyChecklist.hasAdequateVenting ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
                            }`}
                          >
                            NO
                          </button>
                        </div>
                      </div>

                      {!safetyChecklist.hasAdequateVenting && (
                        <div className="flex items-center justify-between bg-amber-950/40 p-2.5 rounded border border-amber-800">
                          <span className="text-amber-200">3. If missing, drilled on site?</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSafetyFieldChange('drilledOnsite', true)}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                                safetyChecklist.drilledOnsite ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
                              }`}
                            >
                              YES (Drilled)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSafetyFieldChange('drilledOnsite', false)}
                              className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                                !safetyChecklist.drilledOnsite ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
                              }`}
                            >
                              NO (Not Drilled)
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded border border-slate-800/50 text-slate-500">
                      <span>2/3. Venting & Drainage Check</span>
                      <span className="text-[11px]">N/A (No Cavity)</span>
                    </div>
                  )}


                </div>
              </div>


{/* Employee ID & PIN Sign-off Input Box */}
<div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-4">
  <label className="block text-xs font-bold text-slate-200 uppercase tracking-wider">
    🚨 Employee Sign-off / Responsibility Confirmation <span className="text-rose-400">*</span>
  </label>
  <p className="text-[11px] text-slate-400">
    Please enter Employee ID and 4-digit Security PIN to digitally sign off. Primary Operator sign-off is mandatory..
  </p>

  {/* Primary Operator Section (Mandatory) */}
  <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-2">
    <span className="block text-[11px] font-bold text-cyan-400 uppercase">
      PRIMARY OPERATOR (MANDATORY) <span className="text-rose-400">*</span>
    </span>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-[10px] text-slate-400 mb-1 uppercase">Employee ID</label>
        <input
          type="text"
          placeholder="e.g. 2324"
          value={primaryOperatorId}
          onChange={(e) => setPrimaryOperatorId(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400"
          required
        />
      </div>
      <div>
        <label className="block text-[10px] text-slate-400 mb-1 uppercase">4-Digit Security PIN</label>
        <input
          type="password"
          maxLength={4}
          placeholder="••••"
          value={primaryPin}
          onChange={(e) => setPrimaryPin(e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-cyan-300 font-mono font-bold focus:outline-none focus:border-cyan-400"
          required
        />
      </div>
    </div>
  </div>

  {/* Assistant Operator Section (Optional) */}
  <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-800/60 space-y-3">
    <div className="flex items-center justify-between">
      <span className="block text-[11px] font-bold text-slate-400 uppercase">
        ASSISTANT OPERATOR{assistants.length > 1 ? 'S' : ''} <span className="text-slate-500 font-normal">(OPTIONAL)</span>
      </span>
      {assistants.length < MAX_ASSISTANT_OPERATORS && (
        <button
          type="button"
          onClick={addAssistantOperator}
          className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 border border-cyan-500/30 hover:border-cyan-400/50 rounded px-2 py-1 transition-colors"
        >
          + Add Assistant Operator
        </button>
      )}
    </div>

    {assistants.map((assistant, idx) => (
      <div key={assistant.uid} className="grid grid-cols-1 md:grid-cols-2 gap-3 relative">
        <div>
          <label className="block text-[10px] text-slate-500 mb-1 uppercase">
            Employee ID {assistants.length > 1 ? `#${idx + 1}` : ''}
          </label>
          <input
            type="text"
            placeholder="e.g. 8892"
            value={assistant.employeeId}
            onChange={(e) => handleAssistantFieldChange(assistant.uid, 'employeeId', e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 font-mono focus:outline-none focus:border-slate-600"
          />
        </div>
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <label className="block text-[10px] text-slate-500 mb-1 uppercase">Security PIN</label>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={assistant.pin}
              onChange={(e) => handleAssistantFieldChange(assistant.uid, 'pin', e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 font-mono focus:outline-none focus:border-slate-600"
            />
          </div>
          {assistants.length > 1 && (
            <button
              type="button"
              onClick={() => removeAssistantOperator(assistant.uid)}
              className="mb-0.5 text-slate-500 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 rounded-lg px-2.5 py-1.5 text-xs transition-colors"
              title="Remove this assistant operator"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    ))}
  </div>
</div>

{/* Submit Button */}
<button
  type="submit"
  disabled={isFormBlocked || isSubmitting}
  className={`w-full py-3.5 font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all ${
    isFormBlocked || isSubmitting
      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20 cursor-pointer'
  }`}
>
  {isFormBlocked
    ? '🚨 CANNOT SUBMIT: FIX SAFETY HAZARDS ABOVE'
    : isSubmitting
    ? 'Submitting...'
    : '🚨 Confirm & Sign-off →'}
</button>
</div>
</div>
</form>

{/* Force Release Rack # Modal - triggered from the Rack # help tooltip */}
{showReleaseModal && (
  <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
    <div className="w-full max-w-sm bg-slate-950 border border-cyan-800 rounded-xl shadow-2xl p-5">
      <div className="flex justify-between items-start mb-3">
        <h3 className="text-sm font-bold text-white">🔓 Force Release a Rack #</h3>
        <button
          type="button"
          onClick={() => setShowReleaseModal(false)}
          className="text-slate-500 hover:text-slate-300 text-sm"
        >
          ✕
        </button>
      </div>

      <p className="text-[11px] text-slate-400 mb-3">
        Use this only if the rack is physically empty right now (e.g. it was already unloaded but nobody released it in the system). This is logged with your ID and reason.
      </p>

      <div className="space-y-3 text-xs">
        <div>
          <label className="block text-slate-400 mb-1">Rack # to release *</label>
          <select
            value={releaseRackNo}
            onChange={(e) => setReleaseRackNo(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-cyan-300 font-mono font-bold"
          >
            <option value="">-- Select occupied Rack # --</option>
            {[...occupiedRacks].sort().map((rn) => (
              <option key={rn} value={rn}>Rack #{rn}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-400 mb-1">Reason *</label>
          <select
            value={releaseReason}
            onChange={(e) => setReleaseReason(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
          >
            {RELEASE_REASON_PRESETS.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
          {releaseReason === 'OTHER' && (
            <input
              type="text"
              placeholder="Describe the reason..."
              value={releaseReasonOther}
              onChange={(e) => setReleaseReasonOther(e.target.value)}
              className="w-full mt-1.5 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
          <div>
            <label className="block text-slate-400 mb-1">Your Employee ID *</label>
            <input
              type="text"
              placeholder="e.g. 8892"
              value={releaseOperatorId}
              onChange={(e) => setReleaseOperatorId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
            />
          </div>
          <div>
            <label className="block text-slate-400 mb-1">Your PIN *</label>
            <input
              type="password"
              maxLength={4}
              placeholder="••••"
              value={releasePin}
              onChange={(e) => setReleasePin(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
            />
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={handleForceRelease}
        disabled={isReleasing}
        className="w-full mt-4 py-2.5 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg transition-all"
      >
        {isReleasing ? 'Releasing...' : 'Confirm Release'}
      </button>
    </div>
  </div>
)}
</div>
);
}
