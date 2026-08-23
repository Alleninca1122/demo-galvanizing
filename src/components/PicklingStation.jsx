import React, { useState, useEffect, useCallback } from 'react';

// =================================================================
// Stage 02: Pickling Station
// Rack lookup + Stage 01 data pull now wired to real Supabase tables
// (production_loads / production_jobs / production_workpieces /
// production_stage_logs / production_stage_signatures / operators),
// same tables ProductionForm.jsx's Stage 01 submit writes into.
// Actually recording Stage 02 (Pickling) results back to the DB is
// still deferred — handleSubmitPickling below is a local-only
// placeholder until that gets its own atomic submit function,
// mirroring submit_production_load.
// =================================================================

// Human-readable labels for production_stages.stage_code, mirrored here
// so the UI doesn't need a round trip just to explain "where a load is".
const STAGE_LABELS = {
  stage_01: 'Stage 01: Loading',
  stage_02: 'Stage 02: Pickling',
  stage_03: 'Stage 03: Process',
  stage_04: 'Stage 04: Unloading',
};

// Everything needed to render a full Stage 01 summary for a load, in one
// nested select. Stage 02 doesn't have a stage_logs row yet for these loads
// (that only gets created once a Pickling submit function exists), so we
// just pull all stage_logs and pick out the stage_01 one client-side.
const LOAD_SELECT = `
  id,
  load_id,
  loading_method,
  rack_no,
  rack_fixture_type,
  current_location,
  current_stage_code,
  workflow_status,
  created_at,
  production_jobs (
    id,
    customer_name,
    customer_order_no,
    customer_batch_no,
    production_workpieces (
      id,
      workpiece_type,
      quantity,
      unit,
      total_weight_lb,
      unit_weight_lb,
      rigging
    )
  ),
  production_stage_logs (
    id,
    stage_code,
    status,
    is_final_for_stage,
    notes,
    data,
    created_at,
    operators ( name ),
    production_stage_signatures (
      signed_at,
      operators ( name )
    )
  )
`;

function formatRackLabel(rackNo) {
  return `Rack #${String(rackNo).padStart(2, '0')}`;
}

// A query is treated as a Rack # if it's 1-2 digits (matches the padded
// "01".."99" rack numbering); anything else (including a full Load ID like
// "20260823-01-N") is treated as a Load ID lookup — which is the only way
// to find a No Rack (crane-direct) load, since those have no rack_no at all.
function isRackNoQuery(raw) {
  return /^\d{1,2}$/.test(raw.trim());
}

function formatQueryInput(val) {
  if (!val) return '';
  const clean = val.trim();
  if (/^\d{1}$/.test(clean)) return clean.padStart(2, '0');
  return clean;
}

