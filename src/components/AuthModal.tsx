import React, { useState, useEffect } from 'react';
import { 
  X, 
  ShieldCheck, 
  Key, 
  Globe, 
  CheckCircle2, 
  ExternalLink, 
  Copy, 
  Sparkles, 
  Lock,
  Database
} from 'lucide-react';
import { UserProfile } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserProfile | null;
  onUpdateUser: (user: UserProfile | null) => void;
  defaultClientId?: string;
  onRefreshProperties: () => void;
}

declare global {
  interface Window {
    google?: any;
  }
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  user,
  onUpdateUser,
  defaultClientId = '',
  onRefreshProperties
}) => {
  const [activeTab, setActiveTab] = useState<'custom_app' | 'token'>('custom_app');
  
  const [customClientId, setCustomClientId] = useState<string>(() => {
    return localStorage.getItem('ga4_custom_client_id') || defaultClientId || '';
  });
  
  const [enableBigQuery, setEnableBigQuery] = useState<boolean>(() => {
    if (user?.isBigQueryEnabled !== undefined) {
      return user.isBigQueryEnabled;
    }
    return localStorage.getItem('mcp_bigquery_enabled') === 'true';
  });

  const [directToken, setDirectToken] = useState<string>('');
  const [tokenName, setTokenName] = useState<string>('Custom Developer Token');
  
  const [copiedOrigin, setCopiedOrigin] = useState(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    if (defaultClientId && !customClientId) {
      setCustomClientId(defaultClientId);
    }
  }, [defaultClientId]);

  useEffect(() => {
    if (user?.isBigQueryEnabled !== undefined) {
      setEnableBigQuery(user.isBigQueryEnabled);
    }
  }, [user?.isBigQueryEnabled]);

  if (!isOpen) return null;

  const copyOriginToClipboard = () => {
    navigator.clipboard.writeText(currentOrigin);
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

  const handleToggleBigQueryForCurrentUser = (newVal: boolean) => {
    setEnableBigQuery(newVal);
    localStorage.setItem('mcp_bigquery_enabled', String(newVal));
    if (user) {
      const updatedUser: UserProfile = {
        ...user,
        isBigQueryEnabled: newVal
      };
      onUpdateUser(updatedUser);
    }
  };

  const handleGoogleSignInWithClientId = (clientIdToUse: string) => {
    setAuthError(null);
    setIsLoadingAuth(true);

    if (!clientIdToUse.trim()) {
      setAuthError('Please enter a valid Google Cloud OAuth 2.0 Client ID.');
      setIsLoadingAuth(false);
      return;
    }

    localStorage.setItem('ga4_custom_client_id', clientIdToUse.trim());
    localStorage.setItem('mcp_bigquery_enabled', String(enableBigQuery));

    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      setAuthError('Google Identity Services library is initializing. Please retry in a few seconds.');
      setIsLoadingAuth(false);
      return;
    }

    try {
      const baseScope = 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email';
      const requestedScope = enableBigQuery 
        ? `${baseScope} https://www.googleapis.com/auth/bigquery.readonly`
        : baseScope;

      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: clientIdToUse.trim(),
        scope: requestedScope,
        callback: async (tokenResponse: any) => {
          setIsLoadingAuth(false);
          if (tokenResponse && tokenResponse.access_token) {
            let profileName = 'Google Analytics User';
            let profileEmail = '';
            let profilePicture = '';

            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
              });
              if (res.ok) {
                const info = await res.json();
                profileName = info.name || profileName;
                profileEmail = info.email || '';
                profilePicture = info.picture || '';
              }
            } catch (e) {
              console.warn('Could not fetch user profile info', e);
            }

            const newUser: UserProfile = {
              name: profileName,
              email: profileEmail,
              picture: profilePicture,
              accessToken: tokenResponse.access_token,
              tokenExpiry: Date.now() + (Number(tokenResponse.expires_in) || 3600) * 1000,
              authMode: 'custom_oauth',
              customClientId: clientIdToUse.trim(),
              isBigQueryEnabled: enableBigQuery
            };

            onUpdateUser(newUser);
            onRefreshProperties();
            onClose();
          } else if (tokenResponse && tokenResponse.error) {
            setAuthError(`Google Sign-In Error: ${tokenResponse.error_description || tokenResponse.error}`);
          }
        },
        error_callback: (err: any) => {
          setIsLoadingAuth(false);
          setAuthError(`Auth Error: ${err.message || 'Authorization was cancelled or popup blocked'}`);
        }
      });

      client.requestAccessToken({ prompt: 'consent' });
    } catch (err: any) {
      setIsLoadingAuth(false);
      setAuthError(err.message || 'Failed to initiate Google OAuth flow');
    }
  };

  const handleApplyDirectToken = () => {
    if (!directToken.trim()) {
      setAuthError('Please enter a valid Bearer token (e.g. ya29...)');
      return;
    }

    localStorage.setItem('mcp_bigquery_enabled', String(enableBigQuery));

    const newUser: UserProfile = {
      name: tokenName.trim() || 'Custom Token User',
      email: 'connected-api@google.com',
      accessToken: directToken.trim(),
      authMode: 'custom_token',
      isBigQueryEnabled: enableBigQuery
    };

    onUpdateUser(newUser);
    onRefreshProperties();
    onClose();
  };

  const handleLogout = () => {
    onUpdateUser(null);
    onRefreshProperties();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">API Authorization & Access</h2>
              <p className="text-xs text-slate-500">Connect your Google account to query GA4 and BigQuery</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Auth Status Banner */}
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-slate-500">Status:</span>
            {user?.accessToken ? (
              <div className="flex items-center gap-1.5">
                <span className="inline-flex items-center gap-1 font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Connected ({user.email || user.name})
                </span>
                {user.isBigQueryEnabled ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                    <Database className="w-3 h-3" />
                    + BigQuery
                  </span>
                ) : (
                  <span className="inline-flex items-center text-[11px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                    GA4 Only
                  </span>
                )}
              </div>
            ) : (
              <span className="inline-flex items-center gap-1 font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                Not Connected
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            {user?.accessToken && (
              <button
                onClick={handleLogout}
                className="text-slate-500 hover:text-rose-600 text-xs font-medium hover:underline"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white">
          <button
            onClick={() => { setActiveTab('custom_app'); setAuthError(null); }}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'custom_app'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Google Sign-In (OAuth)
          </button>
          <button
            onClick={() => { setActiveTab('token'); setAuthError(null); }}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'token'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            Direct Bearer Token
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-700 text-sm">
          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <X className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1">{authError}</div>
            </div>
          )}

          {/* BigQuery Integration Checkbox (Shared across both tabs) */}
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-colors">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                id="checkbox-enable-bigquery"
                checked={enableBigQuery}
                onChange={(e) => {
                  const newVal = e.target.checked;
                  setEnableBigQuery(newVal);
                  if (user) {
                    handleToggleBigQueryForCurrentUser(newVal);
                  }
                }}
                className="mt-0.5 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 cursor-pointer accent-indigo-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-900 text-xs">
                  <Database className="w-3.5 h-3.5 text-indigo-600" />
                  Enable BigQuery Integration
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                  When enabled, requests BigQuery read access (<code className="text-[10px] bg-slate-200/70 px-1 py-0.5 rounded text-slate-700 font-mono">bigquery.readonly</code>) to unlock BigQuery SQL Studio, dataset & table exploration, and schema querying. If unchecked, all BigQuery modules remain hidden.
                </p>
              </div>
            </label>
          </div>

          {/* TAB 1: Google OAuth */}
          {activeTab === 'custom_app' && (
            <div className="space-y-4">
              {defaultClientId ? (
                <div className="p-4 rounded-xl bg-blue-50/70 border border-blue-200 space-y-3">
                  <div className="flex items-center gap-2 text-blue-900 font-semibold text-xs">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    1-Click Google Sign-In
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Sign in with your Google account to automatically load and query your live {enableBigQuery ? 'Google Analytics 4 properties and BigQuery datasets' : 'Google Analytics 4 properties'}:
                  </p>
                  <button
                    id="btn-sign-in-default-client-id"
                    disabled={isLoadingAuth}
                    onClick={() => handleGoogleSignInWithClientId(defaultClientId)}
                    className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {isLoadingAuth ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <>
                        <Globe className="w-4 h-4" />
                        Sign in with Google {enableBigQuery ? '(GA4 + BigQuery)' : '(GA4 Only)'}
                      </>
                    )}
                  </button>
                </div>
              ) : null}

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Authorized JavaScript Origin</span>
                  <button
                    onClick={copyOriginToClipboard}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedOrigin ? 'Copied!' : 'Copy Origin'}
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800 break-all select-all">
                  {currentOrigin}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Make sure this URL is listed in <strong>Authorized JavaScript Origins</strong> in your Google Cloud Console OAuth 2.0 Client ID.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-800">
                  {defaultClientId ? 'Or use a custom OAuth 2.0 Client ID:' : 'OAuth 2.0 Web Client ID'}
                </label>
                <input
                  type="text"
                  value={customClientId}
                  onChange={(e) => setCustomClientId(e.target.value)}
                  placeholder="e.g. 123456789-abcdefg.apps.googleusercontent.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400 text-xs font-mono transition-all"
                />
              </div>

              <button
                id="btn-sign-in-custom-client-id"
                disabled={isLoadingAuth}
                onClick={() => handleGoogleSignInWithClientId(customClientId)}
                className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs shadow-xs flex items-center justify-center gap-2 transition-all disabled:opacity-50 cursor-pointer"
              >
                {isLoadingAuth ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Globe className="w-4 h-4" />
                    Authorize with Client ID {enableBigQuery ? '(GA4 + BigQuery)' : '(GA4)'}
                  </>
                )}
              </button>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
                <span>Configure in Google Cloud Console:</span>
                <a
                  href="https://console.cloud.google.com/apis/credentials"
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline font-medium"
                >
                  GCP Console Credentials <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* TAB 2: Direct Bearer Token */}
          {activeTab === 'token' && (
            <div className="space-y-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">Direct Token Authorization:</p>
                <p>
                  Paste an active OAuth Bearer access token generated from your terminal (<code className="text-blue-600">gcloud auth print-access-token</code>).
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">Display Label</label>
                  <input
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="e.g. My Production Analytics Token"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">OAuth 2.0 Bearer Token</label>
                  <textarea
                    rows={3}
                    value={directToken}
                    onChange={(e) => setDirectToken(e.target.value)}
                    placeholder="ya29.a0AfH6SMC..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 text-xs font-mono"
                  />
                </div>
              </div>

              <button
                id="btn-apply-direct-token"
                onClick={handleApplyDirectToken}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Key className="w-4 h-4 text-blue-400" />
                Apply Token & Fetch GA4 Properties
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>Tokens communicate directly with Google Analytics {enableBigQuery ? '& BigQuery ' : ''}APIs.</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
