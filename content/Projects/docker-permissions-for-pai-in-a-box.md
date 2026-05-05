---
title: Docker Permissions for AI Assistants - The Clean Fix
publish: true
tags:
date: 2026-05-05
---

> [!info] Written by Nova (AI)
>
> This post was written by Nova, Sebastian's AI assistant, based on a conversation about solving Docker permission issues in a PAI setup. It is **AIL 4** on the [AI Influence Level](https://danielmiessler.com/blog/ai-influence-level-ail) scale — AI-generated from a human question, reviewed and published by Sebastian.

If you run an AI assistant like PAI inside a Docker container, you will eventually run into a frustrating permission problem: every file the AI creates is owned by `root`, and your regular user account can't read them.

This post explains why it happens and walks through four ways to fix it — from the quick-and-dirty to the architecturally clean.

---

## Why This Happens

Docker, by default, runs as root. When a container writes a file to a mounted volume, Linux records the owner as uid 0 — root. On your host machine, that file is inaccessible to your normal user account without `sudo`.

This is not a bug. It's a consequence of how Linux user IDs work: the kernel doesn't know or care that "root inside a container" and "root outside a container" might mean very different things. A uid is a uid.

For a typical web server or database container this rarely matters — you access the service through a port, not by browsing its files directly. But a personal AI assistant is different. It writes notes, memory files, and knowledge archives that you want to open in Obsidian, back up with Borg, or occasionally edit by hand. Inaccessible files break the whole point.

---

## The Setup This Applies To

The examples below use:

- **Omarchy** (Arch-based Linux) as the host
- **Docker running rootful** (the default on most systems)
- A PAI container whose home directory is mounted at `~/containers/pai-home:/root`
- Host user: `se`

The principles apply to any similar setup.

---

## Four Approaches

### 1. `chmod o+r` — The Quick Fix (Not Recommended)

The most obvious solution: grant read access to everyone.

```bash
sudo chmod o+r ~/containers/pai-home -R
```

This works. Obsidian can read the files. Borg can back them up. But `o+r` means *others* — every process running as any user on the system can now read your AI's memory, identity files, contacts, and session history.

On a single-user machine with full-disk encryption, the practical risk is low. But it's architecturally sloppy. You also have to rerun it after every session, because new files won't inherit the permission automatically.

**Use it:** never, if you can avoid it. It's a band-aid, not a fix.

---

### 2. `umask` Alone — Partial Fix

`umask` is a setting that controls the default permissions on newly created files. The default `umask 022` produces files with mode `644` (owner read-write, everyone else read-only). Changing it to `umask 002` produces files with mode `664` — adding group-write permission.

Setting `umask 002` inside the container:

```bash
echo 'umask 002' >> /root/.zshrc
```

This changes the permissions on new files — but it doesn't change the *owner*. The files still belong to `root:root`. Your user `se` is not in the `root` group, so the more permissive group bits do nothing for you.

**umask alone doesn't fix the problem.** It's only useful in combination with the group approach below.

---

### 3. Shared Group + setgid + umask — The Pragmatic Fix

This is the right solution if you want to stay on rootful Docker without changing your setup significantly.

**The idea:** Create a Linux group called `pai` with a fixed GID on both the host and inside the container. Add both `se` and `root` to it. Set the `pai-home` directory to be group-owned by `pai`, with the setgid bit enabled so every new file and directory inherits that group. Set `umask 002` inside the container so new files are group-readable. Now `se` — as a member of `pai` — can read everything PAI creates.

**Step 1 — Create the group and add your user on the host:**

```bash
sudo groupadd -g 1500 pai
sudo usermod -aG pai se
# Log out and back in for the group membership to take effect
```

Pick a GID (1500 here) that isn't already in use on your system. Check with `getent group`.

**Step 2 — Mirror the group inside the container (Dockerfile):**

```dockerfile
RUN groupadd -g 1500 pai && usermod -aG pai root
RUN echo 'umask 002' >> /root/.zshrc
```

The GID must match exactly between host and container. Linux uses the numeric ID, not the name.

**Step 3 — Set group ownership and the setgid bit on the volume:**

```bash
sudo chown -R root:pai ~/containers/pai-home
sudo find ~/containers/pai-home -type d -exec chmod g+s {} \;
sudo chmod -R g+rX ~/containers/pai-home
```

The setgid bit (`g+s`) on a directory means: new files and subdirectories created inside it inherit the directory's group (`pai`), regardless of what group the creating process belongs to. Combined with `umask 002`, every new file PAI writes will be `root:pai` with mode `664` — readable and writable by anyone in the `pai` group.

**Step 4 — Rebuild the image and recreate the container:**

```bash
docker compose down
docker build -t pai-image ~/docker-pai/
docker compose up -d
```

After this, `se` can read, edit, and back up all PAI files without `sudo`. Borg can back them up. Obsidian can read them. No recurring maintenance needed.

> [!warning] The setgid bit only applies to new items
>
> Running the `find ... chmod g+s` command sets the bit on all currently existing directories. New directories created by PAI inside those directories will inherit it. But if PAI creates a deeply nested new directory tree in one operation, intermediate directories might miss it. In practice this is rarely a problem — but it's worth knowing if you see an outlier file with wrong ownership.

---

### 4. Rootless Docker — The Clean Fix

Rootless Docker uses Linux user namespaces to remap user IDs. Inside the container, everything still runs as root — PAI sees `/root`, all paths work exactly as before. But the kernel maps that uid 0 to your actual host user (`se`, uid 1000). Files written by the container appear owned by `se` on the host.

No group management. No chown. No setgid. The problem simply doesn't exist.

**Setup on Arch/Omarchy:**

```bash
sudo pacman -S fuse-overlayfs slirp4netns
dockerd-rootless-setuptool.sh install
systemctl --user enable --now docker
```

After setup, use `docker` as `se` (no `sudo`). Your existing `Dockerfile` and `docker-compose.yml` need no changes.

> [!tip] Port 31337
>
> Rootless Docker can forward ports above 1024 without extra configuration. Port 31337 (Pulse dashboard) works fine.

> [!question] What breaks in rootless mode?
>
> Binding ports below 1024, certain network modes, and a handful of privileged syscalls. None of these affect PAI. If you hit a specific error, it almost always has a documented workaround — it's not fundamental.

---

## Comparison

| Approach | Effort | Ongoing maintenance | Security | Verdict |
|---|---|---|---|---|
| `chmod o+r` | None | Every session | Weak | Avoid |
| `umask` alone | Trivial | None | Doesn't fix it | Not sufficient |
| Shared group + setgid | Low-medium | None after setup | Good | Do this now |
| Rootless Docker | Medium (one-time) | None | Best | Do this eventually |

---

## Recommendation

**Right now:** Go with the shared group approach (Option 3). It's a one-time setup, requires a small Dockerfile change, and solves the problem completely without touching your Docker configuration.

**When you have an hour:** Migrate to rootless Docker (Option 4). It's the architecturally correct solution — the permission problem disappears at the kernel level and you never think about it again.

The `umask`-alone and `chmod o+r` approaches are not real fixes. Don't build on them.
