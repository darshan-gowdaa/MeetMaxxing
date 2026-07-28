<div align="center">
  <img width="721" height="148" alt="LOGO" src="https://github.com/user-attachments/assets/42c010bd-f5ca-407a-a162-6ac5e5fb7aad" />
  <h3>A Production-Inspired Multi-Agent AI Meeting Copilot</h3>
  <p>Transforming online meetings into intelligent, collaborative experiences through modular AI agents, semantic memory, and real-time assistance.</p>
  <p><b>Powered by Google ADK, Lyzr, Agent-to-Agent (A2A) Communication & Qdrant.</b></p>

  <div>
    <img height="28" src="https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
    <img height="28" src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
    <img height="28" src="https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white" alt="Next.js" />
    <img height="28" src="https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB" alt="React" />
    <img height="28" src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
    <img height="28" src="https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
    <img height="28" src="https://img.shields.io/badge/Google%20ADK-AI%20Agents-4285F4?style=for-the-badge&logo=google&logoColor=white" alt="Google ADK" />
    <img height="28" src="https://img.shields.io/badge/Lyzr-Orchestration-6E56CF?style=for-the-badge" alt="Lyzr" />
    <img height="28" src="https://img.shields.io/badge/A2A-Agent--to--Agent-FF6F00?style=for-the-badge" alt="A2A" />
    <img height="28" src="https://img.shields.io/badge/Qdrant-Vector%20Memory-DC244C?style=for-the-badge" alt="Qdrant" />
    <img height="28" src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" alt="Redis" />
    <img height="28" src="https://img.shields.io/badge/Supabase-3FCF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
    <img height="28" src="https://img.shields.io/badge/gRPC-4285F4?style=for-the-badge&logo=grpc&logoColor=white" alt="gRPC" />
    <img height="28" src="https://img.shields.io/badge/Chrome%20Extension-4285F4?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Chrome Extension" />
  </div>
</div>

<br />

## <img width="20" height="20" src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f31f.png" /> Project Vision

Modern meetings generate valuable discussions, decisions, and action items — but much of that information is quickly forgotten or scattered across notes, emails, and calendars. **MeetMaxxing** reimagines meeting intelligence through a **multi-agent architecture**, where specialized AI agents collaborate instead of relying on a single monolithic AI workflow. Built around **Google ADK**, **Lyzr**, **Agent-to-Agent (A2A) communication**, and **Qdrant semantic memory**, it demonstrates how modern AI systems can coordinate, remember context, automate follow-ups, and assist users throughout an online meeting.

> **Design Language:** MeetMaxxing follows **Material 3 (M3)** end to end, matching **Google Meet's native design language** — same elevation, motion, spacing, and color system — so it feels like a built-in feature rather than a browser extension. Built for professionals, educators, students, founders, and teams who never want to miss important context.

---

## <img width="20" height="20" src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/2728.png" /> Core Features

| Feature | Description |
| :--- | :--- |
| 🤖 Multi-Agent Intelligence | Specialized AI agents collaborate to perform dedicated tasks instead of relying on a single monolithic LLM. |
| ⚡ Real-Time Assistance | Contextual suggestions, meeting insights, and intelligent support while the meeting is in progress. |
| 🧠 Semantic Memory | Store and retrieve meeting knowledge using vector embeddings powered by Qdrant. |
| 📝 Smart Meeting Summaries | Automatically generate concise summaries, key discussion points, and actionable takeaways. |
| ✉️ AI Follow-ups | Generate professional follow-up emails containing meeting highlights and action items. |
| 📅 Intelligent Scheduling | Create reminders and follow-up meetings directly from extracted action items. |
| 📄 Document Question Answering | Upload supporting documents and let AI agents answer questions using meeting context. |
| ⏱️ Late Join Recaps | Users joining late receive an instant AI-generated summary of everything discussed so far. |

---

# 🧩 Chrome Extension

The Chrome Extension is the primary AI workspace inside Google Meet, providing contextual assistance without interrupting the meeting.

