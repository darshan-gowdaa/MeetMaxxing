'use client';

export default function IntegrationsPage() {
  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight">Integrations</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[
          { name: 'Google Calendar', status: 'Connected', color: 'bg-green-500/10 text-green-500' },
          { name: 'Slack', status: 'Not connected', color: 'bg-surface-highest text-text-muted' },
          { name: 'Notion', status: 'Not connected', color: 'bg-surface-highest text-text-muted' },
        ].map(integration => (
          <div key={integration.name} className="bg-surface-high border border-outline-variant rounded-[32px] p-6 flex flex-col gap-4 hover:-translate-y-1 hover:shadow-xl transition-all duration-300">
            <h2 className="font-bold text-xl">{integration.name}</h2>
            <div className={`self-start text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full ${integration.color}`}>
              {integration.status}
            </div>
            <button className="mt-auto self-start bg-primary text-on-primary px-6 py-2 rounded-full font-medium active:scale-[0.97] transition-all duration-300">
              {integration.status === 'Connected' ? 'Manage' : 'Connect'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
