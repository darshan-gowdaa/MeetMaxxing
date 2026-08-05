"use client";

import React, { useState, useRef, useEffect, MouseEvent } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Strands from '@/components/atoms/Strands';
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
  RiGithubFill,
  RiArrowRightLine
} from '@remixicon/react';

const AUTHORS = [
  {
    name: 'Darshan Gowda G S', role: 'Lead Author', focus: 'Web Development',
    github: 'darshan-gowdaa', githubUrl: 'https://github.com/darshan-gowdaa',
    bio: 'Led the full-stack architecture — Next.js Material 3 dashboard, FastAPI backend, A2A gRPC communication layer, Google ADK agent integration, and the Chrome Extension.',
    domains: [
      { label: 'Next.js / React', icon: RiLayoutGridLine },
      { label: 'FastAPI', icon: RiServerLine },
      { label: 'Chrome Extension', icon: RiGlobalLine },
      { label: 'A2A / gRPC', icon: RiFlowChart },
      { label: 'Material 3 UI', icon: RiReactjsLine },
    ],
    stack: ['Next.js 14', 'React', 'TypeScript', 'FastAPI', 'Python', 'gRPC', 'Supabase', 'Redis'],
    order: '1st Author',
    containerBg: 'rgba(8,66,160,0.18)', containerBorder: 'rgba(168,199,250,0.2)',
    avatarBg: 'rgba(168,199,250,0.12)', avatarBorder: 'rgba(168,199,250,0.3)',
    orderChipBg: 'rgba(8,66,160,0.5)', orderChipText: '#d6e3ff',
    focusChipBg: 'rgba(168,199,250,0.1)', focusChipBorder: 'rgba(168,199,250,0.2)',
  },
  {
    name: 'Kanika Pitaliya', role: 'Co-Author', focus: 'AI & Research',
    github: 'kanikapitaliya', githubUrl: 'https://github.com/kanikapitaliya',
    bio: 'Designed the multi-agent AI ecosystem — semantic memory architecture with Qdrant, Lyzr orchestration, LLM agent prompting strategies, and AI pipeline research.',
    domains: [
      { label: 'Google ADK', icon: RiRobot2Line },
      { label: 'Qdrant', icon: RiDatabase2Line },
      { label: 'Lyzr', icon: RiCpuLine },
      { label: 'LLM Research', icon: RiBrainLine },
      { label: 'AI Pipelines', icon: RiTerminalBoxLine },
    ],
    stack: ['Google ADK', 'Lyzr', 'Qdrant', 'Vector Embeddings', 'LLM Prompting', 'A2A Protocol', 'OpenTelemetry', 'Langfuse'],
    order: '2nd Author',
    containerBg: 'rgba(4,53,130,0.14)', containerBorder: 'rgba(168,199,250,0.14)',
    avatarBg: 'rgba(168,199,250,0.08)', avatarBorder: 'rgba(168,199,250,0.2)',
    orderChipBg: 'rgba(4,53,130,0.55)', orderChipText: '#c2d8ff',
    focusChipBg: 'rgba(168,199,250,0.07)', focusChipBorder: 'rgba(168,199,250,0.14)',
  },
] as const;

const STATS = [
  { value: 9,   suffix: '',  label: 'AI Agents',         desc: 'Specialized & isolated',  icon: RiRobot2Line },
  { value: 100, suffix: '%', label: 'A2A Native',        desc: 'gRPC message bus',         icon: RiFlowChart },
  { value: 8,   suffix: '+', label: 'Tech Integrations', desc: 'End-to-end pipeline',      icon: RiDatabase2Line },
  { value: 3,   suffix: '',  label: 'Core Platforms',    desc: 'Web · Extension · API',    icon: RiSparkling2Fill },
] as const;

const AGENTS = [
  { name: 'Transcription', desc: 'Streams and processes live meeting transcripts.', icon: RiVideoChatLine },
  { name: 'Realtime',      desc: 'Generates contextual suggestions mid-meeting.',   icon: RiLightbulbLine },
  { name: 'Summary',       desc: 'Produces summaries, key points, action items.',   icon: RiFileTextLine },
  { name: 'Memory',        desc: 'Stores semantic embeddings in Qdrant.',           icon: RiBrainLine },
  { name: 'Email',         desc: 'Drafts follow-up emails from meeting context.',   icon: RiMailSendLine },
  { name: 'Scheduler',     desc: 'Converts action items to calendar events.',       icon: RiCalendarEventLine },
  { name: 'Docs QA',       desc: 'Answers questions using uploaded documents.',     icon: RiCodeSSlashLine },
  { name: 'Late Join',     desc: 'Instant recap for mid-meeting participants.',      icon: RiTimerLine },
  { name: 'Orchestrator',  desc: 'Routes and coordinates all agents via A2A.',      icon: RiFlowChart },
] as const;

