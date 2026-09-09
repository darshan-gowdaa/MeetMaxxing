"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { motion } from "framer-motion";
import {
  RiSparkling2Fill,
  RiGithubFill,
  RiArrowRightLine,
} from "@remixicon/react";
import { BlurWord, CountUp } from "./_components/animations";
import { AUTHORS, STATS, FEATURES, AGENTS, getLogo } from "./_constants/data";

/* We load the WebGL strands animation dynamically so it runs only in the browser */
const Strands = dynamic(() => import("@/components/atoms/Strands"), { ssr: false });

export default function AboutPage() {
  const [agentFilter, setAgentFilter] = useState<string>("All");

  const filteredAgents =
    agentFilter === "All"
      ? AGENTS
      : AGENTS.filter((agent) => agent.pillar === agentFilter);

  return (
    <div className="min-h-screen bg-bg text-text font-sans selection:bg-primary/20 overflow-x-hidden">
      {/* Hero section */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        <div className="relative z-10 mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] max-w-6xl">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Content */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black tracking-tight text-text leading-[1.08] mb-6">
                {"Autonomous AI ".split(" ").map((w, i) => (
                  <BlurWord key={"h1-" + i} word={w} index={i} />
                ))}
                <br />
                <span className="text-primary">
                  {"Meeting Copilot".split(" ").map((w, i) => (
                    <BlurWord key={"h2-" + i} word={w} index={i + 2} />
                  ))}
                </span>
              </h1>

              <motion.p
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.25 }}
                className="text-lg sm:text-xl text-text-muted max-w-xl leading-relaxed mb-10"
              >
                An agent ecosystem built on an A2A gRPC message bus. Streams live meeting
                audio, extracts decisions, retrieves episodic semantic memory, and orchestrates
                follow-up actions without human intervention.
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.35 }}
                className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
              >
                <Link
                  href="/"
                  className="h-12 px-7 rounded-full bg-primary text-on-primary font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-primary/90 shadow-md hover:shadow-lg active:scale-[0.98] transition-all w-full sm:w-auto cursor-pointer"
                >
                  <span>Open Dashboard</span>
                  <RiArrowRightLine className="w-5 h-5" />
                </Link>

                <a
                  href="https://github.com/darshan-gowdaa/MeetMaxxing"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="h-12 px-6 rounded-full bg-surface-container hover:bg-surface-container-high border border-border text-text font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all w-full sm:w-auto cursor-pointer"
                >
                  <RiGithubFill className="w-5 h-5" />
                  <span>GitHub Repository</span>
                </a>
              </motion.div>
            </div>

            {/* Right Showcase: Animated Strands WebGL with smooth radial fade mask */}
            <div className="lg:col-span-5 flex items-center justify-center pointer-events-none">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
                className="w-full h-[360px] sm:h-[460px] lg:h-[560px] relative lg:translate-x-6 z-10 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_75%)]"
              >
                <Strands
                  colors={["#a8c7fa", "#8cb1f3", "#6f9be8", "#ffffff"]}
                  count={6}
                  speed={0.35}
                  amplitude={1.0}
                  thickness={0.7}
                  glow={3.0}
                  intensity={0.65}
                  glass={false}
                />
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Key metrics strip */}
      <section className="py-16 bg-surface-container-low border-y border-border relative z-10">
        <div className="mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] max-w-6xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {STATS.map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="p-6 sm:p-7 rounded-[28px] sm:rounded-[32px] bg-surface-container border border-border flex flex-col items-center text-center hover:bg-surface-container-high transition-all duration-300 shadow-xs"
              >
                <div className="w-12 h-12 rounded-[20px] bg-primary-container text-on-primary-container flex items-center justify-center mb-5 shadow-inner">
                  <stat.icon className="w-6 h-6" />
                </div>
                <div className="text-4xl sm:text-5xl font-black tracking-tight text-text mb-2">
                  <CountUp to={stat.value} />
                  <span>{stat.suffix}</span>
                </div>
                <div className="text-[15px] font-bold text-primary mb-1">{stat.label}</div>
                <div className="text-[13px] text-text-muted leading-relaxed">{stat.desc}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* 9-Agent Ecosystem section */}
      <section id="architecture" className="py-24 relative z-10">
        <div className="mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] max-w-6xl">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-6">
            <div className="max-w-2xl">
              <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">
                Distributed System
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-text">
                The 9-Agent Ecosystem
              </h2>
              <p className="text-text-muted text-base sm:text-lg mt-3 leading-relaxed">
                Rather than one monolithic LLM, MeetMaxxing deploys 9 purpose-built micro-agents
                communicating over high-throughput gRPC channels.
              </p>
            </div>

            {/* Filter Chips */}
            <div className="flex flex-wrap items-center gap-2">
              {["All", "Live Stream", "Intelligence", "Automation"].map((filter) => (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setAgentFilter(filter)}
                  className={`h-9 px-4 rounded-full text-[13px] font-bold transition-all duration-200 active:scale-[0.96] cursor-pointer ${
                    agentFilter === filter
                      ? "bg-primary text-on-primary shadow-xs"
                      : "bg-surface-container hover:bg-surface-container-high text-text-muted hover:text-text border border-border"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAgents.map((agent, i) => (
              <motion.div
                key={agent.name}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="p-6 rounded-[28px] bg-surface-container border border-border/80 flex flex-col justify-between hover:bg-surface-container-high transition-all duration-300 hover:-translate-y-1 shadow-xs group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-[20px] bg-surface-container-high group-hover:bg-primary-container text-text-muted group-hover:text-on-primary-container flex items-center justify-center transition-colors">
                      <agent.icon className="w-6 h-6" />
                    </div>
                    <span className="px-3 py-1 rounded-full bg-surface-container-lowest dark:bg-surface-container-low text-[11px] font-bold text-text-muted border border-border/70">
                      {agent.pillar}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-text mb-2.5 tracking-tight">
                    {agent.name}
                  </h3>
                  <p className="text-[14px] text-text-muted leading-relaxed">
                    {agent.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Core capabilities */}
      <section className="py-24 bg-surface-container-low border-t border-border relative z-10">
        <div className="mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">
              Core Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-text">
              Engineered for Real-Time Execution
            </h2>
            <p className="text-text-muted text-base sm:text-lg mt-3 leading-relaxed">
              Designed from first principles to turn unstructured voice conversations into
              verifiable team velocity.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.05 }}
                className="p-6 rounded-[28px] bg-surface-container border border-border flex flex-col hover:bg-surface-container-high transition-all duration-300 shadow-xs hover:-translate-y-1 group"
              >
                <div className="w-10 h-10 rounded-[16px] bg-primary/10 text-primary flex items-center justify-center mb-4 transition-transform group-hover:scale-110">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className="text-[17px] font-bold text-text mb-2 tracking-tight">
                  {feature.title}
                </h3>
                <p className="text-[13px] text-text-muted leading-relaxed">
                  {feature.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* The Architects (Uniform Team Section) */}
      <section className="py-24 relative z-10">
        <div className="mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] max-w-6xl">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-wider text-primary mb-2 block">
              The Engineers
            </span>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-text">
              The Architects
            </h2>
            <p className="text-text-muted text-base sm:text-lg mt-3">
              Built by an agile two-person engineering team for high-velocity execution.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 items-stretch">
            {AUTHORS.map((author, i) => (
              <motion.div
                key={author.name}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className="p-8 sm:p-10 rounded-[32px] bg-surface-container border border-border flex flex-col justify-between h-full shadow-sm hover:shadow-md transition-all duration-300"
              >
                <div>
                  {/* Header: GitHub Profile avatar, Name with username in brackets, Role */}
                  <div className="flex items-start justify-between mb-6 gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="relative w-16 h-16 rounded-[24px] overflow-hidden shrink-0 border border-border bg-surface-container-high shadow-xs">
                        <Image
                          src={`https://github.com/${author.github}.png`}
                          alt={author.name}
                          width={64}
                          height={64}
                          className="w-full h-full object-cover"
                          unoptimized
                        />
                      </div>
                      <div className="min-w-0 flex flex-col justify-center">
                        <h3 className="text-xl sm:text-2xl font-bold text-text tracking-tight flex flex-wrap items-baseline gap-2">
                          <span className="truncate">{author.name}</span>
                          <span className="text-[14px] sm:text-[15px] font-normal text-text-muted shrink-0">
                            (@{author.github})
                          </span>
                        </h3>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <span className="px-3 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25 shrink-0">
                            {author.order}
                          </span>
                          <span className="text-[13px] font-medium text-text-muted truncate">
                            {author.focus}
                          </span>
                        </div>
                      </div>
                    </div>

                    <Link
                      href={author.githubUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-full flex items-center justify-center text-text-muted hover:text-text hover:bg-surface-container-high transition-colors shrink-0 cursor-pointer"
                      aria-label={`${author.name} GitHub profile`}
                    >
                      <RiGithubFill className="w-6 h-6" />
                    </Link>
                  </div>

                  {/* Uniform bio height */}
                  <p className="text-[14px] text-text-muted leading-relaxed mb-8 sm:h-16 flex items-center">
                    {author.bio}
                  </p>

                  {/* Domains with uniform min-height */}
                  <div className="mb-6">
                    <h4 className="text-[11px] font-bold text-text-muted mb-3 uppercase tracking-wider">
                      Core Domains
                    </h4>
                    <div className="flex flex-wrap gap-2 min-h-[84px] content-start">
                      {author.domains.map((d, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-container-lowest dark:bg-surface-container-low border border-border/70 text-[13px] font-medium text-text h-fit"
                        >
                          <d.icon className="w-4 h-4 text-primary shrink-0" />
                          {d.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tech Stack with uniform min-height */}
                <div className="pt-6 border-t border-border/60">
                  <h4 className="text-[11px] font-bold text-text-muted mb-3 uppercase tracking-wider">
                    Technical Stack
                  </h4>
                  <div className="flex flex-wrap gap-2 min-h-[72px] content-start">
                    {author.stack.map((tech, idx) => {
                      const Logo = getLogo(tech);
                      return (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-high text-[12px] font-medium text-text-muted border border-border/60 h-fit"
                        >
                          {Logo && <span className="text-primary">{Logo}</span>}
                          <span>{tech}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Call to action without gradients */}
      <section className="py-20 relative z-10">
        <div className="mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] max-w-5xl">
          <div className="p-8 sm:p-12 rounded-[32px] bg-surface-container border border-border shadow-md flex flex-col items-center text-center">
            <span className="w-12 h-12 rounded-[20px] bg-primary text-on-primary flex items-center justify-center mb-5 shadow-sm">
              <RiSparkling2Fill className="w-6 h-6" />
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-text tracking-tight mb-4 max-w-xl">
              Ready to Upgrade Your Meeting Intelligence?
            </h2>
            <p className="text-text-muted text-base sm:text-lg max-w-lg leading-relaxed mb-8">
              Experience zero-lag live capture, autonomous synthesis, and proactive workflows
              with MeetMaxxing.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                href="/"
                className="h-12 px-8 rounded-full bg-primary text-on-primary font-bold text-[15px] flex items-center justify-center gap-2 hover:bg-primary/90 shadow-md active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Get Started Now</span>
                <RiArrowRightLine className="w-5 h-5" />
              </Link>
              <Link
                href="/settings/api-keys"
                className="h-12 px-6 rounded-full bg-surface-container-high hover:bg-surface-container-highest border border-border text-text font-bold text-[15px] flex items-center justify-center gap-2 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Configure API Keys</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer without navbar links */}
      <footer className="py-10 border-t border-border bg-surface-container-low text-[13px] text-text-muted relative z-10">
        <div className="mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-4rem)] max-w-6xl flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            <span className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center">
              <RiSparkling2Fill className="w-4 h-4" />
            </span>
            <span className="font-bold text-text text-base tracking-tight">MeetMaxxing</span>
          </div>
          <p className="text-[12px] text-text-muted">
            © 2026 MeetMaxxing. Built with Material Design 3 Expressive.
          </p>
        </div>
      </footer>
    </div>
  );
}
