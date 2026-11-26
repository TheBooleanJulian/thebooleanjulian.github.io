# AGENTS.md — thebooleanjulian.github.io

Repository-level overrides of the global `AGENTS.md`. Everything not listed here follows the global file.

## Design: XP look is intentional (overrides Julian Unified UI)

This site (thebooleanjulian.dev, "JulianOS" / "Migusoft Aperture XD") deliberately uses a Windows XP-style look:
XP.css window chrome, the Bliss-style wallpaper, Tahoma / MS Sans Serif-style type and the XP blue/silver palette.
Do not restyle it to Julian Unified UI tokens or fonts, and do not swap XP.css for another framework.

- Keep the parody branding (Migusoft, Aperture XD). Do not reintroduce Microsoft or Windows names or logos.
- `assets/xp.css` is vendored XP.css v0.2.6. Its three `@font-face` rules were removed because the font files were
  never shipped. If you want the pixel fonts back, commit the font files after checking their licence, then restore the rules.

## Hosting

GitHub Pages from `main`, custom domain in `CNAME`, proxied by Cloudflare. It was never on Zeabur, so it is not part of
the Zeabur migration. Moving it to Workers would be a deployment change and needs approval.

## Branches

`feature/*` → `dev` → PR → `main` (Pages publishes `main`).
