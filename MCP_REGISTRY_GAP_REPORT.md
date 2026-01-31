# MCP Registry Publishing — Gap Report

**Project:** Lemon Squeezy TypeScript MCP Server  
**Date:** 2025-01-30  
**Purpose:** Compare current repo state vs requirements for the Official MCP Registry, Smithery, Glama, and “premium” positioning.

---

## Executive Summary

| Area | Status | Action |
|------|--------|--------|
| **Official Registry** | Gaps | Add `server.json`; decide NPM name/namespace; run publisher workflow |
| **Smithery** | Gaps | Add `Dockerfile` (or alias); optionally add `smithery.yaml`; add badge to README |
| **Glama** | Ready | Public repo + valid license; submit URL when ready |
| **Premium / Polish** | Partial | Add one-copy-paste config block and Smithery badge; align namespace if targeting IntrepidServicesLLC |

---

## 1. Official MCP Registry (`github.com/modelcontextprotocol/registry`)

### 1.1 Prerequisites

| Requirement | Current State | Gap? |
|-------------|---------------|------|
| **`server.json` in project root** | **Missing.** No `server.json` present. | **Yes** — Required. Generate via `mcp-publisher init` in project root. |
| **Package on NPM or public GitHub repo** | `package.json` exists with `"name": "lemonsqueezy-mcp-server"`. No `@scope` (e.g. no `@intrepidservices/...`). Unclear if published to NPM. README clone URL is `github.com/IntrepidServicesLLC/lemonsqueezy-mcp-server`. | **Partial** — If targeting “verified namespace” (e.g. `io.github.intrepidservicesllc.lemonsqueezy-mcp-server`), you need to align GitHub org/user and NPM scope (e.g. `@intrepidservices/lemonsqueezy-mcp-server`) and ensure the name in `server.json` matches. |

### 1.2 Publisher Workflow (not repo files, but required for publishing)

- Install: `brew install mcp-publisher` (or binary from repo releases).
- Init: `mcp-publisher init` → generates/validates `server.json`.
- Login: `mcp-publisher login github`.
- Publish: `mcp-publisher publish`.

**Tip from brief:** Use a verified name format in `server.json`, e.g. `io.github.intrepidservicesllc.lemonsqueezy-mcp-server`, to match GitHub org and improve “premium” perception.

---

## 2. Smithery (`smithery.ai`)

### 2.1 Requirements

| Requirement | Current State | Gap? |
|-------------|---------------|------|
| **Valid Dockerfile in repo** | Repo has a **Containerfile** (multi-stage Node 20 Alpine, `npm run build`, `CMD ["node", "dist/index.js"]`). No file named **Dockerfile**. | **Yes** — Smithery typically looks for **Dockerfile**. Add a `Dockerfile` (e.g. copy of Containerfile or symlink) so one-click install works. |
| **Build and entry point** | Containerfile already runs `npm run build` and uses `CMD ["node", "dist/index.js"]`. | **No** — Content is correct. |
| **`smithery.yaml`** (optional) | Not present. | **Optional** — Add to define hardware/config schema if you want explicit control. |

### 2.2 Recommended follow-up

- Add **Dockerfile** (same content as Containerfile or `FROM`-reference it) so Smithery’s automation detects it.
- Optionally add **smithery.yaml** for requirements/config.
- Add the **Smithery badge** to README (see “Premium” section below).

---

## 3. Glama (`glama.ai`)

| Requirement | Current State | Gap? |
|-------------|---------------|------|
| GitHub URL | Repo exists (README points to `IntrepidServicesLLC/lemonsqueezy-mcp-server`). | **No** — Submit the actual repo URL when publishing. |
| Valid license | **MIT** in `LICENSE`. | **No** — Satisfies “valid license.” |
| Open repo | Repo is public. | **No** — Satisfies “open repo.” |

**Conclusion:** No repo changes required for Glama. Use “Publish my MCP server” and submit your GitHub URL; they run automated checks and possibly manual review.

---

## 4. Premium Value & Polish

### 4.1 One-copy-paste setup (README)

| Requirement | Current State | Gap? |
|-------------|---------------|------|
| **Pre-written config block for `claude_desktop_config.json`** | README has generic instructions (command `node`, args with absolute path, env). It does **not** include the suggested one-copy-paste block using **npx** and a scoped package. | **Yes** — Add a clear, copy-paste block. Example from brief: |

```json
"mcpServers": {
  "lemonsqueezy": {
    "command": "npx",
    "args": ["-y", "@intrepidservices/lemonsqueezy-mcp-server"],
    "env": {
      "LEMONSQUEEZY_API_KEY": "YOUR_KEY_HERE"
    }
  }
}
```

