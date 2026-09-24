import React, { useState, useEffect } from 'react';
import { WorkSession, Split, UserSettings, ActivityCategory, BusinessType, Trip } from '../types';
import { hoursBetween } from '../lib/timesheetLogic';
import { X, Plus, Trash2, Clock, AlertCircle, Calendar, Building2, Tag } from 'lucide-react';
import { SearchableDropdown } from './SearchableDropdown';
import { getClientOptions, getJobNumberOptions } from '../lib/autocompleteDefaults';

interface SessionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (session: WorkSession) => void;
  initialSession?: WorkSession | null;
  settings: UserSettings;
  defaultCategory?: ActivityCategory;
  defaultBusinessType?: BusinessType;
  trips?: Trip[];
  sessions?: WorkSession[];
}

export const SessionModal: React.FC<SessionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialSession,
  settings,
  defaultCategory = 'business',
  defaultBusinessType = 'chargeable',
  trips = [],
  sessions = [],
}) => {
  const [onDate, setOnDate] = useState('');
  const [onTime, setOnTime] = useState('09:00');
  const [offDate, setOffDate] = useState('');
  const [offTime, setOffTime] = useState('12:00');
  const [category, setCategory] = useState<ActivityCategory>('business');
  const [businessType, setBusinessType] = useState<BusinessType>('chargeable');
  const [client, setClient] = useState('');
  const [jobNumber, setJobNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [enableSplits, setEnableSplits] = useState(false);
  const [splits, setSplits] = useState<Split[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Auto-complete lists
  const clientOptions = getClientOptions(settings, trips, sessions);
  const jobOptions = getJobNumberOptions(settings, trips, sessions);

  useEffect(() => {
    if (!isOpen) return;

    if (initialSession) {
      setOnDate(initialSession.onDate);
      setOnTime(initialSession.onTime || '09:00');
      setOffDate(initialSession.offDate || initialSession.onDate);
      setOffTime(initialSession.offTime || '12:00');
      setCategory(initialSession.category);
      setBusinessType(initialSession.businessType || 'chargeable');
      setClient(initialSession.client || '');
      setJobNumber(initialSession.jobNumber || '');
      setNotes(initialSession.notes || '');
      if (initialSession.splits && initialSession.splits.length > 0) {
        setEnableSplits(true);
        setSplits(initialSession.splits);
      } else {
        setEnableSplits(false);
        setSplits([]);
      }
    } else {
      const today = new Date().toISOString().slice(0, 10);
      setOnDate(today);
      setOnTime('09:00');
      setOffDate(today);
      setOffTime('12:30');
      setCategory(defaultCategory);
      setBusinessType(defaultBusinessType);
      setClient(defaultBusinessType === 'admin' ? 'Admin' : (settings.clients[0] || ''));
      setJobNumber(defaultBusinessType === 'admin' ? '' : (settings.jobNumbers[0] || ''));
      setNotes('');
      setEnableSplits(false);
      setSplits([]);
    }
    setError(null);
  }, [isOpen, initialSession, settings, defaultCategory, defaultBusinessType]);

  if (!isOpen) return null;

  const totalDurationHrs = hoursBetween(onDate, onTime, offDate, offTime);
  const splitsSum = splits.reduce((acc, s) => acc + (Number(s.amount) || 0), 0);
  const splitsRemainder = Math.round((totalDurationHrs - splitsSum) * 100) / 100;

  const handleAddSplit = () => {
    const newSplit: Split = {
      id: `split-sess-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      businessType: 'chargeable',
      client: settings.clients[0] || '',
      jobNumber: settings.jobNumbers[0] || '',
      amount: Math.max(0, splitsRemainder),
    };
    setSplits([...splits, newSplit]);
  };

  const handleUpdateSplit = (id: string, field: keyof Split, val: any) => {
    setSplits(splits.map((s) => (s.id === id ? { ...s, [field]: val } : s)));
  };

  const handleRemoveSplit = (id: string) => {
    setSplits(splits.filter((s) => s.id !== id));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!onDate || !offDate) {
      setError('Start and end dates are required.');
      return;
    }
    if (totalDurationHrs <= 0) {
      setError('End time must be after start time.');
      return;
    }
    if (category === 'business' && businessType === 'chargeable' && !enableSplits && !client.trim()) {
      setError('Client name is required for chargeable sessions.');
      return;
    }
    if (enableSplits && splits.length > 0 && Math.abs(splitsRemainder) > 0.05) {
      setError(`Split allocations (${splitsSum.toFixed(2)} hrs) must match total duration (${totalDurationHrs.toFixed(2)} hrs).`);
      return;
    }

    const sessionData: WorkSession = {
      id: initialSession ? initialSession.id : `sess-${Date.now()}`,
      onDate,
      onTime,
      offDate,
      offTime,
      category,
      businessType,
      client: category === 'private' ? '' : (businessType === 'admin' ? 'Admin' : client),
      jobNumber: category === 'private' || businessType === 'admin' ? '' : jobNumber,
      splits: enableSplits && splits.length > 0 ? splits : undefined,
      notes,
      status: 'completed',
    };

    onSave(sessionData);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-xl rounded-2xl border border-slate-700 bg-slate-900 p-6 shadow-2xl text-slate-100 my-8">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-100">
                {initialSession ? 'Edit Work Session' : 'Log Time On / Off (HRS)'}
              </h2>
              <p className="text-xs text-slate-400">Explicit clock on and clock off session</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-500/40 bg-red-950/40 p-3 text-xs text-red-300">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          {/* Category Toggle */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setCategory('business')}
              className={`rounded-lg py-2 text-xs font-semibold border transition-all ${
                category === 'business'
                  ? 'bg-blue-600/20 border-blue-500 text-blue-300 shadow-sm'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Business Time
            </button>
            <button
              type="button"
              onClick={() => setCategory('private')}
              className={`rounded-lg py-2 text-xs font-semibold border transition-all ${
                category === 'private'
                  ? 'bg-purple-600/20 border-purple-500 text-purple-300 shadow-sm'
                  : 'bg-slate-800/60 border-slate-700 text-slate-400 hover:bg-slate-800'
              }`}
            >
              Private / Break
            </button>
          </div>

          {/* Business Type: Admin vs Chargeable */}
          {category === 'business' && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-950/60 p-2 border border-slate-800">
              <span className="text-xs font-medium text-slate-400 px-2">Type:</span>
              <button
                type="button"
                onClick={() => {
                  setBusinessType('chargeable');
                  if (client === 'Admin') setClient(settings.clients[0] || '');
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium border transition-colors ${
                  businessType === 'chargeable'
                    ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                    : 'border-transparent text-slate-400 hover:bg-slate-800'
                }`}
              >
                Chargeable (Client/Site)
              </button>
              <button
                type="button"
                onClick={() => {
                  setBusinessType('admin');
                  setClient('Admin');
                  setJobNumber('');
                }}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium border transition-colors ${
                  businessType === 'admin'
                    ? 'bg-yellow-500/20 border-yellow-500/40 text-yellow-300'
                    : 'border-transparent text-slate-400 hover:bg-slate-800'
                }`}
              >
                Admin (Internal/Shop)
              </button>
            </div>
          )}

          {/* Clock On / Clock Off Times */}
          <div className="rounded-xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-400" />
                Time Interval
              </span>
              <span className="text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Duration: {totalDurationHrs.toFixed(2)} HRS ({Math.round(totalDurationHrs * 60)} mins)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  Time On (Start)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    required
                    value={onDate}
                    onChange={(e) => setOnDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="time"
                    required
                    value={onTime}
                    onChange={(e) => setOnTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-500" />
                  Time Off (Finish)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    required
                    value={offDate}
                    onChange={(e) => setOffDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                  <input
                    type="time"
                    required
                    value={offTime}
                    onChange={(e) => setOffTime(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-slate-100 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Client & Job Number (when not split) */}
          {category === 'business' && !enableSplits && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <SearchableDropdown
                label="Client Name"
                icon={<Building2 className="w-3.5 h-3.5 text-slate-400" />}
                disabled={businessType === 'admin'}
                value={client}
                onChange={setClient}
                options={clientOptions}
                placeholder="e.g. Acme Corp"
                accentColor="emerald"
                allowCustom={true}
              />
              <SearchableDropdown
                label="Job Number"
                icon={<Tag className="w-3.5 h-3.5 text-slate-400" />}
                disabled={businessType === 'admin'}
                value={jobNumber}
                onChange={setJobNumber}
                options={jobOptions}
                placeholder="e.g. J-2024-88"
                accentColor="emerald"
                allowCustom={true}
              />
            </div>
          )}

          {/* Splits for Work Session */}
          {category === 'business' && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-slate-200">
                    Split work hours across multiple jobs / admin
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Allocate hours worked in one session across different jobs
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableSplits}
                    onChange={(e) => {
                      setEnableSplits(e.target.checked);
                      if (e.target.checked && splits.length === 0) {
                        setSplits([
                          {
                            id: 'sp-sess-1',
                            businessType: businessType,
                            client: client || settings.clients[0] || 'Admin',
                            jobNumber: jobNumber,
                            amount: totalDurationHrs,
                          },
                        ]);
                      }
                    }}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                </label>
              </div>

              {enableSplits && (
                <div className="mt-3 space-y-2.5">
                  {splits.map((s, index) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg bg-slate-900 border border-slate-800">
                      <span className="text-[11px] font-bold text-slate-400 w-5">#{index + 1}</span>
                      <select
                        value={s.businessType}
                        onChange={(e) => handleUpdateSplit(s.id, 'businessType', e.target.value)}
                        className="rounded border border-slate-700 bg-slate-950 text-xs px-2 py-1 text-slate-200"
                      >
                        <option value="chargeable">Chargeable</option>
                        <option value="admin">Admin</option>
                      </select>

                      <SearchableDropdown
                        compact={true}
                        disabled={s.businessType === 'admin'}
                        value={s.businessType === 'admin' ? 'Admin' : s.client}
                        onChange={(val) => handleUpdateSplit(s.id, 'client', val)}
                        options={clientOptions}
                        placeholder="Client"
                        accentColor="emerald"
                        className="flex-1 min-w-[120px]"
                      />

                      <SearchableDropdown
                        compact={true}
                        disabled={s.businessType === 'admin'}
                        value={s.businessType === 'admin' ? '' : s.jobNumber}
                        onChange={(val) => handleUpdateSplit(s.id, 'jobNumber', val)}
                        options={jobOptions}
                        placeholder="Job #"
                        accentColor="emerald"
                        className="w-28"
                      />

                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.25"
                          placeholder="HRS"
                          value={s.amount}
                          onChange={(e) => handleUpdateSplit(s.id, 'amount', Number(e.target.value))}
                          className="rounded border border-slate-700 bg-slate-950 text-xs px-2 py-1 w-16 text-right font-mono text-slate-100"
                        />
                        <span className="text-xs text-slate-400">HRS</span>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveSplit(s.id)}
                        className="p-1 text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={handleAddSplit}
                      className="inline-flex items-center gap-1 text-xs text-emerald-400 hover:text-emerald-300 font-medium"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Hour Split
                    </button>
                    <span className={`text-xs font-mono ${Math.abs(splitsRemainder) < 0.05 ? 'text-emerald-400' : 'text-amber-400'}`}>
                      Allocated: {splitsSum.toFixed(2)} / {totalDurationHrs.toFixed(2)} HRS ({splitsRemainder >= 0 ? `${splitsRemainder.toFixed(2)} hrs left` : `${Math.abs(splitsRemainder).toFixed(2)} hrs excess`})
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Notes / Work Undertaken</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Switchboard maintenance, circuit wiring, client inspection"
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-100 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-xs font-semibold text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-lg hover:bg-emerald-500 transition-all hover:scale-[1.02]"
            >
              {initialSession ? 'Update Session' : 'Save Session Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
