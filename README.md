<div align="center">

# MeetMaxxing

### *A Production-Inspired Multi-Agent AI Meeting Copilot powered by Google ADK, Lyzr, Agent-to-Agent (A2A) Communication & Qdrant.*

<p align="center">
Transforming online meetings into intelligent, collaborative experiences through modular AI agents, semantic memory, and real-time assistance.
</p>

<br>

![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)
![Google ADK](https://img.shields.io/badge/Google%20ADK-AI%20Agents-4285F4?style=for-the-badge)
![Lyzr](https://img.shields.io/badge/Lyzr-Orchestration-blueviolet?style=for-the-badge)
![A2A](https://img.shields.io/badge/A2A-Agent--to--Agent-orange?style=for-the-badge)
![Qdrant](https://img.shields.io/badge/Qdrant-Vector%20Memory-DC244C?style=for-the-badge)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![Chrome Extension](https://img.shields.io/badge/Chrome-Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white)

<br>

⭐ Star this repository if you like the project!

</div>

---

# Project Vision

Modern meetings generate valuable discussions, decisions, and action items—but much of that information is quickly forgotten or scattered across notes, emails, and calendars.

**MeetMaxxing** reimagines meeting intelligence through a **multi-agent architecture**, where specialized AI agents collaborate instead of relying on a single monolithic AI workflow.

Built around **Google ADK**, **Lyzr**, **Agent-to-Agent (A2A) communication**, and **Qdrant semantic memory**, MeetMaxxing demonstrates how modern AI systems can coordinate, remember context, automate follow-ups, and assist users throughout an online meeting.

Rather than being just another meeting summarizer, MeetMaxxing showcases how multiple AI agents can work together to provide a scalable, modular, and production-inspired meeting experience.

---

# Why MeetMaxxing?

Unlike conventional AI meeting assistants that rely on a single large language model prompt, MeetMaxxing adopts a **collaborative multi-agent design**.

Each AI agent focuses on a specialized responsibility—from live assistance and meeting summarization to semantic memory retrieval, email drafting, scheduling, and document-based question answering.

This modular architecture makes the system more scalable, maintainable, and capable of handling complex workflows while demonstrating modern AI engineering principles using:

- **Google ADK** for specialized AI agents
- **A2A Communication** for seamless agent collaboration
- **Qdrant** for persistent semantic memory
- **Lyzr** for intelligent workflow orchestration

# Core Features

MeetMaxxing transforms traditional online meetings into intelligent, AI-assisted collaborative experiences through a modular multi-agent architecture.

<table>
<tr>
<td width="50%">

### Multi-Agent Intelligence
Specialized AI agents collaborate to perform dedicated tasks instead of relying on a single monolithic LLM.

</td>

<td width="50%">

### Real-Time Assistance
Receive contextual suggestions, meeting insights, and intelligent support while the meeting is still in progress.

</td>
</tr>

<tr>
<td>

### Semantic Memory
Store and retrieve meeting knowledge using vector embeddings powered by Qdrant for context-aware conversations.

</td>

<td>

### Smart Meeting Summaries
Automatically generate concise summaries, key discussion points, and actionable takeaways after every meeting.

</td>
</tr>

<tr>
<td>

### AI Follow-ups
Generate professional follow-up emails containing meeting highlights and action items.

</td>

<td>

### Intelligent Scheduling
Create reminders and follow-up meetings directly from extracted action items.

</td>
</tr>

<tr>
<td>

### Document Question Answering
Upload supporting documents and allow AI agents to answer questions using meeting context.

</td>

<td>

### Late Join Recaps
Users joining late receive an instant AI-generated summary of everything discussed so far.

</td>
</tr>
</table>

---

# AI Agent Ecosystem

MeetMaxxing follows a **collaborative multi-agent architecture** where each agent has a clearly defined responsibility. Instead of overloading a single model with every task, specialized agents work together to deliver a smarter and more scalable meeting experience.

| Agent | Responsibility |
|---------|---------------|
| **Transcription Agent** | Processes meeting transcripts and streams conversation data to the system. |
| **Realtime Agent** | Generates contextual suggestions and live assistance during meetings. |
| **Summary Agent** | Produces concise meeting summaries, key points, and action items. |
| **Memory Agent** | Stores semantic embeddings inside Qdrant and retrieves historical meeting knowledge. |
| **Email Agent** | Drafts follow-up emails using meeting context. |
| **Scheduler Agent** | Converts action items into calendar events and reminders. |
| **Docs QA Agent** | Answers user questions using uploaded documents combined with meeting context. |
| **Late Join Agent** | Instantly summarizes previous discussion for participants joining mid-meeting. |
| **Orchestrator Agent** | Coordinates communication between agents and routes tasks intelligently. |

---

# Google ADK in Action

Google ADK forms the backbone of MeetMaxxing's intelligent agent ecosystem.

Rather than building one large AI workflow, MeetMaxxing uses Google ADK to create **specialized agents**, each equipped with its own reasoning capabilities and dedicated tools.

This modular design enables:

- Independent task execution
- Tool-specific reasoning
- Better scalability
- Easier maintenance
- Collaborative decision making between AI agents

Every major meeting capability—from summarization and semantic retrieval to scheduling and follow-up generation—is powered by dedicated Google ADK agents working together.

---

# Agent-to-Agent (A2A) Communication

One of the core objectives of MeetMaxxing is to demonstrate effective **Agent-to-Agent (A2A) communication**.

Instead of executing tasks sequentially within a single workflow, specialized agents exchange context and collaborate to solve complex meeting scenarios.

<p align="center">
  <img width="600" height="600" alt="MeetMaxxing AI Agent Ecosystem" src="https://github.com/user-attachments/assets/17e5f068-7a1b-490f-aa6b-5c01cbe55226" />
</p>

This architecture allows:

- Parallel execution of specialized tasks
- Better separation of responsibilities
- Easier extensibility for future agents
- Efficient information sharing between agents
- Production-inspired AI orchestration

---

# Persistent Memory with Qdrant

MeetMaxxing doesn't forget previous meetings.

Instead, meeting conversations are transformed into **vector embeddings** and stored inside **Qdrant**, enabling semantic search across historical discussions.

```text
Meeting Transcript
        │
        ▼
Text Embeddings
        │
        ▼
Qdrant Vector Database
        │
        ▼
Semantic Retrieval
        │
        ▼
Relevant Context
        │
        ▼
AI Response
```

This enables users to ask contextual questions like:

> *"What decisions were made regarding our authentication module last week?"*

Instead of keyword matching, Qdrant retrieves semantically similar discussions, allowing AI agents to respond with meaningful context.

---

# Lyzr-Powered Workflow Orchestration

Lyzr strengthens MeetMaxxing's orchestration layer by coordinating complex AI workflows across multiple specialized agents.

It enables:

- Intelligent workflow management
- Agent coordination
- Dynamic task routing
- Context propagation
- Scalable AI execution

Combined with Google ADK and A2A communication, Lyzr helps transform independent AI agents into a cohesive collaborative system.

---

# Why This Architecture?

Traditional AI meeting assistants often rely on a **single prompt** to perform transcription, summarization, memory retrieval, scheduling, and follow-up generation.

MeetMaxxing takes a different approach.

Instead of asking one model to do everything, responsibilities are distributed across specialized agents that collaborate through A2A communication.

This architecture offers several advantages:

- ✅ Modular and maintainable
- ✅ Easier to extend with new agents
- ✅ Better scalability
- ✅ Clear separation of responsibilities
- ✅ Persistent semantic memory
- ✅ Production-inspired system design

The result is an AI meeting copilot that is not only intelligent, but also demonstrates modern AI engineering practices suitable for real-world applications.
The result is an AI meeting copilot that doesn't simply answer questions—it coordinates multiple intelligent agents to understand, remember, and act on meeting information in real time.

# System Architecture

MeetMaxxing is designed as a production-inspired, event-driven AI system where the Chrome Extension, backend services, and specialized AI agents work together to provide intelligent meeting assistance.

<p align="center">
<img src="assets/architecture.png" width="1000">
</p>

<p align="center">
<i>Overall system architecture highlighting Google ADK, Lyzr orchestration, A2A communication, FastAPI services, and Qdrant semantic memory.</i>
</p>

---

# End-to-End Workflow

Every interaction inside MeetMaxxing follows an intelligent event-driven workflow.

```text
                Join Google Meet
                       │
                       ▼
          Chrome Extension captures events
                       │
                       ▼
              FastAPI Backend Services
                       │
                       ▼
              Orchestrator Agent
                       │
       ┌───────────────┼────────────────┐
       ▼               ▼                ▼
Realtime Agent   Summary Agent   Memory Agent
       │               │                │
       └───────────────┼────────────────┘
                       ▼
         Email / Scheduler / Docs QA
                       │
                       ▼
            Qdrant Semantic Memory
                       │
                       ▼
             AI Response to the User
```

---

# Technology Stack

| Category | Technologies |
|-----------|--------------|
| AI Framework | Google ADK, Lyzr |
| Agent Communication | Agent-to-Agent (A2A), gRPC |
| Vector Memory | Qdrant |
| Backend | FastAPI, Python |
| Frontend | Next.js, TypeScript, Chrome Extension |
| Database | Supabase |
| Cache | Redis |
| Infrastructure | Docker, Docker Compose |
| Observability | Langfuse, OpenTelemetry, Jaeger |

---

# Repository Structure

```bash
MeetMaxxing/
│
├── .gemini_rules/
│   ├── material3-expressive-meet-extension.md
│   └── material3-expressive-meet-extension.skill
│
├── backend/
│   ├── .env.example
│   ├── Dockerfile
│   ├── main.py
│   ├── provision_lyzr_agents.py
│   ├── requirements.txt
│   ├── supabase_migrations.sql
│   ├── test_suite.py
│   │
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── docs_qa_agent.py
│   │   ├── email_agent.py
│   │   ├── late_join_agent.py
│   │   ├── memory_agent.py
│   │   ├── orchestrator.py
│   │   ├── realtime_agent.py
│   │   ├── scheduler_agent.py
│   │   ├── summary_agent.py
│   │   └── transcription_agent.py
│   │
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes_calendar.py
│   │   ├── routes_context.py
│   │   ├── routes_dashboard.py
│   │   ├── routes_meeting.py
│   │   ├── routes_memory.py
│   │   ├── routes_transcript.py
│   │   └── test_pipeline.py
│   │
│   ├── core/
│   │   ├── __init__.py
│   │   ├── auth.py
│   │   ├── config.py
│   │   ├── database.py
│   │   ├── llm_fallback.py
│   │   ├── lyzr_integration.py
│   │   ├── rate_limiter.py
│   │   ├── redis_client.py
│   │   └── utils.py
│   │
│   ├── grpc_bus/
│   │   ├── __init__.py
│   │   ├── grpc_bus.proto
│   │   ├── grpc_bus_pb2.py
│   │   ├── grpc_bus_pb2_grpc.py
│   │   └── grpc_server.py
│   │
│   ├── memory/
│   │   ├── __init__.py
│   │   ├── embeddings.py
│   │   ├── qdrant_client.py
│   │   └── schemas.py
│   │
│   ├── scripts/
│   │   └── reindex.py
│   │
│   └── services/
│       ├── __init__.py
│       ├── calendar_service.py
│       ├── gmail_service.py
│       ├── guardrails.py
│       └── transcript.py
│
├── docker/
│   └── kong/
│       └── kong.yml
│
├── docs/
│   ├── Architectural Flow Diagram/
│   │   └── Architectural Flow Diagram.png
│   └── Product Requirement Document/
│       └── Product Requirement Document.pdf
│
├── extension/
│   ├── background.js
│   ├── config.js
│   ├── content.js
│   ├── manifest.json
│   ├── offscreen.html
│   ├── offscreen.js
│   │
│   ├── assets/
│   │   └── icons/
│   │       ├── icon16.png
│   │       ├── icon48.png
│   │       └── icon128.png
│   │
│   ├── styles/
│   │   └── sidepanel.css
│   │
│   └── sidebar-app/
│       ├── .gitignore
│       ├── .oxlintrc.json
│       ├── index.html
│       ├── package-lock.json
│       ├── package.json
│       ├── rewrite.mjs
│       ├── tsconfig.app.json
│       ├── tsconfig.json
│       ├── tsconfig.node.json
│       ├── vite.config.ts
│       │
│       ├── public/
│       │   ├── favicon.svg
│       │   └── icons.svg
│       │
│       └── src/
│           ├── App.css
│           ├── App.tsx
│           ├── index.css
│           ├── main.tsx
│           ├── sidepanel.css
│           ├── types.ts
│           │
│           ├── assets/
│           │   ├── hero.png
│           │   ├── react.svg
│           │   └── vite.svg
│           │
│           ├── components/
│           │   ├── Agents.tsx
│           │   ├── ContextAgent.tsx
│           │   ├── ContextAgent.tsx.bak
│           │   ├── Layout.tsx
│           │   └── States.tsx
│           │
│           ├── hooks/
│           │   └── useCopilot.ts
│           │
│           └── lib/
│               └── utils.ts
│
├── frontend/
│   ├── .env.local.example
│   ├── .gitignore
│   ├── eslint.config.mjs
│   ├── next.config.ts
│   ├── package-lock.json
│   ├── package.json
│   ├── postcss.config.mjs
│   ├── tsconfig.json
│   │
│   ├── public/
│   │   ├── file.svg
│   │   ├── globe.svg
│   │   ├── next.svg
│   │   ├── vercel.svg
│   │   └── window.svg
│   │
│   └── src/
│       ├── app/
│       │   ├── favicon.ico
│       │   ├── globals.css
│       │   ├── layout.tsx
│       │   ├── page.tsx
│       │   ├── template.tsx
│       │   ├── context/
│       │   │   └── page.tsx
│       │   ├── meetings/
│       │   │   └── [id]/
│       │   │       └── page.tsx
│       │   └── memory/
│       │       └── page.tsx
│       │
│       ├── components/
│       │   ├── ActionButtons.tsx
│       │   ├── AnimatedNumber.tsx
│       │   ├── ContextCard.tsx
│       │   ├── ContextManager.tsx
│       │   ├── DeleteDialog.tsx
│       │   ├── EditDialog.tsx
│       │   ├── Md3Loading.tsx
│       │   ├── MeetingCard.tsx
│       │   ├── SelectableGrid.tsx
│       │   ├── Topbar.tsx
│       │   ├── UploadDialog.tsx
│       │   ├── ViewContentDialog.tsx
│       │   └── skeletons/
│       │       ├── CardSkeleton.tsx
│       │       ├── GridSkeleton.tsx
│       │       ├── MeetingSkeleton.tsx
│       │       ├── MemorySkeleton.tsx
│       │       └── index.ts
│       │
│       ├── lib/
│       │   ├── api.ts
│       │   └── supabase.ts
│       │
│       ├── scripts/
│       │   └── apply_colors.py
│       │
│       └── types/
│           ├── index.ts
│           └── mdwc.d.ts
│
├── supabase/
│   └── .temp/
│       ├── gotrue-version
│       ├── linked-project.json
│       ├── pooler-url
│       ├── postgres-version
│       ├── project-ref
│       ├── rest-version
│       ├── storage-migration
│       └── storage-version
│
├── .gitignore
├── docker-compose.yml
├── package.json
├── package-lock.json
└── README.md
```

---

# Getting Started

## Clone Repository

```bash
git clone https://github.com/darshan-gowdaa/MeetMaxxing.git
```

```bash
cd MeetMaxxing
```

---

## Install Backend Dependencies

```bash
npm install
```

```bash
cd backend
```

```bash
pip install -r requirements.txt
```

---

---
---

## Start all services with 

```bash
npm restart
```

---

## Load Chrome Extension

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load unpacked**
5. Select the `extension` folder

---

# Roadmap

- [ ] Smarter AI meeting coaching
- [ ] Voice interaction
- [ ] Multi-language support
- [ ] Mobile companion app
- [ ] Slack & Microsoft Teams integration
- [ ] Custom enterprise knowledge base
- [ ] Fine-grained user personalization
- [ ] Multi-meeting analytics dashboard

---

# Meet the Team

<div>

<table>
<tr>

<td align="center" width="33%">

<a href="https://github.com/darshan-gowdaa">

<b>@darshan-gowdaa</b>

</a>

<br>

Darshan Gowda

</td>

<td align="center" width="33%">

<a href="https://github.com/kanikapitaliya">

<b>@kanikapitaliya</b>

</a>

<br>

Kanika Pitaliya

</td>

<td align="center" width="33%">

<a href="https://github.com/yar123yar">

<b>@yar123yar</b>

</a>

<br>

Yarthem Muivah

</td>

</tr>
</table>

</div>

---

# Support

If you found MeetMaxxing interesting, consider giving the repository a ⭐.

It helps others discover the project and motivates us to continue improving it.

---

<p align="center">

Built using **Google ADK**, **Lyzr**, **A2A**, **Qdrant**, and modern AI engineering practices.

</p>
