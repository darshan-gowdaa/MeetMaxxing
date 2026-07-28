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

---

## Vision

Modern meetings generate valuable discussions, decisions, and action items — but much of that information is quickly forgotten or scattered across notes, emails, and calendars.

**MeetMaxxing** reimagines meeting intelligence through a **multi-agent architecture**: specialized AI agents collaborate instead of relying on one monolithic AI workflow. Built around **Google ADK**, **Lyzr**, **Agent-to-Agent (A2A) communication**, and **Qdrant semantic memory**, it coordinates context, automates follow-ups, and assists users live during meetings.

> **Design Language:** Follows **Material 3 (M3)** end to end, matching Google Meet's native elevation, motion, spacing, and color system — feels built-in rather than bolted-on. Built for professionals, educators, students, founders, and teams who never want to miss important context.

---

## Core Features

| Feature | Description |
| :--- | :--- |
| 🤖 Multi-Agent Intelligence | Specialized agents each own one task instead of one monolithic LLM. |
| ⚡ Live Copilot | Real-time contextual suggestions and insights while the meeting is in progress. |
| 🧠 Semantic Memory | Meeting knowledge stored/retrieved as vector embeddings via Qdrant. |
| 📝 Smart Summaries | Auto-generated summaries, key points, and action items. |
| ✉️ AI Follow-ups | Professional follow-up emails drafted from meeting content. |
| 📅 Intelligent Scheduling | Action items converted into reminders and calendar events. |
| 📄 Docs Q&A (RAG) | Upload documents; ask questions using meeting + doc context. |
| ⏱️ Late-Join Recaps | Instant AI summary of everything missed so far. |
| 🔍 Semantic Search | Retrieve past discussions by meaning, not keywords. |

---

## AI Agent Ecosystem

Each agent has one clear responsibility, coordinated by an orchestrator instead of a single overloaded model.

| Agent | Responsibility |
| :--- | :--- |
| 🎭 Orchestrator | Routes tasks and coordinates inter-agent communication. |
| 🎙️ Transcription | Processes and streams live meeting transcript. |
| ⚡ Realtime (Copilot) | Live contextual suggestions during the meeting. |
| 📝 Summary | Concise summaries, key points, action items. |
| 🧠 Memory | Stores/retrieves semantic embeddings in Qdrant. |
| ✉️ Email | Drafts follow-up emails from meeting context. |
| 📅 Scheduler | Converts action items into calendar events/reminders. |
| 📄 Docs QA | Answers questions using uploaded docs + meeting context. |
| ⏱️ Late Join | Summarizes prior discussion for late joiners. |

**Why multi-agent?**

| Advantage | Why it matters |
| :--- | :--- |
| Modular & maintainable | Each agent isolated and testable |
| Easy to extend | New agents plug into the orchestrator |
| Scalable | Load spreads across agents, run concurrently |
| No monolithic prompt sprawl | Clear separation of responsibilities |
| Persistent semantic memory | Context survives across meetings |

---

## Architecture

**Google ADK** powers each specialized agent's own reasoning + tools. **A2A communication** lets agents exchange context and collaborate in parallel rather than executing sequentially. **Qdrant** stores meeting transcripts as vector embeddings for semantic recall — e.g. asking *"What decisions were made on auth module last week?"* retrieves semantically similar discussions instead of keyword matches.

<p align="center">
  <img width="600" height="500" alt="MeetMaxxing AI Agent Ecosystem" src="https://github.com/user-attachments/assets/17e5f068-7a1b-490f-aa6b-5c01cbe55226" />
</p>

### End-to-End Workflow

```mermaid
%%{init: {'flowchart': {'useMaxWidth': false, 'nodeSpacing': 30, 'rankSpacing': 40} } }%%
flowchart TD
    A[Join Google Meet] --> B[Chrome Extension Captures Events]
    B --> C[FastAPI Backend Services]
    C --> D{Orchestrator Agent}

    D --> E[Realtime Agent]
    D --> F[Summary Agent]
    D --> G[Memory Agent]

    F --> H[Email Agent]
    F --> I[Scheduler Agent]
    D --> J[Docs QA Agent]

    E & G & H & I & J --> K[(Qdrant Semantic Memory)]
    K --> L[AI Response to User]
```

### Memory Pipeline

```mermaid
%%{init: {'flowchart': {'useMaxWidth': false, 'nodeSpacing': 35, 'rankSpacing': 35} } }%%
flowchart TD
    A[Meeting Transcript] --> B[Text Embeddings]
    B --> C[(Qdrant Vector Database)]
    C --> D[Semantic Retrieval]
    D --> E[Relevant Context]
    E --> F[AI Response]
```

