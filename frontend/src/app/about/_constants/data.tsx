import React from 'react';
import {
  RiLayoutGridLine,
  RiServerLine,
  RiGlobalLine,
  RiFlowChart,
  RiReactjsLine,
  RiRobot2Line,
  RiDatabase2Line,
  RiCpuLine,
  RiBrainLine,
  RiTerminalBoxLine,
  RiSparkling2Fill,
  RiVideoChatLine,
  RiLightbulbLine,
  RiFileTextLine,
  RiMailSendLine,
  RiCalendarEventLine,
  RiCodeSSlashLine,
  RiTimerLine,
} from '@remixicon/react';

export const AUTHORS = [
  {
    name: 'Darshan Gowda G S',
    role: 'Lead Author',
    focus: 'Full-Stack & Systems Architecture',
    order: 'Lead Architect',
    github: 'darshan-gowdaa',
    githubUrl: 'https://github.com/darshan-gowdaa',
    bio: 'Architected the full-stack system: Next.js 15 Material 3 dashboard, FastAPI microservices, A2A gRPC communication bus, Google ADK agent integration, and the Chrome Extension.',
    domains: [
      { label: 'Next.js 15 / React', icon: RiLayoutGridLine },
      { label: 'FastAPI Microservices', icon: RiServerLine },
      { label: 'Chrome Extension (V3)', icon: RiGlobalLine },
      { label: 'A2A / gRPC Protocol', icon: RiFlowChart },
      { label: 'Material 3 Expressive', icon: RiReactjsLine },
    ],
    stack: ['Next.js 15', 'React', 'TypeScript', 'FastAPI', 'Python', 'gRPC', 'Supabase', 'Redis', 'Tailwind CSS'],
  },
  {
    name: 'Kanika Pitaliya',
    role: 'Co-Author',
    focus: 'AI Architecture & Research',
    order: 'AI Researcher',
    github: 'kanikapitaliya',
    githubUrl: 'https://github.com/kanikapitaliya',
    bio: 'Engineered the multi-agent AI ecosystem: episodic semantic memory with Qdrant vector search, Lyzr agent orchestration, LLM prompt engineering, and evaluation benchmarks.',
    domains: [
      { label: 'Google ADK', icon: RiRobot2Line },
      { label: 'Qdrant Vector DB', icon: RiDatabase2Line },
      { label: 'Lyzr Orchestration', icon: RiCpuLine },
      { label: 'LLM Prompt Research', icon: RiBrainLine },
      { label: 'Agent Pipelines', icon: RiTerminalBoxLine },
    ],
    stack: ['Google ADK', 'Lyzr', 'Qdrant', 'Vector Embeddings', 'LLM Prompting', 'A2A Protocol', 'OpenTelemetry', 'Langfuse'],
  },
] as const;

export const STATS = [
  { value: 9, suffix: '', label: 'AI Agents', desc: 'Specialized & isolated', icon: RiRobot2Line },
  { value: 100, suffix: '%', label: 'A2A Native', desc: 'gRPC message bus', icon: RiFlowChart },
  { value: 8, suffix: '+', label: 'Tech Integrations', desc: 'End-to-end pipeline', icon: RiDatabase2Line },
  { value: 3, suffix: '', label: 'Core Platforms', desc: 'Web · Extension · API', icon: RiSparkling2Fill },
] as const;

