import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

export function ForceChangePinModal({ currentUser, onPinUpdated }) {
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

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
      const { error: updateError } = await supabase
        .from('employees')
        .update({ pin: newPin, must_change_pin: false })
        .eq('employee_id', currentUser.employee_id);

      if (updateError) throw updateError;

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
            <input
              type="password"
              maxLength="4"
              required
              value={newPin}
              onChange={(e) => setNewPin(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center text-xl focus:ring-2 focus:ring-cyan-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Confirm New PIN
            </label>
            <input
              type="password"
              maxLength="4"
              required
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-center text-xl focus:ring-2 focus:ring-cyan-500"
            />
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