const FEATURES = [
  { title: 'Multi-Agent Intelligence', desc: 'Specialized AI agents collaborate to perform dedicated tasks instead of relying on a single monolithic LLM.', icon: RiRobot2Line },
  { title: 'Real-Time Assistance', desc: 'Contextual suggestions, meeting insights, and intelligent support while the meeting is still in progress.', icon: RiLightbulbLine },
  { title: 'Semantic Memory', desc: 'Store and retrieve meeting knowledge using vector embeddings powered by Qdrant.', icon: RiBrainLine },
  { title: 'Smart Meeting Summaries', desc: 'Automatically generate concise summaries, key discussion points, and actionable takeaways.', icon: RiFileTextLine },
  { title: 'AI Follow-ups', desc: 'Generate professional follow-up emails containing meeting highlights and action items.', icon: RiMailSendLine },
  { title: 'Intelligent Scheduling', desc: 'Create reminders and follow-up meetings directly from extracted action items.', icon: RiCalendarEventLine },
  { title: 'Document Question Answering', desc: 'Upload supporting documents and let AI agents answer questions using meeting context.', icon: RiCodeSSlashLine },
  { title: 'Late Join Recaps', desc: 'Users joining late receive an instant AI-generated summary of everything discussed so far.', icon: RiTimerLine },
] as const;

