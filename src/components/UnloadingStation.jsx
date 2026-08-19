import React, { useState } from 'react';

// =================================================================
// Stage 04: Unloading Station
// Shares the same activeRacks registry lifted up to App.jsx (see
// PicklingStation.jsx for the rationale). Still mock data for now.
// Unloading marks the rack COMPLETED but keeps it in activeRacks so
// its history stays visible (release/re-use of the physical Rack #
// is a separate concern from clearing this record).
// =================================================================
export default function UnloadingStation({ currentUser, activeRacks, setActiveRacks }) {
  const operator = currentUser || { id: 'UNKNOWN', name: 'UNKNOWN', role: 'OPERATOR_PROCESS' };

  const [inputRackNo, setInputRackNo] = useState('');
  const [selectedRack, setSelectedRack] = useState(null);
  const [searchError, setSearchError] = useState('');

  const [formData, setFormData] = useState({
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

  // Racks eligible for Unloading: Dipping is done, Unloading isn't yet
  const eligibleRacks = Object.keys(activeRacks).filter(
    (rackNo) => activeRacks[rackNo].dippingData && !activeRacks[rackNo].unloadingData
  );

  const handleSearchRack = (targetRack) => {
    const queryKey = formatRackInput(targetRack || inputRackNo);
    setInputRackNo(queryKey);
    setSearchError('');

    if (!queryKey) {
      setSearchError('⚠️ Please enter or select a Rack ID.');
      return;
    }

    const record = activeRacks[queryKey];

    if (!record) {
      setSelectedRack(null);
      setSearchError(`❌ Rack #${queryKey} is not active or empty.`);
      return;
    }
    if (!record.dippingData) {
      setSelectedRack(null);
      setSearchError(`❌ Rack #${queryKey} hasn't completed Stage 03 Dipping yet.`);
      return;
    }
    if (record.unloadingData) {
      setSelectedRack(null);
      setSearchError(`⚠️ Rack #${queryKey} has already been unloaded.`);
      return;
    }

    setSelectedRack(record);
  };

  const handleSubmitUnloading = () => {
    if (!selectedRack) return;
    const rackNo = selectedRack.rackNo;

    const updatedRack = {
      ...selectedRack,
      status: 'COMPLETED',
      unloadingData: {
        timestamp: new Date().toLocaleString(),
        operator: operator.id,
        defectQty: formData.defectQty,
        notes: formData.notes
      }
    };

    setActiveRacks(prev => ({ ...prev, [rackNo]: updatedRack }));

    alert(`✅ Step [UNLOADING] successfully recorded for Rack #${rackNo}! Job complete.`);

    setSelectedRack(null);
    setInputRackNo('');
    setFormData({ defectQty: '0', notes: '' });
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-slate-900 text-slate-100 rounded-xl shadow-2xl font-sans">

      {/* Header */}
      <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            Galvanizing Tracking Protocol
          </span>
          <h2 className="text-xl font-bold text-white">Stage 04: Unloading Station</h2>
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
              Racks Ready for Unloading:
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
              <option value="">-- Choose Rack --</option>
              {eligibleRacks.map((rackNo) => (
                <option key={rackNo} value={rackNo}>Rack #{rackNo}</option>
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

          {/* Left Panel: Rack Progress So Far (up to, not including, Unloading) */}
          <div className="lg:col-span-7 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-3">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                📋 Rack #{selectedRack.rackNo} Summary
              </span>
            </div>

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

            <div className="mb-3 bg-slate-900 p-3 rounded-lg border border-slate-800/80 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-bold text-emerald-300">✓ Step 02: Pickling — PASSED</span>
                <span className="font-mono">{selectedRack.picklingData.timestamp}</span>
              </div>
              <div className="mt-1 text-slate-400">
                {selectedRack.picklingData.acidTank} · {selectedRack.picklingData.durationMins} min
                {selectedRack.picklingData.notes && (
                  <span className="block text-slate-500 mt-1">Note: {selectedRack.picklingData.notes}</span>
                )}
              </div>
            </div>

            <div className="bg-slate-900 p-3 rounded-lg border border-slate-800/80 text-xs">
              <div className="flex justify-between items-center text-slate-400">
                <span className="font-bold text-emerald-300">✓ Step 03: Dipping — PASSED</span>
                <span className="font-mono">{selectedRack.dippingData.timestamp}</span>
              </div>
              <div className="mt-1 text-slate-400">
                {selectedRack.dippingData.zincTempC}°C · {selectedRack.dippingData.durationSecs} sec
                {selectedRack.dippingData.notes && (
                  <span className="block text-slate-500 mt-1">Note: {selectedRack.dippingData.notes}</span>
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
                  <h3 className="text-base font-bold text-white">⚡ Perform Step 04: Unloading</h3>
                </div>
                <span className="text-xs bg-cyan-950 text-cyan-300 font-mono font-bold px-2.5 py-1 rounded border border-cyan-800">
                  Rack #{selectedRack.rackNo}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-slate-400 mb-1">Defect / Reject Qty:</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.defectQty}
                    onChange={(e) => setFormData({ ...formData, defectQty: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Operator Notes:</label>
                  <textarea
                    placeholder="Optional notes..."
                    rows="2"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 rounded px-3 py-1.5 text-xs text-white"
                  ></textarea>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 mt-4">
              <button
                onClick={handleSubmitUnloading}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg cursor-pointer transition-all"
              >
                Confirm & Save Step [UNLOADING] →
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
