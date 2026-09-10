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
  Sliders,
  LogOut,
  AlertCircle,
  Settings
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
  const [activeTab, setActiveTab] = useState<'sso' | 'advanced'>('sso');
  
  const [customClientId, setCustomClientId] = useState<string>(() => {
    return localStorage.getItem('ga4_custom_client_id') || defaultClientId || '';
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

  if (!isOpen) return null;

  const copyOriginToClipboard = () => {
    navigator.clipboard.writeText(currentOrigin);
    setCopiedOrigin(true);
    setTimeout(() => setCopiedOrigin(false), 2000);
  };

  const handleGoogleSignInWithClientId = (clientIdToUse: string) => {
    setAuthError(null);
    setIsLoadingAuth(true);

    const effectiveClientId = clientIdToUse.trim() || customClientId.trim() || defaultClientId.trim();

    if (!effectiveClientId) {
      setAuthError('No Google OAuth Client ID found. Please configure one in the Advanced tab or set GOOGLE_CLIENT_ID in settings.');
      setIsLoadingAuth(false);
      return;
    }

    localStorage.setItem('ga4_custom_client_id', effectiveClientId);

    if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
      setAuthError('Google Identity Services is initializing. Please retry in a moment.');
      setIsLoadingAuth(false);
      return;
    }

    try {
      const client = window.google.accounts.oauth2.initTokenClient({
        client_id: effectiveClientId,
        scope: 'https://www.googleapis.com/auth/analytics.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email',
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
              customClientId: effectiveClientId
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

    const newUser: UserProfile = {
      name: tokenName.trim() || 'Custom Token User',
      email: 'connected-api@google.com',
      accessToken: directToken.trim(),
      authMode: 'custom_token',
    };

    onUpdateUser(newUser);
    onRefreshProperties();
    onClose();
  };

  const handleLogout = () => {
    onUpdateUser(null);
    onRefreshProperties();
  };

  const hasConfiguredClientId = Boolean(defaultClientId || customClientId);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Sign in with Google</h2>
              <p className="text-xs text-slate-500">Connect your account for live Google Analytics 4 access</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-white">
          <button
            id="tab-btn-sso"
            onClick={() => { setActiveTab('sso'); setAuthError(null); }}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'sso'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Globe className="w-4 h-4" />
            1-Click Google Sign-In
          </button>
          <button
            id="tab-btn-advanced"
            onClick={() => { setActiveTab('advanced'); setAuthError(null); }}
            className={`flex items-center gap-2 py-3 px-3 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'advanced'
                ? 'border-blue-600 text-blue-700 bg-blue-50/40'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            Advanced Options
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-700 text-sm">
          {authError && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-500" />
              <div className="flex-1">{authError}</div>
            </div>
          )}

          {/* TAB 1: 1-CLICK GOOGLE SSO ONLY */}
          {activeTab === 'sso' && (
            <div className="space-y-5 py-2">
              {user?.accessToken ? (
                /* Connected State Card */
                <div className="p-5 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {user.picture ? (
                        <img 
                          src={user.picture} 
                          alt={user.name} 
                          className="w-12 h-12 rounded-full border border-emerald-300 shadow-xs"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                          {user.name.substring(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-slate-900 text-sm">{user.name}</h3>
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-full border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Connected
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{user.email || 'Google Analytics API'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-emerald-200/60 flex items-center justify-between text-xs">
                    <span className="text-emerald-800">
                      Live data is actively synchronized with your GA4 properties.
                    </span>
                    <button
                      id="btn-disconnect-auth"
                      onClick={handleLogout}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-rose-600 font-semibold transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </div>
              ) : (
                /* Disconnected / Ready to Sign In */
                <div className="space-y-4">
                  <div className="text-center space-y-2 py-2">
                    <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-xs">
                      <Globe className="w-7 h-7" />
                    </div>
                    <h3 className="text-base font-bold text-slate-900">
                      Connect Google Analytics 4
                    </h3>
                    <p className="text-xs text-slate-500 max-w-sm mx-auto leading-relaxed">
                      Sign in with your Google account to query all your analytics properties, real-time traffic, and reports with live AI insights.
                    </p>
                  </div>

                  {/* The Primary 1-Click SSO Button */}
                  <div className="pt-2">
                    <button
                      id="btn-sign-in-one-click"
                      disabled={isLoadingAuth}
                      onClick={() => handleGoogleSignInWithClientId(defaultClientId || customClientId)}
                      className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold text-sm shadow-md flex items-center justify-center gap-3 transition-all duration-150 disabled:opacity-50 cursor-pointer group"
                    >
                      {isLoadingAuth ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                        <>
                          <Globe className="w-5 h-5 text-blue-200 group-hover:text-white transition-colors" />
                          <span>Sign in with Google (1-Click)</span>
                        </>
                      )}
                    </button>
                  </div>

                  {!hasConfiguredClientId && (
                    <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                        <span>No default OAuth Client ID detected.</span>
                      </div>
                      <button
                        onClick={() => setActiveTab('advanced')}
                        className="font-semibold text-blue-700 hover:underline shrink-0"
                      >
                        Configure in Advanced →
                      </button>
                    </div>
                  )}

                  <div className="pt-2 text-center text-xs text-slate-400">
                    Your credentials securely communicate directly with Google's OAuth 2.0 endpoints.
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ADVANCED OPTIONS */}
          {activeTab === 'advanced' && (
            <div className="space-y-5">
              {/* 1. Authorized JavaScript Origin helper */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 text-xs uppercase tracking-wider">Authorized JavaScript Origin</span>
                  <button
                    onClick={copyOriginToClipboard}
                    className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-semibold cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedOrigin ? 'Copied!' : 'Copy Origin'}
                  </button>
                </div>
                <div className="p-2.5 rounded-lg bg-white border border-slate-200 font-mono text-xs text-slate-800 break-all select-all">
                  {currentOrigin}
                </div>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Add this URI to <strong>Authorized JavaScript Origins</strong> in your Google Cloud Console OAuth 2.0 Client ID.
                </p>
                <div className="pt-1">
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-semibold"
                  >
                    Open GCP Console Credentials <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* 2. Custom OAuth 2.0 Client ID */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-slate-600" />
                  <h4 className="font-semibold text-slate-900 text-xs">Custom OAuth 2.0 Web Client ID</h4>
                </div>
                <input
                  type="text"
                  value={customClientId}
                  onChange={(e) => setCustomClientId(e.target.value)}
                  placeholder="e.g. 123456789-abcdefg.apps.googleusercontent.com"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 text-slate-900 placeholder-slate-400 text-xs font-mono transition-all"
                />
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
                      Authorize with Custom Client ID
                    </>
                  )}
                </button>
              </div>

              {/* 3. Direct Bearer Token for developers */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 space-y-3">
                <div className="flex items-center gap-2">
                  <Key className="w-4 h-4 text-slate-600" />
                  <h4 className="font-semibold text-slate-900 text-xs">Direct Bearer Token (Terminal / CLI)</h4>
                </div>
                <p className="text-xs text-slate-500">
                  Paste a temporary OAuth Bearer token generated with <code className="text-blue-600 font-mono bg-blue-50 px-1 py-0.5 rounded">gcloud auth print-access-token</code>:
                </p>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={tokenName}
                    onChange={(e) => setTokenName(e.target.value)}
                    placeholder="Token Label (e.g. Developer Test Token)"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-medium"
                  />
                  <textarea
                    rows={2}
                    value={directToken}
                    onChange={(e) => setDirectToken(e.target.value)}
                    placeholder="ya29.a0AfH6SMC..."
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 focus:border-blue-500 text-slate-900 text-xs font-mono"
                  />
                </div>
                <button
                  id="btn-apply-direct-token"
                  onClick={handleApplyDirectToken}
                  className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer border border-slate-300"
                >
                  <Key className="w-4 h-4 text-slate-600" />
                  Apply Bearer Token
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            <span>OAuth scopes: analytics.readonly & userinfo</span>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 font-medium transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

