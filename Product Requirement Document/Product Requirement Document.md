# Product Requirements Document (PRD): Enterprise AI Meeting Intelligence Platform

## 1. Executive Summary
This document outlines the requirements for a high-performance, enterprise-grade AI Meeting Intelligence Platform. The system leverages a multi-agent "Trunk & Bus" architecture to provide real-time transcription, context-aware memory, and proactive automation for Google Meet. By utilizing Gemini 2.5 Flash and a specialized agent layer, the platform transforms live conversations into actionable structured data while maintaining rigorous security and observability standards.

## 2. Problem Statement
Professional meetings are often information-dense, leading to lost context, inefficient manual note-taking, and delayed follow-ups. Late joiners lack immediate context, and historical knowledge across multiple meetings is difficult to retrieve. Existing solutions often lack real-time reasoning, enterprise-grade security, and deep integration into existing workflows (Slack, Gmail, Calendar).

## 3. Goals & Objectives
*   **Zero-Latency Intelligence:** Provide real-time transcription and insights during the meeting.
*   **Agentic Memory:** Enable reasoning over historical meeting data using vector embeddings.
*   **Proactive Automation:** Automate post-meeting workflows (emails, Slack updates, calendar reminders) immediately upon meeting conclusion.
*   **Enterprise Compliance:** Ensure 100% observability, GDPR compliance, and data encryption.

## 4. Target Users / Stakeholders
*   **Enterprise Professionals:** Primary users seeking to automate meeting overhead.
*   **Project Managers:** Users requiring accurate tracking of decisions and action items.
*   **IT/Security Teams:** Stakeholders responsible for data privacy, compliance, and system observability.

## 5. Functional Requirements

| ID | Feature | Description | Priority |
| :--- | :--- | :--- | :--- |
| **FR-01** | Real-time Transcription | DOM-based extraction of Google Meet captions with <1s latency. | Must |
| **FR-02** | Consent Capture | UI component to capture explicit participant consent before recording/transcribing. | Must |
| **FR-03** | Late Join Recap | On-demand summary of missed content for participants joining late. | Must |
| **FR-04** | Real-time Insights | Continuous stream (10s intervals) of key points and live sentiment. | Must |
| **FR-05** | Historical Memory | Semantic search and Q&A across historical meeting transcripts via Qdrant. | Must |
| **FR-06** | Data Encryption | AES-256 encryption at rest for all vector and transcript data. | Must |
| **FR-07** | Automated Erasure | Workflows for data minimization and right-to-erasure compliance. | Must |
| **FR-08** | Multi-Channel Sync | Automated drafting of follow-up emails and Slack notifications. | Should |
| **FR-09** | Calendar Sync | Create reminders and update event metadata using Google Calendar API. | Should |

## 6. Non-Functional Requirements
*   **Observability:** 100% of LLM calls must be traced via Langfuse and OpenTelemetry, including token usage, latency, prompt/version metadata, and correlation IDs.
*   **Tracing:** All agent requests and LLM calls must propagate correlation IDs across Orchestrator, A2A Task Bus, Security Gateway, and observability pipeline.
*   **Budgeting:** Each agent must enforce token and latency budgets, with per-call max token caps and alerting on budget breaches.
*   **Performance:** Real-time insights must be delivered with a maximum 10-second update frequency.
*   **Scalability:** Horizontal scaling of stateless agents on GKE; Qdrant collection partitioning for multi-tenant isolation.
*   **Reliability:** Use of gRPC with backpressure and rate limiting to handle high-concurrency task loads.

## 7. System Architecture Overview
The system follows a **"Trunk & Bus"** architecture:
1.  **Frontend Layer:** Chrome Extension (Sidebar) and Web Dashboard.
2.  **Security & Orchestration:** Kong Gateway acts as the entry point, feeding into a "Security Trunk" that fanned out to agents.
3.  **Agent Layer:** Seven specialized agents (Transcription, Insights, Recap, Memory, Email, Slack, Calendar) managed by a central Orchestrator using the Google A2A (Agent-to-Agent) protocol.
4.  **Communication:** Asynchronous gRPC Task Bus for worker agents and a horizontal OTLP Trace Bus for observability.
5.  **Reasoning & Data:** Dedicated LLM Layer (Gemini 2.5 Flash) and Vector Memory (Qdrant).

