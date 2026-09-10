import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { AuthModal } from './components/AuthModal';
import { PropertySelectorModal } from './components/PropertySelectorModal';
import { MCPInspectorModal } from './components/MCPInspectorModal';
import { QueryBuilderModal } from './components/QueryBuilderModal';
import { BigQueryStudioModal } from './components/BigQueryStudioModal';
import { UserProfile, GA4Property, GA4Account, ChatMessage } from './types';

export default function App() {
  // 1. Auth State - Saved in localStorage for smooth persistence across reloads
  const [user, setUser] = useState<UserProfile | null>(() => {
    try {
      const stored = localStorage.getItem('ga4_user_profile');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return null;
  });

  const [defaultClientId, setDefaultClientId] = useState<string>('');

  // 2. GA4 Accounts & Properties State - Purely Live API Data
  const [accounts, setAccounts] = useState<GA4Account[]>(() => {
    try {
      const customStored = localStorage.getItem('ga4_custom_properties');
      if (customStored) {
        const parsedProps: GA4Property[] = JSON.parse(customStored);
        if (parsedProps.length > 0) {
          return [{
            id: 'accounts/custom',
            account: 'accounts/custom',
            displayName: 'Custom GA4 Properties',
            properties: parsedProps
          }];
        }
      }
    } catch {}
    return [];
  });

  const [currentProperty, setCurrentProperty] = useState<GA4Property | null>(() => {
    try {
      const stored = localStorage.getItem('ga4_selected_property');
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {}
    return null;
  });

  const [isLiveAccountsLoading, setIsLiveAccountsLoading] = useState<boolean>(false);

  const handleSelectProperty = (prop: GA4Property | null) => {
    setCurrentProperty(prop);
    if (prop) {
      localStorage.setItem('ga4_selected_property', JSON.stringify(prop));
    } else {
      localStorage.removeItem('ga4_selected_property');
    }
  };

  // 3. Modals & Sidebar State
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isPropertyModalOpen, setIsPropertyModalOpen] = useState<boolean>(false);
  const [isMCPModalOpen, setIsMCPModalOpen] = useState<boolean>(false);
  const [isQueryBuilderOpen, setIsQueryBuilderOpen] = useState<boolean>(false);
  const [isBigQueryStudioOpen, setIsBigQueryStudioOpen] = useState<boolean>(false);

  // 4. Chat Messages State (Starts clean)
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState<boolean>(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Save/remove user profile in localStorage
  const handleUpdateUser = (newUser: UserProfile | null) => {
    setUser(newUser);
    if (newUser) {
      localStorage.setItem('ga4_user_profile', JSON.stringify(newUser));
    } else {
      localStorage.removeItem('ga4_user_profile');
      setAccounts([]);
      handleSelectProperty(null);
      setMessages([]);
    }
  };

  // Fetch initial server auth config
  useEffect(() => {
    fetch('/api/auth/config')
      .then(res => res.json())
      .then(data => {
        if (data.defaultClientId) {
          setDefaultClientId(data.defaultClientId);
        }
      })
      .catch(err => console.warn('Could not fetch auth config:', err));
  }, []);

  // Fetch GA4 accounts and properties when user changes or on refresh
  const fetchAccounts = async (token?: string) => {
    const activeToken = token || user?.accessToken;
    if (!activeToken) {
      setAccounts([]);
      handleSelectProperty(null);
      return;
    }

    setIsLiveAccountsLoading(true);
    try {
      const res = await fetch('/api/ga4/accounts', {
        headers: { 'Authorization': `Bearer ${activeToken}` }
      });

      let loadedAccounts: GA4Account[] = [];
      if (res.ok) {
        const data = await res.json();
        if (data.accounts && Array.isArray(data.accounts)) {
          loadedAccounts = data.accounts;
        }
      } else {
        const errData = await res.json().catch(() => ({}));
        console.warn('Could not fetch GA4 accounts:', errData.error || res.statusText);
      }

      // Merge saved custom properties if any
      try {
        const customStored = localStorage.getItem('ga4_custom_properties');
        if (customStored) {
          const customProps: GA4Property[] = JSON.parse(customStored);
          if (customProps.length > 0) {
            loadedAccounts = [
              {
                id: 'accounts/custom',
                account: 'accounts/custom',
                displayName: 'Custom GA4 Properties',
                properties: customProps
              },
              ...loadedAccounts
            ];
          }
        }
      } catch {}

      setAccounts(loadedAccounts);

      // Restore or auto-select property
      const allProps: GA4Property[] = loadedAccounts.flatMap((a: GA4Account) => a.properties);
      if (allProps.length > 0) {
        if (!currentProperty || !allProps.some(p => p.propertyId === currentProperty.propertyId)) {
          handleSelectProperty(allProps[0]);
        }
      }
    } catch (err) {
      console.warn('Error fetching accounts:', err);
    } finally {
      setIsLiveAccountsLoading(false);
    }
  };

  useEffect(() => {
    if (user?.accessToken) {
      fetchAccounts(user.accessToken);
    }
  }, [user?.accessToken]);

  const handleStopProcessing = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsLoadingChat(false);
  };

  // Handle user sending a chat query
  const handleSendMessage = async (text: string) => {
    if (!user?.accessToken) {
      setIsAuthModalOpen(true);
      return;
    }

    const userMsgId = `user_${Date.now()}`;
    const newUserMsg: ChatMessage = {
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, newUserMsg]);
    setIsLoadingChat(true);

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.accessToken}`
        },
        body: JSON.stringify({
          message: text,
          history: chatHistory,
          property: currentProperty,
          accessToken: user.accessToken,
          isBigQueryEnabled: !!user.isBigQueryEnabled
        }),
        signal: controller.signal
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: `Server error ${response.status}` }));
        throw new Error(errData.error || `Server returned status ${response.status}`);
      }

      const data = await response.json();

      const assistantMsg: ChatMessage = {
        id: `asst_${Date.now()}`,
        role: 'assistant',
        content: data.text || 'Analytics report completed.',
        timestamp: Date.now(),
        toolCalls: data.toolCalls,
        kpis: data.kpis,
        chart: data.chart,
        tableData: data.tableData,
        rawReportResponse: data.rawReportResponse,
        propertyContext: currentProperty ? {
          id: currentProperty.propertyId,
          name: currentProperty.displayName
        } : undefined
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        const abortMsg: ChatMessage = {
          id: `abort_${Date.now()}`,
          role: 'assistant',
          content: '⏹️ **Query stopped by user.** Ready for your next exploration.',
          timestamp: Date.now(),
          propertyContext: currentProperty ? {
            id: currentProperty.propertyId,
            name: currentProperty.displayName
          } : undefined
        };
        setMessages(prev => [...prev, abortMsg]);
        return;
      }

      console.error('Chat error:', err);
      const isAuthError = err.message?.toLowerCase().includes('auth') || 
                          err.message?.toLowerCase().includes('token') || 
                          err.message?.toLowerCase().includes('permission') ||
                          err.message?.toLowerCase().includes('401') ||
                          err.message?.toLowerCase().includes('403');
      
      const errorContent = isAuthError
        ? `⚠️ **Google Authorization Issue**:\n\n${err.message}\n\n👉 **Tip**: Click **"Sign in with Google"** in the top navigation to refresh your OAuth access token or select a valid GA4 property.`
        : `⚠️ **Unable to complete query**: ${err.message || 'An error occurred while executing the MCP tool.'}\n\nPlease check your property selection or Google authorization scopes.`;

      const errorMsg: ChatMessage = {
        id: `err_${Date.now()}`,
        role: 'assistant',
        content: errorContent,
        timestamp: Date.now(),
        propertyContext: currentProperty ? {
          id: currentProperty.propertyId,
          name: currentProperty.displayName
        } : undefined
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsLoadingChat(false);
      abortControllerRef.current = null;
    }
  };

  const handleNewChat = () => {
    setMessages([]);
  };

  const handleAddCustomProperty = (newProp: GA4Property) => {
    let existingCustom: GA4Property[] = [];
    try {
      const stored = localStorage.getItem('ga4_custom_properties');
      if (stored) existingCustom = JSON.parse(stored);
    } catch {}

    const updatedCustom = [newProp, ...existingCustom.filter(p => p.propertyId !== newProp.propertyId)];
    localStorage.setItem('ga4_custom_properties', JSON.stringify(updatedCustom));

    setAccounts(prev => {
      const withoutCustom = prev.filter(a => a.id !== 'accounts/custom');
      return [
        {
          id: 'accounts/custom',
          account: 'accounts/custom',
          displayName: 'Custom GA4 Properties',
          properties: updatedCustom
        },
        ...withoutCustom
      ];
    });

    handleSelectProperty(newProp);
  };

  const isBigQueryEnabled = !!user?.isBigQueryEnabled;

  return (
    <div className="h-screen w-full bg-[#f8fafc] flex flex-col font-sans text-slate-800 overflow-hidden antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navbar */}
      <Header
        currentProperty={currentProperty}
        user={user}
        isBigQueryEnabled={isBigQueryEnabled}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
        onOpenPropertyModal={() => setIsPropertyModalOpen(true)}
        onOpenMCPModal={() => setIsMCPModalOpen(true)}
        onOpenQueryBuilder={() => setIsQueryBuilderOpen(true)}
        onOpenBigQueryStudio={() => setIsBigQueryStudioOpen(true)}
        onNewChat={handleNewChat}
        isLiveLoading={isLiveAccountsLoading}
        onToggleSidebar={() => setIsSidebarOpen(prev => !prev)}
      />

      {/* Main App Canvas: Sidebar + Chat Area */}
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar
          onNewChat={handleNewChat}
          onSelectPrompt={handleSendMessage}
          currentProperty={currentProperty}
          isBigQueryEnabled={isBigQueryEnabled}
          onOpenQueryBuilder={() => setIsQueryBuilderOpen(true)}
          onOpenBigQueryStudio={() => setIsBigQueryStudioOpen(true)}
          onOpenMCPModal={() => setIsMCPModalOpen(true)}
          onOpenAuthModal={() => setIsAuthModalOpen(true)}
          isSidebarOpen={isSidebarOpen}
          onCloseSidebar={() => setIsSidebarOpen(false)}
        />

        <main className="flex-1 flex flex-col bg-white overflow-hidden relative">
          <ChatArea
            messages={messages}
            currentProperty={currentProperty}
            isLoading={isLoadingChat}
            onSendMessage={handleSendMessage}
            onStopProcessing={handleStopProcessing}
            onOpenQueryBuilder={() => setIsQueryBuilderOpen(true)}
            onOpenAuthModal={() => setIsAuthModalOpen(true)}
            isAuthenticated={!!user?.accessToken}
            isBigQueryEnabled={isBigQueryEnabled}
          />
        </main>
      </div>

      {/* Auth Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        user={user}
        onUpdateUser={handleUpdateUser}
        defaultClientId={defaultClientId}
        onRefreshProperties={() => fetchAccounts(user?.accessToken)}
      />

      {/* Property Switcher Modal */}
      <PropertySelectorModal
        isOpen={isPropertyModalOpen}
        onClose={() => setIsPropertyModalOpen(false)}
        accounts={accounts}
        currentProperty={currentProperty}
        onSelectProperty={handleSelectProperty}
        onAddCustomProperty={handleAddCustomProperty}
      />

      {/* MCP Protocol Inspector Modal */}
      <MCPInspectorModal
        isOpen={isMCPModalOpen}
        onClose={() => setIsMCPModalOpen(false)}
        currentProperty={currentProperty}
        accessToken={user?.accessToken}
        isBigQueryEnabled={isBigQueryEnabled}
      />

      {/* Visual Query Builder Modal */}
      <QueryBuilderModal
        isOpen={isQueryBuilderOpen}
        onClose={() => setIsQueryBuilderOpen(false)}
        currentProperty={currentProperty}
        onSubmitQuery={handleSendMessage}
      />

      {/* BigQuery SQL Studio Modal */}
      {isBigQueryEnabled && (
        <BigQueryStudioModal
          isOpen={isBigQueryStudioOpen}
          onClose={() => setIsBigQueryStudioOpen(false)}
          accessToken={user?.accessToken}
          onSendToChat={handleSendMessage}
        />
      )}
    </div>
  );
}

