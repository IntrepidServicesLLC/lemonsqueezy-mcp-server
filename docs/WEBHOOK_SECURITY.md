# Webhook listener security

The optional `/webhooks` listener requires `LEMONSQUEEZY_WEBHOOK_SECRET` at startup. Configure the same secret on the Lemon Squeezy webhook. The listener refuses to start if the value is missing or blank, including when remote MCP or ngrok is enabled.

Lemon Squeezy sends a hex SHA-256 HMAC in `X-Signature`. The listener checks it against the exact request bytes before processing the event. Missing, malformed, and incorrect signatures receive HTTP 401. A validly signed payload without the required event fields receives HTTP 400. The health endpoint reveals only service status.

Successful deliveries are acknowledged with HTTP 200. Identical request bodies received again within ten minutes are acknowledged without adding a second payment event. The in-memory duplicate set holds at most 1,024 entries per listener process; the oldest entry is evicted at the limit. Restarting the process or using multiple replicas resets or separates this protection. Use a shared durable event store if the host requires exactly-once processing across replicas or restarts.

Do not expose the legacy payment-context resource through a delegated remote MCP session. Remote callers should see only the guarded tools allowed by their grant. Keep the webhook listener behind the host's TLS boundary and configure the host to limit access to its health endpoint as appropriate.
