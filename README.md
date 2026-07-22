<div align="center">

# 🚀 MeetMaxxing

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

# 🎯 Project Vision

Modern meetings generate valuable discussions, decisions, and action items—but much of that information is quickly forgotten or scattered across notes, emails, and calendars.

**MeetMaxxing** reimagines meeting intelligence through a **multi-agent architecture**, where specialized AI agents collaborate instead of relying on a single monolithic AI workflow.

Built around **Google ADK**, **Lyzr**, **Agent-to-Agent (A2A) communication**, and **Qdrant semantic memory**, MeetMaxxing demonstrates how modern AI systems can coordinate, remember context, automate follow-ups, and assist users throughout an online meeting.

Rather than being just another meeting summarizer, MeetMaxxing showcases how multiple AI agents can work together to provide a scalable, modular, and production-inspired meeting experience.

---

# 🎥 Demo

> **Coming Soon**

### 📹 Complete Walkthrough

<p align="center">

<!-- Replace with YouTube video -->
<a href="YOUR_YOUTUBE_LINK">
<img src="assets/demo-thumbnail.png" width="800"/>
</a>

</p>

---

### ⚡ Quick Demo

<p align="center">

<!-- Replace with your exported GIF -->
<img src="assets/demo.gif" width="900"/>

</p>

---

# 💡 Why MeetMaxxing?

Unlike conventional AI meeting assistants that rely on a single large language model prompt, MeetMaxxing adopts a **collaborative multi-agent design**.

Each AI agent focuses on a specialized responsibility—from live assistance and meeting summarization to semantic memory retrieval, email drafting, scheduling, and document-based question answering.

This modular architecture makes the system more scalable, maintainable, and capable of handling complex workflows while demonstrating modern AI engineering principles using:

- 🤖 **Google ADK** for specialized AI agents
- 🔄 **A2A Communication** for seamless agent collaboration
- 🧠 **Qdrant** for persistent semantic memory
- ⚙️ **Lyzr** for intelligent workflow orchestration

# ✨ Core Features

MeetMaxxing transforms traditional online meetings into intelligent, AI-assisted collaborative experiences through a modular multi-agent architecture.

<table>
<tr>
<td width="50%">

### 🤖 Multi-Agent Intelligence
Specialized AI agents collaborate to perform dedicated tasks instead of relying on a single monolithic LLM.

</td>

<td width="50%">

### ⚡ Real-Time Assistance
Receive contextual suggestions, meeting insights, and intelligent support while the meeting is still in progress.

</td>
</tr>

<tr>
<td>

### 🧠 Semantic Memory
Store and retrieve meeting knowledge using vector embeddings powered by Qdrant for context-aware conversations.

</td>

<td>

### 📄 Smart Meeting Summaries
Automatically generate concise summaries, key discussion points, and actionable takeaways after every meeting.

</td>
</tr>

<tr>
<td>

### 📧 AI Follow-ups
Generate professional follow-up emails containing meeting highlights and action items.

</td>

<td>

### 📅 Intelligent Scheduling
Create reminders and follow-up meetings directly from extracted action items.

</td>
</tr>

<tr>
<td>

### 📚 Document Question Answering
Upload supporting documents and allow AI agents to answer questions using meeting context.

</td>

<td>

### 🔄 Late Join Recaps
Users joining late receive an instant AI-generated summary of everything discussed so far.

</td>
</tr>
</table>

---

# 🧠 AI Agent Ecosystem

MeetMaxxing follows a **collaborative multi-agent architecture** where each agent has a clearly defined responsibility. Instead of overloading a single model with every task, specialized agents work together to deliver a smarter and more scalable meeting experience.

| Agent | Responsibility |
|---------|---------------|
| 🎤 **Transcription Agent** | Processes meeting transcripts and streams conversation data to the system. |
| ⚡ **Realtime Agent** | Generates contextual suggestions and live assistance during meetings. |
| 📝 **Summary Agent** | Produces concise meeting summaries, key points, and action items. |
| 🧠 **Memory Agent** | Stores semantic embeddings inside Qdrant and retrieves historical meeting knowledge. |
| 📧 **Email Agent** | Drafts follow-up emails using meeting context. |
| 📅 **Scheduler Agent** | Converts action items into calendar events and reminders. |
| 📄 **Docs QA Agent** | Answers user questions using uploaded documents combined with meeting context. |
| ⏱️ **Late Join Agent** | Instantly summarizes previous discussion for participants joining mid-meeting. |
| 🎯 **Orchestrator Agent** | Coordinates communication between agents and routes tasks intelligently. |

---

# 🚀 Google ADK in Action

Google ADK forms the backbone of MeetMaxxing's intelligent agent ecosystem.

Rather than building one large AI workflow, MeetMaxxing uses Google ADK to create **specialized agents**, each equipped with its own reasoning capabilities and dedicated tools.

This modular design enables:

- 🧩 Independent task execution
- 🔧 Tool-specific reasoning
- 📈 Better scalability
- 🔄 Easier maintenance
- 🤝 Collaborative decision making between AI agents

Every major meeting capability—from summarization and semantic retrieval to scheduling and follow-up generation—is powered by dedicated Google ADK agents working together.

---

# 🔄 Agent-to-Agent (A2A) Communication

One of the core objectives of MeetMaxxing is to demonstrate effective **Agent-to-Agent (A2A) communication**.

Instead of executing tasks sequentially within a single workflow, specialized agents exchange context and collaborate to solve complex meeting scenarios.

```text
            User Request
                  │
                  ▼
         🎯 Orchestrator Agent
                  │
      ┌───────────┼────────────┐
      ▼           ▼            ▼
 Summary      Memory       Realtime
  Agent        Agent         Agent
      │           │            │
      └───────┬───┴────────────┘
              ▼
      Email / Scheduler
              ▼
          Final Response
```

