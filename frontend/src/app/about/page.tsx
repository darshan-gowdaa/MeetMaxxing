"use client";

import React from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import Strands from '@/components/atoms/Strands';
import { SpotlightCard } from '@/components/atoms/SpotlightCard';
import { BlurWord, CountUp } from './_components/animations';
import { AUTHORS, STATS, FEATURES, AGENTS, getLogo } from './_constants/data';
import { RiGithubFill, RiArrowRightLine, RiSparkling2Fill } from '@remixicon/react';

export default function AboutPage() {
  const shapes = ['32px', '32px 8px 32px 8px', '8px 32px 8px 32px', '24px'];

  return (
    <div className="min-h-screen bg-[#141518] text-[#ffffff] font-sans overflow-x-hidden selection:bg-[rgba(168,199,250,0.3)]">
      {/* HERO SECTION */}
      <section className="relative min-h-[90vh] flex items-center pt-24 pb-16 overflow-hidden">
        <div className="relative z-10 mx-auto w-[calc(100%-2rem)] md:w-[calc(100%-3rem)] max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-0 items-center">
          <div className="flex flex-col items-start text-left max-w-2xl z-20">
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6 leading-tight drop-shadow-sm">
              {'Multi-Agent AI '.split(' ').map((w, i) => (
                <BlurWord key={'m' + i} word={w} index={i} />
              ))}
              <br />
              <span className="text-[#a8c7fa]">
                {'Meeting Copilot'.split(' ').map((w, i) => (
                  <BlurWord key={'c' + i} word={w} index={i + 3} />
                ))}
              </span>
            </h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-xl text-[#868e96] max-w-lg mb-12 drop-shadow-sm"
            >
              An autonomous gRPC-based agent ecosystem that joins your meetings, understands context, and manages your workflow.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
            >
              <a href="https://github.com/darshan-gowdaa/MeetMaxxing" target="_blank" rel="noopener noreferrer" className="w-full sm:w-auto">
                <div className="flex items-center justify-center gap-2 px-8 py-4 bg-[#a8c7fa] text-[#141518] rounded-full font-semibold hover:bg-white transition-colors">
                  <RiGithubFill size={20} />
                  <span>View on GitHub</span>
                </div>
              </a>
              <Link href="#architecture" className="w-full sm:w-auto">
                <div className="flex items-center justify-center gap-2 px-8 py-4 bg-[rgba(168,199,250,0.1)] text-[#a8c7fa] rounded-full font-semibold border border-[rgba(168,199,250,0.2)] hover:bg-[rgba(168,199,250,0.15)] transition-colors">
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
            className="w-full h-[400px] lg:h-[600px] relative overflow-hidden translate-x-4 lg:translate-x-12 z-10"
          >
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
      <section className="border-y border-[rgba(168,199,250,0.15)] bg-[rgba(14,15,18,0.6)] relative z-10 py-16">
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
                <div className="text-5xl font-black tracking-tight mb-2 text-[#ffffff] drop-shadow-sm">
                  <CountUp to={stat.value} />
                  {stat.suffix}
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