<table style="border:none; border-collapse:collapse;">
<tr>
<td align="center" width="50%" style="border:none; padding:8px;">
<img width="100%" src="https://github.com/user-attachments/assets/a5dd1603-9cfe-484b-befd-8edb2a487e86" alt="Chrome Extension"/>

**Chrome Extension** — Installed and available directly from Chrome.
</td>
<td align="center" width="50%" style="border:none; padding:8px; vertical-align:top;">
<img width="100%" height="auto" src="https://github.com/user-attachments/assets/532c6444-e774-4457-90e0-57873f4507a3" alt="Extension Working"/>

**Running Inside Google Meet** — Material 3 sidebar integrated directly into Google Meet.
</td>
</tr>
</table>

---

## <img width="20" height="20" src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f310.png" /> AI Agent Ecosystem

MeetMaxxing follows a **collaborative multi-agent architecture** where each agent has a clearly defined responsibility, instead of overloading a single model with every task.

| Agent | Responsibility | Showcase |
| :--- | :--- | :--- |
| Transcription Agent 🎙️ | Streams and processes meeting transcripts live. | Live Transcript — rolling transcript generated during the meeting. |
| Realtime Agent ⚡ | Generates contextual suggestions and live assistance during meetings. | Live AI Insights (Copilot) — real-time suggestions and meeting intelligence. |
| Summary Agent 📝 | Produces concise meeting summaries, key points, and action items. | Meeting Summaries — AI-generated overview and detailed discussion points. |
| Memory Agent 🧠 | Stores semantic embeddings inside Qdrant and retrieves historical meeting knowledge. | Semantic Search — retrieve information using similarity, not keywords. |
| Email Agent ✉️ | Drafts professional follow-up emails using meeting context. | Mail Agent — generates follow-up emails from discussions. |
| Scheduler Agent 📅 | Converts action items into calendar events and reminders. | Calendar Agent — turns action items into reminders/events. |
| Docs QA Agent 📄 | Answers user questions using uploaded documents combined with meeting context. | RAG ChatBot — ask questions using uploaded docs and meeting knowledge. |
| Late Join Agent ⏱️ | Instantly summarizes prior discussion for participants joining mid-meeting. | Recap Agent — instant summary for late joiners. |
| Orchestrator Agent 🎭 | Coordinates communication between agents and routes tasks intelligently (A2A hub). | Core routing layer — no dedicated UI. |

<table style="border:none; border-collapse:collapse;">
<tr>
<td width="25%" style="border:none; padding:6px; vertical-align:top;">
<img width="100%" style="object-fit:cover; object-position:top;" src="https://github.com/user-attachments/assets/59f1c6a3-ee32-482a-a287-9901670e92da" alt="Live AI Insights"/>
</td>
<td width="25%" style="border:none; padding:6px; vertical-align:top;">
<img width="100%" style="object-fit:cover; object-position:top;" src="https://github.com/user-attachments/assets/85f681b6-a39d-41df-8db8-1af7d6baab4c" alt="RAG Chatbot"/>
</td>
<td width="25%" style="border:none; padding:6px; vertical-align:top;">
<img width="100%" style="object-fit:cover; object-position:top;" src="https://github.com/user-attachments/assets/576cfc82-91ac-4db5-874a-e2797ef60336" alt="Recap Agent"/>
</td>
<td width="25%" style="border:none; padding:6px; vertical-align:top;">
<img width="100%" style="object-fit:cover; object-position:top;" src="https://github.com/user-attachments/assets/f9dc384c-466f-43f6-9a74-c1add5761ce4" alt="Live Transcript"/>
</td>
</tr>
</table>

The extension combines a Material 3 interface with all these agents, letting users interact with meeting knowledge without leaving Google Meet.

---

# 🖥️ Frontend Dashboard

The web dashboard provides centralized access to meetings, semantic memory, uploaded knowledge, analytics, and AI-generated outputs.

<table style="border:none; border-collapse:collapse;">
<tr>
<td style="border:none; padding:8px;">
<img width="100%" src="https://github.com/user-attachments/assets/bac3a07e-636f-4062-bb01-534396573349" alt="Dashboard"/>

**Dashboard Overview**
</td>
</tr>
</table>