export const AGENTS = [
  {
    name: 'Transcription Stream',
    capability: 'Live Audio Ingestion',
    desc: 'Streams and processes live meeting audio with zero latency using persistent WebSocket connections and high-accuracy speech models.',
    icon: RiVideoChatLine,
    pillar: 'Live Stream',
    tag: 'WebSocket · Zero Loss',
  },
  {
    name: 'Realtime Copilot',
    capability: 'In-Meeting Assistance',
    desc: 'Generates proactive suggestions, speaker cues, and contextual insights mid-meeting while conversations are still underway.',
    icon: RiLightbulbLine,
    pillar: 'Live Stream',
    tag: 'Proactive Context Cues',
  },
  {
    name: 'Late Join Catch-up',
    capability: 'Instant Context Recaps',
    desc: 'Delivers instant 30-second synthesized recaps of prior discussion so late arrivals catch up seamlessly without disrupting active flow.',
    icon: RiTimerLine,
    pillar: 'Live Stream',
    tag: 'Instant 30s Catch-Up',
  },
  {
    name: 'Structured Summary',
    capability: 'Executive Synthesis',
    desc: 'Produces executive briefs, discussion highlights, core decisions, and verifiable takeaways automatically after each session.',
    icon: RiFileTextLine,
    pillar: 'Intelligence',
    tag: 'Executive Briefs',
  },
  {
    name: 'Semantic Memory',
    capability: 'Vector Knowledge Base',
    desc: 'Indexes episodic embeddings in Qdrant vector database for semantic recall across organizational history and previous meetings.',
    icon: RiBrainLine,
    pillar: 'Intelligence',
    tag: 'Qdrant Vector DB',
  },
  {
    name: 'Document QA',
    capability: 'Context-Grounded Answers',
    desc: 'Ingests supporting files and docs, answering deep queries grounded directly in meeting context with strict factual citations.',
    icon: RiCodeSSlashLine,
    pillar: 'Intelligence',
    tag: 'Factual Citations',
  },
  {
    name: 'Commitments & Actions',
    capability: 'Task Extraction & Scheduling',
    desc: 'Identifies deliverables with owner assignments and deadlines, generating reminders and calendar events directly from discussion.',
    icon: RiCalendarEventLine,
    pillar: 'Automation',
    tag: 'Owner Assignments',
  },
  {
    name: 'Follow-Up Email',
    capability: 'Automated Communication',
    desc: 'Drafts comprehensive, professional follow-up emails highlighting takeaways and assigned items ready for one-click Gmail review.',
    icon: RiMailSendLine,
    pillar: 'Automation',
    tag: 'Gmail Ready Drafts',
  },
  {
    name: 'gRPC Orchestrator',
    capability: 'Multi-Agent Intelligence',
    desc: 'Routes high-speed agent-to-agent (A2A) message traffic with fallback resilience, coordinating isolated workers instead of one monolithic LLM.',
    icon: RiFlowChart,
    pillar: 'Automation',
    tag: 'A2A Protocol Bus',
  },
] as const;

export const Logos = {
  Nextjs: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 01-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 00-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 00-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 01-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 01-.157-.171l-.049-.106.006-4.703.007-4.705.072-.092a.645.645 0 01.174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 004.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 002.466-2.163 11.944 11.944 0 002.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 00-2.499-.523A33.119 33.119 0 0011.573 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 01.237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 01.233-.296c.096-.05.13-.054.5-.054z"/></svg>,
  React: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14.23 12.004a2.236 2.236 0 01-2.235 2.236 2.236 2.236 0 01-2.236-2.236 2.236 2.236 0 012.235-2.236 2.236 2.236 0 012.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44a23.476 23.476 0 00-3.107-.534 23.892 23.892 0 00-2.038-2.497c1.516-1.495 2.928-2.24 4.107-2.24z"/></svg>,
  TypeScript: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 011.306.34v2.458a3.95 3.95 0 00-.643-.361 5.093 5.093 0 00-.717-.26 5.453 5.453 0 00-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 00-.623.242c-.17.104-.3.229-.393.374a.888.888 0 00-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 01-1.012 1.085 4.38 4.38 0 01-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 01-1.84-.164 5.544 5.544 0 01-1.512-.493v-2.63a5.033 5.033 0 003.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 00-.074-1.089 2.12 2.12 0 00-.537-.5 5.597 5.597 0 00-.807-.444 27.72 27.72 0 00-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 011.47-.629 7.536 7.536 0 011.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/></svg>,
  Google: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>,
  Python: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.83l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.23l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05L0 11.97l.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.24l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05 1.07.13zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09-.33.22zM21.1 6.11l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.04z"/></svg>,
  FastAPI: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.375 0 0 5.375 0 12c0 6.627 5.375 12 12 12 6.626 0 12-5.373 12-12 0-6.625-5.373-12-12-12zm-.624 21.62v-7.528H7.19L13.203 2.38v7.528h4.029L11.376 21.62z"/></svg>
};

export const getLogo = (tech: string) => {
  if (tech.includes('Next.js')) return <Logos.Nextjs />;
  if (tech.includes('React')) return <Logos.React />;
  if (tech.includes('TypeScript')) return <Logos.TypeScript />;
  if (tech.includes('FastAPI')) return <Logos.FastAPI />;
  if (tech.includes('Python')) return <Logos.Python />;
  if (tech.includes('Google ADK')) return <Logos.Google />;
  if (tech.includes('Qdrant')) return <RiDatabase2Line size={14} color="#a8c7fa" />;
  return null;
};
