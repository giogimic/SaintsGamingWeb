# Saints Trail smoke

Creator demo on **Custom 1** (`DEMO_SANDBOX`). Studio-editable; cloneable into Custom 2.

## Boot

```bash
npx prisma db push
npm run ensure:world-profiles
npm run ensure:starter-heroes
FORCE_TRAIL_SEED=1 npm run seed:saints-trail
FORCE_TRAIL_CLONE=1 npm run clone:saints-trail -- custom_2   # optional
SMOKE_CLONE_SLUG=custom_2 npm run smoke:saints-trail
npm run dev
```

## Play path (Custom 1)

1. Lobby → character create → World **Custom 1** → pick a Trail hero → enter `DEMO_SANDBOX`
2. Empty tracker: talk to **Trail Greeter** (plaza) → accept Q1
3. Plaza Scout + Yard Hand → Supply Clerk (shop) + Trail Nurse (heal)
4. Vance → Open Lab → claim starter (Q4)
5. Spar Tutor battle (Q5)
6. Vance toolbelt → SE gather wood×3 then ore×3 → Report (Q6)
7. Craft film → clear north bramble (Q7–Q8)

## Studio

- `/studio` → Ctrl+E → World **Custom 1**
- **Quests** / **Talk** docks edit Trail content (DB authority)
- **Clone Trail** → namespaced Custom 2 world

## Offline check

`npm run smoke:saints-trail` — sprites, NPCs, dialogues, quests, gather stages.
With `SMOKE_CLONE_SLUG=custom_2` also verifies the clone.