const Logos = {
  Nextjs: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M11.572 0c-.176 0-.31.001-.358.007a19.76 19.76 0 01-.364.033C7.443.346 4.25 2.185 2.228 5.012a11.875 11.875 0 00-2.119 5.243c-.096.659-.108.854-.108 1.747s.012 1.089.108 1.748c.652 4.506 3.86 8.292 8.209 9.695.779.25 1.6.422 2.534.525.363.04 1.935.04 2.299 0 1.611-.178 2.977-.577 4.323-1.264.207-.106.247-.134.219-.158-.02-.013-.9-1.193-1.955-2.62l-1.919-2.592-2.404-3.558a338.739 338.739 0 00-2.422-3.556c-.009-.002-.018 1.579-.023 3.51-.007 3.38-.01 3.515-.052 3.595a.426.426 0 01-.206.214c-.075.037-.14.044-.495.044H7.81l-.108-.068a.438.438 0 01-.157-.171l-.049-.106.006-4.703.007-4.705.072-.092a.645.645 0 01.174-.143c.096-.047.134-.051.54-.051.478 0 .558.018.682.154.035.038 1.337 1.999 2.895 4.361a10760.433 10760.433 0 004.735 7.17l1.9 2.879.096-.063a12.317 12.317 0 002.466-2.163 11.944 11.944 0 002.824-6.134c.096-.66.108-.854.108-1.748 0-.893-.012-1.088-.108-1.747-.652-4.506-3.859-8.292-8.208-9.695a12.597 12.597 0 00-2.499-.523A33.119 33.119 0 0011.573 0zm4.069 7.217c.347 0 .408.005.486.047a.473.473 0 01.237.277c.018.06.023 1.365.018 4.304l-.006 4.218-.744-1.14-.746-1.14v-3.066c0-1.982.01-3.097.023-3.15a.478.478 0 01.233-.296c.096-.05.13-.054.5-.054z"/></svg>,
  React: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14.23 12.004a2.236 2.236 0 01-2.235 2.236 2.236 2.236 0 01-2.236-2.236 2.236 2.236 0 012.235-2.236 2.236 2.236 0 012.236 2.236zm2.648-10.69c-1.346 0-3.107.96-4.888 2.622-1.78-1.653-3.542-2.602-4.887-2.602-.41 0-.783.093-1.106.278-1.375.793-1.683 3.264-.973 6.365C1.98 8.917 0 10.42 0 12.004c0 1.59 1.99 3.097 5.043 4.03-.704 3.113-.39 5.588.988 6.38.32.187.69.275 1.102.275 1.345 0 3.107-.96 4.888-2.624 1.78 1.654 3.542 2.603 4.887 2.603.41 0 .783-.09 1.106-.275 1.374-.792 1.683-3.263.973-6.365C22.02 15.096 24 13.59 24 12.004c0-1.59-1.99-3.097-5.043-4.032.704-3.11.39-5.587-.988-6.38-.318-.184-.688-.277-1.092-.278zm-.005 1.09c.225 0 .406.044.558.127.666.382.955 1.835.73 3.704-.054.46-.142.945-.25 1.44a23.476 23.476 0 00-3.107-.534 23.892 23.892 0 00-2.038-2.497c1.516-1.495 2.928-2.24 4.107-2.24z"/></svg>,
  TypeScript: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M1.125 0C.502 0 0 .502 0 1.125v21.75C0 23.498.502 24 1.125 24h21.75c.623 0 1.125-.502 1.125-1.125V1.125C24 .502 23.498 0 22.875 0zm17.363 9.75c.612 0 1.154.037 1.627.111a6.38 6.38 0 011.306.34v2.458a3.95 3.95 0 00-.643-.361 5.093 5.093 0 00-.717-.26 5.453 5.453 0 00-1.426-.2c-.3 0-.573.028-.819.086a2.1 2.1 0 00-.623.242c-.17.104-.3.229-.393.374a.888.888 0 00-.14.49c0 .196.053.373.156.529.104.156.252.304.443.444s.423.276.696.41c.273.135.582.274.926.416.47.197.892.407 1.266.628.374.222.695.473.963.753.268.279.472.598.614.957.142.359.214.776.214 1.253 0 .657-.125 1.21-.373 1.656a3.033 3.033 0 01-1.012 1.085 4.38 4.38 0 01-1.487.596c-.566.12-1.163.18-1.79.18a9.916 9.916 0 01-1.84-.164 5.544 5.544 0 01-1.512-.493v-2.63a5.033 5.033 0 003.237 1.2c.333 0 .624-.03.872-.09.249-.06.456-.144.623-.25.166-.108.29-.234.373-.38a1.023 1.023 0 00-.074-1.089 2.12 2.12 0 00-.537-.5 5.597 5.597 0 00-.807-.444 27.72 27.72 0 00-1.007-.436c-.918-.383-1.602-.852-2.053-1.405-.45-.553-.676-1.222-.676-2.005 0-.614.123-1.141.369-1.582.246-.441.58-.804 1.004-1.089a4.494 4.494 0 011.47-.629 7.536 7.536 0 011.77-.201zm-15.113.188h9.563v2.166H9.506v9.646H6.789v-9.646H3.375z"/></svg>,
  Google: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12.48 10.92v3.28h7.84c-.24 1.84-.853 3.187-1.787 4.133-1.147 1.147-2.933 2.4-6.053 2.4-4.827 0-8.6-3.893-8.6-8.72s3.773-8.72 8.6-8.72c2.6 0 4.507 1.027 5.907 2.347l2.307-2.307C18.747 1.44 16.133 0 12.48 0 5.867 0 .307 5.387.307 12s5.56 12 12.173 12c3.573 0 6.267-1.173 8.373-3.36 2.16-2.16 2.84-5.213 2.84-7.667 0-.76-.053-1.467-.173-2.053H12.48z"/></svg>,
  Python: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M14.25.18l.9.2.73.26.59.3.45.32.34.34.25.34.16.33.1.3.04.26.02.2-.01.13V8.5l-.05.63-.13.55-.21.46-.26.38-.3.31-.33.25-.35.19-.35.14-.33.1-.3.07-.26.04-.21.02H8.83l-.69.05-.59.14-.5.22-.41.27-.33.32-.27.35-.2.36-.15.37-.1.35-.07.32-.04.27-.02.21v3.06H3.23l-.21-.03-.28-.07-.32-.12-.35-.18-.36-.26-.36-.36-.35-.46-.32-.59-.28-.73-.21-.88-.14-1.05L0 11.97l.06-1.22.16-1.04.24-.87.32-.71.36-.57.4-.44.42-.33.42-.24.4-.16.36-.1.32-.05.24-.01h.16l.06.01h8.16v-.83H6.24l-.01-2.75-.02-.37.05-.34.11-.31.17-.28.25-.26.31-.23.38-.2.44-.18.51-.15.58-.12.64-.1.71-.06.77-.04.84-.02 1.27.05 1.07.13zm-6.3 1.98l-.23.33-.08.41.08.41.23.34.33.22.41.09.41-.09.33-.22.23-.34.08-.41-.08-.41-.23-.33-.33-.22-.41-.09-.41.09-.33.22zM21.1 6.11l.28.06.32.12.35.18.36.27.36.35.35.47.32.59.28.73.21.88.14 1.04.05 1.23-.06 1.23-.16 1.04-.24.86-.32.71-.36.57-.4.45-.42.33-.42.24-.4.16-.36.09-.32.05-.24.02-.16-.01h-8.22v.82h5.84l.01 2.76.02.36-.05.34-.11.31-.17.29-.25.25-.31.24-.38.2-.44.17-.51.15-.58.13-.64.09-.71.07-.77.04-.84.01-1.27-.04-1.07-.14-.9-.2-.73-.25-.59-.3-.45-.33-.34-.34-.25-.34-.16-.33-.1-.3-.04-.25-.02-.2.01-.13v-5.34l.05-.64.13-.54.21-.46.26-.38.3-.32.33-.24.35-.2.35-.14.33-.1.3-.06.26-.04.21-.02.13-.01h5.84l.69-.05.59-.14.5-.21.41-.28.33-.32.27-.35.2-.36.15-.36.1-.35.07-.32.04-.28.02-.21V6.07h2.09l.14.04z"/></svg>,
  FastAPI: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.375 0 0 5.375 0 12c0 6.627 5.375 12 12 12 6.626 0 12-5.373 12-12 0-6.625-5.373-12-12-12zm-.624 21.62v-7.528H7.19L13.203 2.38v7.528h4.029L11.376 21.62z"/></svg>
};

