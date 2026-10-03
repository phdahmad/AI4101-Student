# AI4101 · My Work

A static student page for AI4101 (Umm Al-Qura University). Each student signs in
with their university ID and a private access code and sees only their own marked
work, feedback and scanned sheets.

- No server. Everything is decrypted in the student's browser with Web Crypto.
- One encrypted bundle per student: AES-GCM-256, key from PBKDF2-SHA256
  (600,000 iterations) + HKDF; new salts and IVs on every build.
- Bundle file names are derived from the ID and the code, so neither the ID nor the
  file can be found without both.
- All bundles are padded to the same size.
- Student data is **never** in this repository. The build reads it from a folder
  outside the repo and refuses to output anything that is not encrypted.

## Commands (Node 20+)

| Command | What it does |
|---|---|
| `node tools/tokens.mjs` | Gives an access code to every student who has none |
| `node tools/build.mjs` | Encrypts all bundles into `dist/` and runs the guard |
| `node tools/guard.mjs` | Checks `dist/` again |
| `node tools/reissue.mjs --id <ID>` | New code for one student; re-encrypts only that bundle |
| `node tools/deploy.mjs` | Publishes `dist/` to `gh-pages` as one commit with no history |
| `node --test tests/portal.test.mjs` | Security tests (fake data only) |

Set the data folder in `local.config.json` (copy `local.config.example.json`).

Fonts: Inter, Crimson Pro and JetBrains Mono under the SIL Open Font License (`src/fonts/OFL.txt`).
