"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { Switch } from "@/components/atoms/Switch";

const API_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000";

type Notifications = {
  email: boolean;
  reminders: boolean;
  in_app: boolean;
};

export default function NotificationsPage() {
  const { session } = useAuth();
  const token = session?.access_token;
  
  const [notifs, setNotifs] = useState<Notifications>({
    email: true,
    reminders: true,
    in_app: true,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const fetchSettings = async () => {
      try {
        const res = await fetch(`${API_URL}/api/settings/`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.notifications) setNotifs(data.notifications);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, [token]);

  const toggleNotif = async (key: keyof Notifications) => {
    if (!token) return;
    const newNotifs = { ...notifs, [key]: !notifs[key] };
    
    // Optimistic UI
    setNotifs(newNotifs);
    
    try {
      await fetch(`${API_URL}/api/settings/`, {
        method: "PATCH",
        headers: { 
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ notifications: newNotifs })
      });
    } catch {
      // Revert on error
      setNotifs({ ...notifs, [key]: notifs[key] });
    }
  };

  return (
    <div className="flex flex-col gap-8 max-w-3xl animate-fade-scale">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text">Notifications</h1>
      
      {loading ? (
        <div className="text-text-muted">Loading...</div>
      ) : (
        <div className="bg-surface-container rounded-[32px] p-8 flex flex-col gap-6 border border-border">
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div className="flex flex-col">
              <span className="font-bold text-lg text-text">Email Summaries</span>
              <span className="text-sm text-text-muted">Daily digests of activity</span>
            </div>
            <Switch 
              checked={notifs.email}
              onCheckedChange={() => toggleNotif('email')}
            />
          </label>
          
          <div className="h-px w-full bg-border"></div>
          
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div className="flex flex-col">
              <span className="font-bold text-lg text-text">Meeting Reminders</span>
              <span className="text-sm text-text-muted">Alerts before meetings start</span>
            </div>
            <Switch 
              checked={notifs.reminders}
              onCheckedChange={() => toggleNotif('reminders')}
            />
          </label>
          
          <div className="h-px w-full bg-border"></div>
          
          <label className="flex items-center justify-between gap-4 cursor-pointer">
            <div className="flex flex-col">
              <span className="font-bold text-lg text-text">In-App Alerts</span>
              <span className="text-sm text-text-muted">Real-time web notifications</span>
            </div>
            <Switch 
              checked={notifs.in_app}
              onCheckedChange={() => toggleNotif('in_app')}
            />
          </label>
        </div>
      )}
    </div>
  );
}
