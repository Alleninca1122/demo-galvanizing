import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export default function AdminEmployeeManager() {
  const [employeeId, setEmployeeId] = useState('');
  const [fullName, setFullName] = useState('');
  const [preferredName, setPreferredName] = useState('');
  const [role, setRole] = useState('Operator');
  const [defaultPin, setDefaultPin] = useState('1234');
  
  const [hireDate, setHireDate] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [craneCertified, setCraneCertified] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateEmployee = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const newEmployee = {
      employee_id: employeeId,
      name: fullName,
      preferred_name: preferredName || fullName,
      role: role,
      pin: defaultPin,
      must_change_pin: true,
      hire_date: hireDate || null,
      hourly_rate: hourlyRate ? parseFloat(hourlyRate) : null,
      crane_certified: craneCertified,
      is_active: true,
    };

    try {
      const { error: empError } = await supabase.from('employees').insert([newEmployee]);
      if (empError) throw empError;

      // Provision the matching operators row in the same step, so this one
      // form is the single source of truth for both login (employees) and
      // sign-off / permission checks (operators). role is stored verbatim -
      // same four HR titles used everywhere now, no separate admin/supervisor
      // wording.
      const { error: opError } = await supabase.from('operators').insert([{
        name: `Employee ${employeeId}`,
        role: role,
        pin: defaultPin,
      }]);

      if (opError) {
        // Roll back the employees row so we don't leave a half-provisioned
        // account that can log in but can never sign off.
        await supabase.from('employees').delete().eq('employee_id', employeeId);
        throw opError;
      }

      setMessage(`✅ Employee ${preferredName || fullName} (ID: ${employeeId}) created successfully!`);
      setEmployeeId('');
      setFullName('');
      setPreferredName('');
      setHireDate('');
      setHourlyRate('');
    } catch (err) {
      setMessage('⚠️ Error creating user: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-md max-w-lg mx-auto space-y-4">
      <h2 className="text-sm font-bold text-slate-900 border-b pb-2 uppercase tracking-wide">
        Admin Portal - Provision Employee Account
      </h2>

      <form onSubmit={handleCreateEmployee} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Employee ID *</label>
            <input
              type="text"
              required
              placeholder="e.g. 1007"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl font-mono text-xs focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Initial PIN *</label>
            <input
              type="text"
              required
              maxLength="4"
              value={defaultPin}
              onChange={(e) => setDefaultPin(e.target.value)}
              className="w-full px-3 py-2 border rounded-xl font-mono text-xs focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name *</label>
          <input
            type="text"
            required
            placeholder="e.g. Xiaoming Zhang"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Preferred Short Name / Nickname</label>
          <input
            type="text"
            placeholder="e.g. Xiao"
            value={preferredName}
            onChange={(e) => setPreferredName(e.target.value)}
            className="w-full px-3 py-2 border rounded-xl text-xs focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Role *</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full px-3 py-2 border rounded-xl text-xs bg-white focus:ring-2 focus:ring-cyan-500"
          >
            <option value="Operator">Operator</option>
            <option value="Supervisor">Supervisor</option>
            <option value="Inspector">Inspector</option>
            <option value="Manager">Manager</option>
          </select>
        </div>

        <div className="border-t border-slate-200 pt-3">
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-xs font-bold text-cyan-700 hover:text-cyan-800 flex items-center gap-1 focus:outline-none"
          >
            {showAdvanced ? '▼ Hide Extended HR Fields' : '▶ Expand Extended HR & Safety Fields (Optional)'}
          </button>

          {showAdvanced && (
            <div className="mt-3 p-3 bg-slate-50 rounded-xl space-y-3 border border-slate-200">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hire Date</label>
                  <input
                    type="date"
                    value={hireDate}
                    onChange={(e) => setHireDate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">Hourly Rate ($)</label>
                  <input
                    type="number"
                    step="0.50"
                    placeholder="28.50"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(e.target.value)}
                    className="w-full px-2.5 py-1.5 border rounded-lg text-xs bg-white font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={craneCertified}
                    onChange={(e) => setCraneCertified(e.target.checked)}
                    className="rounded text-cyan-600 focus:ring-cyan-500"
                  />
                  Crane / Hoist Certified
                </label>
              </div>
            </div>
          )}
        </div>

        {message && <p className="text-xs font-medium text-cyan-800 bg-cyan-50 p-2.5 rounded-lg">{message}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2.5 rounded-xl text-xs transition shadow-md disabled:opacity-50"
        >
          {loading ? 'Creating Account...' : 'Create Employee Account'}
        </button>
      </form>
    </div>
  );
}
