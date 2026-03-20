import React, { useEffect, useState } from 'react';
import { Bot, ExternalLink, Loader2, Minimize2, Maximize2, X } from 'lucide-react';

const IBM_CHAT_ROOT_ID = 'wxo-chat-root';
const IBM_HOST_URL = import.meta.env.VITE_IBM_HOST_URL;
const IBM_LOADER_ID = 'wxo-loader-script';
const IBM_ORCHESTRATION_ID = import.meta.env.VITE_IBM_ORCHESTRATION_ID;
const IBM_CRN = import.meta.env.VITE_IBM_CRN;
const IBM_AGENT_ID = import.meta.env.VITE_IBM_AGENT_ID;
const IBM_AGENT_ENVIRONMENT_ID = import.meta.env.VITE_IBM_AGENT_ENVIRONMENT_ID;

export const AIAssistant: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || isMinimized || typeof window === 'undefined') {
      return;
    }

    if (!IBM_HOST_URL || !IBM_ORCHESTRATION_ID || !IBM_CRN || !IBM_AGENT_ID) {
      setLoadError('IBM chat is not configured. Add the required VITE_IBM_* values to .env.local before opening the assistant.');
      setIsLoading(false);
      return;
    }

    const chatOptions: Window['wxOConfiguration']['chatOptions'] = {
      agentId: IBM_AGENT_ID,
    };

    if (IBM_AGENT_ENVIRONMENT_ID) {
      chatOptions.agentEnvironmentId = IBM_AGENT_ENVIRONMENT_ID;
    }

    window.wxOConfiguration = {
      orchestrationID: IBM_ORCHESTRATION_ID,
      hostURL: IBM_HOST_URL,
      rootElementID: IBM_CHAT_ROOT_ID,
      deploymentPlatform: 'ibmcloud',
      crn: IBM_CRN,
      chatOptions,
    };

    const existingScript = document.getElementById(IBM_LOADER_ID) as HTMLScriptElement | null;
    const initChat = () => {
      try {
        window.wxoLoader?.init();
        setIsLoading(false);
        setLoadError(null);
      } catch (error) {
        console.error('IBM chat init failed:', error);
        setIsLoading(false);
        setLoadError('IBM assistant failed to initialize.');
      }
    };

    if (existingScript) {
      initChat();
      return;
    }

    setIsLoading(true);
    setLoadError(null);

    const script = document.createElement('script');
    script.id = IBM_LOADER_ID;
    script.src = `${IBM_HOST_URL}/wxochat/wxoLoader.js?embed=true`;
    script.async = true;
    script.addEventListener('load', initChat);
    script.addEventListener('error', () => {
      setIsLoading(false);
      setLoadError('IBM assistant script failed to load.');
    });
    document.head.appendChild(script);
  }, [isMinimized, isOpen]);

  if (!isOpen) {
    return (
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 rounded-full flex items-center justify-center shadow-2xl shadow-indigo-500/40 hover:scale-110 transition-all z-50 group"
      >
        <Bot className="text-white group-hover:rotate-12 transition-transform" size={28} />
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-zinc-950"></div>
      </button>
    );
  }

  return (
    <div className={`fixed bottom-6 right-6 w-80 md:w-96 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl z-50 flex flex-col transition-all overflow-hidden ${isMinimized ? 'h-14' : 'h-[500px]'}`}>
      <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
        <div className="flex items-center gap-2">
          <Bot size={18} className="text-indigo-400" />
          <span className="text-sm font-bold">SiliconSentinel AI</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setIsMinimized(!isMinimized)} className="text-zinc-500 hover:text-white transition-colors">
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button onClick={() => setIsOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          <div className="flex-1 overflow-hidden bg-zinc-950/30">
            {(isLoading || loadError) && (
              <div className="absolute inset-x-4 top-16 z-10 rounded-xl border border-zinc-800 bg-zinc-950/95 p-3 text-xs text-zinc-300 shadow-xl">
                {isLoading && (
                  <div className="flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin text-indigo-400" />
                    <span>Loading IBM assistant...</span>
                  </div>
                )}
                {loadError && (
                  <div className="space-y-2">
                    <p>{loadError}</p>
                    <p className="text-zinc-500">
                      Verify your `agentId`, optional `agentEnvironmentId`, and IBM embedded chat security in the tenant.
                    </p>
                    <a
                      href={`${IBM_HOST_URL}/wxochat/wxoLoader.js?embed=true`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-indigo-400 hover:text-indigo-300"
                    >
                      <ExternalLink size={12} />
                      <span>Open loader URL</span>
                    </a>
                  </div>
                )}
              </div>
            )}
            <div id={IBM_CHAT_ROOT_ID} className="h-full w-full" />
            {!isLoading && !loadError && (
              <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-zinc-900 to-transparent" />
            )}
          </div>
          <div className="border-t border-zinc-800 bg-zinc-950/30 px-4 py-3 text-[11px] text-zinc-500">
            IBM watsonx Orchestrate embedded assistant
          </div>
        </>
      )}
    </div>
  );
};
