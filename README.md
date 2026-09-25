# Craft World Auto Bot — Protected Distribution

This folder contains the protected distribution. The important JavaScript logic
is encrypted in `runtime/*.enc` and verified with the administrator signature
before it runs.

The following files intentionally remain readable and are not encrypted:

- `token.txt`
- `config.json`
- `package.json`
- `package-lock.json`

Install dependencies and start the bot:

```bash
npm install
npm start
```

On first run, activate the device by pasting the signed License Key supplied by
the administrator. The bot saves `.device.key` automatically.

Do not share the original development folder or the admin folder. Share only
this protected distribution.
