# Sky Force Evolution — End-to-end Design Plan (Game Design + UI/UX + Art)

_Owner: game design & engineering. Reference: the approved Sky Force Evolution graphics sheet
("Tam Grafik Paketi — Bölüm 1: Şelale Kanyonu"). Target: iPhone landscape first, web second._

## 1. Audit (2026-11-04, iPhone 15 Pro landscape 852×393, measured)

| # | Area | Finding | Severity |
|---|---|---|---|
| A1 | Result screen | Retry / Missions / Menu buttons rendered at y≈544 px on a 393 px screen → player cannot continue | **Critical** |
| A2 | Mission select | Start button and briefing below the fold (layout stacks on phones) | **Critical** |
| A3 | Main menu | Desktop layout scaled down: text down to 6.6 px (31 labels < 11 px), nav targets 87×26 px (min 44 px) | High |
| A4 | Visual consistency | Menus/screens use the old dark-navy theme; gameplay HUD and sheet are bright glossy blue cartoon | High |
| A5 | Hangar | 3D preview off-screen on phones; no select / upgrade actions | High |
| A6 | Naming | Chapter names differ from the sheet ("Gök Akademisi" vs "Şelale Kanyonu", …) | Medium |
| A7 | Coming-soon & Settings | Panels overflow 393 px height | Medium |
| A8 | Missing screens (on sheet) | Weapon upgrade, chapter map with nodes, bottom tab navigation, hangar card grid | High |
| A9 | Art | Aircraft/enemy/boss/pickup art still interim (waiting for the production package, 0/124) | Blocked on art |
| A10 | Performance | Bloom + MSAA dominate cost in software rendering; needs real-device FPS (setting exists) | Medium |

## 2. Design pillars
1. **Readable at arm's length** — min 12 pt text, 44 pt touch targets, high-contrast white text with navy outline.
2. **One visual language** — bright sky-blue glossy panels, white rims, candy buttons (gold = primary,
   green = upgrade/confirm, purple = premium/special, red = danger/fire), exactly like the sheet.
3. **Thumb-first landscape** — primary actions bottom-right, navigation bottom bar, info top.
4. **Never trap the player** — every screen fits 393 px height without scrolling for primary actions.
5. **Fair & kid-safe economy** — fixed rewards, no loot boxes, no real money.

## 3. Information architecture (from the sheet's bottom bar)
`Ana Menü · Uçaklar · Bölümler · Yükseltme · Görevler · Etkinlikler · Ödüller · Sıralama · Çok Oyunculu · Mağaza`
- Implemented screens: Ana Menü, Uçaklar (hangar), Bölümler (chapter map), Ayarlar, Güncellemeler, Grafik Paketi.
- Planned (clearly labelled "Yakında"): Yükseltme (Phase B), Görevler/Etkinlikler/Ödüller (Phase C),
  Sıralama/Çok Oyunculu (server phase), Mağaza (in-game currency only).

## 4. Screen specs
| Screen | Layout (landscape) | Key components |
|---|---|---|
| Ana Menü | Top bar (logo, avatar+level+XP, coins, crystals, settings) · hero 3D scene centre · right column: Hangar card (selected aircraft + stats + Yükselt) · left: Daily reward · big gold **OYNA** · bottom tab bar | TopBar, TabBar, CandyButton, HangarCard, DailyChest |
| Bölümler | Chapter carousel (10 themed cards) → node path map (31…35 style bubbles, stars, boss node) → mission sheet with **Başla** always visible | ChapterCard, MapNode, MissionSheet |
| Uçaklar | 8-card grid (stars, lock state, rarity frame) + 3D/sprite preview + stat bars + Seç / Yükselt | AircraftCard, StatBar |
| Yükseltme | Weapon list + preview + level stars + before/after stats + cost + Yükselt | WeaponCard, UpgradeDiff |
| Oyun HUD | (done) hearts, energy, shield, boss bar, pills, slots, joystick, fire/missile/special | — |
| Duraklat | Compact centred card, 4 large buttons | Dialog |
| Sonuç | Two columns: stars + stats │ rewards + buttons, always within 393 px | ResultCard |

## 5. Phases
- **Phase A — UI foundation & critical fixes (this PR):** cartoon design tokens + shared components
  restyle every screen; mobile-first main menu with bottom tab bar; fix A1, A2, A3, A6, A7; landscape
  layouts for missions, hangar, result, pause, settings, coming-soon.
- **Phase B — Progression screens:** working aircraft selection, weapon upgrade screen (spend coins,
  `weaponUpgradeCost`), chapter map with node path, next-mission button on results.
- **Phase C — Meta loop:** daily/weekly missions, achievements, events, rewards inbox (fixed rewards).
- **Phase D — Production art drop-in:** as files arrive (art:check → art:approve → screenshot review),
  starting with Falcon X1 and Shadow Commander, then enemies, pickups, effects, environments, UI art.
- **Phase E — Polish & performance:** screen transitions, button haptics/sounds, reduced-motion,
  real-device FPS budget (60 fps target, 30 fps floor), mobile bloom profile.

## 6. Acceptance per phase
Real screenshots at 852×393 and 667×375; no primary action outside the viewport; no label < 11 px;
no touch target < 40 px; typecheck, unit, build, e2e green; changelog entry visible in "Güncellemeler".
