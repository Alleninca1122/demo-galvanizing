import React, { useState } from 'react';

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

// 30 Fixed Racks
const RACK_OPTIONS = Array.from({ length: 30 }, (_, i) => {
  const num = String(i + 1).padStart(2, '0');
  return { value: num, label: `Rack #${num}` };
});

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

// Custom, shop-built hanging fixtures (not wire/chain) - e.g. a Railing Comb Rack or a row of
// hooks for small workpieces. These bypass wire/chain/shackle spec checks but still count toward the
// rack's total weight.
const CUSTOM_FIXTURE_TYPES = [
  { value: '', label: '-- Select Fixture --' },
  { value: 'RAILING_COMB_RACK', label: 'Railing Comb Rack' },
  { value: 'HOOK_ROW', label: 'Hook Row (Small Workpieces)' },
  { value: 'OTHER', label: 'Other Custom Fixture' },
];

// Resolves a workpiece line's weight, accounting for both weight-input modes:
// - isUniformWeight (default true): operator enters either the TOTAL weight for the line, or a
//   single-piece weight (weightInputMode) which the app multiplies out by quantity.
// - Not uniform: pieces vary, so instead of weighing each one the operator selects a certified
//   weight bracket (Reo table) and the app conservatively uses the UPPER bound of that bracket.
function getWorkpieceTotalWeight(wp) {
  const qty = parseInt(wp.quantity, 10) || 0;

  if (wp.isUniformWeight === false) {
    const pts = wp.hangingPoints === '2' ? 2 : 1;
    const brackets = pts === 2 ? WIRE_BRACKETS_DOUBLE : WIRE_BRACKETS_SINGLE;
    const bracket = brackets.find(b => String(b.maxLb) === String(wp.weightBracketId));
    const totalW = bracket ? bracket.maxLb : 0;
    return { totalW, unitW: qty > 0 ? totalW / qty : 0 };
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

  // 控制 ASTM A385 图解弹窗的开关
  const [showGuide, setShowGuide] = useState(false);

  // Global Rack & Load Session
  const [rackNo, setRackNo] = useState('');
  const [loadId, setLoadId] = useState('');
  const [autoLoadId, setAutoLoadId] = useState(''); 
  const [isGeneratingLoadId, setIsGeneratingLoadId] = useState(false);

  // Sign-off State
const [primaryOperatorId, setPrimaryOperatorId] = useState('');
const [primaryPin, setPrimaryPin] = useState(''); 
const [assistantOperatorId, setAssistantOperatorId] = useState('');
const [assistantPin, setAssistantPin] = useState(''); 

  // Global Job Safety & Submersion Checklist (SOP Inspection) - shared across ALL jobs on this load
  const [safetyChecklist, setSafetyChecklist] = useState({
    hasEnclosedCavity: false,      // 1. Enclosed cavity/pipe structure
    hasAdequateVenting: true,      // 2. Adequate venting/drainage holes
    drilledOnsite: true,           // 3. Drilled on site if missing
    isAngleCompliant: true,        // 4. Tilt angle 15°-30°
    minTopClearanceValid: true,    // 5. Min top clearance >= 30cm
    maxHangDepthValid: true,       // 6. Max hang depth <= 300cm
    hasTightContact: false,        // 7. Tight contact between workpieces
    hasMaskingAgent: false         // 8. Coated with masking/stop-off agent
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
        riggingCategory: 'WIRE_CHAIN', // 'WIRE_CHAIN' | 'CUSTOM_FIXTURE'
        customFixtureType: '',
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

    try {
      const { count, error } = await supabase
        .from('production_loads')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', `${todayStr}T00:00:00`);

      if (error) throw error;
      return (count || 0) + 1;
    } catch (err) {
      console.warn('Could not fetch daily load count from Supabase, falling back to 1:', err);
      return 1;
    }
  };

  const handleRackSelect = async (selectedVal) => {
    setRackNo(selectedVal);

    if (selectedVal) {
      setIsGeneratingLoadId(true);
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const day = String(now.getDate()).padStart(2, '0');

      const dailySeq = await getNextDailySequence();

      const generated = `R${selectedVal}-${year}${month}${day}-${dailySeq}`;

      setAutoLoadId(generated);
      setLoadId(generated);
      setIsGeneratingLoadId(false);
    } else {
      setLoadId('');
      setAutoLoadId('');
    }
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
      riggingCategory: 'WIRE_CHAIN',
      customFixtureType: '',
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
  //    backbone chain - NOT the "Use Wire Extension at Top" top-point extension checkbox further
  //    down (that is a different, separate piece of hardware). Because a tie only ever holds the
  //    one workpiece it's tied to, it is checked against a SINGLE workpiece's weight, not the
  //    string's shared total.
  //  - Pure Wire: each workpiece is hung from the one below it using the SAME hanging-point pattern
  //    (e.g. every link is a 2-point wire hang) all the way down to the last piece, then the whole
  //    daisy chain is hung from the rack. Every one of those links carries some or all of the
  //    weight below it, so - rather than track each link's exact position - every link's wire
  //    strand count is conservatively checked as if it alone were carrying the FULL total weight of
  //    the whole string, still split across however many points that link actually uses (1 or 2).
  const checkSafetyDeficiencies = () => {
    let deficiencies = [];
    jobs.forEach((job, jIdx) => {
      job.workpieces.forEach((wp, wIdx) => {
        // Custom fixtures (Comb Rack / Hook Row) aren't rated by strand count - nothing to check here
        if (wp.riggingCategory === 'CUSTOM_FIXTURE') return;

        const { totalW, unitW } = getWorkpieceTotalWeight(wp);
        const pts = parseInt(wp.hangingPoints, 10) || 1;
        const isString = wp.hangingMode === 'STRING';
        const stringingMethod = wp.stringingMethod || 'FULL_CHAIN';

        // designW = the weight actually carried by the shared structural points (chain / top
        // rigging): String mode -> whole batch shares one set of points; Individual mode -> one
        // piece's own points. (When isUniformWeight is false, totalW/unitW are already both the
        // same bracket ceiling.)
        const designW = isString ? totalW : (wp.isUniformWeight === false ? totalW : unitW);
        const loadPerPt = designW / pts;
        const workpieceTypeLabel = wp.workpieceType === 'Others' && wp.workpieceTypeOther
          ? `Others: ${wp.workpieceTypeOther}`
          : wp.workpieceType;
        const label = `Job #${jIdx + 1} Line #${wIdx + 1} (${workpieceTypeLabel || 'Item'})`;

        // Wire recommendation basis differs by stringing method (see notes above).
        let wireRec;
        let wireBasisNote;
        if (isString && stringingMethod === 'CHAIN_WIRE') {
          wireRec = getRequiredWireCount(unitW, 1); // ties ONE workpiece - always single-hanger basis
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
            if (userStrands < wireRec.perPoint) {
              deficiencies.push(`${label}: ${pointLabel} wire count (${userStrands}) is below the Reo-certified recommendation (${wireRec.perPoint}) for ${wireBasisNote}.`);
            }
          } else if (specObj.type === 'CHAIN') {
            // Chain always carries the shared structural load (loadPerPt), regardless of stringing
            // method - a Chain+Wire line's chain point is still the backbone for the whole string.
            const req = Math.max(1, Math.ceil(loadPerPt / specObj.swl));
            if (userStrands < req) {
              deficiencies.push(`${label}: ${pointLabel} chain strand count (${userStrands}) is below the required (${req}) for a ${specObj.label} rated at ${specObj.swl} lb WLL.`);
            }
          }
        };

        checkPoint(wp.point1SpecId, wp.point1Strands, 'Point 1');
        if (pts === 2) {
          checkPoint(wp.point2SpecId, wp.point2Strands, 'Point 2');
        }

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
  // CUSTOM_FIXTURE lines) - this is what the Beam Rack's support frames actually have to carry.
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
    // Check 2: Minimum Top Clearance violation (< 30cm)
    if (!safetyChecklist.minTopClearanceValid) {
      severeErrors.push(`Top clearance is less than 30 cm. Material cannot be fully submerged in acid/zinc bath.`);
    }
    // Check 3: Maximum Hang Depth violation (> 300cm)
    if (!safetyChecklist.maxHangDepthValid) {
      severeErrors.push(`Total hang depth exceeds 300 cm. Risk of bottom collision or crane overhead snagging.`);
    }
    // Check 4: Rack support-frame capacity (8,000 lb net, after beam self-weight & safety factor) - hard limit, no override
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rackNo || !loadId.trim()) {
      alert('Please select a Rack # first.');
      return;
    }

    if (isFormBlocked) {
      alert(`❌ CANNOT SUBMIT DUE TO SEVERE SAFETY VIOLATIONS:\n\n` + criticalViolations.join('\n'));
      return;
    }

    if (!primaryOperatorId.trim()) {
      alert('Please enter the Primary Operator Employee ID to Confirm & Sign-off before submitting.');
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

    const payload = {
      global: {
        loadId: loadId.trim(),
        rackNo: `Rack #${rackNo}`,
        operatorId: currentUser?.id || 'UNKNOWN',
        signedOffByEmployeeId: primaryOperatorId.trim(),
        assistantOperatorId: assistantOperatorId.trim() || null,
        shift: getShiftDisplay(),
        entryDate: currentDateFormatted,
        createdAt: new Date().toISOString(),
        // Job Safety & Submersion Checklist (SOP Inspection) - one shared checklist for the whole load
        safetyChecklist: { ...safetyChecklist },
        // Rack structural capacity check, recorded for audit trail
        rackCapacityCheck: {
          totalLoadLb: Math.round(rackTotalWeight),
          limitLb: RACK_LIMIT_LBS
        },
        // Surface Assessment (Oil, Paint & Rust Level) - global summary across every workpiece on this Load
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
      },
      jobs: jobs.map(job => ({
        customerName: job.customerName,
        customerOrderNo: job.customerOrderNo,
        customerBatchNo: job.customerBatchNo || '#1',
        workpieces: job.workpieces.map(wp => {
          const { totalW, unitW } = getWorkpieceTotalWeight(wp);
          const qty = parseInt(wp.quantity, 10) || 0;
          const base = {
            workpieceType: wp.workpieceType,
            ...(wp.workpieceType === 'Others' ? { workpieceTypeOther: wp.workpieceTypeOther || '' } : {}),
            quantity: qty,
            unit: wp.unit || 'pcs',
            totalWeightLb: Math.round(totalW),
            unitWeightLb: Math.round(unitW),
            weightSource: wp.isUniformWeight === false ? 'WEIGHT_BRACKET' : (wp.weightInputMode === 'PER_UNIT' ? 'PER_UNIT_INPUT' : 'TOTAL_INPUT')
          };

          if (wp.riggingCategory === 'CUSTOM_FIXTURE') {
            return {
              ...base,
              rigging: {
                category: 'CUSTOM_FIXTURE',
                fixtureType: wp.customFixtureType || null
              }
            };
          }

          return {
            ...base,
            rigging: {
              category: 'WIRE_CHAIN',
              hangingMode: wp.hangingMode,
              hangingPoints: parseInt(wp.hangingPoints, 10),
              point1: { spec: wp.point1SpecId, strands: parseInt(wp.point1Strands, 10) || 0 },
              point2: wp.hangingPoints === '2' ? { spec: wp.point2SpecId, strands: parseInt(wp.point2Strands, 10) || 0 } : null,
              anchorShackle: wp.anchorShackle && wp.anchorShackle !== 'NONE' ? wp.anchorShackle : null
            }
          };
        })
      }))
    };

    console.log('Submitting Production Load Payload:', payload);
    alert(`Load [${loadId.trim()}] recorded and signed off by ID [${primaryOperatorId.trim()}] successfully!`);

    // Reset Form
    setRackNo('');
    setLoadId('');
    setAutoLoadId('');
    setPrimaryOperatorId('');
    setPrimaryPin('');
    setAssistantOperatorId('');
    setAssistantPin('');
    setSafetyChecklist({
      hasEnclosedCavity: false,
      hasAdequateVenting: true,
      drilledOnsite: true,
      isAngleCompliant: true,
      minTopClearanceValid: true,
      maxHangDepthValid: true,
      hasTightContact: false,
      hasMaskingAgent: false
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
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <span className="text-amber-400">📐</span> Socket & Spigot Galvanizing Racking Standards
          </div>
          <button 
            type="button"
            onClick={() => setShowSocketSpigotModal(false)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs transition-colors cursor-pointer"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-cyan-500/30 rounded-xl shadow-2xl max-w-2xl w-full p-5 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2 text-cyan-400 font-bold text-sm">
            <span className="text-amber-400">📐</span> Rigging Standards: Clearance Looping vs. Rigid Binding
          </div>
          <button 
            type="button"
            onClick={() => setShowClearanceLoopingModal(false)}
            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded text-xs transition-colors cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        {/* Modal Content */}
        <div className="space-y-3 text-xs text-slate-300">
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
        <div className="flex justify-end pt-2 border-t border-slate-800">
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
  </div>

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
            <div className="w-full h-48 bg-slate-900/90 rounded border border-slate-800/80 flex items-center justify-center p-2">
              <svg viewBox="0 0 320 150" className="w-full h-full">
                <rect x="30" y="12" width="260" height="12" rx="2" fill="#334155" stroke="#64748b" strokeWidth="1.5" />
                <text x="160" y="21" fill="#94a3b8" fontSize="8" fontWeight="bold" textAnchor="middle" className="font-mono">
                  Beam Rack
                </text>

                <line x1="100" y1="24" x2="100" y2="125" stroke="#64748b" strokeWidth="1.5" strokeDasharray="3 3" />
                <text x="105" y="40" fill="#64748b" fontSize="7" className="font-mono">0° Vertical Line</text>

                <line x1="100" y1="24" x2="60" y2="110" stroke="#f43f5e" strokeWidth="2" />
                <circle cx="100" cy="24" r="3" fill="#f43f5e" />
                <circle cx="60" cy="110" r="3" fill="#f43f5e" />

                <line x1="220" y1="24" x2="260" y2="110" stroke="#f43f5e" strokeWidth="2" />
                <circle cx="220" cy="24" r="3" fill="#f43f5e" />
                <circle cx="260" cy="110" r="3" fill="#f43f5e" />

                <path d="M 100 65 A 41 41 0 0 0 81 60" fill="none" stroke="#f59e0b" strokeWidth="2" />
                <text x="82" y="76" fill="#f59e0b" fontSize="9" fontWeight="bold" className="font-mono">
                  θ (Rigging Angle)
                </text>

                <rect x="40" y="110" width="240" height="18" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                <text x="160" y="122" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">
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
      {/* Modal Header */}
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

      {/* Modal Content */}
      <div className="space-y-3 text-xs text-slate-300 max-h-[70vh] overflow-y-auto pr-1">
        {/* Section 1: SVG Diagram */}
        <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="font-bold text-rose-300 text-[11px]">
            1. Rigging & Corner Interconnecting Anti-Sway Diagram (3-Plate Row)
          </div>
          <div className="text-[10px] text-slate-400 leading-relaxed">
            Use dual-point suspension for large plates. Thread tie wire through adjacent corner holes or wrap around outer edges of neighboring plates to lock them into a single rigid row.
          </div>

          <div className="w-full h-72 bg-slate-900/90 rounded border border-slate-800/80 flex items-center justify-center p-2">
            <svg viewBox="0 0 850 420" className="w-full h-full">
              <defs>
                <pattern id="grid-sway-3plates" width="25" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#1e293b" strokeWidth="0.8" />
                </pattern>
              </defs>

              <rect width="850" height="420" fill="url(#grid-sway-3plates)" rx="4" />

              {/* Beam Rack */}
              <rect x="50" y="25" width="750" height="28" rx="6" fill="#2563eb" stroke="#3b82f6" strokeWidth="1.5" />
              <text x="425" y="44" fill="#ffffff" fontSize="16" fontWeight="bold" textAnchor="middle" className="font-mono">
                BEAM RACK FRAME
              </text>

              {/* Dual-Point Suspension Callout */}
              <rect x="100" y="70" width="180" height="30" rx="15" fill="#022c22" stroke="#10b981" strokeWidth="2" />
              <text x="190" y="90" fill="#34d399" fontSize="13" fontWeight="bold" textAnchor="middle">
                Dual-Point Suspension
              </text>

              {/* Vertical Suspension Wires (Left-High Tilt Layout) */}
              {/* Plate 1 Wires */}
              <line x1="145" y1="53" x2="140" y2="155" stroke="#94a3b8" strokeWidth="2.5" />
              <line x1="225" y1="53" x2="228" y2="170" stroke="#94a3b8" strokeWidth="2.5" />
              {/* Plate 2 Wires */}
              <line x1="385" y1="53" x2="380" y2="155" stroke="#94a3b8" strokeWidth="2.5" />
              <line x1="465" y1="53" x2="468" y2="170" stroke="#94a3b8" strokeWidth="2.5" />
              {/* Plate 3 Wires */}
              <line x1="625" y1="53" x2="620" y2="155" stroke="#94a3b8" strokeWidth="2.5" />
              <line x1="705" y1="53" x2="708" y2="170" stroke="#94a3b8" strokeWidth="2.5" />

              {/* Workpiece #1 (Left-High Tilt: rotate -10) */}
              <g transform="translate(185, 230) rotate(-10)">
                <rect x="-65" y="-75" width="130" height="150" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
                <circle cx="-35" cy="-55" r="5" fill="none" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="35" cy="-55" r="5" fill="none" stroke="#38bdf8" strokeWidth="2" />
                {/* Corner Holes (Bottom Left & Right) */}
                <circle cx="-45" cy="55" r="5" fill="none" stroke="#64748b" strokeWidth="1.5" />
                <circle cx="45" cy="55" r="6" fill="#022c22" stroke="#f59e0b" strokeWidth="2" />
                <text x="0" y="-5" fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">
                  Plate #1
                </text>
              </g>

              {/* Workpiece #2 (Left-High Tilt: rotate -10) */}
              <g transform="translate(425, 230) rotate(-10)">
                <rect x="-65" y="-75" width="130" height="150" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
                <circle cx="-35" cy="-55" r="5" fill="none" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="35" cy="-55" r="5" fill="none" stroke="#38bdf8" strokeWidth="2" />
                {/* Corner Holes (Bottom Left & Right) */}
                <circle cx="-45" cy="55" r="6" fill="#022c22" stroke="#f59e0b" strokeWidth="2" />
                <circle cx="45" cy="55" r="6" fill="#022c22" stroke="#f59e0b" strokeWidth="2" />
                <text x="0" y="-5" fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">
                  Plate #2
                </text>
              </g>

              {/* Workpiece #3 (Left-High Tilt: rotate -10) */}
              <g transform="translate(665, 230) rotate(-10)">
                <rect x="-65" y="-75" width="130" height="150" rx="6" fill="#0f172a" stroke="#38bdf8" strokeWidth="2.5" />
                <circle cx="-35" cy="-55" r="5" fill="none" stroke="#38bdf8" strokeWidth="2" />
                <circle cx="35" cy="-55" r="5" fill="none" stroke="#38bdf8" strokeWidth="2" />
                {/* Corner Holes (Bottom Left & Right) */}
                <circle cx="-45" cy="55" r="6" fill="#022c22" stroke="#f59e0b" strokeWidth="2" />
                <circle cx="45" cy="55" r="5" fill="none" stroke="#64748b" strokeWidth="1.5" />
                <text x="0" y="-5" fill="#ffffff" fontSize="14" fontWeight="bold" textAnchor="middle">
                  Plate #3
                </text>
              </g>

              {/* Interconnecting Tie Wire Path (Through Corner Holes across Plates #1, #2, #3) */}
              <path d="M 120 280 L 220 270 L 370 270 L 460 270 L 610 270 L 710 260" fill="none" stroke="#f59e0b" strokeWidth="3.5" strokeDasharray="6 3" />
              <path d="M 220 270 L 370 270 M 460 270 L 610 270" fill="none" stroke="#f59e0b" strokeWidth="3.5" />

              {/* Tie Knots / Corner Lock Points (Green Dots at Corner Holes) */}
              <circle cx="220" cy="270" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              <circle cx="370" cy="270" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              <circle cx="460" cy="270" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />
              <circle cx="610" cy="270" r="7" fill="#10b981" stroke="#ffffff" strokeWidth="2" />

              {/* Callout Lines & Label */}
              <line x1="295" y1="270" x2="295" y2="340" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
              <line x1="535" y1="270" x2="535" y2="340" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
              
              <rect x="180" y="340" width="490" height="42" rx="8" fill="#0f172a" stroke="#f59e0b" strokeWidth="2" />
              <text x="425" y="366" fill="#fbbf24" fontSize="14" fontWeight="bold" textAnchor="middle" className="font-mono">
                Interconnecting Tie Wire (Threaded Through Adjacent Corner Holes)
              </text>
            </svg>
          </div>
        </div>

        {/* Section 2: Mandatory Controls Rules */}
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
                Thread tie wire through adjacent corner holes or wrap outer edges of neighboring plates to lock them into a unified row, eliminating relative sway & collisions.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Footer */}
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
            
            <div className="w-full h-44 bg-slate-900/90 rounded border border-slate-800 flex items-center justify-center p-2">
              <svg viewBox="0 0 320 140" className="w-full h-full">
                <line x1="30" y1="95" x2="280" y2="95" stroke="#475569" strokeWidth="1.5" strokeDasharray="4 4" />
                <text x="282" y="98" fill="#64748b" fontSize="8" className="font-mono">0° Horizontal</text>

                <line x1="80" y1="10" x2="80" y2="35" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />
                <line x1="240" y1="10" x2="240" y2="92" stroke="#64748b" strokeWidth="2" strokeDasharray="3 3" />

                <g transform="rotate(20 80 35)">
                  <rect x="70" y="25" width="200" height="20" rx="3" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" />
                  <circle cx="78" cy="25" r="3.5" fill="#ef4444" />
                  <circle cx="262" cy="45" r="3.5" fill="#38bdf8" />
                </g>

                <path d="M 160 95 A 55 55 0 0 1 164 76" fill="none" stroke="#f59e0b" strokeWidth="2" />
                <text x="148" y="82" fill="#f59e0b" fontSize="10" fontWeight="bold" fontFamily="sans-serif">
                  15°–30°
                </text>

                <path d="M 80 30 L 80 18" stroke="#ef4444" strokeWidth="1.5" strokeDasharray="2 2" />
                <text x="80" y="12" fill="#ef4444" fontSize="8" fontWeight="bold" textAnchor="middle">Air Escape ↑ (Highest Vent)</text>

                <path d="M 260 88 L 260 105" stroke="#38bdf8" strokeWidth="2" strokeDasharray="2 2" />
                <text x="260" y="115" fill="#38bdf8" fontSize="8" fontWeight="bold" textAnchor="middle">Rapid Run-off ↓ (Lowest Drain)</text>

                <line x1="20" y1="120" x2="180" y2="120" stroke="#0284c7" strokeWidth="1" strokeDasharray="3 3" opacity="0.5" />
                <text x="25" y="115" fill="#0284c7" fontSize="8" opacity="0.7">Zinc Kettle Bath Line</text>
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

            <div className="w-full h-32 bg-slate-900/90 rounded border border-slate-800/80 flex items-center justify-center p-2">
              <svg viewBox="0 0 320 110" className="w-full h-full">
                <line x1="20" y1="15" x2="300" y2="15" stroke="#475569" strokeWidth="3" />
                <text x="25" y="10" fill="#64748b" fontSize="7" className="font-mono">Beam Rack</text>

                <line x1="80" y1="15" x2="80" y2="40" stroke="#38bdf8" strokeWidth="2" strokeDasharray="3 3" />
                <text x="65" y="30" fill="#38bdf8" fontSize="9" fontWeight="bold" className="font-mono">L₁</text>

                <line x1="240" y1="15" x2="240" y2="90" stroke="#f59e0b" strokeWidth="2" strokeDasharray="3 3" />
                <text x="246" y="55" fill="#f59e0b" fontSize="9" fontWeight="bold" className="font-mono">L₂</text>

                <g transform="rotate(18 80 40)">
                  <rect x="70" y="32" width="180" height="14" rx="2" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
                  <circle cx="80" cy="32" r="3" fill="#ef4444" />
                  <circle cx="240" cy="32" r="3" fill="#ef4444" />
                  
                  <line x1="80" y1="22" x2="240" y2="22" stroke="#a855f7" strokeWidth="1.5" />
                  <line x1="80" y1="18" x2="80" y2="26" stroke="#a855f7" strokeWidth="1" />
                  <line x1="240" y1="18" x2="240" y2="26" stroke="#a855f7" strokeWidth="1" />
                  <text x="150" y="18" fill="#c084fc" fontSize="9" fontWeight="bold" textAnchor="middle" className="font-mono">Distance D</text>
                </g>

                <line x1="80" y1="90" x2="280" y2="90" stroke="#475569" strokeWidth="1" strokeDasharray="2 2" />
                <path d="M 190 90 A 45 45 0 0 1 193 78" fill="none" stroke="#f59e0b" strokeWidth="1.5" />
                <text x="180" y="85" fill="#f59e0b" fontSize="8" fontWeight="bold">θ</text>
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
        <div className="bg-slate-950 p-5 rounded-xl border border-cyan-800/60 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500"></div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase mb-1">
                Rack # <span className="text-rose-400">*</span>
              </label>
              <select
                value={rackNo}
                onChange={(e) => handleRackSelect(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-2.5 text-cyan-300 font-mono font-bold text-base focus:outline-none focus:border-cyan-400"
                required
              >
                <option value="">-- Select Rack # --</option>
                {RACK_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-slate-300 uppercase">
                  Load ID <span className="text-rose-400">*</span>
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
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    ⚖️ Rack Support Frame Load
                  </span>
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
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
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

                        <div>
                          <div className="flex justify-between items-center mb-1">
                            <label className="block text-[11px] text-slate-400">
                              {wp.isUniformWeight === false ? 'Weight Bracket' : (wp.weightInputMode === 'PER_UNIT' ? 'Unit Weight (lb)' : 'Total Weight (lb)')}
                            </label>
                            <button
                              type="button"
                              onClick={() => handleWorkpieceChange(jobIndex, wpIndex, 'isUniformWeight', wp.isUniformWeight === false)}
                              className="text-[9px] font-bold text-slate-500 hover:text-cyan-300 underline decoration-dotted"
                              title="Are all pieces on this line the same weight?"
                            >
                              {wp.isUniformWeight === false ? 'Varied → Identical' : 'Identical → Varied'}
                            </button>
                          </div>

                          {wp.isUniformWeight === false ? (
                            <select
                              value={wp.weightBracketId || ''}
                              onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'weightBracketId', e.target.value)}
                              className="w-full bg-slate-900 border border-amber-700/60 rounded-lg px-2 py-1.5 text-xs text-amber-200 focus:outline-none focus:border-amber-500"
                            >
                              <option value="">-- Select Weight Range --</option>
                              {(wp.hangingPoints === '2' ? WIRE_BRACKETS_DOUBLE : WIRE_BRACKETS_SINGLE).map(b => (
                                <option key={b.maxLb} value={b.maxLb}>
                                  {b.minLb}–{b.maxLb} lb
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div className="flex gap-1">
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
                                className="shrink-0 px-1.5 rounded border border-slate-700 text-[9px] text-slate-400 hover:text-cyan-300 font-bold"
                                title="Switch between total weight and per-unit weight entry"
                              >
                                {wp.weightInputMode === 'PER_UNIT' ? 'Unit \u2192 Total' : 'Total \u2192 Unit'}
                              </button>
                            </div>
                          )}

                          {wp.isUniformWeight !== false && unitW > 0 && (
                            <span className="text-[10px] text-cyan-400 font-mono font-bold block mt-0.5">
                              {wp.weightInputMode === 'PER_UNIT' ? `= ${Math.round(totalW)} lb total` : `${Math.round(unitW)} lb/pc`}
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="block text-[11px] text-slate-400 mb-1">Operator</label>
                            <input
                              type="text"
                              disabled
                              value={currentUser?.id || '7222'}
                              className="w-full bg-slate-900/50 border border-slate-800 rounded-lg px-2 py-1.5 text-xs font-mono text-cyan-400 font-bold cursor-not-allowed"
                            />
                          </div>
                          {job.workpieces.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeWorkpieceRow(jobIndex, wpIndex)}
                              className="mt-4 text-xs text-rose-400 hover:text-rose-300 font-bold px-1"
                              title="Delete line"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      </div>

{/* Rigging & Hanging Setup for THIS Workpiece */}
<div className="pt-2.5 border-t border-slate-800/80 bg-slate-950/40 p-3 rounded-lg space-y-3">

  {/* Rigging Category Toggle: how is this workpiece actually hung? */}
  <div className="inline-flex bg-slate-900 p-0.5 rounded border border-slate-800">
    <button
      type="button"
      onClick={() => handleWorkpieceChange(jobIndex, wpIndex, 'riggingCategory', 'WIRE_CHAIN')}
      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
        wp.riggingCategory !== 'CUSTOM_FIXTURE'
          ? 'bg-cyan-600 text-slate-950 shadow'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      🔗 Wire / Chain (Beam Rack)
    </button>
    <button
      type="button"
      onClick={() => handleWorkpieceChange(jobIndex, wpIndex, 'riggingCategory', 'CUSTOM_FIXTURE')}
      className={`px-2.5 py-1 rounded text-[10px] font-bold transition-all ${
        wp.riggingCategory === 'CUSTOM_FIXTURE'
          ? 'bg-cyan-600 text-slate-950 shadow'
          : 'text-slate-400 hover:text-slate-200'
      }`}
    >
      🧱 Custom Fixture
    </button>
  </div>

  {wp.riggingCategory === 'CUSTOM_FIXTURE' ? (
    <div className="space-y-2 pt-1">
      <label className="block text-[10px] font-semibold text-slate-300 uppercase tracking-wide">
        Fixture Type <span className="text-rose-400">*</span>
      </label>
      <select
        value={wp.customFixtureType || ''}
        onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'customFixtureType', e.target.value)}
        className="w-full sm:w-64 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
      >
        {CUSTOM_FIXTURE_TYPES.map(f => (
          <option key={f.value} value={f.value}>{f.label}</option>
        ))}
      </select>
      <p className="text-[10px] text-slate-500">
        Certified shop fixture - no wire/chain/shackle spec needed. Its weight still counts toward the Rack's total load below.
      </p>
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
            onClick={() => handleWorkpieceChange(jobIndex, wpIndex, 'stringingMethod', method.id)}
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
          ⚠️ NOTICE: Wire strand count below reference value
        </div>
        <p className="text-[11px] text-amber-200/90">
          One or more workpiece lines have wire strand counts below the theoretical safety recommendation. Please review item details.
        </p>
        <ul className="list-disc list-inside text-[10px] space-y-0.5 text-amber-200/80 mt-1">
          {lineDeficiencies.map((detail, idx) => (
            <li key={idx}>{detail.replace(`${linePrefix}: `, '')}</li>
          ))}
        </ul>
      </div>
    )}
  </div>

  {/* Spec & Strands Inputs (Your original layout logic) */}
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
    <div className="grid grid-cols-2 gap-2 bg-slate-900/80 p-2 rounded border border-slate-800">
      <div>
        <label className="block text-[10px] text-slate-400 mb-0.5">
          {wp.hangingPoints === '2' ? 'Point 1 Spec *' : 'Hanging Spec *'}
        </label>
        <select
          value={wp.point1SpecId || ''}
          onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point1SpecId', e.target.value)}
          className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100"
          required
        >
          {RIGGING_SPECS.map(r => (
            <option key={r.id} value={r.id}>{r.label} ({r.swl.toLocaleString()} lb WLL)</option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-[10px] text-slate-400 mb-0.5">Strands / Lines *</label>
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
          <label className="block text-[10px] text-slate-400 mb-0.5">Point 2 Spec *</label>
          <select
            value={wp.point2SpecId || ''}
            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'point2SpecId', e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-1 text-[11px] text-slate-100"
            required
          >
            {RIGGING_SPECS.map(r => (
              <option key={r.id} value={r.id}>{r.label} ({r.swl.toLocaleString()} lb WLL)</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[10px] text-slate-400 mb-0.5">Strands / Lines *</label>
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

  {/* 2. Anchor Shackle & 3/4. Safety Checkboxes */}
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

    <div className="space-y-2 flex flex-col justify-end">
      {/* 3. Secondary Wire Latch */}
      <label className="flex items-start gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={!!wp.secondaryWireLatch}
          onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'secondaryWireLatch', e.target.checked)}
          className="mt-0.5 rounded bg-slate-950 border-slate-700 text-cyan-500 focus:ring-cyan-500/20"
        />
        <div className="text-[10px]">
          <span className="font-medium text-slate-200 group-hover:text-cyan-300">
            Secondary Wire Latch
          </span>
          <p className="text-slate-400">Primary support comes from the chain/shackle; wire is only a secondary backup.</p>
        </div>
      </label>

      {/* 4. Use Wire Extension at Top */}
      <label className="flex items-start gap-2 cursor-pointer group">
        <input
          type="checkbox"
          checked={!!wp.useWireExtensionAtTop}
          onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'useWireExtensionAtTop', e.target.checked)}
          className="mt-0.5 rounded bg-slate-950 border-slate-700 text-amber-500 focus:ring-amber-500/20"
        />
        <div className="text-[10px]">
          <span className="font-medium text-slate-200 group-hover:text-amber-300">
            Use Wire Extension at Top
          </span>
          <p className="text-slate-400">Wire is used above the main hanging point to extend its length.</p>
        </div>
      </label>
    </div>
  </div>

  {wp.useWireExtensionAtTop && (
    <div className="p-2.5 rounded bg-rose-950/40 border border-rose-500/50 text-rose-200 text-[10px] flex items-start gap-2">
      <span>🚨</span>
      <div>
        <strong className="font-bold">Top Wire Extension Warning:</strong>
        The system has automatically switched the overall load bottleneck to the top wire's rated capacity, to prevent a "strong chain, weak wire" failure!
      </div>
    </div>
  )}
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

              {/* Global Job Safety & Submersion Checklist (SOP Inspection) - applies to the whole load, confirmed once at sign-off */}
              <div className="bg-slate-900/80 p-3.5 rounded-lg border border-slate-800 space-y-3">
                <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider block">
                  🛡️ Job Safety & Submersion Checklist (SOP Inspection)
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

                  {/* 4. Angle Check */}
                  <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-300">4. Tilt angle compliant (15°-30°)?</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSafetyFieldChange('isAngleCompliant', true)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          safetyChecklist.isAngleCompliant ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        YES
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSafetyFieldChange('isAngleCompliant', false)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          !safetyChecklist.isAngleCompliant ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        NO
                      </button>
                    </div>
                  </div>

                  {/* 5. Top Clearance Check */}
                  <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-300">5. Min top clearance &ge; 30 cm?</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSafetyFieldChange('minTopClearanceValid', true)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          safetyChecklist.minTopClearanceValid ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        YES (&ge; 30 cm)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSafetyFieldChange('minTopClearanceValid', false)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          !safetyChecklist.minTopClearanceValid ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        NO (&lt; 30 cm)
                      </button>
                    </div>
                  </div>

                  {/* 6. Max Hang Depth Check */}
                  <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-300">6. Max hang depth &le; 300 cm?</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSafetyFieldChange('maxHangDepthValid', true)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          safetyChecklist.maxHangDepthValid ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        YES (&le; 300 cm)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSafetyFieldChange('maxHangDepthValid', false)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          !safetyChecklist.maxHangDepthValid ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        NO (&gt; 300 cm)
                      </button>
                    </div>
                  </div>

 {/* 7. Workpiece Surface Contact Check */}
                  <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
                    <span className="text-slate-300">7. Tight contact between workpieces?</span>
                    <div className="flex gap-2">
                     <button
                        type="button"
                        onClick={() => handleSafetyFieldChange('hasTightContact', false)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          safetyChecklist.hasTightContact === false ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        NO
                      </button>
                     {/* YES button: turns red and shows "Action Required" once selected */}
                      <button
                        type="button"
                        onClick={() => handleSafetyFieldChange('hasTightContact', true)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold transition-colors ${
                          safetyChecklist.hasTightContact === true
                            ? 'bg-rose-600 text-white' 
                            : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                        }`}
                      >
                        {safetyChecklist.hasTightContact === true ? 'YES (Action Required)' : 'YES'}
                      </button>
                    </div>
                  </div>

{/* 8. Anti-Galvanizing Masking Agent Check */}
<div className="space-y-2 col-span-1 md:col-span-2">
  <div className="flex items-center justify-between bg-slate-950 p-2.5 rounded border border-slate-800">
    <span className="text-slate-300">8. Coated with Masking / Stop-off Agent?</span>
    <div className="flex gap-2">
      <button
        type="button"
        onClick={() => handleSafetyFieldChange('hasMaskingAgent', true)}
        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
          safetyChecklist.hasMaskingAgent ? 'bg-amber-600 text-slate-950' : 'bg-slate-900 text-slate-400'
        }`}
      >
        YES
      </button>
      <button
        type="button"
        onClick={() => handleSafetyFieldChange('hasMaskingAgent', false)}
        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
          !safetyChecklist.hasMaskingAgent ? 'bg-slate-700 text-slate-200' : 'bg-slate-900 text-slate-400'
        }`}
      >
        NO
      </button>
    </div>
  </div>

  {/* Racking Direction Notice Card */}
  {safetyChecklist.hasMaskingAgent && (
    <div className="bg-amber-950/40 border border-amber-600/50 rounded p-2.5 text-xs text-amber-200 flex items-start gap-2">
      <span className="text-amber-400 font-bold">⚠️ SOP Notice:</span>
      <div>
        <p className="font-semibold">Position masked areas at the BOTTOM or SIDES during racking.</p>
        <p className="text-[11px] text-amber-300/80 mt-0.5">
          Prevent pre-treatment runoff from dripping onto unmasked steel surfaces.
        </p>
      </div>
    </div>
  )}
</div>

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
  <div className="bg-slate-900/30 p-3 rounded-lg border border-slate-800/60 space-y-2">
    <span className="block text-[11px] font-bold text-slate-400 uppercase">
      ASSISTANT OPERATOR <span className="text-slate-500 font-normal">(OPTIONAL)</span>
    </span>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-[10px] text-slate-500 mb-1 uppercase">Employee ID</label>
        <input
          type="text"
          placeholder="e.g. 8892"
          value={assistantOperatorId}
          onChange={(e) => setAssistantOperatorId(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 font-mono focus:outline-none focus:border-slate-600"
        />
      </div>
      <div>
        <label className="block text-[10px] text-slate-500 mb-1 uppercase">Security PIN</label>
        <input
          type="password"
          maxLength={4}
          placeholder="••••"
          value={assistantPin}
          onChange={(e) => setAssistantPin(e.target.value)}
          className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm text-slate-300 font-mono focus:outline-none focus:border-slate-600"
        />
      </div>
    </div>
  </div>
</div>

{/* Submit Button */}
<button
  type="submit"
  disabled={isFormBlocked}
  className={`w-full py-3.5 font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg transition-all ${
    isFormBlocked
      ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
      : 'bg-cyan-500 hover:bg-cyan-400 text-slate-950 shadow-cyan-500/20 cursor-pointer'
  }`}
>
  {isFormBlocked
    ? '🚨 CANNOT SUBMIT: FIX SAFETY HAZARDS ABOVE'
    : '🚨 Confirm & Sign-off →'}
</button>  
        </div>

   {/* WORKFLOW STEPPER CONTAINER */}   </form>
    </div>
  );
}
