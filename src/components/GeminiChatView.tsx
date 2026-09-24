import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Zap,
  Brain,
  ShieldCheck,
  RotateCcw,
  User,
  Car,
  Clock,
  Compass,
  FileSpreadsheet,
  CheckCircle2,
  Copy,
  ChevronDown,
} from 'lucide-react';
import { Trip, WorkSession, UserSettings } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  modelUsed?: string;
}

interface GeminiChatViewProps {
  trips: Trip[];
  sessions: WorkSession[];
  settings: UserSettings;
}

export const GeminiChatView: React.FC<GeminiChatViewProps> = ({ trips, sessions, settings }) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    return [
      {
        id: 'welcome-msg',
        role: 'model',
        content: `👋 **Welcome to your AI Fleet & Tax Advisor!**\n\nI am powered by Google Gemini to help you manage your vehicle logbook, SARS tax compliance, and HR-018 timesheets.\n\nHere are some things you can ask me:\n- *"Are my ${trips.length} logged trips compliant with SARS Section 8(1) audit requirements?"*\n- *"What is my business vs private travel ratio for the year?"*\n- *"How do I split a 160 KM round trip between two client job numbers?"*\n- *"Draft a professional logbook purpose note for client site inspection in Paarl."*`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: 'gemini-3.5-flash',
      },
    ];
  });

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [taskType, setTaskType] = useState<'general' | 'complex' | 'fast'>('general');
  const [role, setRole] = useState<'sars_advisor' | 'dispatch_assistant' | 'timesheet_assistant'>('sars_advisor');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Context calculations
  const totalKm = trips.reduce((acc, t) => acc + Math.max(0, (t.mileageIn || 0) - (t.mileageOut || 0)), 0);
  const bizTrips = trips.filter((t) => t.category === 'business');
  const bizKm = bizTrips.reduce((acc, t) => acc + Math.max(0, (t.mileageIn || 0) - (t.mileageOut || 0)), 0);
  const bizPct = totalKm > 0 ? Math.round((bizKm / totalKm) * 100) : 0;

  const handleSendMessage = async (customPrompt?: string) => {
    const textToSend = customPrompt || input.trim();
    if (!textToSend || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const newHistory = [...messages, userMessage];
    setMessages(newHistory);
    setInput('');
    setLoading(true);

    try {
      const contextData = {
        driverName: settings.driverName,
        vehicle: settings.vehicleName,
        vehicleRego: settings.vehicleRego,
        currentOdometer: settings.currentOdometer,
        totalTrips: trips.length,
        totalKm,
        businessKm: bizKm,
        businessPercentage: `${bizPct}%`,
        clientsCount: settings.clients.length,
        recentClients: settings.clients.slice(0, 5),
        sessionsCount: sessions.length,
      };

      const payload = {
        messages: newHistory.map((m) => ({
          role: m.role,
          content: m.content,
        })),
        taskType,
        role,
        contextData,
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();

      const modelMessage: ChatMessage = {
        id: `model-${Date.now()}`,
        role: 'model',
        content: data.reply || 'No response returned.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        modelUsed: data.modelUsed,
      };

      setMessages((prev) => [...prev, modelMessage]);
    } catch (err: any) {
      console.error('Chat error:', err);
      const errorMessage: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'model',
        content: `⚠️ **Error communicating with Gemini:** ${err.message || 'Check server connection and GEMINI_API_KEY.'}`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    if (confirm('Clear chat conversation history?')) {
      setMessages([
        {
          id: 'welcome-reset',
          role: 'model',
          content: 'Chat history cleared. How can I assist you with your mileage, SARS compliance, or timesheet calculations?',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed: 'gemini-3.5-flash',
        },
      ]);
    }
  };

  const promptSuggestions = [
    'Audit my trip logbook against SARS Section 8(1) rules',
    'What formula determines my SARS deemed travel cost deduction?',
    'How do I split a 150 KM day trip between 2 clients?',
    'Draft a professional logbook note for UWC Campus electrical work',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] min-h-[580px] max-w-5xl mx-auto space-y-4">
      {/* Header & Controls Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-md shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-100">Gemini Fleet & SARS Assistant</h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                Multi-Turn AI
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Context-aware logbook compliance, SARS Section 8(1) tax calculations & timesheet dispatch
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Role selector */}
          <div className="relative">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="appearance-none rounded-xl border border-slate-700 bg-slate-800/90 pl-3 pr-8 py-1.5 text-xs font-medium text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="sars_advisor">Role: SARS Tax & Audit</option>
              <option value="dispatch_assistant">Role: Route & Mileage Dispatch</option>
              <option value="timesheet_assistant">Role: HR-018 Timesheet & Payroll</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
          </div>

          {/* Model / Task Type Selector */}
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-950/80 p-1">
            <button
              type="button"
              onClick={() => setTaskType('fast')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                taskType === 'fast'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="gemini-3.1-flash-lite: Quick answers & rapid triage"
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Fast</span>
            </button>
            <button
              type="button"
              onClick={() => setTaskType('general')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                taskType === 'general'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="gemini-3.5-flash: Balanced general tasks & route reasoning"
            >
              <Sparkles className="w-3 h-3 text-blue-300" />
              <span>General</span>
            </button>
            <button
              type="button"
              onClick={() => setTaskType('complex')}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                taskType === 'complex'
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="gemini-3.1-pro-preview: Complex tax audits & deep analysis"
            >
              <Brain className="w-3 h-3 text-purple-300" />
              <span>Complex</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleClearHistory}
            className="p-2 text-slate-400 hover:text-slate-200 rounded-xl hover:bg-slate-800 transition-colors"
            title="Clear Chat History"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Live Fleet Context Banner */}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 rounded-xl border border-slate-800/80 bg-slate-900/40 text-xs text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span className="flex items-center gap-1.5 text-slate-300 font-medium">
            <Car className="w-3.5 h-3.5 text-blue-400" />
            {settings.vehicleName || 'Toyota Hilux'} ({settings.vehicleRego || 'CA 123-456'})
          </span>
          <span className="font-mono text-slate-300">
            {totalKm.toLocaleString()} Total KM ({bizPct}% Business)
          </span>
          <span className="font-mono text-slate-300">
            {trips.length} Trips logged
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
          <ShieldCheck className="w-3 h-3" />
          Active Model: {taskType === 'complex' ? 'gemini-3.1-pro-preview' : taskType === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash'}
        </div>
      </div>

      {/* Messages Scrollable Thread */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-1 rounded-2xl border border-slate-800 bg-slate-950/50 p-4 shadow-inner">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'model' && (
              <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div
              className={`relative max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-blue-600 text-white shadow-md rounded-tr-none'
                  : 'bg-slate-900 border border-slate-800 text-slate-200 shadow-sm rounded-tl-none'
              }`}
            >
              <div className="flex items-center justify-between gap-3 mb-1 text-[10px] opacity-70">
                <span className="font-semibold">
                  {msg.role === 'user' ? (settings.driverName || 'You') : 'Gemini Fleet Advisor'}
                </span>
                <div className="flex items-center gap-2">
                  {msg.modelUsed && (
                    <span className="font-mono bg-slate-800 px-1.5 py-0.2 rounded text-[9px] text-slate-300">
                      {msg.modelUsed}
                    </span>
                  )}
                  <span>{msg.timestamp}</span>
                </div>
              </div>

              {/* Message content */}
              <div className="whitespace-pre-wrap font-sans text-[13px] leading-relaxed">
                {msg.content}
              </div>

              {/* Message action */}
              {msg.role === 'model' && (
                <div className="flex items-center justify-end gap-2 mt-2 pt-1 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => handleCopy(msg.id, msg.content)}
                    className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1 transition-colors"
                    title="Copy response"
                  >
                    {copiedId === msg.id ? (
                      <>
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        <span className="text-emerald-400">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {msg.role === 'user' && (
              <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="rounded-2xl bg-slate-900 border border-slate-800 px-4 py-3 text-xs text-slate-400 flex items-center gap-2">
              <div className="flex gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
              <span>Gemini is analyzing fleet context with {taskType === 'complex' ? 'gemini-3.1-pro-preview' : taskType === 'fast' ? 'gemini-3.1-flash-lite' : 'gemini-3.5-flash'}...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-500 text-[11px] shrink-0 font-medium">Quick Prompts:</span>
        {promptSuggestions.map((prompt, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleSendMessage(prompt)}
            className="shrink-0 px-3 py-1 rounded-full border border-slate-800 bg-slate-900 text-slate-300 hover:text-white hover:border-slate-700 hover:bg-slate-800 transition-all text-[11px]"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Input Composer Box */}
      <div className="relative rounded-2xl border border-slate-800 bg-slate-900 p-2 shadow-lg focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500/50">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Ask Gemini about your ${trips.length} logged trips, SARS Section 8(1) deductions, or timesheet calculations... (Press Enter to send, Shift+Enter for new line)`}
          rows={2}
          disabled={loading}
          className="w-full resize-none bg-transparent px-3 py-1.5 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:opacity-50"
        />

        <div className="flex items-center justify-between px-2 pt-1 border-t border-slate-800/60">
          <div className="flex items-center gap-2 text-[11px] text-slate-500">
            <span>Model:</span>
            <span className="font-mono text-slate-400">
              {taskType === 'complex'
                ? 'gemini-3.1-pro-preview (Complex Tasks)'
                : taskType === 'fast'
                ? 'gemini-3.1-flash-lite (Fast Tasks)'
                : 'gemini-3.5-flash (General Tasks)'}
            </span>
          </div>

          <button
            type="button"
            disabled={!input.trim() || loading}
            onClick={() => handleSendMessage()}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white shadow-md hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed transition-all hover:scale-105"
          >
            <span>Send</span>
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
