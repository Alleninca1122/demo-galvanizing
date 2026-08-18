import React, { useState } from 'react';

// =================================================================
// Active Shop-Floor Racks Data Structure
// =================================================================
const INITIAL_ACTIVE_RACKS = {
  '01': {
    rackNo: '01',
    status: 'IN_PROGRESS',
    loadingData: {
      timestamp: '2026-07-26 08:30',
      operator: 'EMP-101',
      totalWeight: '3.20',
      items: [
        { customer: 'ABC Steel', batch: 'B-2026-01', material: 'Tube', qty: 15, isRush: true },
        { customer: 'XYZ Metal', batch: 'PO-8821', material: 'Angle', qty: 20, isRush: false }
      ]
    },
    picklingData: null,
    dippingData: null,
    unloadingData: null
  },
  '05': {
    rackNo: '05',
    status: 'IN_PROGRESS',
    loadingData: {
      timestamp: '2026-07-26 09:00',
      operator: 'EMP-105',
      totalWeight: '4.10',
      items: [
        { customer: 'Apex Fab', batch: 'BATCH-99', material: 'Pipe', qty: 50, isRush: false }
      ]
    },
    picklingData: {
      timestamp: '2026-07-26 09:40',
      operator: 'EMP-202',
      acidTank: 'Acid Tank #2',
      durationMins: '45'
    },
    dippingData: null,
    unloadingData: null
  }
};

