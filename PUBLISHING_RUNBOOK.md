# Publishing Runbook — Lemon Squeezy MCP Server

**Purpose:** One place for lessons learned and step-by-step publishing so we don’t hit the same issues again.

---

## Lessons Learned

### npm

- **2FA required:** npm requires **two-factor authentication** (or a granular access token with “bypass 2FA” for publish) to publish packages. Enable 2FA at [npmjs.com → Account → Two-Factor Authentication](https://www.npmjs.com/settings/~/account).
- **Re-auth for future publishes:** Once registered, you only need to log in again when your token expires: `npm login` (or use an automation token).
- **Package name:** Unscoped name `lemonsqueezy-mcp-server` must be unique on npm. If taken, use a scoped name (e.g. `@your-username/lemonsqueezy-mcp-server`) and keep `server.json` and `package.json` `mcpName` in sync.
- **npm warnings:** If npm “auto-corrects” things (e.g. `repository.url`, bin script name), run `npm pkg fix` and commit so future publishes are clean.

### MCP Registry (mcp-publisher)

- **Install once:** `brew install mcp-publisher`. Not installed by default.
- **Description length:** `server.json` **description must be ≤ 100 characters**. Longer text causes `422 Unprocessable Entity`.
- **Order of operations:** The registry **validates that the npm package exists**. Publish to **npm first**, then run `mcp-publisher publish`. If you publish to the MCP registry before npm, you get `400 NPM package '...' not found (404)`.
- **server.json exists:** `mcp-publisher init` refuses to run if `server.json` already exists. Use our template as-is, or temporarily move it and run `init` to regenerate, then merge.

### Browsing npm

- **Human-facing site:** Use **https://www.npmjs.com** to search and view packages (e.g. [lemonsqueezy-mcp-server](https://www.npmjs.com/package/lemonsqueezy-mcp-server)).
- **API only:** **https://registry.npmjs.org** is the raw API; opening it in a browser often shows `{}`. It’s for tools, not browsing.

---

## Publishing Order (First Time vs Future)

### First-time full publish

1. **npm**
   - Enable 2FA on npmjs.com if not already.
   - `npm login` (once).
   - `npm run build` then `npm publish --access public`.
2. **MCP Registry**
   - `brew install mcp-publisher` (once).
   - `mcp-publisher login github` (once, or when token expires).
   - Ensure `server.json` description ≤ 100 chars.
   - `mcp-publisher publish`.
3. **Smithery** (optional)
   - Go to [smithery.ai/new](https://smithery.ai/new), sign in with GitHub, select this repo (needs `Dockerfile` in repo).
4. **Glama** (optional)
   - Go to [glama.ai/mcp/servers](https://glama.ai/mcp/servers), “Publish my MCP server”, submit GitHub repo URL.

### Future publishes (new version)

1. Bump `version` in **package.json** and **server.json** (keep them equal).
2. **npm:** `npm run build` → `npm publish --access public`.
3. **MCP Registry:** `mcp-publisher publish` (no need to re-login unless expired).
4. Smithery/Glama usually pick up new versions from the same repo; no extra steps unless their UI says otherwise.

---

## What’s Next (After npm Publish)

You’ve published to npm. Recommended order:

| Step | Action | Notes |
|------|--------|--------|
| 1 | **MCP Registry** | Run `mcp-publisher publish` in this repo. Package exists on npm now, so it should succeed. |
| 2 | **Smithery** | [smithery.ai/new](https://smithery.ai/new) → connect GitHub → select this repo. We have a `Dockerfile` in the repo. After it’s live, add the Smithery badge to README. |
| 3 | **Glama** | [glama.ai/mcp/servers](https://glama.ai/mcp/servers) → “Publish my MCP server” → paste GitHub URL. |
| 4 | **README badge** | Add Smithery “Install” badge once the server is listed (replace slug if different): `[![Smithery](https://smithery.ai/badge/lemonsqueezy-mcp-server)](https://smithery.ai/server/lemonsqueezy-mcp-server)` |

---

## Quick reference

- **npm package:** https://www.npmjs.com/package/lemonsqueezy-mcp-server  
- **MCP registry name:** `io.github.IntrepidServicesLLC/lemonsqueezy-mcp-server`  
- **One-time:** 2FA on npm, `brew install mcp-publisher`, `mcp-publisher login github`  
- **Per release:** Bump version in package.json + server.json → `npm publish` → `mcp-publisher publish`