const getLogo = (tech: string) => {
  if (tech.includes('Next.js')) return <Logos.Nextjs />;
  if (tech.includes('React')) return <Logos.React />;
  if (tech.includes('TypeScript')) return <Logos.TypeScript />;
  if (tech.includes('FastAPI')) return <Logos.FastAPI />;
  if (tech.includes('Python')) return <Logos.Python />;
  if (tech.includes('Google ADK')) return <Logos.Google />;
  if (tech.includes('Qdrant')) return <RiDatabase2Line size={14} color="#a8c7fa" />;
  return null;
};

const BlurWord = ({ word, index }: { word: string, index: number }) => {
  return (
    <motion.span
      initial={{ filter: 'blur(8px)', opacity: 0, y: 16 }}
      animate={{ filter: 'blur(0px)', opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.06, ease: [0.4, 0, 0.2, 1] }}
      className="inline-block mr-[0.25em]"
    >
      {word}
    </motion.span>
  );
};



const SpotlightCard = ({ children, borderRadius = '16px', className = '' }: { children: React.ReactNode, borderRadius?: string, className?: string }) => {
  const [pos, setPos] = useState<{ x: number, y: number } | null>(null);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const handleMouseLeave = () => setPos(null);

  return (
    <div
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`relative overflow-hidden border border-[rgba(168,199,250,0.15)] bg-[rgba(168,199,250,0.04)] transition-colors hover:border-[rgba(168,199,250,0.3)] hover:bg-[rgba(168,199,250,0.08)] ${className}`}
      style={{ borderRadius }}
    >
      {pos && (
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background: `radial-gradient(250px circle at ${pos.x}px ${pos.y}px, rgba(168,199,250,0.15) 0%, transparent 100%)`
          }}
        />
      )}
      <div className="relative z-10 h-full p-6 md:p-8">{children}</div>
    </div>
  );
};

const CountUp = ({ to }: { to: number }) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let startTime: number;
    const duration = 1500;
    
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        const animate = (timestamp: number) => {
          if (!startTime) startTime = timestamp;
          const progress = Math.min((timestamp - startTime) / duration, 1);
          const easeOutQuint = 1 - Math.pow(1 - progress, 5);
          setCount(Math.floor(easeOutQuint * to));
          
          if (progress < 1) requestAnimationFrame(animate);
        };
        requestAnimationFrame(animate);
        observer.unobserve(el);
      }
    }, { threshold: 0.1 });

    observer.observe(el);
    return () => observer.disconnect();
  }, [to]);

  return <span ref={ref}>{count}</span>;
};