### Meeting Management

<table style="border:none; border-collapse:collapse; table-layout:fixed; width:100%;">
<tr>
<td width="50%" style="border:none; padding:8px; vertical-align:top;">
<img width="100%" src="https://github.com/user-attachments/assets/0e177e60-f402-4ae8-9a13-a75fa65d729e" alt="Selecting Meetings"/>

**Selecting Meetings** — Bulk selection for organizing and managing meetings.
</td>
<td width="50%" style="border:none; padding:8px; vertical-align:top;">
<img width="100%" src="https://github.com/user-attachments/assets/21a93041-2615-4784-9cc7-389927b384b4" alt="Deleting Meetings"/>

**Deleting Meetings** — Delete meetings individually or in batches.
</td>
</tr>
</table>

### Context Manager

Store PDFs, notes, documentation, and company knowledge that powers the RAG assistant.

<table style="border:none; border-collapse:collapse;">
<tr>
<td align="center" width="50%" style="border:none; padding:8px;">
<img width="100%" src="https://github.com/user-attachments/assets/d0ca2bc2-2b3f-4069-9bf6-66f0863d2732" alt="Context Homepage"/>

**Context Manager** — Central repository for uploaded knowledge.
</td>
<td align="center" width="50%" style="border:none; padding:8px;">
<img width="100%" src="https://github.com/user-attachments/assets/a4a4731d-d5ad-4528-abaa-11d3cd74c14e" alt="Uploading Context"/>

**Uploading & Viewing** — Upload, organize, and manage contextual documents.
</td>
</tr>
</table>

### Semantic Search

<table style="border:none; border-collapse:collapse;">
<tr>
<td style="border:none; padding:8px;">
<img width="100%" src="https://github.com/user-attachments/assets/0367f135-dd47-4039-ac7e-1482c94622a1" alt="Semantic Search"/>

**Semantic Search** — Retrieve information using semantic similarity instead of keywords.
</td>
</tr>
</table>

### Meeting Summaries

<table style="border:none; border-collapse:collapse;">
<tr>
<td align="center" width="50%" style="border:none; padding:8px;">
<img width="100%" src="https://github.com/user-attachments/assets/cd8348c1-1c75-412a-a068-421e14e28c93" alt="Meeting Summary"/>

**Summary View** — AI-generated meeting overview with highlights.
</td>
<td align="center" width="50%" style="border:none; padding:8px;">
<img width="100%" src="https://github.com/user-attachments/assets/418146fd-3643-4b54-8232-f38f94fe48d4" alt="Meeting Details"/>

**Detailed Summary** — Actionable discussion points and key decisions.
</td>
</tr>
</table>

### Productivity Agents

<table style="border:none; border-collapse:collapse;">
<tr>
<td align="center" width="50%" style="border:none; padding:8px;">
<img width="100%" alt="Mail Agent" src="https://github.com/user-attachments/assets/9901db12-b9f1-4566-bacb-3feaa8bbd0a0" />

**Mail Agent** — Generate professional follow-up emails from meeting discussions.
</td>
<td align="center" width="50%" style="border:none; padding:8px;">
<img width="100%" src="https://github.com/user-attachments/assets/cf480236-2acc-4fa7-9d07-164bb609bb21" alt="Calendar Agent"/>

**Calendar Agent** — Convert action items into reminders and calendar events.
</td>
</tr>
<tr>
<td align="center" width="50%" style="border:none; padding:8px;">
<img width="100%" src="https://github.com/user-attachments/assets/88089382-6fd3-4ad2-b3a1-fcaccec4e27d" alt="Action Items"/>

**Action Items** — Track tasks assigned during meetings.
</td>
<td align="center" width="50%" style="border:none; padding:8px;">
<img width="100%" src="https://github.com/user-attachments/assets/7f8a793e-ce0b-4690-aa58-5b6c200ea653" alt="Meeting Transcripts"/>

**Meeting Transcripts** — Fully searchable transcript archive for every meeting.
</td>
</tr>
</table>

