import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

// Small inline eye / eye-off icon so this component has no extra icon-library
// dependency. Toggled purely by className, not by swapping SVGs.
function EyeIcon({ visible }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="w-4 h-4"
    >
      <path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z" />
      <circle cx="12" cy="12" r="3" />
      {!visible && <line x1="2" y1="2" x2="22" y2="22" />}
    </svg>
  );
}

export function ForceChangePinModal({ currentUser, onPinUpdated }) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showNewPin, setShowNewPin] = useState(false);
  const [showConfirmPin, setShowConfirmPin] = useState(false);

  const handlePinUpdate = async (e) => {
    e.preventDefault();
    setError('');

    if (newPin.length !== 4) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    if (newPin === '1234') {
      setError('Please choose a PIN other than default 1234');
      return;
    }
    if (newPin !== confirmPin) {
      setError('PINs do not match');
      return;
    }

    setLoading(true);

    try {
      // Capture the current PIN before overwriting it, so a failed operators
      // update can be rolled back to exactly what it was before this attempt.
      const { data: beforeRow, error: readError } = await supabase
        .from('employees')
        .select('pin')
        .eq('employee_id', currentUser.employee_id)
        .maybeSingle();

      if (readError) throw readError;
      const originalPin = beforeRow?.pin;

      const { error: empError } = await supabase
        .from('employees')
        .update({ pin: newPin, must_change_pin: false })
        .eq('employee_id', currentUser.employee_id);

      if (empError) throw empError;

      // Keep operators in sync - sign-off in ProductionForm checks the PIN
      // against operators, not employees, so both must hold the new PIN.
      const { error: opError } = await supabase
        .from('operators')
        .update({ pin: newPin })
        .eq('name', `Employee ${currentUser.employee_id}`);

      if (opError) {
        // Roll employees back to its pre-update state so the two tables
        // never end up holding different PINs for the same person - a
        // failed attempt should look like it never happened, not leave the
        // account half-updated.
        await supabase
          .from('employees')
          .update({ pin: originalPin, must_change_pin: true })
          .eq('employee_id', currentUser.employee_id);
        throw opError;
      }

      alert('PIN updated successfully! Please log in with your new PIN.');
      onPinUpdated();
    } catch (err) {
      setError('Failed to update PIN: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex justify-center items-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
        <div className="text-center">
          <h3 className="text-base font-bold text-slate-900">First-Time Setup Required</h3>
          <p className="text-xs text-slate-500 mt-1">
            Welcome, <span className="font-semibold text-slate-800">{currentUser.preferred_name || currentUser.name}</span>!
            Please set your personal 4-digit PIN.
          </p>
        </div>

        <form onSubmit={handlePinUpdate} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Enter New 4-Digit PIN
            </label>
            <div className="relative">
              <input
                type={showNewPin ? 'text' : 'password'}
                maxLength="4"
                required
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                className="w-full px-4 py-2.5 pr-11 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center text-xl text-slate-900 focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowNewPin((v) => !v)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                aria-label={showNewPin ? 'Hide PIN' : 'Show PIN'}
              >
                <EyeIcon visible={showNewPin} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New PIN
            </label>
            <div className="relative">
              <input
                type={showConfirmPin ? 'text' : 'password'}
                maxLength="4"
                required
                value={confirmPin}
                onChange={(e) => setConfirmPin(e.target.value)}
                className="w-full px-4 py-2.5 pr-11 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center text-xl text-slate-900 focus:ring-2 focus:ring-cyan-500"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPin((v) => !v)}
                tabIndex={-1}
                className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                aria-label={showConfirmPin ? 'Hide PIN' : 'Show PIN'}
              >
                <EyeIcon visible={showConfirmPin} />
              </button>
            </div>
          </div>

          {error && <p className="text-xs text-red-500 text-center font-medium">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-3 rounded-xl transition text-xs shadow-md disabled:opacity-50"
          >
            {loading ? 'Updating PIN...' : 'Save New PIN & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
