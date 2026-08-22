import React, { useState, useEffect } from 'react';
import ProductionForm from './components/ProductionForm';
import PicklingStation from './components/PicklingStation';
import DippingStation from './components/DippingStation';
import UnloadingStation from './components/UnloadingStation';
import { ForceChangePinModal } from './components/ForceChangePinModal';
import { BRAND } from './config/brand';
import { supabase } from './supabaseClient';

// Mock rack registry shared by the three process stations (Pickling/Dipping/
// Unloading) - each station reads/writes the same record so a rack's history
// carries forward correctly from one station to the next. Still mock data;
// real Supabase wiring (production_stage_logs etc.) is deferred to the
// edit-record work.
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

export default function App() {
  useEffect(() => {
    document.title = BRAND.systemTitle;
  }, []);

  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('loading');
  const [activeRacks, setActiveRacks] = useState(INITIAL_ACTIVE_RACKS);

  const [shift, setShift] = useState('Morning');
  const [employeeId, setEmployeeId] = useState('');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);
  // Employee record from Supabase for a user who's authenticated but still has
  // must_change_pin = true - held separately from currentUser so the app main
  // screen doesn't render until ForceChangePinModal reports the PIN is updated.
  const [pendingPinChangeUser, setPendingPinChangeUser] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    const trimmedId = employeeId.trim();
    if (!trimmedId || !pin) {
      setLoginError('Please enter both Employee ID and Security PIN.');
      return;
    }

    setLoggingIn(true);
    try {
      const { data, error } = await supabase
        .from('employees')
        .select('employee_id, name, preferred_name, pin, must_change_pin')
        .eq('employee_id', trimmedId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        setLoginError(`Employee ID ${trimmedId} not found.`);
        return;
      }
      if (String(data.pin) !== String(pin)) {
        setLoginError('Incorrect Security PIN.');
        return;
      }

      let role = 'OPERATOR_LOADING';
      if (trimmedId.toLowerCase().includes('proc') || pin === '8888') {
        role = 'OPERATOR_PROCESS';
      }

      const userData = {
        id: data.employee_id,
        employee_id: data.employee_id,
        name: data.preferred_name || data.name,
        preferred_name: data.preferred_name,
        role: role,
        shift: shift
      };

      // Still on default/never-changed PIN - hold off on entering the app
      // until they've set a personal PIN via ForceChangePinModal.
      if (data.must_change_pin) {
        setPendingPinChangeUser(userData);
        return;
      }

      setCurrentUser(userData);
      setActiveTab(role === 'OPERATOR_PROCESS' ? 'pickling' : 'loading');
    } catch (err) {
      setLoginError('Login failed: ' + err.message);
    } finally {
      setLoggingIn(false);
    }
  };

  const handlePinUpdated = () => {
    const userData = pendingPinChangeUser;
    setPendingPinChangeUser(null);
    if (!userData) return;
    setCurrentUser(userData);
    setActiveTab(userData.role === 'OPERATOR_PROCESS' ? 'pickling' : 'loading');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    setPendingPinChangeUser(null);
    setEmployeeId('');
    setPin('');
  };

  if (pendingPinChangeUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans">
        <ForceChangePinModal currentUser={pendingPinChangeUser} onPinUpdated={handlePinUpdated} />
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 font-sans text-slate-100">
        <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-20 -right-20 w-40 h-40 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="text-center mb-8">
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest block mb-1">
              {BRAND.headerTitle}
            </span>
            <h1 className="text-2xl font-extrabold text-white">Shop-Floor Portal</h1>
            <p className="text-xs text-slate-400 mt-1">Sign in to start your shift</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            {/* Shift Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-2">Select Shift</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setShift('Morning')}
                  className={`py-2.5 rounded-lg text-xs font-bold border transition-all ${
                    shift === 'Morning'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300 shadow-lg shadow-cyan-950/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  ☀️ Morning Shift
                </button>
                <button
                  type="button"
                  onClick={() => setShift('Evening')}
                  className={`py-2.5 rounded-lg text-xs font-bold border transition-all ${
                    shift === 'Evening'
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-lg shadow-indigo-950/50'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
                  }`}
                >
                  🌙 Evening Shift
                </button>
              </div>
            </div>

            {/* Employee ID - 统一改为 Employee ID */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Employee ID</label>
              <input
                type="text"
                placeholder="Enter your Employee ID"
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-cyan-300 font-mono focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>

            {/* Security PIN */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Security PIN</label>
              <input
                type="password"
                placeholder="••••"
                maxLength="6"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-4 py-2.5 text-sm text-cyan-300 font-mono tracking-widest focus:outline-none focus:border-cyan-500 transition-all"
              />
            </div>

            {loginError && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-lg text-xs text-rose-300 text-center">
                {loginError}
              </div>
            )}

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-950 font-bold text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-cyan-500/20 cursor-pointer transition-all mt-2"
            >
              {loggingIn ? 'Checking...' : 'Access System →'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans p-4">
      <header className="max-w-6xl mx-auto mb-6 bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-lg">
        <div>
          <h1 className="text-lg font-bold text-white tracking-wide">{BRAND.headerTitle}</h1>
          <p className="text-xs text-slate-400">Integrated Shop-Floor Tracking Solution</p>
        </div>

        <div className="flex bg-slate-950 p-1 rounded-lg border border-slate-800 flex-wrap justify-center">
          <button
            onClick={() => setActiveTab('loading')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'loading'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stage 01: Loading
          </button>
          <button
            onClick={() => setActiveTab('pickling')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'pickling'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stage 02: Pickling
          </button>
          <button
            onClick={() => setActiveTab('dipping')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'dipping'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stage 03: Dipping
          </button>
          <button
            onClick={() => setActiveTab('unloading')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'unloading'
                ? 'bg-cyan-500 text-slate-950 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Stage 04: Unloading
          </button>
        </div>

        <div className="flex items-center gap-3 border-l border-slate-800 pl-4">
          <div className="text-right">
            <span className="text-[11px] text-slate-400 block">{currentUser.shift} Shift</span>
            <span className="text-xs font-bold text-cyan-300 font-mono">👤 {currentUser.id}</span>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1.5 bg-slate-800 hover:bg-rose-900 hover:text-rose-200 text-slate-300 text-xs font-bold rounded-lg transition-all"
          >
            Sign Out
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto">
        {activeTab === 'loading' && <ProductionForm currentUser={currentUser} supabase={supabase} />}
        {activeTab === 'pickling' && (
          <PicklingStation currentUser={currentUser} activeRacks={activeRacks} setActiveRacks={setActiveRacks} />
        )}
        {activeTab === 'dipping' && (
          <DippingStation currentUser={currentUser} activeRacks={activeRacks} setActiveRacks={setActiveRacks} />
        )}
        {activeTab === 'unloading' && (
          <UnloadingStation currentUser={currentUser} activeRacks={activeRacks} setActiveRacks={setActiveRacks} />
        )}
      </main>
    </div>
  );
}
