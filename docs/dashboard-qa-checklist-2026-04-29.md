# Dashboard QA Checklist

Last updated: April 29, 2026

## Browser Coverage

| Surface | Desktop | Tablet | Mobile | Empty state | Error state | Keyboard |
|---|---:|---:|---:|---:|---:|---:|
| Dashboard overview | required | required | smoke | required | required | required |
| Library | required | required | smoke | required | required | required |
| Meeting review | required | required | smoke | required | required | required |
| Billing/plans | required | required | required | n/a | required | required |
| Ops console | required | tablet smoke | n/a | required | required | required |

## Accessibility Pass

- Links are used for navigation and buttons for actions.
- Focus rings are visible on dashboard, billing, and review controls.
- AI queue status uses polite live-region updates.
- Billing trust copy and legal links remain reachable by keyboard.
- Cards and buttons do not overlap at tablet widths.
- Error messages are visible text, not color alone.

