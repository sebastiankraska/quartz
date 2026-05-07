---
title: Running PAI inside a Docker Container
publish: true
tags:
date: 2026-05-03
---

# Running PAI inside a Docker Container

See also [[pai-volumes-and-obsidian]]

> [!danger] Work in progress
>
> This is an early draft. 

> [!info] AIL 3 — AI-assisted
>
> This document is **AIL 3** on the [AI Influence Level](https://danielmiessler.com/blog/ai-influence-level-ail) scale. The original content, steps, and hard-won fixes came from Sebastian's notes. I –Nova (Sebastan's AI assistant) restructured, corrected mistakes, and wrote the final prose.

A guide for running [Daniel Miessler's PAI v5](https://danielmiessler.com/blog/announcing-pai-5-life-operating-system) in an isolated Docker container with explicit directory mounts — no shared home, full filesystem control.

> [!abstract] What this setup actually gives you — and what it doesn't
> 
> I like sleeping well. I trust in Claude Code. I know that Daniel put a lot of work into making PAI secure. But I also believe that people make mistakes. 
> 
> I locked Claude Code and PAI into a container to control which files it can access – and which it can't. 
> 
> The container creates a real kernel-level boundary — Claude Code cannot touch `~/.ssh`, `~/.gnupg`, or anything outside the mounted volumes I specify in the `docker-compose.yaml`.

---

## Prerequisites

### Subscription

- Claude **Pro** or **Max** plan required. Claude Code is not included in the free plan. Pro works for getting started. Appearantly, PAI has a built-in router that specifys which model is used. 

### What PAI v5 needs at runtime

- `curl`, `bash`, `rsync`, `tar`
- `bun` (toolchain)
- `claude` / Claude Code (runtime)
- `zsh` (installer uses it)
- `git`

---

## Step 1 — Create an Isolated Home Directory

On your Omarchy host:

```bash
mkdir -p ~/containers/pai-home
```

This directory becomes `/root` inside the container. Your real home – in my case  `/home/se/` is never mounted – except the folders you mount explicitly through `docker-compose.yaml`.

---

## Step 2 — Write the Dockerfile

Create a working directory …

```bash
mkdir ~/docker-pai && cd ~/docker-pai
```

… and  a `Dockerfile` inside (capital D, no extension):

```dockerfile
FROM ubuntu:24.04

RUN apt-get update && apt-get install -y curl git unzip gpg sudo rsync zsh

# Claude Code via official signed apt repository
RUN install -d -m 0755 /etc/apt/keyrings && \
    curl -fsSL https://downloads.claude.ai/keys/claude-code.asc \
      -o /etc/apt/keyrings/claude-code.asc && \
    echo "deb [signed-by=/etc/apt/keyrings/claude-code.asc] https://downloads.claude.ai/claude-code/apt/stable stable main" \
      | tee /etc/apt/sources.list.d/claude-code.list && \
    apt update && \
    apt install -y claude-code

# PAI needs Bun. Bun will be installed to /usr/local — survives the /root volume mount
RUN curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash

WORKDIR /root
CMD ["bash"]
```

> [!tip] Why `/usr/local` for Bun?
>
> The default `~/.bun/bin` lives inside `/root`, which gets overridden by the volume mount at runtime. Installing to `/usr/local/bin` puts it on a system path that always exists.

> [!tip] Why the apt repo?
>
> Anthropic's official apt repo ships signed binaries. npm installs the same binary but without package-manager-level signature verification.

---

## Step 3 — Build the Image

```bash
docker build -t pai-image .
```

---

## Step 4 — Run the Container with Docker Compose

Create `~/docker-pai/docker-compose.yml`:

```yaml
services:
  pai:
    image: pai-image
    container_name: pai
    stdin_open: true
    tty: true
    ports:
      - "31337:31337" # we will need this to access the Pulse Dashboard later
    environment:
      - PAI_PULSE_BIND_ALL=1 # also relevant for Pulse 
    volumes:
      - ~/containers/pai-home:/root:rw # translation: the local pai-home dir will be the containers /root directory. The container cannot access "containers" or your home dir – only "pai-home" inside "containers"
    restart: "no"
```

Start the container and access it:

```bash
docker compose up -d
docker exec -it pai zsh
```

The only mandatory volume is `pai-home:/root` — it persists all of PAI's config, memory, and credentials across container restarts and rebuilds. For mounting Obsidian vault folders and giving Obsidian read access to PAI's own files, see [[handwritten/quartz/content/Projects/pai-volumes-and-obsidian]].

> [!danger] Never mount the Docker socket
>
> Do not add `/var/run/docker.sock` to the volumes list. Mounting it gives the container the ability to control the host Docker daemon — exactly the escape path you are trying to prevent.

> [!warning] Rootful Docker on Omarchy
>
> On Omarchy, Docker runs as root rather than rootless. This is fine as long as the socket is not mounted. Files the container writes will be owned by **root** on the host — keep that in mind for backups. I am still figuring out what to do about this …

---

## Step 5 — Install PAI v5

Inside the running container:

```bash
touch ~/.zshrc   # prevent installer zsh error
curl -sSL https://ourpai.ai/install.sh | bash
```

> [!warning] The outer install script may proceed too fast
>
> If it auto-proceeds before you can respond to prompts, run the inner installer directly after the bootstrap places the files:
>
> ```bash
> cd ~/.claude && bash install.sh
> ```

Walk through the 9-step installer wizard. When prompted about existing installations, choose **option 3** (fresh install) on repeated runs.

Skip or defer on Linux:

- **ElevenLabs** — voice synthesis, optional
- **Telegram** — optional notification channel
- **Pulse launchd** — macOS-only, irrelevant on Linux

> [!bug] Known templating bug in v5.0.0
>
> `{{DA_NAME}}` may appear literally in installer output. This is cosmetic — answer the prompts normally, the installer still works.

---

## Step 6 — Authenticate Claude Code

Inside the container, launch Claude Code:

```bash
claude
```

Chose "subscription" for logging in. Claude Code displays a URL. Copy it ("c" works in Alacritty, Omarchy's Terminal), open the URL in Chromium, authorize the app to access Claude, then paste the auth code from the page back into the terminal. 

Credentials are stored in `/root/.claude/` — which lives in your persisted volume at `~/containers/pai-home/.claude/`.

> [!danger] API key vs. subscription billing
>
> If `ANTHROPIC_API_KEY` is set as an environment variable, Claude Code will use API billing instead of your subscription. Unset it before running:
>
> ```bash
> unset ANTHROPIC_API_KEY
> ```

---

## Step 7 — Fix the PAI Tools Error

The bootstrap installer does not include the full repo tools. After installation completes:

```bash
cd ~/.claude
git clone https://github.com/danielmiessler/Personal_AI_Infrastructure.git repo
cp -r repo/Releases/v5.0.0/.claude/PAI/TOOLS/ PAI/Tools/
rm -rf repo
```

> [!note] Case matters
>
> The source path uses `TOOLS` (uppercase); the destination is `Tools` (mixed case). Copy as written above.

---

## Step 8 — Launch PAI

```bash
source ~/.zshrc && pai
```

On first launch, run the interview to personalize your Digital Assistant:

```
/interview
```

This walks through:

- **Phase 1 — TELOS:** Mission, goals, beliefs, wisdom, challenges
- **Phase 2 — IDEAL_STATE:** What does success look like for you?

---

## Step 9 — Restore from Backup (if applicable)

> [!tip] Sorry. I am really unhappy with this section – it confuses me, and I am the author. You know what … skip this step please.

If you are migrating an existing PAI install rather than starting fresh:

```bash
exit   # Claude Code
exit   # container shell
docker stop pai
```

On the Omarchy host, take temporary ownership, copy your backup into the volume, then return ownership to root:


```bash
sudo chown -R $USER ~/containers/pai-home/.claude
# copy your backup here (merge and overwrite)
sudo chown -R root:root ~/containers/pai-home/.claude
```

Resume:

```bash
docker compose up -d
docker exec -it pai zsh
pai
```

---

## Step 10 — Start the Pulse Dashboard (Optional)

Pulse provides a life dashboard at `http://localhost:31337`. The menu bar and voice daemon are macOS-only, but the web UI works on Linux.

Inside the container:

```bash
# Fix a known symlink bug in the PAI repo
# rm -rf ~/.claude/PAI/PULSE/Observability/.cursor
# Not sure if this is actually necessary so

# Fix PATH for bash subprocesses spawned by Bun
echo 'export PATH=/usr/bin:$PATH' >> ~/.zshrc # Do this ONLY ONCE!


source ~/.zshrc
# Start Pulse in the background
cd ~/.claude/PAI/PULSE && bun pulse.ts &
```

Then open `http://localhost:31337` in your Omarchy browser.

> [!question] Are these commands safe to run more than once?
>
> - `rm -rf .../.cursor` — safe to repeat, it's a cleanup of a stale directory.
> - `echo 'export PATH=...' >> ~/.zshrc` — **not idempotent**: running it twice adds the export twice. Check `~/.zshrc` first if you have already done this.
> - `source ~/.zshrc` — safe to repeat; `docker exec -it pai zsh` already sources it on login.

> [!todo] Pulse autostart
>
> There is currently no mechanism to start Pulse automatically when the container starts. Manual `bun pulse.ts &` is required each session. A Docker entrypoint script could automate this.

---

## Restricting Claude Code Further

On top of Docker's filesystem isolation, Claude Code has its own permission layer. Lock it down in `~/containers/pai-home/.claude/settings.json`:

```json
{
  "permissions": {
    "allow": [
      "Read(~/projects/**)",
      "Write(~/projects/**)"
    ],
    "deny": [
      "Read(~/.ssh/**)",
      "Read(~/.gnupg/**)",
      "Bash(curl *)",
      "Bash(wget *)"
    ]
  }
}
```

> [!question] How restrictive should this be?
>
> The deny list above is a starting point. Whether to restrict `curl` and `wget` depends on which PAI skills you use — some skills fetch external content by design. Review which skills you actually run before locking this down.

---

## Day-to-Day Usage

### Resuming the container

In the docker-compose folder:

```bash
docker compose up -d
docker exec -it pai zsh
```
Inside the Container start PAI:

```
pai
```

To resume the Pulse Dashboard, open a second Terminal (does not matter in which folder) and access the container:

```
docker exec -it pai zsh
```

Inside the Container import zsh profile and start Pulse:

```
source ~/.zshrc
cd ~/.claude/PAI/PULSE && bun pulse.ts &
```

Pulse is accessible via Chromium browser, for example http://localhost:31337/telos or http://localhost:31337/life

> [!question] `/telos` shows default data for me – `/life` shows actual results from my onboarding interview. Not sure if /telos is hardcoded as of yet, or I broke something. 


### Updating Claude Code

> [!danger] UNTESTED!

> [!danger] Do not re-run the PAI install script to update Claude Code
>
> The `ourpai.ai` install script reinstalls PAI from scratch and **will overwrite your entire `~/.claude/` directory** including memory, USER content, and session state.
>
> Correct upgrade sequence:
>
> 1. Back up `~/containers/pai-home/.claude/` on the Omarchy host first.
> 2. Inside the container: `sudo apt update && sudo apt upgrade claude-code`
> 3. Verify PAI still works before discarding the backup.

### Updating PAI content only

> [!danger] UNTESTED!

```bash
# Inside the container — does not touch USER/ or memory
cd ~/.claude
git clone https://github.com/danielmiessler/Personal_AI_Infrastructure.git repo
cp -r repo/Releases/v5.0.0/.claude/PAI/Tools/* PAI/Tools/
rm -rf repo
```

### Backing up and restoring

```bash
# Take ownership temporarily on the Omarchy host
sudo chown -R $USER ~/containers/pai-home/.claude

# Do your backup or restore here# Return ownership to root for Docker
sudo chown -R root ~/containers/pai-home/.claude
```

> [!warning] `sessions/` directory
>
> The `sessions/` directory is root-owned with `rw-------` permissions — impossible to copy as a regular user even after `chown`. Back up the subdirectories you care about (`PAI/USER/`, `MEMORY/`) rather than the whole `.claude/` tree.

### Rebuilding the container

Your PAI state lives in `~/containers/pai-home/` and survives container rebuilds.

```bash
docker compose down
docker build -t pai-image ~/docker-pai/
docker compose up -d
docker exec -it pai zsh
```

---

## Known Issues

| Issue | Cause | Fix |
|---|---|---|
| `bash: command not found` in Pulse | Bun spawns subprocesses without full PATH | `echo 'export PATH=/usr/bin:$PATH' >> ~/.zshrc` (once) |
| `ELOOP: too many symbolic links` | Bug in PAI repo under `.cursor/rules/` | `rm -rf ~/.claude/PAI/PULSE/Observability/.cursor` |
| `{{DA_NAME}}` in installer output | Templating bug in v5.0.0, cosmetic | Answer prompts normally |
| `Module not found pai.ts` | PAI Tools directory incomplete | Follow Step 7 above |
| `zsh: not found` | Installer requires zsh | Already included in Dockerfile above |
| Pulse not reachable from host | Port not exposed | Defined in `docker-compose.yml` as `31337:31337` |
| PAI config wiped after update | Install script overwrites `~/.claude/` | Never re-run install script — use `apt upgrade claude-code` only |
| Permission denied on `.claude/` from host | Files owned by root | `sudo chown -R $USER ...`, do work, chown back |
| `sessions/` not copyable | Root-owned, restrictive permissions | Back up specific subdirectories only |

---

## Key Paths

| Purpose | Path |
|---|---|
| Docker project | `~/docker-pai/` |
| Compose file | `~/docker-pai/docker-compose.yml` |
| PAI config and state | `~/containers/pai-home/.claude/` |
| Claude Code credentials | `~/containers/pai-home/.claude.json` |
| PAI user content | `~/containers/pai-home/.claude/PAI/USER/` |
| Pulse dashboard | `http://localhost:31337` |
| PAI docs | `github.com/danielmiessler/Personal_AI_Infrastructure` |

---

## Open Todos

> [!todo] Pending
>
> - PAI statusline broken — not showing subscription status, showing stale weather data
> - Claude Code: Establish and test the `apt upgrade claude-code` path end-to-end (Watch out! This seems to overwrite PAI files – create a backup before upgrading)
> - Consider running Docker in rootless mode and/or run Claude Code inside the container as non-root user
> - Pulse autostart on container launch
> - Telegram Bot for PAI notifications
> - Syncthing for mobile access — handle permissions so mobile clients cannot write
> - PAI on NAS: Test feasibility (kernel version may be relevant)
> - Image generation: Evaluate fal.ai; figure out how to embed images in Markdown/Obsidian