---

## Technology Stack

| Layer | Technology | Purpose |
| :--- | :--- | :--- |
| AI Framework | Google ADK, Lyzr | Agent logic + orchestration |
| Communication | A2A, gRPC | Inter-agent messaging & RPC |
| Memory | Qdrant | Vector embeddings, semantic search |
| Backend | FastAPI, Python | High-performance API services |
| Frontend | Next.js, React, TypeScript, Tailwind CSS | Dashboard & UI |
| Cache/Queue | Redis | Fast in-memory state |
| Database | Supabase | Persistent structured storage |
| Client | Chrome Extension | In-meeting AI workspace |

---

## Application Showcase

### Chrome Extension (Live in Google Meet)

| | |
| :---: | :---: |
| <img width="100%" src="https://github.com/user-attachments/assets/a5dd1603-9cfe-484b-befd-8edb2a487e86" alt="Chrome Extension"/><br>**Extension in Chrome** | <img width="100%" src="https://github.com/user-attachments/assets/532c6444-e774-4457-90e0-57873f4507a3" alt="Extension Working"/><br>**M3 Sidebar Inside Meet** |

**In-meeting AI panels:**

| | | | |
| :---: | :---: | :---: | :---: |
| <img width="100%" src="https://github.com/user-attachments/assets/59f1c6a3-ee32-482a-a287-9901670e92da" alt="Live AI Insights"/><br>**Copilot** | <img width="100%" src="https://github.com/user-attachments/assets/85f681b6-a39d-41df-8db8-1af7d6baab4c" alt="RAG Chatbot"/><br>**RAG ChatBot** | <img width="100%" src="https://github.com/user-attachments/assets/576cfc82-91ac-4db5-874a-e2797ef60336" alt="Recap Agent"/><br>**Recap Agent** | <img width="100%" src="https://github.com/user-attachments/assets/f9dc384c-466f-43f6-9a74-c1add5761ce4" alt="Live Transcript"/><br>**Live Transcript** |

### Web Dashboard

<p align="center"><img width="100%" src="https://github.com/user-attachments/assets/bac3a07e-636f-4062-bb01-534396573349" alt="Dashboard"/><br><b>Dashboard Overview</b></p>

**Meeting management:**

| | |
| :---: | :---: |
| <img width="100%" src="https://github.com/user-attachments/assets/0e177e60-f402-4ae8-9a13-a75fa65d729e" alt="Selecting Meetings"/><br>**Bulk Selection** | <img width="100%" src="https://github.com/user-attachments/assets/21a93041-2615-4784-9cc7-389927b384b4" alt="Deleting Meetings"/><br>**Bulk Delete** |

**Context manager (RAG knowledge base):**

| | |
| :---: | :---: |
| <img width="100%" src="https://github.com/user-attachments/assets/d0ca2bc2-2b3f-4069-9bf6-66f0863d2732" alt="Context Homepage"/><br>**Repository** | <img width="100%" src="https://github.com/user-attachments/assets/a4a4731d-d5ad-4528-abaa-11d3cd74c14e" alt="Uploading Context"/><br>**Upload & Organize** |

**Semantic search:**

<p align="center"><img width="100%" src="https://github.com/user-attachments/assets/0367f135-dd47-4039-ac7e-1482c94622a1" alt="Semantic Search"/></p>

**Meeting summaries:**

| | |
| :---: | :---: |
| <img width="100%" src="https://github.com/user-attachments/assets/cd8348c1-1c75-412a-a068-421e14e28c93" alt="Meeting Summary"/><br>**Overview** | <img width="100%" src="https://github.com/user-attachments/assets/418146fd-3643-4b54-8232-f38f94fe48d4" alt="Meeting Details"/><br>**Detailed View** |

**Productivity agents:**

| | |
| :---: | :---: |
| <img width="100%" src="https://github.com/user-attachments/assets/9901db12-b9f1-4566-bacb-3feaa8bbd0a0" alt="Mail Agent"/><br>**Mail Agent** | <img width="100%" src="https://github.com/user-attachments/assets/cf480236-2acc-4fa7-9d07-164bb609bb21" alt="Calendar Agent"/><br>**Calendar Agent** |
| <img width="100%" src="https://github.com/user-attachments/assets/88089382-6fd3-4ad2-b3a1-fcaccec4e27d" alt="Action Items"/><br>**Action Items** | <img width="100%" src="https://github.com/user-attachments/assets/7f8a793e-ce0b-4690-aa58-5b6c200ea653" alt="Meeting Transcripts"/><br>**Transcript Archive** |

</document_content>