export default function AboutPage() {
  const shapes = [
    '32px',
    '32px 8px 32px 8px',
    '8px 32px 8px 32px',
    '24px'
  ];

  return (
    <div className="min-h-screen bg-[#141518] text-[#ffffff] font-sans overflow-x-hidden selection:bg-[rgba(168,199,250,0.3)]">
      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center pt-24 pb-16 overflow-hidden">
        <div className="relative z-10 mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-0 items-center">
          
          <div className="flex flex-col items-start text-left max-w-2xl z-20">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight drop-shadow-lg">
              {'Multi-Agent AI '.split(' ').map((w, i) => <BlurWord key={'m'+i} word={w} index={i} />)}
              <br />
              <span className="text-[#a8c7fa]">
                {'Meeting Copilot'.split(' ').map((w, i) => <BlurWord key={'c'+i} word={w} index={i + 3} />)}
              </span>
            </h1>

            <motion.p 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl text-[#868e96] max-w-lg mb-12 drop-shadow-md"
            >
              An autonomous gRPC-based agent ecosystem that joins your meetings, understands context, and manages your workflow.
            </motion.p>

            <motion.div 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
            >
              <Link href="https://github.com/darshan-gowdaa/MeetMaxxing" className="w-full sm:w-auto">
                <div className="flex items-center justify-center gap-2 px-8 py-4 bg-[#a8c7fa] text-[#141518] rounded-full font-semibold hover:bg-white transition-colors">
                  <RiGithubFill size={20} />
                  <span>View on GitHub</span>
                </div>
              </Link>
              <Link href="#architecture" className="w-full sm:w-auto">
                <div className="flex items-center justify-center gap-2 px-8 py-4 bg-[rgba(168,199,250,0.1)] text-[#a8c7fa] rounded-full font-semibold border border-[rgba(168,199,250,0.2)] hover:bg-[rgba(168,199,250,0.15)] transition-colors backdrop-blur-sm">
                  <span>Explore Ecosystem</span>
                  <RiArrowRightLine size={20} />
                </div>
              </Link>
            </motion.div>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2, ease: "easeOut" }}
            className="w-full h-[400px] lg:h-[600px] relative overflow-hidden translate-x-4 lg:translate-x-12 scale-110 z-10"
          >
            {/* Edge fading masks to blend seamlessly into background */}
            <div className="absolute inset-y-0 left-0 w-1/4 bg-gradient-to-r from-[#141518] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute inset-y-0 right-0 w-1/4 bg-gradient-to-l from-[#141518] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute top-0 inset-x-0 h-1/4 bg-gradient-to-b from-[#141518] to-transparent z-10 pointer-events-none"></div>
            <div className="absolute bottom-0 inset-x-0 h-1/4 bg-gradient-to-t from-[#141518] to-transparent z-10 pointer-events-none"></div>
            
            <Strands
              colors={["#a8c7fa", "#8cb1f3", "#6f9be8", "#ffffff"]}
              count={6}
              speed={0.4}
              amplitude={1.4}
              thickness={0.8}
              glow={3.2}
              intensity={0.65}
              glass={false}
            />
          </motion.div>

        </div>
      </section>

      {/* STATS STRIP */}
      <section className="border-y border-[rgba(168,199,250,0.15)] bg-[rgba(14,15,18,0.6)] backdrop-blur-xl relative z-10 py-16">
        <div className="mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] max-w-6xl">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((stat, i) => (
              <SpotlightCard 
                key={i} 
                borderRadius={shapes[i]}
                className="flex flex-col items-center text-center justify-center"
              >
                <div className="w-14 h-14 rounded-[16px] bg-[rgba(168,199,250,0.1)] text-[#a8c7fa] flex items-center justify-center mb-6 mx-auto shadow-inner">
                  <stat.icon size={28} />
                </div>
                <div className="text-5xl font-black tracking-tight mb-2 text-[#ffffff] drop-shadow-md">
                  <CountUp to={stat.value} />{stat.suffix}
                </div>
                <div className="text-lg font-semibold text-[#a8c7fa] mb-2">{stat.label}</div>
                <div className="text-sm text-[#868e96] leading-relaxed">{stat.desc}</div>
              </SpotlightCard>
            ))}
          </div>
        </div>
      </section>

      {/* AUTHORS */}
      <section className="py-24 relative z-10">
        <div className="mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] max-w-6xl">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 tracking-tight">The Architects</h2>
            <p className="text-[#868e96] text-lg">Built by a specialized two-person team.</p>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {AUTHORS.map((author, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-100px" }}
                transition={{ duration: 0.6 }}
                className="p-8 border rounded-3xl"
                style={{ backgroundColor: author.containerBg, borderColor: author.containerBorder }}
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div 
                      className="w-16 h-16 border flex items-center justify-center text-2xl font-bold text-[#a8c7fa] transition-all duration-300 hover:rounded-full"
                      style={{ backgroundColor: author.avatarBg, borderColor: author.avatarBorder, borderRadius: '24px' }}
                    >
                      {author.name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold">{author.name}</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span 
                          className="px-3 py-1 text-xs font-bold uppercase tracking-widest"
                          style={{ backgroundColor: author.orderChipBg, color: author.orderChipText, borderRadius: '8px' }}
                        >
                          {author.order}
                        </span>
                        <span className="text-sm font-medium text-[#a8c7fa]">{author.role}</span>
                      </div>
                    </div>
                  </div>
                  <Link href={author.githubUrl} target="_blank" className="text-[#868e96] hover:text-[#a8c7fa] transition-colors">
                    <RiGithubFill size={24} />
                  </Link>
                </div>
                
                <p className="text-[#868e96] mb-10 h-16 leading-relaxed">{author.bio}</p>
                
                <div className="mb-8">
                  <h4 className="text-xs font-bold text-[#a8c7fa] mb-4 uppercase tracking-widest">Domains</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {author.domains.map((d, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center gap-2 px-3.5 py-2 border text-sm transition-colors hover:border-[#a8c7fa]/30"
                        style={{ backgroundColor: author.focusChipBg, borderColor: author.focusChipBorder, borderRadius: '8px' }}
                      >
                        <d.icon size={16} className="text-[#a8c7fa]" />
                        <span className="text-gray-200 font-medium">{d.label}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-bold text-[#a8c7fa] mb-4 uppercase tracking-widest">Tech Stack</h4>
                  <div className="flex flex-wrap gap-2.5">
                    {author.stack.map((tech, idx) => {
                      const Logo = getLogo(tech);
                      return (
                        <div 
                          key={idx} 
                          className="flex items-center gap-2 px-3 py-1.5 bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.08)] text-xs text-[#868e96] transition-colors hover:bg-[rgba(255,255,255,0.06)]"
                          style={{ borderRadius: '8px' }}
                        >
                          {Logo && <span className="text-[#a8c7fa]">{Logo}</span>}
                          {tech}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES & AGENT ECOSYSTEM */}
      <section id="architecture" className="py-24 bg-[#0a0b0d] relative z-10 border-t border-[rgba(168,199,250,0.05)]">
        <div className="mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] max-w-6xl">
          
          {/* Core Features */}
          <div className="mb-32">
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 tracking-tight">Core Features</h2>
              <p className="text-[#868e96] max-w-2xl mx-auto text-lg">
                Everything you need to automate, remember, and manage your meetings without leaving the context.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {FEATURES.map((feature, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                >
                  <SpotlightCard className="flex flex-col h-full bg-[rgba(168,199,250,0.02)]">
                    <div className="w-10 h-10 rounded-[12px] bg-[rgba(168,199,250,0.08)] flex items-center justify-center text-[#a8c7fa] mb-4 shadow-inner">
                      <feature.icon size={20} />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                    <p className="text-[#868e96] text-sm leading-relaxed flex-grow">{feature.desc}</p>
                  </SpotlightCard>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Agent Ecosystem */}
          <div>
            <div className="text-center mb-16">
              <h2 className="text-4xl font-bold mb-4 tracking-tight">Agent Ecosystem</h2>
              <p className="text-[#868e96] max-w-2xl mx-auto text-lg">
                Our A2A (Agent-to-Agent) architecture uses gRPC for high-speed, isolated communication between specialized AI modules.
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {AGENTS.map((agent, i) => (
                <motion.div 
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ duration: 0.5, delay: i * 0.05 }}
                >
                  <SpotlightCard className="flex flex-col h-full">
                    <div className="w-12 h-12 rounded-[14px] bg-[rgba(168,199,250,0.08)] flex items-center justify-center text-[#a8c7fa] mb-6 shadow-inner">
                      <agent.icon size={24} />
                    </div>
                    <h3 className="text-xl font-bold mb-3">{agent.name}</h3>
                    <p className="text-[#868e96] text-sm leading-relaxed flex-grow">{agent.desc}</p>
                  </SpotlightCard>
                </motion.div>
              ))}
            </div>
          </div>

        </div>
      </section>


      {/* FOOTER */}
      <footer className="py-12 border-t border-[rgba(168,199,250,0.1)] bg-[#0a0b0d] text-sm text-[#868e96] relative z-10">
        <div className="container mx-auto px-6 max-w-6xl flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-2">
            <RiSparkling2Fill className="text-[#a8c7fa]" size={20} />
            <span className="font-bold text-[#ffffff] text-lg tracking-tight">MeetMaxxing</span>
          </div>
          <div className="flex items-center gap-6">
            <span>2024 MeetMaxxing. Open Source Project.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
