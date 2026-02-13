# EcoMario — Product Requirements Document

## Background & Context

### The Problem

People accumulate objects they no longer use but feel reluctant to discard. Trip souvenirs forgotten on shelves, old electronics kept because "they might be worth something," gifts from loved ones that carry emotional weight. Over time, these sentimental items become clutter — collecting dust, consuming space, and creating a low-grade stress that grows with every shelf, drawer, and closet they fill.

Two specific barriers prevent people from recycling these items:

1. **No information about their worth.** People don't know the environmental value of recycling a specific item. Without a tangible sense of impact, the rational case for recycling never gets made.

2. **Sentiment blocks action.** Even when people know they should recycle, the emotional attachment to objects — memories of trips, gifts from family, remnants of past identities — makes discarding feel like discarding the memory itself.

### Why It Matters Now

- The average household contains **300,000 items** (UCLA Center on Everyday Lives). Clutter is at an all-time high.
- Sustainability awareness is rising, but **intention doesn't translate to action** — people know they should recycle but don't follow through on sentimental items.
- AI image classification (CLIP, Imagga) is now accessible enough to build consumer-grade item recognition at low cost.
- Pixel art and retro gaming aesthetics are experiencing a cultural moment, making digital collectibles feel emotionally resonant rather than gimmicky.

### Who Is the Customer?

**Primary Persona: The Sentimental Keeper**

| Attribute | Detail |
|---|---|
| Who | Adults 25-45 who accumulate objects tied to memories |
| Behavior | Keeps items "just in case," feels guilty when considering disposal |
| Struggling moment | Forced to confront clutter (moving, spring cleaning, running out of space) and feels paralyzed between wanting a clean space and not wanting to lose memories |
| Current workaround | Takes photos before discarding (inconsistent), puts items in storage boxes (delays the problem), gives to friends/family (limited) |
| Desired outcome | A clean, uncluttered space **without** the feeling that memories were lost |

**Secondary Persona: The Pragmatic Holder**

| Attribute | Detail |
|---|---|
| Who | Adults who keep items because "they might be worth something" |
| Behavior | Hoards old electronics, clothes, and materials without knowing their recycling or resale value |
| Struggling moment | Looks at a pile of old items and thinks "I should do something with these" but doesn't know what |
| Current workaround | Searches eBay/Craigslist (time-consuming), asks friends, does nothing |
| Desired outcome | Quick clarity on what an item is worth — environmentally or financially — so they can act |

---

## Product Vision

> EcoMario transforms physical objects into collectible pixel miniatures — preserving the memory in a permanent digital collection so the physical item can be recycled without guilt. By showing users the environmental impact of recycling each item, EcoMario turns letting go into a rewarding, gamified experience.

**One-liner:** Snap it. Keep the memory. Recycle the thing.

---

## Solution Overview

EcoMario is a Mario-themed web application with three core capabilities:

### 1. Scan & Classify

Users upload or photograph an item. EcoMario uses image classification (Imagga API) to identify the item and return:

- **What it is** — item category (e.g., aluminum can, laptop, glass bottle)
- **CO2 produced** — carbon footprint of manufacturing the item
- **CO2 saved** — carbon saved by recycling instead of landfilling
- **Recycling tips** — how and where to recycle the specific item

**Why this matters:** Removes the information barrier. Gives users a concrete, rational reason to recycle.

### 2. Pixel Miniature Collection

When a user confirms they'll recycle an item, EcoMario:

- Transforms the item photo into a **pixelated miniature** in retro game style
- Adds it to the user's permanent **digital collection**
- The collection lives as an "e-shelf" — a visual gallery of everything they've let go of, preserved as pixel art

**Why this matters:** This is the core innovation. It directly addresses the emotional barrier by giving users a way to "keep" the memory without keeping the physical object. The pixel art style makes items feel like collectible treasures rather than disposable goods.

### 3. Gamified Progression

Users earn progress through a leveling system:

| Level | Title | Threshold |
|---|---|---|
| 1 | Beginner | 0 items |
| 2 | Eco Warrior | 5 items |
| 3 | Green Hero | 15 items |
| 4 | Eco Champion | 30 items |
| 5 | Master Recycler | 50 items |

Mario-themed animations, sound effects, and character assignments reinforce the game feel.

**Why this matters:** Creates a repeat-use loop. The collection and leveling mechanics tap into completionist psychology — users want to grow their collection and advance through levels.

---

## User Flow

```
1. User opens EcoMario
        │
2. Logs in (assigned a random Mario character name)
        │
3. Uploads or photographs a sentimental/unused item
        │
4. EcoMario classifies the item
   ├── Shows item category
   ├── Shows CO2 produced vs. CO2 saved
   └── Shows recycling tips
        │
5. User confirms "I'll recycle this"
        │
6. Photo transforms into pixel miniature (animation)
        │
7. Miniature added to user's collection shelf
   ├── Collection count updates
   ├── Level progress updates
   └── Mario celebration animation plays
        │
8. User visits collection to browse all pixel miniatures
```

---

## Supported Item Categories (V1)

