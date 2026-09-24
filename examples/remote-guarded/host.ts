import { createServer } from "node:http";
import { createRemoteGuardedRequestHandler } from "../../dist/connector/remote-http.js";
import type { RemoteGrantAuthority } from "../../dist/connector/remote-grants.js";
import { createExampleAuthority } from "./authority.js";

/** Integrator hook: provide an external verifier, grant store, and key resolver. */
export function createRemoteHost(options: {
  authority: RemoteGrantAuthority;
  environment: "test" | "live";
  apiFetch?: typeof fetch;
}) {
  const handler = createRemoteGuardedRequestHandler(options);
  return createServer((req, res) => { void handler(req, res); });
}

/** Bind this test-mode fixture to loopback. Put a real host behind TLS. */
export function createExampleHost(options: {
  bearerToken: string;
  merchantKey: string;
  storeId: number;
  customerId: number;
  apiFetch?: typeof fetch;
}) {
  const fixture = createExampleAuthority(options);
  const server = createRemoteHost({
    authority: fixture.authority,
    environment: "test",
    apiFetch: options.apiFetch,
  });
  return { server, revoke: fixture.revoke, rotateCredential: fixture.rotateCredential };
}