Together, the dashboard extends MeetMaxxing beyond live meetings by organizing meeting history, searchable knowledge, AI-generated summaries, transcripts, emails, calendar events, and semantic memory into a single Material 3 workspace.

---

## <img width="20" height="20" src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f3d7.png" /> Architecture & Design Rationale

Traditional AI meeting assistants rely on a **single prompt** to perform transcription, summarization, memory retrieval, scheduling, and follow-up generation. MeetMaxxing distributes these responsibilities across specialized agents that collaborate through **Google ADK** (independent, tool-specific reasoning per agent) and **A2A communication** (parallel execution and direct context sharing), instead of one monolithic workflow.

<p align="center">
  <img width="600" height="500" alt="MeetMaxxing AI Agent Ecosystem" src="https://github.com/user-attachments/assets/17e5f068-7a1b-490f-aa6b-5c01cbe55226" />
</p>

| Advantage | Why It Matters |
| :--- | :--- |
| ✅ Modular and maintainable | Each agent is isolated, testable, and independently deployable |
| ✅ Easy to extend | New agents plug into the orchestrator without touching existing ones |
| ✅ Better scalability | Load spreads across agents; parallel execution instead of blocking |
| ✅ Clear separation of responsibilities | No monolithic prompt sprawl; each agent owns one job |
| ✅ Persistent semantic memory | Context survives across meetings via Qdrant |
| ✅ Production-inspired design | Mirrors real multi-agent systems used in industry |

---

## <img width="20" height="20" src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f9e0.png" /> Persistent Memory with Qdrant

MeetMaxxing doesn't forget previous meetings. Conversations are transformed into **vector embeddings** and stored inside **Qdrant**, enabling semantic search across historical discussions.

| Step | Stage |
| :--- | :--- |
| 1 | Meeting Transcript |
| 2 | Text Embeddings |
| 3 | Qdrant Vector Database |
| 4 | Semantic Retrieval |
| 5 | Relevant Context |
| 6 | AI Response |

This lets users ask contextual questions like *"What decisions were made regarding our authentication module last week?"* — instead of keyword matching, Qdrant retrieves semantically similar discussions so agents respond with meaningful context.

---

## <img width="20" height="20" src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f504.png" /> End-to-End Workflow

Every interaction inside MeetMaxxing follows an intelligent event-driven workflow:

| Step | Stage | Detail |
| :--- | :--- | :--- |
| 1 | Join Google Meet | User joins a meeting |
| 2 | Chrome Extension Captures Events | Extension listens to meeting activity |
| 3 | FastAPI Backend Services | Events forwarded to backend |
| 4 | Orchestrator Agent | Routes tasks to the right agent(s) |
| 5a | Realtime Agent | Live in-meeting suggestions |
| 5b | Summary Agent | Feeds Email Agent and Scheduler Agent |
| 5c | Memory Agent | Semantic storage/retrieval |
| 5d | Docs QA Agent | Document-based answers |
| 6 | Qdrant Semantic Memory | All agent outputs converge here |
| 7 | AI Response to User | Final response delivered |

---

