import React, { useState } from 'react';

// Standard Galvanizing Workpiece Types
const WORKPIECE_TYPES = [
  'Anchor', 'Angle', 'Beam', 'Bracket', 'Frame', 
  'Grating', 'Ladder', 'Mesh', 'Pipe', 'Plate', 
  'Pole', 'Railing', 'Rebar', 'Rod', 'Tube', 'Washer', 'Others'
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

// Rigging Specifications (SWL per strand in lbs)
const RIGGING_SPECS = [
  { id: '14_WIRE', label: '14 Gauge Wire', type: 'WIRE', swl: 50 },
  { id: '12_WIRE', label: '12 Gauge Wire', type: 'WIRE', swl: 75 },
  { id: '10_WIRE', label: '10 Gauge Wire', type: 'WIRE', swl: 150 },
  { id: '38_CHAIN', label: '3/8" High Test Chain', type: 'CHAIN', swl: 4000 },
  { id: '12_CHAIN', label: '1/2" High Test Chain', type: 'CHAIN', swl: 6500 },
  { id: 'CLAMP', label: 'Heavy Duty Lifting Clamp', type: 'CLAMP', swl: 10000 },
];

// Surface Condition Rating Options (Clean & Standardized)
const SURFACE_CONDITION_OPTIONS = [
  { value: 'NONE', label: 'None (Clean)' },
  { value: 'LIGHT', label: 'Light' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'HEAVY', label: 'Heavy' }
];

export default function ProductionForm({ currentUser, supabase }) {
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
    minTopClearanceValid: true,    // 5. Min top clearance >= 50cm
    maxHangDepthValid: true,       // 6. Max hang depth <= 300cm
    hasTightContact: false,        // 7. Tight contact between workpieces
    hasMaskingAgent: false         // 8. Coated with masking/stop-off agent
  });

  const handleSafetyFieldChange = (field, value) => {
    setSafetyChecklist(prev => ({ ...prev, [field]: value }));
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
    // Surface Condition Inspection
    oilPaintLevel: '',
    rustLevel: '',
    // Note: SOP & Safety Checklist moved to global `safetyChecklist` state (shared across all jobs)
    workpieces: [
      {
        id: Date.now() + 1,
        workpieceType: '',
        quantity: '',
        unit: 'pcs',
        weightLb: '', 
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

      let generated = '';
      if (selectedVal === 'HOOK') {
        generated = `H00-${year}${month}${day}-${dailySeq}`;
      } else {
        generated = `R${selectedVal}-${year}${month}${day}-${dailySeq}`;
      }

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
      quantity: '',
      unit: 'pcs',
      weightLb: '',
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

  // Wire Strand Safety Check Warnings (Non-blocking warning)
  const checkSafetyDeficiencies = () => {
    let deficiencies = [];
    jobs.forEach((job, jIdx) => {
      job.workpieces.forEach((wp, wIdx) => {
        const totalW = parseFloat(wp.weightLb) || 0;
        const qty = parseInt(wp.quantity, 10) || 1;
        const unitW = totalW / qty;
        const pts = parseInt(wp.hangingPoints, 10) || 1;

        const loadPerPt = wp.hangingMode === 'STRING' ? (totalW / pts) : (unitW / pts);

        const p1Obj = RIGGING_SPECS.find(r => r.id === wp.point1SpecId) || RIGGING_SPECS[0];
        const p1Req = Math.max(1, Math.ceil(loadPerPt / p1Obj.swl));
        const p1User = parseInt(wp.point1Strands, 10) || 0;
        if (p1Obj.type === 'WIRE' && p1User > 0 && p1User < p1Req) {
          deficiencies.push(`Job #${jIdx + 1} Line #${wIdx + 1} (${wp.workpieceType || 'Item'}): Point 1 wire count (${p1User}) is lower than recommended (${p1Req}).`);
        }

        if (pts === 2) {
          const p2Obj = RIGGING_SPECS.find(r => r.id === wp.point2SpecId) || RIGGING_SPECS[0];
          const p2Req = Math.max(1, Math.ceil(loadPerPt / p2Obj.swl));
          const p2User = parseInt(wp.point2Strands, 10) || 0;
          if (p2Obj.type === 'WIRE' && p2User > 0 && p2User < p2Req) {
            deficiencies.push(`Job #${jIdx + 1} Line #${wIdx + 1} (${wp.workpieceType || 'Item'}): Point 2 wire count (${p2User}) is lower than recommended (${p2Req}).`);
          }
        }
      });
    });
    return deficiencies;
  };

  // Severe Safety Violations Check (Hard Blocking Logic) - now based on the single global checklist
  const checkCriticalSafetyViolations = () => {
    let severeErrors = [];
    // Check 1: Cavity without venting & without onsite drilling
    if (safetyChecklist.hasEnclosedCavity && (!safetyChecklist.hasAdequateVenting && !safetyChecklist.drilledOnsite)) {
      severeErrors.push(`Enclosed cavity detected without sufficient venting/drainage holes, and not drilled on site! (Explosion Risk in Kettle)`);
    }
    // Check 2: Minimum Top Clearance violation (< 50cm)
    if (!safetyChecklist.minTopClearanceValid) {
      severeErrors.push(`Top clearance is less than 50 cm. Material cannot be fully submerged in acid/zinc bath.`);
    }
    // Check 3: Maximum Hang Depth violation (> 300cm)
    if (!safetyChecklist.maxHangDepthValid) {
      severeErrors.push(`Total hang depth exceeds 300 cm. Risk of bottom collision or crane overhead snagging.`);
    }
    return severeErrors;
  };

  const deficiencies = checkSafetyDeficiencies();
  const criticalViolations = checkCriticalSafetyViolations();
  const isFormBlocked = criticalViolations.length > 0;

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
        rackNo: rackNo === 'HOOK' ? 'HOOK' : `Rack #${rackNo}`,
        operatorId: currentUser?.id || 'UNKNOWN',
        signedOffByEmployeeId: primaryOperatorId.trim(),
        assistantOperatorId: assistantOperatorId.trim() || null,
        shift: getShiftDisplay(),
        entryDate: currentDateFormatted,
        createdAt: new Date().toISOString(),
        // Job Safety & Submersion Checklist (SOP Inspection) - one shared checklist for the whole load
        safetyChecklist: { ...safetyChecklist }
      },
      jobs: jobs.map(job => ({
        customerName: job.customerName,
        customerOrderNo: job.customerOrderNo,
        customerBatchNo: job.customerBatchNo || '#1',
        surfaceAssessment: {
          oilPaintLevel: job.oilPaintLevel,
          rustLevel: job.rustLevel
        },
        workpieces: job.workpieces.map(wp => {
          const totalW = parseInt(wp.weightLb, 10) || 0;
          const qty = parseInt(wp.quantity, 10) || 0;
          const unitW = qty > 0 ? Math.round(totalW / qty) : 0;
          return {
            workpieceType: wp.workpieceType,
            quantity: qty,
            unit: wp.unit || 'pcs',
            totalWeightLb: totalW,
            unitWeightLb: unitW,
            rigging: {
              hangingMode: wp.hangingMode,
              hangingPoints: parseInt(wp.hangingPoints, 10),
              point1: { spec: wp.point1SpecId, strands: parseInt(wp.point1Strands, 10) || 0 },
              point2: wp.hangingPoints === '2' ? { spec: wp.point2SpecId, strands: parseInt(wp.point2Strands, 10) || 0 } : null
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
    setJobs([createNewJob()]);
  };

  return (
    <div className="w-full max-w-5xl mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl font-sans text-slate-100">
      
      {/* Header */}
      <div className="border-b border-slate-800 pb-4 mb-6 flex justify-between items-center">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block">
            Step 01: Loading Station
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

        {/* SOP OPERATING GUIDELINES CARD */}
        <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80">
            <span className="text-sm">📋</span>
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">
              SOP OPERATING GUIDELINES & INSPECTION STANDARDS
            </h3>
          </div>

          {/* CRITICAL SAFETY BLOCKING WARNING */}
          {criticalViolations.length > 0 && (
            <div className="p-3.5 bg-rose-950/80 border-2 border-rose-600 rounded-lg text-rose-200 text-xs space-y-1.5 animate-pulse">
              <div className="font-extrabold text-rose-300 text-sm flex items-center gap-2">
                🚨 CRITICAL SAFETY HAZARD DETECTED - SUBMISSION BLOCKED
              </div>
              <ul className="list-disc list-inside text-[11px] space-y-1 text-rose-200">
                {criticalViolations.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}

          {/* NON-BLOCKING RIGGING STRAND WARNING */}
          {deficiencies.length > 0 && criticalViolations.length === 0 && (
            <div className="p-3 bg-amber-950/70 border border-amber-800 rounded-lg text-amber-200 text-xs space-y-1">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                ⚠️ NOTICE: Wire strand count below reference value
              </div>
              <p className="text-[11px] text-amber-200/90">
                One or more workpiece lines have wire strand counts below the theoretical safety recommendation. Please review item details.
              </p>
            </div>
          )}

          {/* 4-STEP SOP REFERENCE GRID */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            {/* Step 1: Venting & Drainage */}
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
              <div className="font-bold text-cyan-400">1. Cavity Venting & Drainage</div>
              <p className="text-[11px] text-slate-300">
                Check hollow/pipe structures. Ensure vent & drain holes are present at opposite ends (min 1/2" / 13mm). Drill on site if missing to prevent explosion in 450°C kettle!
              </p>
            </div>

            {/* Step 2: Surface Assessment */}
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
              <div className="font-bold text-cyan-400">2. Surface Condition Assessment</div>
              <p className="text-[11px] text-slate-300">
                Inspect oil, paint, and rust levels (None / Light / Medium / Heavy). Record accurately to alert pickling operators for degreasing & acid immersion times.
              </p>
            </div>

            {/* Step 3: Hanging Angle */}
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
              <div className="font-bold text-cyan-400">3. Hanging Tilt Angle</div>
              <p className="text-[11px] text-slate-300">
                Maintain a <strong>15° - 30° tilt angle</strong> for smooth zinc flow & drainage. Adjust front/rear wire or chain lengths based on attachment point spacing.
              </p>
            </div>

            {/* Step 4: Clearance Limits */}
            <div className="p-3 bg-slate-900/60 rounded-lg border border-slate-800 space-y-1">
              <div className="font-bold text-cyan-400">4. Physical Clearance Limits</div>
              <p className="text-[11px] text-slate-300">
                • <strong>Min Top Clearance &ge; 50 cm</strong>: Ensures full submersion in tank.<br/>
                • <strong>Max Hang Depth &le; 300 cm</strong>: Prevents bottoming out or overhead crane snagging.
              </p>
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

              {/* Surface Assessment Section */}
              <div className="bg-slate-900/50 p-3 rounded-lg border border-slate-800/80 space-y-2">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
                  🔍 Surface Assessment (Oil, Paint & Rust Level)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">   
<div>
  <label className="block text-[11px] text-slate-400 mb-1">
    Oil / Paint Level<span className="text-rose-400">*</span>
  </label>
  <select
    value={job.oilPaintLevel}
    onChange={(e) => handleJobFieldChange(jobIndex, 'oilPaintLevel', e.target.value)}
    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
    required
  >
    <option value="">-- Select --</option>
    {SURFACE_CONDITION_OPTIONS.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
</div>
<div>
  <label className="block text-[11px] text-slate-400 mb-1">
    Rust Level<span className="text-rose-400">*</span>
  </label>
  <select
    value={job.rustLevel}
    onChange={(e) => handleJobFieldChange(jobIndex, 'rustLevel', e.target.value)}
    className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200"
    required
  >
    <option value="">-- Select --</option>
    {SURFACE_CONDITION_OPTIONS.map(opt => (
      <option key={opt.value} value={opt.value}>{opt.label}</option>
    ))}
  </select>
</div>
                </div>
              </div>


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
                  const totalW = parseFloat(wp.weightLb) || 0;
                  const qty = parseInt(wp.quantity, 10) || 0;
                  const unitW = qty > 0 && totalW > 0 ? Math.round(totalW / qty) : 0;

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
                            <label className="block text-[11px] text-slate-400">Total Weight (lb)</label>
                            {unitW > 0 && (
                              <span className="text-[10px] text-cyan-400 font-mono font-bold">
                                {unitW} lb/pc
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            placeholder="Total lbs"
                            value={wp.weightLb}
                            onChange={(e) => handleWorkpieceChange(jobIndex, wpIndex, 'weightLb', e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-100 focus:outline-none focus:border-cyan-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />
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
        { id: 'CHAIN_WIRE', label: 'Chain + Wire', desc: 'Chain + Wire' },
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
          {RIGGING_SPECS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
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
            {RIGGING_SPECS.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
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
        <option value="NONE">-- None (Direct Chain / Slot Hooking) --</option>
        <option value="1.0T">1.0 Ton WLL Anchor Shackle (2,200 lbs)</option>
        <option value="2.0T">2.0 Ton WLL Anchor Shackle (4,400 lbs)</option>
        <option value="3.25T">3.25 Ton WLL Anchor Shackle (7,150 lbs)</option>
        <option value="4.75T">4.75 Ton WLL Anchor Shackle (10,450 lbs)</option>
        <option value="6.5T">6.5 Ton WLL Anchor Shackle (14,300 lbs)</option>
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
                    <span className="text-slate-300">5. Min top clearance &ge; 50 cm?</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSafetyFieldChange('minTopClearanceValid', true)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          safetyChecklist.minTopClearanceValid ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        YES (&ge; 50 cm)
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSafetyFieldChange('minTopClearanceValid', false)}
                        className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                          !safetyChecklist.minTopClearanceValid ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400'
                        }`}
                      >
                        NO (&lt; 50 cm)
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

      </form>
    </div>
  );
}