export default function PicklingStation({ currentUser, supabase }) {
  const operator = currentUser || { id: 'UNKNOWN', name: 'UNKNOWN', role: 'OPERATOR_PROCESS' };

  const [inputQuery, setInputQuery] = useState('');
  const [selectedLoad, setSelectedLoad] = useState(null);
  const [searchError, setSearchError] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  const [eligibleLoads, setEligibleLoads] = useState([]);
  const [isLoadingEligible, setIsLoadingEligible] = useState(false);

  const [formData, setFormData] = useState({
    acidTank: 'Acid Tank #1',
    soakDurationMins: '40',
    notes: ''
  });

  // Loads that have finished Stage 01 and haven't moved past it yet — this
  // covers both numbered-rack loads and No Rack (crane-direct) loads, since
  // the filter is on production_loads.current_stage_code / workflow_status,
  // not on rack_no.
  const refreshEligibleLoads = useCallback(async () => {
    if (!supabase) return;
    setIsLoadingEligible(true);
    try {
      const { data, error } = await supabase
        .from('production_loads')
        .select(LOAD_SELECT)
        .eq('current_stage_code', 'stage_01')
        .eq('workflow_status', 'in_progress')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setEligibleLoads(data || []);
    } catch (err) {
      console.warn('Could not fetch loads ready for Pickling:', err);
    } finally {
      setIsLoadingEligible(false);
    }
  }, [supabase]);

  useEffect(() => {
    refreshEligibleLoads();
  }, [refreshEligibleLoads]);

  const handleSearch = async (targetQuery) => {
    if (!supabase) {
      setSearchError('⚠️ Database connection is not available.');
      return;
    }

    const raw = (targetQuery ?? inputQuery).trim();
    const formatted = formatQueryInput(raw);
    setInputQuery(formatted);
    setSearchError('');
    setSelectedLoad(null);

    if (!formatted) {
      setSearchError('⚠️ Please enter a Rack # or Load ID, or choose from the list.');
      return;
    }

    setIsSearching(true);
    try {
      let loadUuid = null;

      if (isRackNoQuery(formatted)) {
        // Resolve via production_rack_current_status first, so a reused
        // Rack # resolves to whichever load currently occupies it — not
        // some earlier load that used to sit on the same number.
        const { data: statusRow, error: statusErr } = await supabase
          .from('production_rack_current_status')
          .select('rack_no, event_type, load_id')
          .eq('rack_no', parseInt(formatted, 10))
          .maybeSingle();
        if (statusErr) throw statusErr;

        if (!statusRow || statusRow.event_type !== 'assigned') {
          setSearchError(`❌ ${formatRackLabel(formatted)} is not currently active (no load assigned).`);
          return;
        }
        loadUuid = statusRow.load_id;
      }

      const query = supabase.from('production_loads').select(LOAD_SELECT);
      const { data: load, error: loadErr } = loadUuid
        ? await query.eq('id', loadUuid).maybeSingle()
        : await query.eq('load_id', formatted).maybeSingle();
      if (loadErr) throw loadErr;

      if (!load) {
        setSearchError(
          isRackNoQuery(formatted)
            ? `❌ ${formatRackLabel(formatted)} is not currently active (no load assigned).`
            : `❌ No active load found for Load ID "${formatted}".`
        );
        return;
      }

      const rackLabel = isRackNoQuery(formatted) ? formatRackLabel(formatted) : `Load ${load.load_id}`;

      if (load.current_stage_code !== 'stage_01') {
        setSearchError(
          `⚠️ ${rackLabel} (${load.load_id}) has already moved past Stage 01 — it's currently at ${STAGE_LABELS[load.current_stage_code] || load.current_stage_code}.`
        );
        return;
      }
      if (load.workflow_status !== 'in_progress') {
        setSearchError(`⚠️ ${rackLabel} (${load.load_id}) is marked "${load.workflow_status}" — check with a supervisor before proceeding.`);
        return;
      }

      setSelectedLoad(load);
    } catch (err) {
      setSearchError('⚠️ Search failed: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSubmitPickling = () => {
    if (!selectedLoad) return;

    // NOTE: local-only for now — this doesn't write to production_stage_logs
    // yet. Recording Stage 02 needs its own atomic submit function (same
    // pattern as submit_production_load) so it can insert the stage log +
    // signatures + advance production_loads.current_stage_code to
    // 'stage_02' in one transaction. That's the next piece of work.
    alert(`✅ (Local only — not yet saved to DB) Step [PICKLING] captured for Load #${selectedLoad.load_id}`);

    setSelectedLoad(null);
    setInputQuery('');
    setFormData({ acidTank: 'Acid Tank #1', soakDurationMins: '40', notes: '' });
  };

  const stage01Log = selectedLoad?.production_stage_logs?.find((l) => l.stage_code === 'stage_01');
  const isCraneDirect = selectedLoad?.loading_method === 'crane_direct';

  return (
    <div className="w-full max-w-6xl mx-auto p-4 bg-slate-900 text-slate-100 rounded-xl shadow-2xl font-sans">

      {/* Header */}
      <div className="flex justify-between items-center pb-4 mb-4 border-b border-slate-800">
        <div>
          <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest">
            Galvanizing Tracking Protocol
          </span>
          <h2 className="text-xl font-bold text-white">Stage 02: Pickling Station - Under Construction</h2>
        </div>

        <div className="text-right">
          <span className="text-xs text-slate-400 block">Operator ID:</span>
          <span className="text-xs font-bold text-cyan-300 font-mono">
            👤 {operator.id}
          </span>
        </div>
      </div>

      {/* Rack / Load Search Area */}
      <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 whitespace-nowrap">
              Ready for Pickling{isLoadingEligible ? ' (loading…)' : ''}:
            </label>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) handleSearch(e.target.value);
              }}
              className="bg-slate-900 border border-slate-700 text-cyan-300 font-mono text-xs rounded-lg px-2 py-2 focus:outline-none focus:border-cyan-500"
            >
              <option value="">-- Choose Rack or No Rack Load --</option>
              {eligibleLoads.map((load) => (
                <option
                  key={load.id}
                  value={load.loading_method === 'crane_direct' ? load.load_id : String(load.rack_no).padStart(2, '0')}
                >
                  {load.loading_method === 'crane_direct' ? 'No Rack' : formatRackLabel(load.rack_no)} — {load.load_id}
                </option>
              ))}
            </select>
          </div>

          <span className="text-slate-600 text-xs hidden sm:inline">OR</span>

          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-slate-400 whitespace-nowrap">
              Rack # or Load ID:
            </label>
            <input
              type="text"
              placeholder="e.g. 05, or 20260823-01-N"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onBlur={() => setInputQuery(formatQueryInput(inputQuery))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="w-44 bg-slate-900 border-2 border-cyan-500 text-cyan-300 font-mono font-bold text-center text-sm rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            />
            <button
              onClick={() => handleSearch()}
              disabled={isSearching}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 text-xs font-bold uppercase rounded-lg shadow-lg cursor-pointer transition-all"
            >
              {isSearching ? 'Loading...' : 'Load'}
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
      {selectedLoad && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* Left Panel: Stage 01 Summary */}
          <div className="lg:col-span-7 bg-slate-950/60 p-4 rounded-xl border border-slate-800">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800 mb-3">
              <span className="text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                📋 {isCraneDirect ? 'No Rack (Crane Direct)' : formatRackLabel(selectedLoad.rack_no)} Summary
              </span>
              <span className="text-[10px] font-mono text-slate-500">{selectedLoad.load_id}</span>
            </div>

            {!isCraneDirect && selectedLoad.rack_fixture_type && selectedLoad.rack_fixture_type !== 'STANDARD' && (
              <div className="mb-3 text-[11px] text-amber-300 bg-amber-950/30 border border-amber-800/60 rounded px-2 py-1">
                Fixture: {selectedLoad.rack_fixture_type === 'HOOK_RACK' ? 'Hook Rack' : selectedLoad.rack_fixture_type}
              </div>
            )}

            <div className="mb-3 bg-slate-900 p-3 rounded-lg border border-slate-800/80 text-xs">
              <div className="flex justify-between text-slate-400 mb-2">
                <span className="font-bold text-slate-200">Step 01: Loading</span>
                <span className="font-mono">
                  {stage01Log ? new Date(stage01Log.created_at).toLocaleString() : '—'}
                </span>
              </div>
              {stage01Log?.operators?.name && (
                <div className="text-slate-500 mb-2">Logged by: {stage01Log.operators.name}</div>
              )}

              <div className="space-y-2">
                {(selectedLoad.production_jobs || []).map((job) => (
                  <div key={job.id} className="bg-slate-950 p-2 rounded border border-slate-800">
                    <div className="flex justify-between items-center mb-1">
                      <strong className="text-slate-200">{job.customer_name || '—'}</strong>
                      <span className="text-slate-500 text-[11px]">
                        {job.customer_order_no || '—'} · {job.customer_batch_no || '#1'}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {(job.production_workpieces || []).map((wp) => (
                        <div key={wp.id} className="flex justify-between items-center bg-slate-900 px-2 py-1 rounded">
                          <span className="text-slate-400">{wp.workpiece_type}</span>
                          <span className="font-mono font-bold text-cyan-300">
                            {wp.quantity} {wp.unit} · {Math.round(wp.total_weight_lb || 0).toLocaleString()} lb
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
                {(selectedLoad.production_jobs || []).length === 0 && (
                  <div className="text-slate-500 text-[11px]">No job/workpiece records found for this load.</div>
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
                  <h3 className="text-base font-bold text-white">⚡ Perform Step 02: Pickling</h3>
                </div>
                <span className="text-xs bg-cyan-950 text-cyan-300 font-mono font-bold px-2.5 py-1 rounded border border-cyan-800">
                  {isCraneDirect ? 'No Rack' : formatRackLabel(selectedLoad.rack_no)}
                </span>
              </div>

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
                onClick={handleSubmitPickling}
                className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider rounded-lg shadow-lg cursor-pointer transition-all"
              >
                Confirm & Save Step [PICKLING] →
              </button>
            </div>
          </div>

        </div>
      )}

    </div>
  );
}