## <img width="20" height="20" src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f6e0.png" /> Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| AI Framework 🤖 | Google ADK, Lyzr | Core agent logic and orchestration |
| Communication 📡 | <img height="20" src="https://img.shields.io/badge/A2A-FF6F00?style=flat-square" alt="A2A" /> <img height="20" src="https://img.shields.io/badge/gRPC-4285F4?style=flat-square&logo=grpc&logoColor=white" alt="gRPC" /> | Inter-agent messaging and RPC |
| Memory 🧠 | <img height="20" src="https://img.shields.io/badge/Qdrant-DC244C?style=flat-square" alt="Qdrant" /> | Vector embeddings and semantic search |
| Backend ⚙️ | <img height="20" src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" /> <img height="20" src="https://img.shields.io/badge/Python-3776AB?style=flat-square&logo=python&logoColor=white" alt="Python" /> | High-performance API services |
| Frontend 🖥️ | <img height="20" src="https://img.shields.io/badge/Next.js-000000?style=flat-square&logo=nextdotjs&logoColor=white" alt="Next.js" /> <img height="20" src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB" alt="React" /> <img height="20" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript" /> <img height="20" src="https://img.shields.io/badge/Tailwind%20CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" /> | Dashboard and user interface |
| Client 🔌 | <img height="20" src="https://img.shields.io/badge/Chrome%20Extension-4285F4?style=flat-square&logo=googlechrome&logoColor=white" alt="Chrome Extension" /> | Google Meet integration |
| Database 🗄️ | <img height="20" src="https://img.shields.io/badge/Supabase-3FCF8E?style=flat-square&logo=supabase&logoColor=white" alt="Supabase" /> | Relational data and auth |
| Cache ⚡ | <img height="20" src="https://img.shields.io/badge/Redis-DC382D?style=flat-square&logo=redis&logoColor=white" alt="Redis" /> | State management and caching |
| Observability 🔍 | <img height="20" src="https://img.shields.io/badge/Langfuse-000000?style=flat-square" alt="Langfuse" /> <img height="20" src="https://img.shields.io/badge/OpenTelemetry-F5A800?style=flat-square&logo=opentelemetry&logoColor=white" alt="OpenTelemetry" /> <img height="20" src="https://img.shields.io/badge/Jaeger-66CFE3?style=flat-square&logo=jaeger&logoColor=white" alt="Jaeger" /> | Monitoring and tracing |

---

## <img width="20" height="20" src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f4c1.png" /> Repository Structure

