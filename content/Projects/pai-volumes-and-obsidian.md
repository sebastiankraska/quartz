---
title: PAI Volumes and Obsidian Integration
publish: true
tags:
date: 2026-05-04
---

# PAI Volumes and Obsidian Integration

> [!info] AIL 3 — AI-assisted
>
> This document is **AIL 3** on the [AI Influence Level](https://danielmiessler.com/blog/ai-influence-level-ail) scale. The original content, steps, and hard-won fixes came from Sebastian's own notes written while actually setting this up. I – Nova, Sebastian's AI assistant – restructured, corrected mistakes, and wrote the final prose. 

This guide covers two related but distinct things:

1. **Mounting Obsidian vault folders into the PAI container** — so PAI skills can write AI-generated notes directly into your vault, and read your handwritten notes.
2. **Giving Obsidian read access to PAI's own files** — so you can browse PAI's identity, memory, and knowledge files (stored inside the container volume) directly in Obsidian.

For the base container setup, see [[handwritten/quartz/content/Projects/pai-inside-container]].

---

## Part 1 — Mounting Vault Folders into the Container

### The idea

Your Obsidian vault lives on the host. The PAI container has no access to it by default. By adding volume mounts to `docker-compose.yml`, you can expose specific vault subfolders to PAI — either read-write (so PAI can write into them) or read-only (so PAI can read your handwritten notes without being able to modify them).

### Updated `docker-compose.yml`

```yaml
services:
  pai:
    image: pai-image
    container_name: pai
    stdin_open: true
    tty: true
    ports:
      - "31337:31337"
    environment:
      - PAI_PULSE_BIND_ALL=1
    volumes:
      - ~/containers/pai-home:/root:rw
      - ~/Projects/PAI:/root/projects/work:rw
      - ~/Documents/New-Vault/ai-written/:/root/new-vault-ai-written:rw
      - ~/Documents/New-Vault/ai-wiki/:/root/new-vault-ai-wiki:ro
      - ~/Documents/New-Vault/handwritten/:/root/new-vault-handwritten:ro
    restart: "no"
```

### Volume mount reference

| Host path | Container path | Access | Purpose |
|---|---|---|---|
| `~/containers/pai-home` | `/root` | rw | PAI config, memory, credentials |
| `~/Projects/PAI` | `/root/projects/work` | rw | Work projects |
| `~/Documents/New-Vault/ai-written/` | `/root/new-vault-ai-written` | rw | PAI writes notes here; Obsidian reads them |
| `~/Documents/New-Vault/ai-wiki/` | `/root/new-vault-ai-wiki` | ro | PAI reads wiki content; Obsidian owns writes |
| `~/Documents/New-Vault/handwritten/` | `/root/new-vault-handwritten` | ro | PAI reads your handwritten notes |

**Access discipline:** Give PAI write access only to folders it is expected to write into. Handwritten notes and the wiki are read-only — PAI has no business modifying those.

### Applying the changes

After editing `docker-compose.yml`, recreate the container to pick up the new mounts:

```bash
docker compose down
docker compose up -d
docker exec -it pai zsh
```

Your data in `~/containers/pai-home/` is unaffected — it persists in the host volume.

---

## Part 2 — Giving Obsidian Read Access to PAI's Own Files

### The idea

PAI stores files about you in `~/.claude/PAI/` inside the container — your identity, contacts, telos, memory, knowledge archive, and more. These live inside `~/containers/pai-home/.claude/PAI/` on the host, owned by root. Obsidian can't access them directly because they're not inside the vault.

The solution is a symlink: point a location inside your Obsidian vault at the host path of the PAI directory. Obsidian follows symlinks and will index everything under it.

### Create the symlink

On the Omarchy host (not inside the container):

```bash
ln -s ~/containers/pai-home/.claude/PAI ~/Documents/New-Vault/PAI-readonly
```

Then restart Obsidian — it does not pick up new vault entries without a restart.

> [!note] Why Obsidian cannot write to PAI files
>
> The PAI directory is root-owned with group/others having read+execute only. Obsidian will show an error when it tries to write — this is intentional and correct. Read access via the symlink works fine.

---

## Permissions and Backups

### The root ownership problem

Because Docker on Omarchy runs as root, everything PAI writes inside the container is owned by root on the host. This affects two things:

- **Obsidian** — can only read, not write (fine by design for the PAI-files – not so great for the `ai-written` folder which I want to edit – yep, I am still figuring out how to solve this)
- **Borg/Vorta backups** — Borg runs as your user and cannot read root-owned files unless you grant `others` read permission

### Granting read access for Borg

```bash
sudo chmod o+r ~/containers/pai-home -R
sudo chmod o-w ~/containers/pai-home -R   # read only — never grant write
```

Do the same for your backup folder if you keep a separate one:

```bash
sudo chmod o+r ~/containers/backups/pai-home -R
sudo chmod o-w ~/containers/backups/pai-home -R
```

> [!question] Is `o+r` on the PAI folder acceptable long-term?
>
> Omarchy uses full-disk encryption and is a single-user machine, which reduces the practical risk. However, `o+r` grants every process running as any user on the system read access to your entire PAI state — identity, memory, contacts, session history.
>
> A cleaner alternative: `rsync` the PAI folder to a staging directory owned by your user before Borg runs, keeping the source files root-restricted. This would avoid the broad `o+r` grant entirely. Not yet implemented.

### Backing up and restoring PAI files

When you need to copy files between the container volume and the host (for backup, migration, or manual editing):

```bash
# Take ownership temporarily
sudo chown -R $USER ~/containers/pai-home/.claude

# Do your work here

# Return ownership to root
sudo chown -R root ~/containers/pai-home/.claude
```

> [!warning] `sessions/` cannot be copied
>
> The `sessions/` directory inside `.claude/` is `rw-------` — impossible to copy even after `chown`. Back up specific subdirectories you care about: `PAI/USER/`, `MEMORY/`, `PAI/ALGORITHM/`, etc. Skip `sessions/` entirely.

---

## Known Issues

| Issue | Cause | Fix |
|---|---|---|
| Obsidian doesn't show PAI files after symlink | Obsidian needs a restart to detect new vault entries | Restart Obsidian |
| Obsidian shows write error on PAI files | Files are root-owned, others have no write permission | Expected behavior — read access works fine |
| Borg backup fails with permission denied | Root-owned files not readable by others | `sudo chmod o+r ~/containers/pai-home -R` |
| `sessions/` not copyable during backup | Root-owned with `rw-------` | Back up `PAI/USER/` and `MEMORY/` only |

---

## Open Todos

> [!todo] Pending
>
> - Borg: Decide whether `o+r` on PAI folders is acceptable, or implement the `rsync`-to-staging alternative
> - Borg: Consider encrypting the NAS shared folder and/or Borg archive in case the NAS is stolen
> - Syncthing for mobile access — figure out permissions so mobile clients get read-only access
> - Fabric / Skills: Test reading from `/root/new-vault-handwritten` with a real skill (e.g. YouTube summary into `ai-written`)
