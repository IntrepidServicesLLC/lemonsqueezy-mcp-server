# Containers: Containerfile vs Dockerfile

This repo includes **two** container build files with the same content:

| File           | Purpose |
|----------------|---------|
| **Containerfile** | Canonical build file. Use this with Podman (or any OCI builder): `podman build -f Containerfile -t lemonsqueezy-mcp .` |
| **Dockerfile**     | Duplicate for **discovery**. Many registries (e.g. [Smithery](https://smithery.ai)) and CI systems look for the filename `Dockerfile` by convention. Content is identical. |

## Why both?

- **Containerfile** is the project’s main build file and works with Podman, Buildah, and other OCI tools without requiring Docker.
- **Dockerfile** exists so automated systems that only scan for `Dockerfile` can find and build the image. No Docker-specific instructions are used; both files use standard Dockerfile/OCI syntax.

## Building

Use either file; the image is the same.

```bash
# With Podman (recommended)
podman build -f Containerfile -t lemonsqueezy-mcp .

# With Docker
docker build -t lemonsqueezy-mcp .

# With Podman using Dockerfile (e.g. in CI)
podman build -f Dockerfile -t lemonsqueezy-mcp .
```

When updating the build, **edit one file and copy the changes to the other** so they stay in sync. The only intentional difference is the comment block at the top of each file.
