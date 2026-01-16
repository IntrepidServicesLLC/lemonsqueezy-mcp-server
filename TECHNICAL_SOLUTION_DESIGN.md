# Technical Solution Design (TSD)
## Lemon Squeezy MCP Server

![Project Logo](https://lemonsqueezy.com/brand/lemonsqueezy-logo-black.svg)

---

## 1. Version History / Revision Log

| Version | Date       | Author | Description                                      |
|---------|------------|--------|--------------------------------------------------|
| 1.0.0   | 2026-01-16 | Team   | Initial TSD release based on existing codebase.  |

---

## 2. Table of Contents

3.  [Executive Summary](#3-executive-summary)
4.  [Purpose and Scope](#4-purpose-and-scope)
5.  [Business Requirements](#5-business-requirements)
6.  [Functional Requirements](#6-functional-requirements)
7.  [Non-functional Requirements](#7-non-functional-requirements)
8.  [System Architecture Overview](#8-system-architecture-overview)
9.  [High-level Design](#9-high-level-design)
10. [Detailed Technical Design](#10-detailed-technical-design)
11. [Security / Compliance](#11-security--compliance)
12. [Integration Points](#12-integration-points)
13. [Risk and Mitigation](#13-risk-and-mitigation)
14. [Deployment and Infrastructure](#14-deployment-and-infrastructure)
15. [Appendices](#15-appendices)

---

## 3. Executive Summary

The Lemon Squeezy MCP Server is a Model Context Protocol (MCP) compliant server that bridges the gap between AI assistants (like VS Code, Claude Desktop, or any MCP-compatible client) and the Lemon Squeezy payment platform. It enables AI agents to query sales data, manage subscriptions, and perform customer support tasks autonomously. The project has evolved from a monolithic prototype to a modular, enterprise-ready TypeScript application with built-in resilience, optional integrations (Salesforce, Firebase), and secure configuration management.

---

## 4. Purpose and Scope

**Purpose:** To empower AI assistants with real-time access to business payment and subscription data, facilitating automated customer support, revenue analysis, and CRM synchronization.

**Scope:**
*   **In Scope:**
    *   Integration with Lemon Squeezy API (Orders, Subscriptions, Customers, etc.).
    *   MCP Protocol implementation (Resources, Tools, Prompts).
    *   Optional Salesforce CRM integration (Syncing Leads/Contacts).
    *   Containerized deployment support.
    *   Webhooks for real-time updates.
*   **Out of Scope:**
    *   Frontend UI (Managed by the AI client/IDE).
    *   Direct payment processing (Handled by Lemon Squeezy).
    *   User authentication for the server itself (Assumes local execution or secured transport).

---

## 5. Business Requirements

*   **Operational Efficiency:** Reduce manual context switching by allowing developers/support to query data directly from their workspace.
*   **Data Accessibility:** Provide a semantic interface for AI to "understand" and query payment data.
*   **Flexibility:** Support various deployment environments (Local, Docker, Cloud) without vendor lock-in.
*   **Extensibility:** Allow for future integrations (e.g., other CRMs, analytics platforms) via a plugin-like architecture.

---

## 6. Functional Requirements

*   **Tool Execution:** The system must expose executable tools for Lemon Squeezy operations (e.g., `get_order`, `list_subscriptions`, `refund_payment`).
*   **Context Provisioning:** The system must provide "Resources" (read-only context) such as the current store configuration or recent failed payments.
*   **CRM Sync:** Optionally sync customer and revenue data to Salesforce.
*   **Configuration:** Support configuration via environment variables and AWS Secrets Manager.
*   **Webhooks:** Listen for and process Lemon Squeezy webhooks (e.g., `subscription_payment_failed`) to update internal state or trigger alerts.

---

## 7. Non-functional Requirements

*   **Performance:** Tool execution latency should primarily depend on the upstream API response time.
*   **Reliability:** Implement exponential backoff retry logic for critical API calls.
*   **Security:** API keys and credentials must never be exposed in logs. Support for secret management services (AWS Secrets Manager).
*   **Compatibility:** Must support MCP Protocol version 2024-11-05 or later.
*   **Portability:** OCI-compliant container image support (Docker/Podman).

---

## 8. System Architecture Overview

The system follows a modular architecture centered around the MCP SDK.

**High-Level Components:**
1.  **MCP Server Interface:** Handles JSON-RPC communication with the AI client.
2.  **Tool Handlers:** specialized modules mapping MCP tool calls to business logic.
3.  **Service Layer:**
    *   **Lemon Squeezy Service:** Wrapper around the official SDK.
    *   **CRM Service:** Abstracted interface for Salesforce (and future CRMs).
    *   **Secrets Provider:** Abstracted interface for credential retrieval (Env vs AWS).
4.  **Utilities:** Logging (Pino), Validation (Zod), Retry Logic.

---

## 9. High-level Design

```mermaid
graph TD
    Client[AI Client (VS Code/Claude/etc)] <-->|MCP Protocol via Stdio| Server[MCP Server Index]
    Server -->|Dispatch| Router[Tool Router]
    
    Router -->|Call| Handler1[Orders Handler]
    Router -->|Call| Handler2[Subscriptions Handler]
    Router -->|Call| Handler3[Salesforce Handler]
    
    Handler1 & Handler2 -->|Use| LS_SDK[Lemon Squeezy SDK]
    Handler3 -->|Use| SF_SDK[JSForce SDK]
    
    LS_SDK <-->|REST API| LS_API[Lemon Squeezy API]
    SF_SDK <-->|REST API| SF_API[Salesforce API]
    
    subgraph "Infrastructure / Utils"
        Config[Config Manager]
        Secrets[Secrets Provider]
        Logger[Structured Logger]
    end
    
    Config --> Secrets
    Handler1 & Handler2 & Handler3 --> Logger
```

---

## 10. Detailed Technical Design

### Modules and Interflows

*   **`src/index.ts`**: Entry point. Initializes the MCP server, loads config, and registers capabilities.
*   **`src/tools/`**: Contains tool definitions and handlers.
    *   `definitions.ts`: Zod schemas defining tool inputs.
    *   `handlers/`: Implementation logic for each tool.
*   **`src/utils/secrets/`**:
    *   `provider.ts`: Defines `SecretsProvider` interface.
    *   Implementations: `EnvSecretsProvider` (default) and `AwsSecretsProvider`.
*   **`src/utils/retry.ts`**: Generic retry wrapper with configurable backoff (max attempts, initial delay, multiplier).

### Data Flow
1.  **Request:** AI Client sends `call_tool` request (e.g., `list_orders`).
2.  **Validation:** `zod` schema validates input arguments.
3.  **Execution:** Handler invokes Lemon Squeezy SDK method.
4.  **Resilience:** If API fails (rate limit/5xx), `retry` utility retries based on policy.
5.  **Response:** Result is formatted as MCP `CallToolResult` and returned to client.

---

## 11. Security / Compliance

*   **Credential Management:**
    *   **Development:** `.env` files (git-ignored).
    *   **Production:** AWS Secrets Manager or injected environment variables.
    *   **Masking:** Logs automatically redact sensitive keys.
*   **Least Privilege:**
    *   Container runs as non-root user (`nodejs`, uid 1001).
    *   AWS IAM policies should restrict `secretsmanager:GetSecretValue` to specific ARNs.
*   **Input Validation:** strict typing and runtime validation using `zod` to prevent injection or malformed requests.

---

## 12. Integration Points

| System | Integration Type | Data Exchanged |
|--------|------------------|----------------|
| **Lemon Squeezy** | REST API (SDK) | Orders, Customers, Subscriptions, Products |
| **Salesforce** | REST/SOAP (JSForce) | Leads, Contacts, Revenue Data |
| **AWS Secrets** | AWS SDK | API Keys, Credentials |
| **AI Client** | Stdio (JSON-RPC) | Prompts, Tool Calls, Resources |

---

## 13. Risk and Mitigation

*   **Risk: API Rate Limiting**
    *   *Impact:* Service unavailability for the AI user.
    *   *Mitigation:* Implemented exponential backoff retry logic (`src/utils/retry.ts`) and user-friendly error messages.
*   **Risk: Credential Leakage**
    *   *Impact:* Unauthorized access to payment data.
    *   *Mitigation:* Strict `.gitignore` rules, support for AWS Secrets Manager, and log redaction.
*   **Risk: Breaking API Changes**
    *   *Impact:* Functionality breaks if Lemon Squeezy updates API.
    *   *Mitigation:* Pinned SDK versions (`@lemonsqueezy/lemonsqueezy.js` v4.0.0) and comprehensive integration tests.

---

## 14. Deployment and Infrastructure

### Environment Setup
*   **Development:** Local Node.js environment (v18+).
*   **Production:** OCI Container (Docker/Podman).

### Deployment Procedures
*   **Build:** `npm run build` (Compiles TS to JS in `dist/`).
*   **Containerize:** `podman build -t lemonsqueezy-mcp -f Containerfile .`
*   **Run:** `podman run -e LEMONSQUEEZY_API_KEY=... lemonsqueezy-mcp`

### Infrastructure Requirements
*   **Runtime:** Node.js 18+ or Container Runtime.
*   **Memory:** 256MB minimum recommended.
*   **Network:** Outbound HTTPS access to `api.lemonsqueezy.com` (and optionally `login.salesforce.com`, `secretsmanager.us-east-1.amazonaws.com`).

---

## 15. Appendices

### Glossary
*   **MCP:** Model Context Protocol.
*   **SDK:** Software Development Kit.
*   **OCI:** Open Container Initiative.
*   **TSD:** Technical Solution Design.

### References
*   [Model Context Protocol Spec](https://modelcontextprotocol.io)
*   [Lemon Squeezy API Docs](https://docs.lemonsqueezy.com/api)
