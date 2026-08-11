'use client';

export default function NotificationsPage() {
  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Notifications</h1>
      <div className="bg-surface-high border border-outline-variant rounded-[32px] p-6 flex flex-col gap-6 shadow-sm">
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div className="flex flex-col">
            <span className="font-bold text-lg">Email Summaries</span>
            <span className="text-sm text-text-muted">Daily digests of activity</span>
          </div>
          <input type="checkbox" className="w-6 h-6 rounded-md accent-primary focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 hover:scale-105 active:scale-95" />
        </label>
        <div className="h-px w-full bg-outline-variant"></div>
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div className="flex flex-col">
            <span className="font-bold text-lg">Meeting Reminders</span>
            <span className="text-sm text-text-muted">Alerts before meetings start</span>
          </div>
          <input type="checkbox" className="w-6 h-6 rounded-md accent-primary focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 hover:scale-105 active:scale-95" defaultChecked />
        </label>
        <div className="h-px w-full bg-outline-variant"></div>
        <label className="flex items-center justify-between gap-4 cursor-pointer">
          <div className="flex flex-col">
            <span className="font-bold text-lg">In-App Alerts</span>
            <span className="text-sm text-text-muted">Real-time web notifications</span>
          </div>
          <input type="checkbox" className="w-6 h-6 rounded-md accent-primary focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-300 hover:scale-105 active:scale-95" defaultChecked />
        </label>
      </div>
    </div>
  );
}