**Note:** If you keep the unscoped name `lemonsqueezy-mcp-server`, the block would use `lemonsqueezy-mcp-server` in args instead of `@intrepidservices/lemonsqueezy-mcp-server`. Align with your final NPM package name.

### 4.2 Type-safe schemas (Zod)

| Requirement | Current State | Gap? |
|-------------|---------------|------|
| Use **Zod** for tool input schemas | **Zod is used:** `src/utils/validation.ts` defines Zod schemas for all tools and `validateToolArgs()` uses `schema.parse(args)`. Tool definitions in `definitions.ts` are JSON Schema (correct for MCP protocol). Runtime validation is Zod-backed. | **No** — Meets “TypeScript + Zod” expectation for premium clients. |

### 4.3 Error handling

| Requirement | Current State | Gap? |
|-------------|---------------|------|
| Don’t crash on API errors; return errors as content | Handlers throw on API errors (e.g. Lemon Squeezy 401); `handleToolCall` wraps in try/catch and returns `createErrorResponse(error)` with `content: [{ type: "text", text: "Error: ..." }]`. Process stays up. | **No** — Meets “professional” error handling. |

### 4.4 Smithery badge

| Requirement | Current State | Gap? |
|-------------|---------------|------|
| “Install on Smithery” badge in README | Not present. | **Yes** — Add after publishing to Smithery. Example: |

```markdown
[![Smithery Badge](https://smithery.ai/badge/lemonsqueezy-mcp-server)](https://smithery.ai/server/lemonsqueezy-mcp-server)
```

Replace `lemonsqueezy-mcp-server` with your Smithery server slug if different.

### 4.5 Namespace / authority

| Requirement | Current State | Gap? |
|-------------|---------------|------|
| Verified/corporate namespace (e.g. `io.github.IntrepidServicesLLC` or `com.intrepidservices.lemonsqueezy`) | Package name is **`lemonsqueezy-mcp-server`** (no scope). README clone URL is **IntrepidServicesLLC**. | **No** — Namespace and clone URLs now use IntrepidServicesLLC. |

---

## 5. Checklist: What to Add or Change

### Must-have for registries

1. **`server.json`**  
   - A template `server.json` is included; it matches `package.json` and `mcpName`. Before first publish, run `mcp-publisher init` in project root to validate or regenerate, then commit.  
   - Set `name` to your chosen verified namespace if applicable (e.g. `io.github.intrepidservicesllc.lemonsqueezy-mcp-server`).

2. **`Dockerfile`**  
   - Add a **Dockerfile** in the repo (same content as Containerfile or equivalent) so Smithery can detect and build it.

3. **README: one-copy-paste config**  
   - Add a single, ready-to-paste `mcpServers` block for `claude_desktop_config.json` (npx + your final NPM package name and env vars).

### Recommended for premium / discoverability

4. **README: Smithery badge**  
   - Add the Smithery badge and link once the server is published on Smithery.

5. **`smithery.yaml`** (optional)  
   - Add if you want to specify hardware or config schema on Smithery.

6. **Namespace and NPM**  
   - If targeting IntrepidServicesLLC: publish under an NPM scope (e.g. `@intrepidservices/lemonsqueezy-mcp-server`), point README and `server.json` to the same org/namespace, and use that in the one-copy-paste block.

### No code/structural changes needed

- **Zod:** Already used for tool input validation.  
- **Error handling:** Already returns errors as content and keeps the process alive.  
- **Glama:** Ready to submit URL once the above are done (optional but good for discoverability).  
- **License:** MIT is valid for all three registries.

---

## 6. Summary Table

| Item | Needed | Have | Action |
|------|--------|------|--------|
| server.json | ✓ | ✗ | Run `mcp-publisher init`; set name/namespace; commit |
| NPM package / scope | ✓ (for npx one-liner) | Unscoped name only | Publish to NPM; optionally use @intrepidservices scope |
| Dockerfile | ✓ (Smithery) | ✗ (have Containerfile) | Add Dockerfile (copy or alias of Containerfile) |
| smithery.yaml | Optional | ✗ | Add if you want explicit Smithery config |
| README: copy-paste mcpServers block | ✓ | ✗ | Add npx block with final package name and env |
| README: Smithery badge | ✓ (premium) | ✗ | Add after Smithery publish |
| Zod for tool inputs | ✓ | ✓ | None |
| Error handling (no crash, return content) | ✓ | ✓ | None |
| Verified namespace (e.g. IntrepidServicesLLC) | Optional | ✗ | Align server.json, NPM, and GitHub org if desired |
| Valid license / public repo (Glama) | ✓ | ✓ | None |

This report reflects the current repo state. After you add `server.json`, `Dockerfile`, and the README config block (and optionally namespace + Smithery badge), you’ll be aligned with the three main registries and the “premium” checklist you were given.