```bash
MeetMaxxing/
│
├── .gemini_rules/                                # AI-assistant rule/config files for this repo
│   ├── material3-expressive-meet-extension.md     # Design-rule doc for Material3 expressive UI
│   └── material3-expressive-meet-extension.skill  # Skill definition consumed by the rule file above
│
├── backend/                                       # Python FastAPI backend (all agents + services)
│   ├── agents/                                    # Google ADK agent implementations
│   │   ├── __init__.py                            # Package init for agents module
│   │   ├── docs_qa_agent.py                       # Answers questions using uploaded documents
│   │   ├── email_agent.py                         # Drafts follow-up emails from meeting context
│   │   ├── late_join_agent.py                     # Summarizes discussion for late joiners
│   │   ├── memory_agent.py                        # Stores/retrieves semantic memory via Qdrant
│   │   ├── orchestrator.py                        # Routes tasks between all agents (A2A hub)
│   │   ├── realtime_agent.py                      # Generates live in-meeting suggestions
│   │   ├── scheduler_agent.py                     # Converts action items into calendar events
│   │   ├── summary_agent.py                       # Produces meeting summaries and key points
│   │   └── transcription_agent.py                 # Streams and processes meeting transcripts
│   ├── alembic/                                   # DB migration tooling (Alembic)
│   │   ├── env.py                                 # Alembic runtime/env configuration
│   │   ├── README                                 # Alembic usage notes
│   │   └── script.py.mako                         # Migration file template
│   ├── api/                                       # REST API route definitions
│   │   ├── __init__.py                            # Package init for api module
│   │   ├── routes_calendar.py                     # Calendar/reminder endpoints
│   │   ├── routes_context.py                      # Context/knowledge endpoints
│   │   ├── routes_dashboard.py                    # Dashboard data endpoints
│   │   ├── routes_meeting.py                      # Meeting CRUD and detail endpoints
│   │   ├── routes_memory.py                       # Semantic memory search endpoints
│   │   ├── routes_transcript.py                   # Transcript ingestion/retrieval endpoints
│   │   └── test_pipeline.py                       # Endpoint for testing the agent pipeline
│   ├── core/                                      # Core config, auth, and shared utilities
│   │   ├── __init__.py                            # Package init for core module
│   │   ├── auth.py                                # Authentication/authorization logic
│   │   ├── config.py                              # App-wide settings and env config
│   │   ├── database.py                            # Database connection/session setup
│   │   ├── llm_fallback.py                        # Fallback logic across LLM providers
│   │   ├── lyzr_integration.py                    # Lyzr orchestration integration
│   │   ├── rate_limiter.py                        # Request rate-limiting middleware
│   │   ├── redis_client.py                        # Redis connection and cache helpers
│   │   └── utils.py                               # Shared helper functions
│   ├── grpc_bus/                                  # gRPC-based Agent-to-Agent (A2A) messaging
│   │   ├── __init__.py                            # Package init for grpc_bus module
│   │   ├── grpc_bus_pb2_grpc.py                   # Generated gRPC service stubs
│   │   ├── grpc_bus_pb2.py                        # Generated protobuf message classes
│   │   ├── grpc_bus.proto                         # Protobuf schema for A2A messages
│   │   └── grpc_server.py                         # gRPC server that routes agent messages
│   ├── memory/                                    # Qdrant-backed semantic memory layer
│   │   ├── __init__.py                            # Package init for memory module
│   │   ├── embeddings.py                          # Text-to-vector embedding generation
│   │   ├── qdrant_client.py                       # Qdrant connection and query helpers
│   │   └── schemas.py                             # Pydantic schemas for memory records
│   ├── services/                                  # Third-party service integrations
│   │   ├── __init__.py                            # Package init for services module
│   │   ├── calendar_service.py                    # Google Calendar API integration
│   │   ├── gmail_service.py                       # Gmail API integration for follow-ups
│   │   ├── guardrails.py                          # Input/output safety and validation checks
│   │   └── transcript.py                          # Transcript parsing/formatting logic
│   ├── tests/                                     # Backend test suite
│   │   ├── conftest.py                            # Shared pytest fixtures
│   │   └── test_suite.py                          # Core backend tests
│   ├── .env.example                               # Sample environment variables
│   ├── .pre-commit-config.yaml                    # Pre-commit hook configuration
│   ├── .python-version                            # Pinned Python version for the backend
│   ├── alembic.ini                                # Alembic migration config
│   ├── main.py                                    # Backend entry point (FastAPI app)
│   ├── pyproject.toml                             # Python project/dependency config
│   ├── README.md                                  # Backend-specific documentation
│   ├── supabase_migrations.sql                    # SQL migrations for Supabase schema
│   └── uv.lock                                    # Locked dependency versions (uv)
│
├── docs/                                          # Project documentation assets
│   ├── Architectural Flow Diagram/
│   │   └── Architectural Flow Diagram.png         # Visual diagram of system architecture
│   └── Product Requirement Document/
│       └── Product Requirement Document.pdf       # PRD for the project
│
├── extension/                                     # Chrome Extension (Google Meet integration)
│   ├── assets/
│   │   └── icons/
│   │       ├── icon128.png                        # Extension icon, 128x128
│   │       ├── icon16.png                         # Extension icon, 16x16
│   │       └── icon48.png                         # Extension icon, 48x48
│   ├── sidebar-app/                               # React sidebar UI (Vite-built)
│   │   ├── public/
│   │   │   ├── favicon.svg                        # Sidebar app favicon
│   │   │   └── icons.svg                          # Shared icon sprite sheet
│   │   ├── src/
│   │   │   ├── assets/
│   │   │   │   ├── hero.png                       # Hero image used in sidebar UI
│   │   │   │   ├── react.svg                      # React logo asset
│   │   │   │   └── vite.svg                       # Vite logo asset
│   │   │   ├── components/
│   │   │   │   ├── Agents.tsx                     # Displays active agents in sidebar
│   │   │   │   ├── ContextAgent.tsx               # UI for context/document agent interactions
│   │   │   │   ├── ContextAgent.tsx.bak            # Backup of ContextAgent.tsx
│   │   │   │   ├── Layout.tsx                     # Sidebar layout wrapper
│   │   │   │   └── States.tsx                     # Loading/empty/error state components
│   │   │   ├── hooks/
│   │   │   │   └── useCopilot.ts                  # Hook for copilot chat/session state
│   │   │   ├── lib/
│   │   │   │   └── utils.ts                       # Shared frontend helper functions
│   │   │   ├── App.css                            # Root app styles
│   │   │   ├── App.tsx                            # Root sidebar React component
│   │   │   ├── index.css                          # Global CSS entry
│   │   │   ├── main.tsx                           # React app bootstrap/entry point
│   │   │   ├── sidepanel.css                       # Styles specific to the side panel
│   │   │   └── types.ts                           # Shared TypeScript types
│   │   ├── .gitignore                             # Git ignore rules for sidebar-app
│   │   ├── .oxlintrc.json                         # Oxlint linter configuration
│   │   ├── index.html                             # Sidebar app HTML entry
│   │   ├── package-lock.json                      # Locked npm dependency versions
│   │   ├── package.json                           # Sidebar app dependencies/scripts
│   │   ├── rewrite.mjs                            # Build-time rewrite/transform script
│   │   ├── tsconfig.app.json                      # TypeScript config for app code
│   │   ├── tsconfig.json                          # Base TypeScript config
│   │   ├── tsconfig.node.json                     # TypeScript config for Node/build tooling
│   │   └── vite.config.ts                         # Vite build configuration
│   ├── styles/
│   │   └── sidepanel.css                          # Legacy/root-level side panel styles
│   ├── background.js                              # Extension service worker (background tasks)
│   ├── config.js                                  # Extension runtime configuration
│   ├── content.js                                 # Content script injected into Google Meet
│   ├── manifest.json                              # Chrome extension manifest
│   ├── offscreen.html                             # Offscreen document for background audio/DOM work
│   └── offscreen.js                               # Logic for the offscreen document
│
├── frontend/                                      # Next.js web dashboard
│   ├── public/
│   │   ├── file.svg                               # Static file icon asset
│   │   ├── globe.svg                               # Static globe icon asset
│   │   ├── next.svg                                # Next.js logo asset
│   │   ├── vercel.svg                              # Vercel logo asset
│   │   └── window.svg                              # Static window icon asset
│   ├── src/
│   │   ├── app/                                    # Next.js App Router pages
│   │   │   ├── context/
│   │   │   │   └── page.tsx                       # Context/knowledge management page
│   │   │   ├── meetings/
│   │   │   │   └── [id]/
│   │   │   │       └── page.tsx                   # Single meeting detail page
│   │   │   ├── memory/
│   │   │   │   └── page.tsx                       # Semantic memory search page
│   │   │   ├── globals.css                        # Global dashboard styles
│   │   │   ├── icon.png                           # Dashboard favicon/app icon
│   │   │   ├── layout.tsx                         # Root layout wrapper
│   │   │   ├── page.tsx                           # Dashboard home page
│   │   │   └── template.tsx                       # Route template wrapper
│   │   ├── components/
│   │   │   ├── atoms/
│   │   │   │   ├── AnimatedNumber.tsx             # Animated numeric counter component
│   │   │   │   └── Md3Loading.tsx                 # Material3-style loading indicator
│   │   │   ├── molecules/
│   │   │   │   ├── ActionButtons.tsx              # Grouped action button component
│   │   │   │   ├── MeetingCard.tsx                # Card summarizing a single meeting
│   │   │   │   └── Topbar.tsx                     # Dashboard top navigation bar
│   │   │   ├── organisms/
│   │   │   │   ├── ContextCard.tsx                # Card displaying context/knowledge items
│   │   │   │   ├── ContextHero.tsx                # Hero section for context page
│   │   │   │   ├── ContextManager.tsx             # Manages uploaded context documents
│   │   │   │   ├── DashboardHero.tsx              # Hero section for dashboard home
│   │   │   │   ├── DeleteDialog.tsx               # Confirmation dialog for deletions
│   │   │   │   ├── EditDialog.tsx                 # Dialog for editing records
│   │   │   │   ├── MeetingActionItems.tsx         # Displays extracted action items
│   │   │   │   ├── MeetingDecisions.tsx           # Displays extracted decisions
│   │   │   │   ├── MeetingHeader.tsx              # Header for meeting detail page
│   │   │   │   ├── MeetingSummary.tsx             # Displays AI-generated meeting summary
│   │   │   │   ├── MeetingTranscript.tsx          # Displays full meeting transcript
│   │   │   │   ├── SelectableGrid.tsx             # Grid with multi-select support
│   │   │   │   ├── UploadDialog.tsx               # Dialog for uploading documents
│   │   │   │   └── ViewContentDialog.tsx          # Dialog for viewing full content
│   │   │   └── templates/
│   │   │       └── skeletons/
│   │   │           ├── CardSkeleton.tsx           # Loading skeleton for cards
│   │   │           ├── GridSkeleton.tsx           # Loading skeleton for grids
│   │   │           ├── index.ts                   # Skeleton components barrel export
│   │   │           ├── MeetingSkeleton.tsx        # Loading skeleton for meeting page
│   │   │           └── MemorySkeleton.tsx         # Loading skeleton for memory page
│   │   ├── lib/
│   │   │   ├── api.ts                             # API client for backend requests
│   │   │   └── supabase.ts                        # Supabase client setup
│   │   ├── scripts/
│   │   │   └── apply_colors.py                    # Script to apply/generate theme colors
│   │   └── types/
│   │       ├── index.ts                           # Shared TypeScript type definitions
│   │       └── mdwc.d.ts                          # Type declarations for md web components
│   ├── .env.local.example                         # Sample local environment variables
│   ├── .eslintrc.json                             # ESLint configuration
│   ├── .gitignore                                 # Git ignore rules for frontend
│   ├── next.config.ts                             # Next.js build/runtime configuration
│   ├── package-lock.json                          # Locked npm dependency versions
│   ├── package.json                               # Frontend dependencies/scripts
│   ├── postcss.config.mjs                         # PostCSS configuration
│   └── tsconfig.json                              # TypeScript configuration
│
├── supabase/                                      # Supabase project config/state
│   └── .temp/
│       ├── gotrue-version                         # Pinned GoTrue (auth) service version
│       ├── linked-project.json                    # Linked Supabase project metadata
│       ├── pooler-url                             # Connection pooler URL
│       ├── postgres-version                       # Pinned Postgres version
│       ├── project-ref                            # Supabase project reference ID
│       ├── rest-version                           # Pinned PostgREST version
│       ├── storage-migration                      # Storage migration state marker
│       └── storage-version                        # Pinned Storage service version
│
├── .gitignore                                     # Root-level git ignore rules
├── package-lock.json                              # Locked root npm dependency versions
├── package.json                                   # Root scripts (install/start all services)
└── README.md                                      # Project documentation (this file)
```

