"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

type Integration = {
  id: string;
  name: string;
  logo: React.ReactNode;
};

const INTEGRATION_DEFS: Integration[] = [
  { 
    id: "google_calendar", 
    name: "Google Calendar",
    logo: (
      <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.2 14.2L11 13V7h1.5v5.2l4.5 2.7-.8 1.3z" fill="#4285F4"/>
      </svg>
    )
  },
  { 
    id: "slack", 
    name: "Slack",
    logo: (
      <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.958a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.52h2.52zM15.165 17.687a2.527 2.527 0 0 1-2.52-2.521 2.526 2.526 0 0 1 2.52-2.521h6.313A2.527 2.527 0 0 1 24 15.166a2.528 2.528 0 0 1-2.522 2.521h-6.313z" fill="#E01E5A"/>
      </svg>
    )
  },
  { 
    id: "notion", 
    name: "Notion",
    logo: (
      <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
        <path d="M4.459 4.208c-.742.062-1.458.261-2.128.59l-.497-.687L7.333 1.5l10.518 3.513c.89.062 1.633.25 2.126.545l.594.69-5.597 2.616-10.515-4.656zm14.47 18.29l-10.52-3.418v-12.72l5.599-2.716 10.52 4.658v12.72l-5.599 1.476zm-9.332-4.408l8.33-2.738v-10.15l-8.33 4.24v8.648z" fill="#000000" className="dark:fill-white"/>
      </svg>
    )
  }
];

export default function IntegrationsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  
  const [connections, setConnections] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchIntegrations = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/integrations`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        const connMap: Record<string, boolean> = {};
        (data.integrations || []).forEach((i: { provider: string; is_connected: boolean }) => {
          connMap[i.provider] = i.is_connected;
        });
        setConnections(connMap);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchIntegrations();
  }, [token]);

  const toggleIntegration = async (provider: string, currentStatus: boolean) => {
    if (!token) return;
    const newStatus = !currentStatus;
    
    // Optimistic UI
    setConnections(prev => ({ ...prev, [provider]: newStatus }));
    
    try {
      await fetch(`${API_URL}/api/settings/integrations/${provider}`, {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ is_connected: newStatus })
      });
    } catch {
      // Revert on error
      setConnections(prev => ({ ...prev, [provider]: currentStatus }));
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl animate-fade-scale">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text">Integrations</h1>
      
      {loading ? (
        <div className="text-text-muted">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {INTEGRATION_DEFS.map(integration => {
            const isConnected = !!connections[integration.id];
            
            return (
              <div 
                key={integration.id} 
                className="bg-surface-container rounded-[32px] p-6 flex flex-col gap-4 border border-border md3-glow-primary transition-shadow duration-300"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-surface rounded-full flex items-center justify-center border border-border">
                    {integration.logo}
                  </div>
                  <h2 className="font-bold text-xl text-text">{integration.name}</h2>
                </div>
                
                <div className={`self-start text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${isConnected ? 'bg-success-container text-on-success-container' : 'bg-surface-highest text-text-muted'}`}>
                  {isConnected ? 'Connected' : 'Not connected'}
                </div>
                
                <button 
                  onClick={() => toggleIntegration(integration.id, isConnected)}
                  className={`mt-auto self-start px-6 py-2 rounded-full font-bold transition-colors spring ${isConnected ? 'bg-surface-highest text-text hover:bg-surface-highest/80 border border-border' : 'bg-primary text-on-primary hover:bg-primary-container hover:text-on-primary-container'}`}
                >
                  {isConnected ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