This architecture allows:

- Parallel execution of specialized tasks
- Better separation of responsibilities
- Easier extensibility for future agents
- Efficient information sharing between agents
- Production-inspired AI orchestration

---

# 🧠 Persistent Memory with Qdrant

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

> 💬 *"What decisions were made regarding our authentication module last week?"*

Instead of keyword matching, Qdrant retrieves semantically similar discussions, allowing AI agents to respond with meaningful context.

---

# ⚙️ Lyzr-Powered Workflow Orchestration

Lyzr strengthens MeetMaxxing's orchestration layer by coordinating complex AI workflows across multiple specialized agents.

It enables:

- Intelligent workflow management
- Agent coordination
- Dynamic task routing
- Context propagation
- Scalable AI execution

Combined with Google ADK and A2A communication, Lyzr helps transform independent AI agents into a cohesive collaborative system.

---

# 🌟 Why This Architecture?

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

# 🏗️ System Architecture

MeetMaxxing is designed as a production-inspired, event-driven AI system where the Chrome Extension, backend services, and specialized AI agents work together to provide intelligent meeting assistance.

<p align="center">
<img src="assets/architecture.png" width="1000">
</p>

<p align="center">
<i>Overall system architecture highlighting Google ADK, Lyzr orchestration, A2A communication, FastAPI services, and Qdrant semantic memory.</i>
</p>

---

# 🔄 End-to-End Workflow

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
             🎯 Orchestrator Agent
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

# 🖥️ Application Showcase

## 🏠 Chrome Extension

<p align="center">
<img src="assets/extension.png" width="900">
</p>

The Chrome Extension serves as the primary user interface, enabling real-time interaction with AI agents directly within Google Meet.

---

## ⚡ Live AI Assistance

<p align="center">
<img src="assets/realtime.png" width="900">
</p>

Receive contextual suggestions, insights, and assistance while the meeting is still ongoing.

---

## 📝 Meeting Summary

<p align="center">
<img src="assets/summary.png" width="900">
</p>

Automatically generate concise summaries, discussion highlights, and actionable takeaways.

---

## 🧠 Semantic Memory

<p align="center">
<img src="assets/memory.png" width="900">
</p>

Retrieve information from previous meetings using semantic similarity instead of keyword matching.

---

## 📧 AI Follow-up Emails

<p align="center">
<img src="assets/email.png" width="900">
</p>

Generate polished follow-up emails with meeting highlights and assigned action items.

---

## 📅 Smart Scheduling

<p align="center">
<img src="assets/calendar.png" width="900">
</p>

Convert action items into reminders and calendar events with minimal user effort.

---

## 📊 Dashboard

<p align="center">
<img src="assets/dashboard.png" width="900">
</p>

Access previous meetings, semantic memory, analytics, and meeting history from a centralized dashboard.

---

# 🛠️ Technology Stack

| Category | Technologies |
|-----------|--------------|
| 🤖 AI Framework | Google ADK, Lyzr |
| 🔄 Agent Communication | Agent-to-Agent (A2A), gRPC |
| 🧠 Vector Memory | Qdrant |
| 🖥️ Backend | FastAPI, Python |
| 🌐 Frontend | Next.js, TypeScript, Chrome Extension |
| 🗄️ Database | Supabase |
| ⚡ Cache | Redis |
| 🐳 Infrastructure | Docker, Docker Compose |
| 📊 Observability | Langfuse, OpenTelemetry, Jaeger |

---

# 📂 Repository Structure

```bash
MeetMaxxing/
│
├── backend/
│   ├── agents/
│   ├── orchestrator/
│   ├── api/
│   ├── services/
│   ├── memory/
│   └── grpc_bus/
│
├── frontend/
│
├── extension/
│
├── docker/
│
├── assets/
│
└── README.md
```

---

# 🚀 Getting Started

## Clone Repository

```bash
git clone https://github.com/<username>/MeetMaxxing.git
```

```bash
cd MeetMaxxing
```

---

## Install Backend Dependencies

```bash
pip install -r requirements.txt
```

---

## Start Docker Services

```bash
docker compose up
```

---

## Start Backend

```bash
uvicorn app.main:app --reload
```

---

## Start Frontend

```bash
npm install

npm run dev
```

---

## Load Chrome Extension

1. Open Chrome
2. Go to `chrome://extensions`
3. Enable **Developer Mode**
4. Click **Load unpacked**
5. Select the `extension` folder

---

# 🚧 Roadmap

- [ ] Smarter AI meeting coaching
- [ ] Voice interaction
- [ ] Multi-language support
- [ ] Mobile companion app
- [ ] Slack & Microsoft Teams integration
- [ ] Custom enterprise knowledge base
- [ ] Fine-grained user personalization
- [ ] Multi-meeting analytics dashboard

---

# 👨‍💻 Contributors

<table>
<tr>

<td align="center">
<img src="https://github.com/YOUR_USERNAME.png" width="120"><br>
<b>Your Name</b><br>
AI Engineering
</td>

<td align="center">
<img src="https://github.com/COLLABORATOR_1.png" width="120"><br>
<b>Collaborator</b><br>
Backend
</td>

<td align="center">
<img src="https://github.com/COLLABORATOR_2.png" width="120"><br>
<b>Collaborator</b><br>
Frontend
</td>

</tr>
</table>

---

# 🌟 Support

If you found MeetMaxxing interesting, consider giving the repository a ⭐.

It helps others discover the project and motivates us to continue improving it.

---

<p align="center">

Built using **Google ADK**, **Lyzr**, **A2A**, **Qdrant**, and modern AI engineering practices.

</p>
