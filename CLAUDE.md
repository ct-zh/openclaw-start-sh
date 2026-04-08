# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an **OpenClaw workspace repository** that contains:
- **SKILLS/**: Reusable skill modules for OpenClaw (currently `web-hosting`)
- **conversations/**: Workspace persona configuration and memory files
- **sync-prompts.sh**: Automated synchronization script for workspace prompts

The repository is automatically synced every 3 hours via cron to preserve workspace state.

## Development Commands

### Web Hosting Skill

Located at `SKILLS/web-hosting/`

```bash
# Initialize the web hosting environment (Docker setup)
cd SKILLS/web-hosting
./scripts/init.sh

# Create a static HTML page
./scripts/create-page.sh static "<h1>Hello World</h1>" hello

# Create a dynamic Flask route
./scripts/create-page.sh dynamic 'return jsonify({"msg": "hello"})' myapi

# Create a file upload page
./scripts/create-page.sh upload "上传您的文件" upload

# Clean expired pages (run by cron hourly)
./scripts/cleanup.sh

# Get public IP address
./scripts/get-public-ip.sh
```

### Docker Management

```bash
# Start services
cd SKILLS/web-hosting/docker
docker compose up -d

# Rebuild and restart
docker compose up -d --build

# Stop services
docker compose down

# View logs
docker compose logs -f
```

### Sync Script

```bash
# Manual sync (runs every 3 hours via cron)
./sync-prompts.sh
```

## Architecture

### Web Hosting Skill

A Docker-based web hosting service providing secure, temporary web pages:

**Components:**
- **Nginx** (port 8888): Serves static files, proxies API requests
- **Flask** (port 5000): Handles dynamic routes and file uploads
- **Security**: Token + timestamp validation (1-hour expiration)
- **Auto-cleanup**: Cron job removes expired pages and old uploads

**Directory Structure:**
```
SKILLS/web-hosting/
├── docker/
│   ├── docker-compose.yml    # Service orchestration
│   ├── nginx/nginx.conf      # Static file serving + API proxy
│   └── python/
│       ├── Dockerfile        # Flask app container
│       ├── app.py           # Dynamic routes, upload handling, validation
│       └── requirements.txt
├── scripts/
│   ├── init.sh              # Environment setup
│   ├── create-page.sh       # Page creation (static/dynamic/upload)
│   ├── cleanup.sh           # Expired page cleanup
│   └── get-public-ip.sh
├── webroot/                  # Runtime data (created during init)
│   ├── static/              # Static HTML pages
│   ├── dynamic/routes/      # Dynamic Flask routes
│   ├── uploads/             # User-uploaded files
│   └── tokens.json          # Token validation store
└── templates/               # HTML templates
```

**Security Model:**
- Each page generates a unique token via `openssl rand -hex 16`
- URLs include `?token=xxx&ts=xxx` parameters
- Tokens expire after 1 hour (configurable)
- File uploads limited to 10MB, allowed extensions filtered

### Conversation Workspace

Located at `conversations/2026-03-10-feishu-caoting/`

This is an OpenClaw persona configuration with memory persistence:

**Key Files:**
- `IDENTITY.md`: Agent identity (name, creature, vibe, emoji)
- `SOUL.md`: Core behavior guidelines
- `AGENTS.md`: Workspace rules, OpenClaw operation restrictions
- `USER.md`: User information (曹庭, software engineer, GMT+8)
- `TOOLS.md`: Local environment notes (camera names, SSH hosts, etc.)
- `HEARTBEAT.md`: Periodic task checklist (currently empty)
- `MEMORY.md`: Long-term curated memory (main session only)
- `memory/YYYY-MM-DD.md`: Daily raw logs

**Important Restriction from AGENTS.md:**
The agent is **prohibited** from:
- Modifying OpenClaw config files (`~/.openclaw/openclaw.json`, `/opt/openclaw/`)
- Running `openclaw` CLI commands (gateway restart, configure, plugins, etc.)
- Modifying system files in `/opt/openclaw/`

Allowed to edit workspace files freely (`SOUL.md`, `USER.md`, `AGENTS.md`, `TOOLS.md`, `IDENTITY.md`, `HEARTBEAT.md`, `memory/*.md`).

### Sync System

**sync-prompts.sh** runs every 3 hours (cron) to:
1. Copy workspace prompt files from `~/.openclaw/workspace/` to `conversations/2026-03-10-feishu-caoting/`
2. Copy `memory/*.md` files
3. Git commit if changes detected
4. Push to origin (main or master branch)

**Synced Files:**
- `AGENTS.md`, `BOOTSTRAP.md`, `HEARTBEAT.md`, `IDENTITY.md`, `MEMORY.md`, `SOUL.md`, `TOOLS.md`, `USER.md`
- `memory/*.md` files

## Configuration

**Environment Variables:**
- `WEB_PORT`: Web service port (default: 8888)
- `TOKENS_FILE`: Path to tokens.json (default: /app/webroot/tokens.json)

**Key Paths:**
- Web root: `SKILLS/web-hosting/webroot/`
- Upload directory: `webroot/uploads/<upload_id>/`
- Token store: `webroot/tokens.json`

## Deployment Notes

**deploy_question.md** contains troubleshooting for OpenClaw gateway pairing issues (token mismatch, environment variable priority, device pairing loop).

The web hosting skill requires:
- Docker and Docker Compose installed
- Firewall open on port 8888
- Cron access for cleanup tasks
