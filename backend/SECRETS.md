# Groq and API keys (keep them secret)

## What “encrypted” means here

- **In git:** Your Groq key must **never** appear in the repository. Plaintext keys in tracked files are not acceptable; use ignore rules and optional tooling below.
- **On the host (e.g. Render):** Set `GROQ_API_KEY` in the dashboard **Environment** / **Secrets** UI. The platform stores those values **encrypted at rest** in its secret store—you do not put the raw key in `render.yaml` or in code.
- **On your laptop:** Keep the key only in a **local** `backend/.env` (see `.gitignore`) or in your OS keychain / password manager.

## Do this

1. **Never commit** `backend/.env` or any file containing `GROQ_API_KEY=...`.
2. **Production:** Add `GROQ_API_KEY` only in Render (or another host) as a **secret** environment variable—not in the repo.
3. **Rotate** the key in [Groq Console](https://console.groq.com) if it was ever pasted into chat, a ticket, or a committed file.

## Optional: encrypted file you *can* commit (SOPS + age)

If you need a **team-shared encrypted** secret file in git (not required for Render-only workflows):

1. Install [SOPS](https://github.com/getsops/sops) and [age](https://github.com/FiloSottile/age).
2. Generate an age keypair; keep the **private** key off-repo (e.g. `~/.config/sops/age/keys.txt`).
3. Add a `creation_rules` entry (see SOPS docs) with your **public** age recipient.
4. Edit an encrypted YAML/ENV with `sops path/to/secrets.yaml` and commit **only** the encrypted file.

Decrypt locally when needed, or inject via CI using the private key stored in the CI secret store—**not** in the repo.

## Optional: pre-commit check

From repo root:

```bash
chmod +x backend/scripts/check-no-secrets.sh
./backend/scripts/check-no-secrets.sh
```

Wire it as a git hook if you want every commit scanned:

```bash
printf '%s\n' '#!/bin/sh' 'exec ./backend/scripts/check-no-secrets.sh' > .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```
