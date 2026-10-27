import React, { useState } from 'react';
import { ConcurrencyTestResult } from '../types';
import {
  FlaskConical,
  Play,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  RotateCcw,
  Terminal,
  Zap,
  Layers,
  Database,
} from 'lucide-react';

export const ConcurrencyLab: React.FC = () => {
  const [concurrencyResult, setConcurrencyResult] = useState<ConcurrencyTestResult | null>(null);
  const [runningConcurrency, setRunningConcurrency] = useState(false);

  const [expirationResult, setExpirationResult] = useState<{ passed: boolean; logs: string[] } | null>(null);
  const [runningExpiration, setRunningExpiration] = useState(false);

  const [webhookResult, setWebhookResult] = useState<{ passed: boolean; logs: string[] } | null>(null);
  const [runningWebhook, setRunningWebhook] = useState(false);

  const [diagnostics, setDiagnostics] = useState<any>(null);

  const fetchDiagnostics = async () => {
    try {
      const res = await fetch('/api/system/diagnostics');
      const data = await res.json();
      setDiagnostics(data);
    } catch (err) {
      console.error(err);
    }
  };

  React.useEffect(() => {
    fetchDiagnostics();
  }, []);

  const runConcurrencyTest = async () => {
    setRunningConcurrency(true);
    setConcurrencyResult(null);
    try {
      const res = await fetch('/api/system/simulate-concurrency', { method: 'POST' });
      const data: ConcurrencyTestResult = await res.json();
      setConcurrencyResult(data);
      await fetchDiagnostics();
    } catch (err) {
      console.error(err);
    } finally {
      setRunningConcurrency(false);
    }
  };

  const runExpirationTest = async () => {
    setRunningExpiration(true);
    setExpirationResult(null);
    try {
      const res = await fetch('/api/system/test-expiration', { method: 'POST' });
      const data = await res.json();
      setExpirationResult(data);
      await fetchDiagnostics();
    } catch (err) {
      console.error(err);
    } finally {
      setRunningExpiration(false);
    }
  };

  const runWebhookTest = async () => {
    setRunningWebhook(true);
    setWebhookResult(null);
    try {
      const res = await fetch('/api/system/test-webhook-idempotency', { method: 'POST' });
      const data = await res.json();
      setWebhookResult(data);
      await fetchDiagnostics();
    } catch (err) {
      console.error(err);
    } finally {
      setRunningWebhook(false);
    }
  };

  const handleTriggerSweep = async () => {
    await fetch('/api/system/trigger-sweep', { method: 'POST' });
    await fetchDiagnostics();
  };

  const handleResetSeed = async () => {
    await fetch('/api/system/reset-seed', { method: 'POST' });
    await fetchDiagnostics();
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <span className="text-xs font-semibold text-[#FF5A36] uppercase tracking-wider flex items-center gap-1.5">
            <FlaskConical className="w-3.5 h-3.5" />
            Verification & Resilience Console
          </span>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#1B0A2A] mt-0.5">
            Concurrency & Reliability Test Lab
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Simulate flash-sale traffic spikes, race conditions, 10-minute hold expirations, and webhook idempotency in real time.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleTriggerSweep}
            className="px-3.5 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            title="Trigger BullMQ background reservation sweeper"
          >
            <Clock className="w-3.5 h-3.5 text-amber-600" />
            Trigger Worker Sweep
          </button>
          <button
            onClick={handleResetSeed}
            className="px-3.5 py-2 border border-slate-300 rounded-lg bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
            title="Reset in-memory tables to fresh seed data"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Data Seed
          </button>
        </div>
      </div>

      {/* Telemetry Strip */}
      {diagnostics && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Authoritative DB Events</span>
            <span className="text-xl font-mono font-black text-slate-900 tabular-nums">
              {diagnostics.database.eventsCount}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Ticket Tiers</span>
            <span className="text-xl font-mono font-black text-slate-900 tabular-nums">
              {diagnostics.database.ticketCategoriesCount}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Reservations</span>
            <span className="text-xl font-mono font-black text-slate-900 tabular-nums">
              {diagnostics.database.reservationsCount}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Confirmed Orders</span>
            <span className="text-xl font-mono font-black text-emerald-700 tabular-nums">
              {diagnostics.database.ordersCount}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Redis Cache Keys</span>
            <span className="text-xl font-mono font-black text-purple-700 tabular-nums">
              {diagnostics.cache.activeKeysCount}
            </span>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Worker Sweeps</span>
            <span className="text-xl font-mono font-black text-amber-700 tabular-nums">
              {diagnostics.queue.sweepCount}
            </span>
          </div>
        </div>
      )}

      {/* Primary Benchmark 1: 20 Simultaneous Requests for 10 Tickets */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="p-6 bg-[#1B0A2A] text-white flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[#FF5A36] text-xs font-bold uppercase tracking-wider mb-1">
              <Zap className="w-4 h-4" />
              Primary Verification Specification
            </div>
            <h2 className="text-xl font-bold">
              20 Simultaneous Attendees vs. 10 Total Tickets
            </h2>
            <p className="text-xs text-white/70 mt-1 max-w-xl">
              Fires 20 parallel requests against a strict 10-ticket inventory category using row-level locks and atomic updates. Invariant: exactly 10 reservations must succeed and 10 must fail with zero overselling.
            </p>
          </div>

          <button
            onClick={runConcurrencyTest}
            disabled={runningConcurrency}
            className="px-5 py-3 bg-[#FF5A36] hover:bg-[#E84C2A] text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md self-start md:self-auto disabled:opacity-50"
          >
            <Play className={`w-4 h-4 ${runningConcurrency ? 'animate-spin' : ''}`} />
            {runningConcurrency ? 'Simulating 20 Requests...' : 'Execute Concurrency Test'}
          </button>
        </div>

        {/* Results Bar */}
        {concurrencyResult && (
          <div className="p-6 border-b border-slate-200 bg-slate-50/70">
            <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3">
                {concurrencyResult.passed ? (
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-red-100 text-red-600 flex items-center justify-center">
                    <XCircle className="w-6 h-6" />
                  </div>
                )}
                <div>
                  <h3 className="font-extrabold text-base text-slate-900">
                    {concurrencyResult.passed
                      ? 'PASSED: Zero Overselling Verified!'
                      : 'FAILED: Race Condition Detected'}
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">
                    Completed in {concurrencyResult.durationMs}ms · Row-level mutex serialized critical sections
                  </p>
                </div>
              </div>

              {/* Outcome Badges */}
              <div className="flex items-center gap-3 font-mono text-xs">
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1.5 rounded-lg font-bold">
                  Succeeded: {concurrencyResult.successfulReservations} / 20
                </span>
                <span className="bg-red-100 text-red-800 px-3 py-1.5 rounded-lg font-bold">
                  Rejected: {concurrencyResult.rejectedReservations} / 20
                </span>
                <span className="bg-slate-200 text-slate-800 px-3 py-1.5 rounded-lg font-bold">
                  Remaining Stock: {concurrencyResult.finalStock}
                </span>
              </div>
            </div>

            {/* Terminal Logs */}
            <div className="bg-[#11051F] text-emerald-400 p-4 rounded-xl font-mono text-xs max-h-64 overflow-y-auto space-y-1">
              <div className="text-slate-400 text-[10px] uppercase font-bold border-b border-white/10 pb-1 mb-2 flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5" />
                Real-Time Execution Logs & Mutex Locking Trace
              </div>
              {concurrencyResult.logs.map((log, idx) => (
                <div
                  key={idx}
                  className={
                    log.includes('REJECTED')
                      ? 'text-red-400'
                      : log.includes('PASS')
                      ? 'text-emerald-300 font-bold'
                      : 'text-slate-300'
                  }
                >
                  {log}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Additional Tests Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Test 2: Expired Reservation Worker */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Background Worker Test
              </span>
              <h3 className="text-base font-bold text-slate-900">
                10-Minute Hold Expiration & Sweep
              </h3>
            </div>
            <button
              onClick={runExpirationTest}
              disabled={runningExpiration}
              className="px-3.5 py-2 bg-[#1B0A2A] hover:bg-[#FF5A36] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {runningExpiration ? 'Sweeping...' : 'Test Expiry Release'}
            </button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Tests fast-forwarding an active reservation past its 10-minute hold window. Confirms that the BullMQ worker safely restores available inventory and rejects checkout.
          </p>

          {expirationResult && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                {expirationResult.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span>{expirationResult.passed ? 'TEST PASSED' : 'TEST FAILED'}</span>
              </div>
              {expirationResult.logs.map((l, i) => (
                <p key={i} className="text-slate-600 text-[11px]">{l}</p>
              ))}
            </div>
          )}
        </div>

        {/* Test 3: Duplicate Webhook Idempotency */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Payment Gateway Test
              </span>
              <h3 className="text-base font-bold text-slate-900">
                Duplicate Webhook Idempotency
              </h3>
            </div>
            <button
              onClick={runWebhookTest}
              disabled={runningWebhook}
              className="px-3.5 py-2 bg-[#1B0A2A] hover:bg-[#FF5A36] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {runningWebhook ? 'Testing...' : 'Test Duplicate Hook'}
            </button>
          </div>
          <p className="text-xs text-slate-500 leading-relaxed">
            Dispatches repeated duplicate <code className="font-mono bg-slate-100 px-1 py-0.5 rounded text-slate-800">payment.captured</code> webhooks with identical transaction signatures. Confirms that repeated calls never create duplicate orders or deduct extra inventory.
          </p>

          {webhookResult && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono space-y-1">
              <div className="font-bold text-slate-800 flex items-center gap-1 mb-1">
                {webhookResult.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-600" />
                )}
                <span>{webhookResult.passed ? 'IDEMPOTENCY VERIFIED' : 'TEST FAILED'}</span>
              </div>
              {webhookResult.logs.map((l, i) => (
                <p key={i} className="text-slate-600 text-[11px]">{l}</p>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
