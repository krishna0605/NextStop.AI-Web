# Approved Browser Storage Inventory

Last updated: April 29, 2026

The repo contract blocks suspicious `localStorage` and `sessionStorage` keys that look like credentials. Only non-sensitive browser state may be stored client-side.

| Classification | Allowed examples | Rules |
|---|---|---|
| UI preference | theme, sidebar state, view mode | no tokens, no user secrets |
| Capture workflow state | draft capture flags, local UI progress | must not contain transcript body or audio |
| Non-sensitive cache | public plan display, feature toggles | must be refreshable from server |
| Temporary workflow hint | last selected tab, dismissed notice | must not unlock access |

Forbidden key patterns include `token`, `jwt`, `secret`, `refresh`, `session`, `auth`, `credential`, and provider names combined with sensitive data.