| Item | CO2 Produced | CO2 Saved | Recycling Tip |
|---|---|---|---|
| Plastic Bottle | 0.08 kg | 0.04 kg | Rinse before recycling |
| Aluminum Can | 1.6 kg | 1.4 kg | No need to crush |
| T-Shirt | 7.0 kg | 3.5 kg | Donate or textile recycling |
| Banana Peel | 0.07 kg | 0.03 kg | Compost it |
| Glass Bottle | 0.5 kg | 0.3 kg | Remove caps first |
| Laptop | 200 kg | 5.0 kg | E-waste recycling center |
| Paper Sheet | 0.01 kg | 0.005 kg | Remove staples first |

---

## Success Metrics

### Primary Metric (North Star)

**Items recycled per user per month** — measures whether EcoMario actually drives recycling behavior, not just app opens.

### Supporting Metrics

| Metric | What It Tells Us | Target (V1) |
|---|---|---|
| Collection size per user | Are users coming back to scan more items? | Avg 5+ items in first month |
| D7 retention | Does the app create a habit? | 30%+ |
| Scan-to-recycle conversion | Do users follow through after scanning? | 60%+ confirm recycling |
| Time to first scan | Is onboarding frictionless? | Under 60 seconds |
| Collection page visits | Do users value their pixel collection? | 2+ visits per week |

### Validation Metric (Pre-launch)

> "If this memory lived in a pixel collection on your phone, would you feel okay recycling the original?"
>
> Target: 7/10 sentimental keepers say yes in user interviews.

---

## Scope

### In Scope (V1 — MVP)

- [x] Image upload and classification via Imagga API
- [x] CO2 impact display (produced vs. saved)
- [x] Recycling tips per item category
- [x] Pixel miniature transformation of uploaded photos
- [x] Persistent collection shelf (localStorage)
- [x] User login with Mario character assignment
- [x] Gamified leveling system (5 tiers)
- [x] Mario-themed UI with pixel art aesthetics
- [x] Mobile-responsive web app (React + Vite)

### Out of Scope (V1)

- Native mobile app (iOS/Android)
- Social sharing of collections
- Real-time camera scanning (upload only for V1)
- Marketplace or resale value estimation
- Multi-user household accounts
- Backend user accounts with persistent cloud storage (localStorage only for V1)
- Integration with local recycling center databases
- Custom pixel art styles or themes

### Future Considerations (V2+)

- **Cloud-synced collections** — move from localStorage to authenticated accounts with persistent storage
- **Social features** — share your collection, compare with friends, community challenges
- **Expanded item categories** — furniture, appliances, toys, books
- **"Story" attachment** — let users write a short memory note alongside each pixel miniature
- **Local recycling integration** — show nearest drop-off points for each item type
- **Camera scanning** — real-time item recognition without upload step

---

## Technical Architecture

### Frontend
- **Framework:** React + Vite
- **Styling:** Tailwind CSS with custom pixel-art theme
- **Font:** "Press Start 2P" for retro gaming aesthetic
- **Storage:** localStorage for user data and collection persistence
- **Routing:** React Router for page navigation

### Backend
- **Server:** Python Flask with CORS
- **Classification:** Imagga API for image tagging and categorization
- **Fallback:** Filename analysis and file-size heuristics when API is unavailable
- **Database:** SQLite (planned for V2 persistent storage)

### API Endpoints
- `POST /api/classify` — accepts image upload, returns item classification with CO2 data and recycling tips

---

## Key Assumptions & Risks

| Assumption | Risk if Wrong | Mitigation |
|---|---|---|
| A pixel miniature can emotionally "replace" a physical object | Core value prop fails — users scan but don't recycle | Validate with 5-8 user interviews before V2 investment |
| Gamification drives repeat usage | Users try once and forget | Design collection mechanics for intrinsic satisfaction, not just points |
| 7 item categories cover the most common sentimental clutter | Users try to scan items we can't classify | Clear messaging on supported categories; graceful fallback for unknown items |
| localStorage is sufficient for MVP | Users lose collections when clearing browser data | Communicate limitation clearly; prioritize cloud sync in V2 |
| CO2 data motivates the Pragmatic Holder | Environmental data feels abstract or untrustworthy | Source data transparently; consider showing equivalences ("= 3 car miles saved") |

---

## Key Decisions Log

| Decision | Rationale | Date |
|---|---|---|
| Lead with pixel collection, not CO2 data | CO2 info is a rational bonus; the pixel miniature is what unlocks the emotional barrier for Sentimental Keepers | Feb 2026 |
| Mario theme for gamification | Retro gaming aesthetic aligns with pixel art collection; familiar and approachable | Jun 2025 |
| localStorage over cloud accounts for V1 | Reduces scope and removes auth complexity for MVP; validates core mechanic first | Jun 2025 |
| Imagga API over local CLIP model | Faster to integrate for MVP; trade-off is API dependency and cost | Jun 2025 |
| Web app over native mobile | Lower development cost; accessible across platforms; sufficient for validation | Jun 2025 |

---

## Open Questions

1. **Does the pixel miniature actually release emotional attachment?** Needs user interview validation.
2. **What triggers first-time use?** The Sentimental Keeper has low urgency — what gets them to open the app? (Moving season? Spring cleaning campaigns? Social referral?)
3. **Should V2 let users add a "memory note" to each pixel miniature?** Could deepen emotional value but adds complexity.
4. **How do we handle items that don't fit the 7 categories?** Graceful error? Generic "other" category? Expand classification?
5. **Is localStorage acceptable for early users, or will data loss kill retention?** Need to monitor support feedback.