export default function NextStepProcessPortal({ currentUser }) {
  // Uses authenticated user session; falls back to empty fields if missing
  const operator = currentUser || { id: 'UNKNOWN', name: 'UNKNOWN', role: 'OPERATOR_PROCESS' };

  const [activeRacks, setActiveRacks] = useState(INITIAL_ACTIVE_RACKS);
  const [inputRackNo, setInputRackNo] = useState('');
  const [selectedRack, setSelectedRack] = useState(null);
  const [currentAutoStage, setCurrentAutoStage] = useState('');
  const [searchError, setSearchError] = useState('');

  const [formData, setFormData] = useState({
    acidTank: 'Acid Tank #1',
    soakDurationMins: '40',
    zincTemp: '450',
    dipDurationSecs: '240',
    defectQty: '0',
    notes: ''
  });

  // Poka-Yoke Auto Formatting (e.g., "1" -> "01")
  const formatRackInput = (val) => {
    if (!val) return '';
    const clean = val.trim();
    if (/^\d{1}$/.test(clean)) {
      return clean.padStart(2, '0');
    }
    return clean;
  };

  // Auto-determine next pending stage based on rack history
  const determineNextStage = (rackRecord) => {
    if (!rackRecord.picklingData) {
      return 'PICKLING';
    } else if (!rackRecord.dippingData) {
      return 'DIPPING';
    } else if (!rackRecord.unloadingData) {
      return 'UNLOADING';
    } else {
      return 'COMPLETED';
    }
  };

  const handleSearchRack = (targetRack) => {
    const queryKey = formatRackInput(targetRack || inputRackNo);
    setInputRackNo(queryKey);
    setSearchError('');

    if (!queryKey) {
      setSearchError('⚠️ Please enter or select a Rack ID.');
      return;
    }
    
    const record = activeRacks[queryKey];

    if (record) {
      setSelectedRack(record);
      const nextStage = determineNextStage(record);
      setCurrentAutoStage(nextStage);
    } else {
      setSelectedRack(null);
      setCurrentAutoStage('');
      setSearchError(`❌ Rack #${queryKey} is not active or empty.`);
    }
  };

  const handleSubmitProcess = () => {
    if (!selectedRack || !currentAutoStage) return;

    const rackNo = selectedRack.rackNo;
    const updatedRack = { ...selectedRack };

    if (currentAutoStage === 'PICKLING') {
      updatedRack.picklingData = {
        timestamp: new Date().toLocaleString(),
        operator: operator.id,
        acidTank: formData.acidTank,
        durationMins: formData.soakDurationMins,
        notes: formData.notes
      };
    } else if (currentAutoStage === 'DIPPING') {
      updatedRack.dippingData = {
        timestamp: new Date().toLocaleString(),
        operator: operator.id,
        zincTemp: formData.zincTemp,
        dipDurationSecs: formData.dipDurationSecs,
        notes: formData.notes
      };
    } else if (currentAutoStage === 'UNLOADING') {
      updatedRack.unloadingData = {
        timestamp: new Date().toLocaleString(),
        operator: operator.id,
        defectQty: formData.defectQty,
        notes: formData.notes
      };
      updatedRack.status = 'COMPLETED';
    }

    setActiveRacks(prev => ({ ...prev, [rackNo]: updatedRack }));
    
    alert(`✅ Step [${currentAutoStage}] successfully recorded for Rack #${rackNo}!`);

    setSelectedRack(null);
    setInputRackNo('');
    setFormData({
      acidTank: 'Acid Tank #1',
      soakDurationMins: '40',
      zincTemp: '450',
      dipDurationSecs: '240',
      defectQty: '0',
      notes: ''
    });
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-slate-900 text-slate-100 rounded-xl shadow-2xl font-sans">
      
      {/* Header */}
      <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            Galvanizing Tracking Protocol
          </span>
          <h2 className="text-xl font-bold text-white">Execution Station ( Coming Soon / Under Construction )</h2>
        </div>
        
        <div className="text-right">
          <span className="text-xs text-slate-400 block">Operator ID:</span>
          <span className="text-xs font-bold text-cyan-300 font-mono">
            👤 {operator.id}
          </span>
        </div>
      </div>

      {/* Rack Search Area */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 whitespace-nowrap">
              Active Racks:
            </label>
            <select
              value={selectedRack?.rackNo || ''}
              onChange={(e) => {
                if (e.target.value) {
                  setInputRackNo(e.target.value);
                  handleSearchRack(e.target.value);
                }
              }}
              className="bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-cyan-500"
            >
              <option value="">-- Choose Active Rack --</option>
              {Object.keys(activeRacks).map((rackNo) => (
                <option key={rackNo} value={rackNo}>
                  Rack #{rackNo} ({determineNextStage(activeRacks[rackNo])})
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-600 text-xs hidden sm:inline">OR</span>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 whitespace-nowrap">
              Input #:
            </label>
            <input
              type="text"
              placeholder="e.g. 1, 05"
              value={inputRackNo}
              onChange={(e) => setInputRackNo(e.target.value)}
              onBlur={() => setInputRackNo(formatRackInput(inputRackNo))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearchRack()}
              className="w-24 bg-slate-900 border-2 border-cyan-500 text-cyan-300 font-mono font-bold text-center text-lg rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <button
              onClick={() => handleSearchRack()}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 text-xs font-bold uppercase rounded-lg shadow-lg cursor-pointer transition-all"
            >
              Load
            </button>
          </div>
        </div>
      </div>

      {searchError && (
        <div className="p-4 bg-rose-950/40 border border-rose-800 rounded-lg text-rose-300 text-sm mb-6">
          {searchError}
        </div>
      )}

      {/* Main Layout */}
      {selectedRack && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Panel: Rack Progress History */}
          <div className="lg:col-span-7 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-3">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                📋 Rack #{selectedRack.rackNo} Progress History
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
                Next Action: <strong className="text-cyan-300">{currentAutoStage}</strong>
              </span>
            </div>

            {/* Step 01 */}
            <div className="mb-3 bg-slate-900 p-3 rounded-lg border border-slate-800/80 text-xs">
              <div className="flex justify-between text-slate-400 mb-2">
                <span className="font-bold text-slate-200">Step 01: Loading</span>
                <span className="font-mono">{selectedRack.loadingData.timestamp}</span>
              </div>
              <div className="space-y-1">
                {selectedRack.loadingData.items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center bg-slate-950 p-2 rounded border border-slate-800">
                    <div>
                      <strong className="text-slate-200">{item.customer}</strong>
                      <span className="text-slate-400 ml-2">[{item.material}]</span>
                      <span className="text-slate-500 ml-2">{item.batch}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.isRush && <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800 px-1 py-0.5 rounded font-bold">RUSH</span>}
                      <span className="font-mono font-bold text-cyan-300">{item.qty} pcs</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Step 02 */}
            <div className="mb-3 bg-slate-900 p-3 rounded-lg border border-slate-800/80 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200">Step 02: Pickling</span>
                {selectedRack.picklingData ? (
                  <span className="text-emerald-400 font-mono font-bold">✓ PASSED</span>
                ) : (
                  <span className="text-amber-400 font-mono">⏳ PENDING</span>
                )}
              </div>
              {selectedRack.picklingData && (
                <p className="text-slate-400 mt-1">
                  Tank: {selectedRack.picklingData.acidTank} | Time: {selectedRack.picklingData.durationMins} mins | Operator: {selectedRack.picklingData.operator}
                </p>
              )}
            </div>

            {/* Step 03 */}
            <div className="mb-3 bg-slate-900 p-3 rounded-lg border border-slate-800/80 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200">Step 03: Dipping</span>
                {selectedRack.dippingData ? (
                  <span className="text-emerald-400 font-mono font-bold">✓ PASSED</span>
                ) : (
                  <span className="text-amber-400 font-mono">⏳ PENDING</span>
                )}
              </div>
              {selectedRack.dippingData && (
                <p className="text-slate-400 mt-1">
                  Temp: {selectedRack.dippingData.zincTemp}°C | Time: {selectedRack.dippingData.dipDurationSecs}s | Operator: {selectedRack.dippingData.operator}
                </p>
              )}
            </div>

            {/* Step 04 */}
            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80 text-xs">
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-200">Step 04: QC & Unloading</span>
                {selectedRack.unloadingData ? (
                  <span className="text-emerald-400 font-mono font-bold">✓ COMPLETED</span>
                ) : (
                  <span className="text-amber-400 font-mono">⏳ PENDING</span>
                )}
              </div>
            </div>

          </div>

          {/* Right Panel: Active Action Form */}
          <div className="lg:col-span-5 bg-slate-950 p-4 rounded-xl border border-cyan-800/80 flex flex-col justify-between">
            <div>
              <div className="pb-3 border-b border-slate-800 mb-4 flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 uppercase tracking-widest block">Action Required</span>
                  <h3 className="text-base font-bold text-white">
                    {currentAutoStage === 'PICKLING' && '⚡ Perform Step 02: Pickling'}
                    {currentAutoStage === 'DIPPING' && '🔥 Perform Step 03: Dipping'}
                    {currentAutoStage === 'UNLOADING' && '📦 Perform Step 04: QC & Unloading'}
                    {currentAutoStage === 'COMPLETED' && '🎉 All Steps Completed'}
                  </h3>
                </div>
                <span className="text-xs bg-cyan-950 text-cyan-300 font-mono font-bold px-2.5 py-1 rounded border border-cyan-800">
                  Rack #{selectedRack.rackNo}
                </span>
              </div>

              {currentAutoStage === 'PICKLING' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Acid Tank Selected:</label>
                    <select
                      value={formData.acidTank}
                      onChange={(e) => setFormData({ ...formData, acidTank: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white"
                    >
                      <option>Acid Tank #1 (HCl 12%)</option>
                      <option>Acid Tank #2 (HCl 15%)</option>
                      <option>Acid Tank #3 (Degreasing)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Soak Duration (Mins):</label>
                    <input
                      type="number"
                      value={formData.soakDurationMins}
                      onChange={(e) => setFormData({ ...formData, soakDurationMins: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>
              )}

              {currentAutoStage === 'DIPPING' && (
                <div className="space-y-3 text-xs">
                  <div>
                    <label className="block text-slate-400 mb-1">Zinc Kettle Temp (°C):</label>
                    <input
                      type="number"
                      value={formData.zincTemp}
                      onChange={(e) => setFormData({ ...formData, zincTemp: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Dipping Duration (Secs):</label>
                    <input
                      type="number"
                      value={formData.dipDurationSecs}
                      onChange={(e) => setFormData({ ...formData, dipDurationSecs: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>
              )}

              {currentAutoStage === 'UNLOADING' && (
                <div className="space-y-3 text-xs">
                  <div className="p-2.5 bg-emerald-950/30 border border-emerald-800/50 rounded text-emerald-300">
                    <p className="font-semibold">Final Step: Unload & Release Rack</p>
                    <p className="text-[11px] text-emerald-400/80 mt-1">Submitting will mark Rack #{selectedRack.rackNo} as EMPTY for the next loading cycle.</p>
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">Defect / Re-galvanize Pcs:</label>
                    <input
                      type="number"
                      value={formData.defectQty}
                      onChange={(e) => setFormData({ ...formData, defectQty: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>
              )}

              {currentAutoStage !== 'COMPLETED' && (
                <div className="mt-3">
                  <label className="block text-slate-400 text-xs mb-1">Operator Notes:</label>
                  <textarea
                    placeholder="Optional notes..."
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                  ></textarea>
                </div>
              )}

            </div>

            {currentAutoStage !== 'COMPLETED' ? (
              <div className="pt-4 border-t border-slate-800 mt-4">
                <button
                  onClick={handleSubmitProcess}
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg cursor-pointer transition-all"
                >
                  Confirm & Save Step [{currentAutoStage}] →
                </button>
              </div>
            ) : (
              <div className="p-3 bg-slate-900 border border-slate-800 rounded text-center text-xs text-slate-400 mt-4">
                This rack has finished all processing steps.
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}