---

## <img width="20" height="20" src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f680.png" /> Getting Started

### Prerequisites

| Requirement | Version |
| :--- | :--- |
| Node.js | v18 or higher |
| Python | v3.10+ |
| Docker | For running Qdrant, Redis, etc. |

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/darshan-gowdaa/MeetMaxxing.git
   cd MeetMaxxing
   ```

2. **Install All Dependencies** *(installs frontend packages and sets up the backend via `uv`)*
   ```bash
   npm install
   ```

3. **Start All Services** *(from the root directory)*
   ```bash
   npm start
   ```

### Load Chrome Extension

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load unpacked**
5. Select the `extension` folder

---

## <img width="20" height="20" src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f5fa.png" /> Roadmap

| Item | Status |
| :--- | :--- |
| Smarter AI meeting coaching 🧠 | Planned |
| Voice interaction 🎙️ | Planned |
| Multi-language support 🌍 | Planned |
| Mobile companion app 📱 | Planned |
| Slack & Microsoft Teams integration 💬 | Planned |
| Custom enterprise knowledge base 🏢 | Planned |
| Fine-grained user personalization 👤 | Planned |
| Multi-meeting analytics dashboard 📊 | Planned |

---

## <img width="20" height="20" src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f465.png" /> Contributors

<div align="center">

[![Darshan Gowda](https://img.shields.io/badge/GitHub-darshan--gowdaa-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/darshan-gowdaa)
[![Kanika Pitaliya](https://img.shields.io/badge/GitHub-kanikapitaliya-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/kanikapitaliya)

</div>

---

## <img width="20" height="20" src="https://raw.githubusercontent.com/twitter/twemoji/master/assets/72x72/1f31f.png" /> Support

If you found MeetMaxxing interesting, consider giving the repository a ⭐. It helps others discover the project and motivates us to continue improving it.
