import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import {
  X,
  Server,
  ExternalLink,
  Check,
  AlertTriangle,
  RefreshCw,
  Copy,
  Code,
  CheckCircle2,
  FileSpreadsheet,
  Info,
  Key,
} from 'lucide-react';
import {
  CODE_GS_FIXED,
  WEBAPP_API_FIXED,
  GOOGLE_SHEET_URL,
  DEFAULT_DEPLOYED_URL,
} from '../../constants/appsScriptCode';

interface ApiConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ApiConfigModal: React.FC<ApiConfigModalProps> = ({ isOpen, onClose }) => {
  const { apiUrl, updateApiUrl, isDemo, toggleDemoMode, showToast } = useApp();
  const [inputUrl, setInputUrl] = useState(apiUrl || DEFAULT_DEPLOYED_URL);
  const [activeTab, setActiveTab] = useState<'connect' | 'script' | 'guide'>('connect');
  const [selectedScriptFile, setSelectedScriptFile] = useState<'webapp' | 'code'>('webapp');
  const [isTesting, setIsTesting] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    details?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    updateApiUrl(inputUrl);
    setTestResult(null);
    onClose();
  };

  const currentCode = selectedScriptFile === 'webapp' ? WEBAPP_API_FIXED : CODE_GS_FIXED;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopiedCode(true);
      showToast('Code Copied', `${selectedScriptFile === 'webapp' ? 'Webapp api.gs' : 'Code.gs'} code copied to clipboard`, 'success');
      setTimeout(() => setCopiedCode(false), 2500);
    } catch {
      showToast('Copy Failed', 'Please select and copy the code manually', 'error');
    }
  };

  const handleTestConnection = async () => {
    if (!inputUrl.trim()) {
      setTestResult({
        success: false,
        message: 'Please enter a Google Apps Script Web App URL first.',
      });
      return;
    }

    setIsTesting(true);
    setTestResult(null);

    try {
      const url = new URL(inputUrl.trim());
      url.searchParams.set('action', 'dashboard');

      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        redirect: 'follow',
        headers: { Accept: 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}: ${response.statusText}`);
      }

      const text = await response.text();
      let json: any;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error(
          'Web App responded with HTML instead of JSON. Ensure "Who has access" is set to "Anyone" when deploying.'
        );
      }

      if (json.data) {
        setTestResult({
          success: true,
          message: 'Connected successfully to Google Sheet backend!',
          details: `Current Net Balance: Rs. ${json.data.currentOutstanding ?? 0}`,
        });
      } else if (json.error) {
        setTestResult({
          success: false,
          message: `Backend returned message: ${json.error}`,
        });
      } else {
        setTestResult({
          success: true,
          message: 'Response received from Google Apps Script endpoint.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'Failed to reach endpoint. Check Web App URL and deployment permissions.',
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/75 backdrop-blur-sm animate-fade-in">
      <div
        id="api-config-modal"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-amber-400 dark:bg-slate-800 shadow-sm">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                Google Sheet Live Connection
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Direct synchronization with your Google Spreadsheet
              </p>
            </div>
          </div>
          <button
            id="close-api-modal-btn"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 dark:border-slate-800 px-4 pt-2 bg-slate-50/40 dark:bg-slate-900/40 gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('connect')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'connect'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800/80 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Live Connection
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'script'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800/80 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Code className="w-3.5 h-3.5" />
            Apps Script Code
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`px-3.5 py-2 text-xs font-semibold rounded-t-lg transition-colors cursor-pointer border-b-2 flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-white dark:bg-slate-800/80 shadow-xs'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <Info className="w-3.5 h-3.5" />
            Verification Steps
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {activeTab === 'connect' && (
            <>
              {/* Linked Sheet Banner */}
              <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                    <FileSpreadsheet className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-emerald-900 dark:text-emerald-200">
                      Target Google Spreadsheet
                    </p>
                    <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-mono truncate max-w-xs sm:max-w-md">
                      Home Expense 01022026
                    </p>
                  </div>
                </div>
                <a
                  href={GOOGLE_SHEET_URL}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1 shadow-xs transition-colors shrink-0"
                >
                  <span>Open Sheet</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              {/* Web App URL Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400 mb-1.5">
                  Google Apps Script Web App URL
                </label>
                <input
                  id="api-url-input"
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400"
                />
              </div>

              {/* Test Status Box */}
              {testResult && (
                <div
                  className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
                    testResult.success
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-800 dark:bg-emerald-950/50 dark:border-emerald-800 dark:text-emerald-300'
                      : 'bg-rose-50 border-rose-200 text-rose-800 dark:bg-rose-950/50 dark:border-rose-800 dark:text-rose-300'
                  }`}
                >
                  {testResult.success ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400 mt-0.5" />
                  )}
                  <div>
                    <p className="font-semibold">{testResult.message}</p>
                    {testResult.details && (
                      <p className="mt-1 text-[11px] opacity-90">{testResult.details}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Operating Mode Switcher */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                    Operating Mode
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {isDemo
                      ? 'Using offline local preview (changes stay in browser)'
                      : 'Live Sync Active (all changes sync directly to Google Sheet)'}
                  </p>
                </div>
                <button
                  id="toggle-demo-mode-btn"
                  type="button"
                  onClick={() => toggleDemoMode(!isDemo)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0 ${
                    isDemo
                      ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700'
                  }`}
                >
                  {isDemo ? 'Switch to Live Sync' : 'Live Sync Active'}
                </button>
              </div>

              {/* Security PIN status */}
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 px-1">
                <Key className="w-3.5 h-3.5 text-indigo-500" />
                <span>
                  Portal Access PIN: <strong className="text-slate-700 dark:text-slate-200">Live Synced from Google Sheet Settings (cell B6)</strong>
                </span>
              </div>
            </>
          )}

          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setSelectedScriptFile('webapp')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                      selectedScriptFile === 'webapp'
                        ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Webapp api.gs
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedScriptFile('code')}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
                      selectedScriptFile === 'code'
                        ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-xs'
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    Code.gs
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedCode ? 'Copied!' : `Copy ${selectedScriptFile === 'webapp' ? 'Webapp api.gs' : 'Code.gs'}`}
                </button>
              </div>

              <div className="relative">
                <pre className="p-3.5 rounded-xl bg-slate-950 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto max-h-[340px] border border-slate-800 selection:bg-indigo-600 selection:text-white">
                  {currentCode}
                </pre>
              </div>
            </div>
          )}

          {activeTab === 'guide' && (
            <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 text-blue-900 dark:text-blue-300">
                <p className="font-semibold mb-1">Key Script Verification Points</p>
                <p className="text-[11px] leading-relaxed">
                  Make sure your <code className="font-semibold">Code.gs</code> and <code className="font-semibold">Webapp api.gs</code> match your sheet column headers (<code className="font-semibold">Purchase</code> instead of <code className="font-semibold">Purchase by</code>, and <code className="font-semibold">Stat</code> instead of <code className="font-semibold">Status</code>).
                </p>
              </div>

              <div className="space-y-2">
                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <p className="font-semibold text-slate-900 dark:text-white">1. Column Headers in Sheet</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Your sheet uses <code className="font-semibold text-slate-800 dark:text-slate-200">Purchase</code> for the buyer (kashif/asif) and <code className="font-semibold text-slate-800 dark:text-slate-200">Stat</code> for status (paid/unpaid). The updated scripts detect both automatically.
                  </p>
                </div>

                <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60">
                  <p className="font-semibold text-slate-900 dark:text-white">2. Updating an Existing Deployment</p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                    Whenever you edit script files in Apps Script, click <strong>Deploy &rarr; Manage deployments &rarr; Edit (pencil icon) &rarr; Version: New version &rarr; Deploy</strong> so changes take effect on your existing Web App URL.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900/80 border-t border-slate-100 dark:border-slate-800">
          <button
            id="test-api-btn"
            type="button"
            onClick={handleTestConnection}
            disabled={isTesting || !inputUrl.trim()}
            className="px-3.5 py-2 rounded-xl border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-amber-500' : ''}`} />
            {isTesting ? 'Testing Connection...' : 'Test Connection'}
          </button>
          <div className="flex items-center gap-2">
            <button
              id="cancel-api-btn"
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              id="save-api-btn"
              type="button"
              onClick={handleSave}
              className="px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 transition-all cursor-pointer"
            >
              Save & Connect
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