## 8. Tech Stack
*   **Frontend:** TypeScript, Next.js, Tailwind CSS, shadcn/ui, Chrome Extension API.
*   **Orchestration:** Python, Google ADK, Lyzr, LangGraph, Google A2A Protocol.
*   **Infrastructure:** Kong Gateway (OAuth2, JWT, TLS 1.3), gRPC, OpenTelemetry (OTLP).
*   **AI/ML:** Gemini 2.5 Flash.
*   **Database:** Qdrant (Vector Search) with AES-256 encryption.
*   **Observability:** Langfuse.

## 9. Data Requirements
*   **Vector Storage:** Qdrant handles high-dimensional embeddings of meeting segments.
*   **Multi-tenancy:** Data isolation enforced at the collection level.
*   **Data Flow:** Transcripts flow from the DOM -> Orchestrator -> Security Trunk -> Specialized Agents -> Qdrant/External APIs.

## 10. API Specifications
*   **Internal:** gRPC for high-performance, asynchronous A2A communication.
*   **External:** 
    *   **Gmail API:** For drafting/sending follow-ups.
    *   **Slack API:** For channel-based notifications.
    *   **Google Calendar API:** For event metadata and reminders.
*   **LLM:** Gemini 2.5 Flash API via secured LLM Layer.

## 11. Security Requirements
*   **Authentication:** OAuth2 + JWT via Kong Gateway.
*   **Encryption:** TLS 1.3 for data in transit; AES-256 for data at rest (Qdrant).
*   **GDPR Compliance:** System must enforce explicit consent, data minimization, right to erasure, and automated retention/deletion workflows for transcript data.
*   **Input Validation:** Strict schema validation at the Gateway level to prevent injection attacks.

## 12. Deployment & Infrastructure
*   **Cloud:** Google Cloud Platform (GCP).
*   **Containerization:** Kubernetes (GKE) for horizontal scaling of agents.
*   **CI/CD:** Automated pipelines for agent deployment and Langfuse trace versioning.

## 13. Success Metrics
*   **Accuracy:** Grounded recap accuracy above 95%, measured against provided transcript evidence.
*   **Latency:** Transcription-to-Insight latency < 10 seconds.
*   **Reliability:** 99.9% uptime for the A2A Task Bus.
*   **Compliance:** 100% audit trail for data deletion requests.

## 14. Timeline & Milestones
*   **Phase 1:** Core Transcription & Consent UI (MVP).
*   **Phase 2:** Agent Orchestrator & Security Trunk implementation.
*   **Phase 3:** Historical Memory (Qdrant) & Real-time Insights.
*   **Phase 4:** External Integrations (Slack, Email, Calendar) & Observability Bus.

## 15. Open Questions & Risks
*   **Hallucination Risk:** Mitigated by strict grounding requirements in agent prompts.
*   **API Rate Limits:** Managed via Kong Gateway rate limiting and gRPC backpressure.
*   **DOM Stability:** Google Meet UI changes may require frequent updates to the transcription extraction logic.

---

### Appendix C: Late Join Recap Agent Specification

**Framework:** CRISPE (Capacity, Role, Insight, Statement, Personality, Experiment)

**Prompt Constraint:** "The agent must summarize only from the provided transcript segments. No hallucinations or external knowledge allowed."

**JSON Output Schema:**
```json
{
  "recap_summary": "string",
  "key_decisions": [
    {"decision": "string", "context": "string"}
  ],
  "action_items": [
    {"task": "string", "owner": "string", "deadline": "string"}
  ],
  "open_questions": ["string"],
  "risks": ["string"]
}
```

**Few-Shot Example:**
*Input:* "Transcript: [00:01] Sarah: We decided to move the launch to Friday. [00:02] Bob: I'll handle the server migration by Thursday night."
*Output:* 
```json
{
  "recap_summary": "The team discussed the launch schedule and infrastructure readiness.",
  "key_decisions": [
    {"decision": "Launch moved to Friday", "context": "Agreed upon by Sarah"}
  ],
  "action_items": [
    {"task": "Server migration", "owner": "Bob", "deadline": "Thursday night"}
  ],
  "open_questions": [],
  "risks": ["Tight turnaround for server migration before Friday launch"]
}
```