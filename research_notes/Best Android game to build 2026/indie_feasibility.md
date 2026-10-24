# Indie Feasibility & Competition Analysis for Android Games (2025–2026)

Research date: 2026-10-24. Scope: which mobile game genres a solo dev / 1–5 person team (possibly Nepal-based, Android-first, limited budget) can realistically build and win in 2025–2026; competition, UA cost barriers, success stories, tech stack, Google Play specifics, and launch strategy.

Method note: Several primary trade sites (pocketgamer.biz, deconstructoroffun.com, macrumors.com) failed to load directly (DNS errors from the research environment), so some figures come from search-result summaries of those pages rather than full-page reads. These are flagged where relevant. Items from background knowledge that could not be verified with a source in this session are placed under Inferences or Gaps and labeled as such.

---

## 1. Which genres are closed to indies, and which have room?

### Takeaway
Strategy/4X is the biggest money-maker in mobile and it is controlled by heavily funded (mostly Chinese) publishers with high CPIs (~$4 Android). It is effectively closed to small teams, and so are social casino and RPG/gacha. Indies have room where marketing costs are low or there are organic or premium paths: ad-monetized casual puzzle (very low CPI, but you must out-iterate data-driven studios), premium ports of PC indie hits, and roguelite/survivor-likes. Even the biggest recent "puzzle" breakouts (Block Blast, Pixel Flow) were built by studios that ended up large and well funded, not by hobbyists.

### Cited Findings
**Strategy/4X dominance**
- In 2025, strategy was the only genre to grow in revenue, downloads and time spent. The top two games by revenue in 2025 were Last War: Survival and Whiteout Survival. Strategy revenue rose 20% YoY to over $20B. — [GameDevReports summary of Sensor Tower 2025](https://gamedevreports.substack.com/p/sensor-tower-mobile-market-in-2025)
- In 2024, strategy made up only ~4% of downloads but 21.4% of mobile game revenue. This is the profile of a genre that runs on high-LTV whales and heavy UA. — [GameDevReports / Sensor Tower](https://gamedevreports.substack.com/p/sensor-tower-mobile-market-in-2025)
- The top 30 Chinese publishers made $23.3B globally in 2025, 35% of the revenue of the top 100 publishers. Tencent stayed #1. Newcomer Florere Game grew ~20x in 2025 on two 4X titles (Last Z: Survival Shooter, Dark War: Survival). — [Sensor Tower via itiger](https://www.itiger.com/news/1136036604); [Sensor Tower State of Gaming via Bolsamania](https://www.bolsamania.com/nota-de-prensa/mercados/sensor-tower-state-of-gaming-gaming-drove-94-billion-in-revenue-in-2025-downloads-reached-52-billion--21828650.html)
- Sensor Tower says mobile gaming drove ~$94B in revenue with 52B downloads in 2025. Installs are falling, so "industry growth can no longer rely heavily on user acquisition", which pushes the market toward retention and live-ops depth. — [Bolsamania (Sensor Tower press release)](https://www.bolsamania.com/nota-de-prensa/mercados/sensor-tower-state-of-gaming-gaming-drove-94-billion-in-revenue-in-2025-downloads-reached-52-billion--21828650.html)
- 2024 download leaders among publishers included Azur Interactive, Supersonic Studios and SayGames, which are hybrid/hyper-casual publishing machines. — [GameDevReports](https://gamedevreports.substack.com/p/sensor-tower-mobile-market-in-2025)

**UA cost barriers by genre (CPI)**
- Strategy CPI is about $4.00 on Android and $5.50 on iOS (Business of Apps data cited by FoxData's 2026 benchmarks). Puzzle is about $2.00 on Android and $3.00 on iOS. — [FoxData 2026 UA benchmarks](https://foxdata.com/en/blogs/2026-mobile-game-user-acquisition-cost-benchmarks-how-much-should-you-spend/)
- 2024 US CPI for Strategy/Hardcore/RPG: iOS $5.50–6.00, Android $4.00–4.50. Hardcore (MMO/RPG) is the highest-CPI category. — [Segwise](https://segwise.ai/blog/cpi-ipm-roas-benchmarks-optimizing-ad-spend/)
- Hyper-casual 2025 global median CPI on Android was ~$0.40 (Adjust data, as cited). — [Playio 2025 CPI trends](https://blog.playio.co/2025-mobile-game-cpi-trends); [Mapendo](https://mapendo.co/blog/mobile-games-cpi-2025)
- Casino CPI was listed at $11.45 (iOS) in an undated table. Treat as unverified. — [Click-Vision](https://click-vision.com/mobile-game-marketing-statistics)

**Casual puzzle, where breakouts still happen (but not from hobbyists)**
- Pixel Flow (Loom Games, released August 2025) made ~$198.4M in gross player spending (IAP only, excluding ads) in its first 365 days, per AppMagic estimates. Spending peaked at $28.3M in month 8. — [PocketGamer.biz (via search summary; page not directly loadable)](https://www.pocketgamer.biz/loom-games-pixel-flow-makes-almost-200m-in-player-spending-during-first-year/)
- Pixel Flow passed $100M IAP by ~May–June 2026. — [Mobilegamer.biz data digest](https://mobilegamer.biz/data-digest-pixel-flow-hits-100m-mays-top-games-neverness-to-everness-pokemon-go-more/)
- In February 2026, Scopely took a majority stake in Loom Games in a deal valuing the company above $1B. Pixel Flow won Game of the Year at the Pocket Gamer Mobile Games Awards 2026. — [PocketGamer.biz awards](https://pocketgamer.biz/pixel-flow-wins-game-of-the-year-at-the-pocket-gamer-mobile-games-awards-2026/); [Deconstructor of Fun, "Pixel Flow: The Publisher's Dream" (Feb 2026; page not directly loadable)](https://www.deconstructoroffun.com/blog/2026/2/13/pixel-flow-the-publishers-dream)
- Estimates for December 2025 put Pixel Flow's IAP at ~$300K/day, with ads adding another 30–40%. These are analyst estimates. — [Gamota](https://gamota.com/en_GB/?p=2786%2F)
- Block Blast! (Hungry Studio, founded 2021) reached 70M DAU and 300M MAU. The studio ran more than 10,000 A/B tests in 2025. — [BusinessWire press release, Jan 2026](https://www.businesswire.com/news/home/20260108572322/en/Block-Blast-Scales-to-70M-DAU-as-Hungry-Studio-Runs-Over-10000-Experiments-in-a-Single-Year); [Block Blast About page](https://www.blockblast.com/about-us)
- Block Blast monetizes almost entirely through in-app ads (IAA), with an estimated ~$584K/day ad revenue (2024 per 36Kr; Udonis/AppMagic gives the same number for a different period, so the periods may be confused). By the end of 2025 Hungry Studio reportedly had nearly 1,000 employees. A company-profile aggregator lists 44 at the Singapore HQ, so the sources conflict. Xiaomi founder Lei Jun reportedly invested personally in 2020 (single source). — [36Kr](https://eu.36kr.com/de/p/3706617203732616); [Udonis](https://www.blog.udonis.co/statistics/block-blast); [a-leads profile](https://www.a-leads.co/company/94963181_aef5ba6f)
- Block Blast's TikTok presence that turned up in search was a paid partnership (TikTok US Super Wish Season, March 2026), not organic virality. — [BusinessWire Mar 2026](https://www.businesswire.com/news/home/20260320788327/en/Block-Blast-Brings-Its-Relaxing-Mobile-Play-Experience-to-TikTok-US-Super-Wish-Season)

**Hybrid-casual market size**
- Hybrid-casual App Store net revenue hit a new high of ~$174.8M in March 2025, up from ~$100M in early 2024 (paywalled. Summary only). — [Matej Lancaric, 2025 Hybridcasual Market Overview](https://lancaric.substack.com/p/2025-hybridcasual-market-overview)

### Inferences
- **Closed to indies (with high confidence):** 4X/SLG strategy, social casino, RPG/gacha, and head-on match-3 competition. These genres combine CPIs of $4 or more (casino likely far higher) with whale-LTV economics that need large UA budgets and live-ops teams. The dominant players (Century Games, FirstFun, Tencent, Florere, King/Playrix/Dream Games in match-3) out-spend any small team. The Sensor Tower note that "UA can no longer drive growth" makes incumbents with deep content even harder to unseat.
- **Open but brutally competitive:** ad-monetized casual puzzle and hybrid-casual. CPIs are low (~$0.40–$2 on Android), so a small team can afford tests. But Block Blast and Pixel Flow show winners are decided by very fast iteration (10,000+ A/B tests per year) and then publisher-scale UA. The realistic small-team path here is to prototype and pitch to a publisher (see Section 3), not to self-scale.
- **Best fit for a solo/small team with no UA budget:** (a) **premium or "premium-free" ports of PC/Steam indie games** (Balatro, Vampire Survivors model, see Section 2), where discovery happens off-mobile; (b) **roguelite/survivor-likes, idle/incremental, and deep niche puzzle/strategy** games that grow organically through Reddit/Discord/YouTube communities; (c) **cozy/narrative premium** games targeting Google Play featuring / Play Pass. These depend on game quality and community, not CPI arbitrage.
- Hybrid-casual genres where low CPIs coexist with IAP depth (sorting/conveyor puzzles like Pixel Flow, block puzzles) are the "big upside but lottery" option. They suit a 2–5 person team with strong analytics skills more than a solo artist-coder.
- Word games, physics games, and Hole.io-style io games: no 2025–2026 data was found in this session (see Gaps). Hole.io-style io games are the classic hyper-casual model now dominated by publishers like Voodoo.

### Gaps
- No reliable 2025–2026 primary data on match-3 publisher concentration (Sensor Tower genre reports are paywalled).
- No verified 2025–2026 casino or RPG Android CPI from a primary source (Adjust/AppsFlyer/Liftoff reports not retrieved).
- Pixel Flow / Loom Games founding team size and origin were not retrievable (PocketGamer.biz and Deconstructor of Fun pages failed to load).
- Block Blast's original launch-era team size and early growth channel are unverified.
- No data gathered on word games, cozy sims, physics games, or idle/incremental genre saturation specifically.

---

## 2. Indie / small-team mobile success stories 2023–2026

### Takeaway
The documented indie wins on mobile are mostly **ports of games that already broke out on PC/Steam** (Vampire Survivors, Balatro). They succeeded on mobile with zero or minimal paid UA because they arrived with brand awareness. Native-mobile breakouts from small origins (Block Blast, Pixel Flow) quickly became large, funded companies. The typical solo outcome is modest.

### Cited Findings
**Vampire Survivors (poncle) mobile — Dec 2022 launch (2022–2023 data)**
- Free with no IAP. Monetized only through an optional rewarded ad at the end of each run (for lives/gold). — [Mobilegamer.biz](https://mobilegamer.biz/vampire-survivors-mobile-hits-5m-downloads/)
- Passed 1M downloads in its first week and 5M downloads in just over 3 months (AppMagic). Daily downloads peaked at ~204K on Dec 10, 2022 and fell to a ~17K/day 7-day average by the 5M mark, with **no paid marketing**. — [Mobilegamer.biz 5M](https://mobilegamer.biz/vampire-survivors-mobile-hits-5m-downloads/); [Mobilegamer.biz 1M first week](https://mobilegamer.biz/vampire-survivors-mobile-has-passed-1m-downloads-in-its-first-week/)
- poncle rushed the port because "1:1 copies with stolen code, assets, data, progression" were flooding mobile stores. It self-published because it could not find a partner with non-predatory monetization. — [Mobilegamer.biz](https://mobilegamer.biz/vampire-survivors-mobile-hits-5m-downloads/)

**Balatro (LocalThunk / Playstack) mobile — Sep 2024 launch**
- The mobile version grossed ~$1M in its first week and over $9M in IAP revenue by January 2025 (Statista). — [Statista](https://statista.com/statistics/1552648/balatro-app-revenue)
- AppMagic data puts Balatro at 3.1M mobile downloads and $21.3M mobile revenue. The time window is unclear. — [Pocket Tactics](https://www.pockettactics.com/premium-mobile-games-increase)
- It was reportedly the driving force behind a rise in premium mobile game revenue. — [Pocket Tactics](https://www.pockettactics.com/premium-mobile-games-increase)
- Another report puts mobile revenue at over $4M (an earlier snapshot). — [VGC](https://www.videogameschronicle.com/news/balatro-has-reportedly-made-over-4million-dollars-on-mobile-since-release)
- Playstack's H1 2025 revenue was £10.8M (+38.4% YoY). Balatro and Abiotic Factor together sold 3M+ copies in H1 2025 (all platforms). — [WN Hub](https://wnhub.io/news/stores-and-publishing/item-48861)

**Block Blast! (Hungry Studio) and Pixel Flow (Loom Games)**
- See Section 1. Both are native-mobile puzzle breakouts (Block Blast: 70M DAU, IAA-driven; Pixel Flow: ~$198M first-year IAP). Both companies scaled into large or acquired businesses (Hungry Studio reportedly ~1,000 staff; Loom valued >$1B by Scopely). — [BusinessWire](https://www.businesswire.com/news/home/20260108572322/en/Block-Blast-Scales-to-70M-DAU-as-Hungry-Studio-Runs-Over-10000-Experiments-in-a-Single-Year); [36Kr](https://eu.36kr.com/de/p/3706617203732616); [PocketGamer.biz](https://pocketgamer.biz/pixel-flow-wins-game-of-the-year-at-the-pocket-gamer-mobile-games-awards-2026/)

**Godot-made mobile games shipping 2025–2026 (small teams)**
- Rift Riff (Oct 2025), Kamaeru: A Frog Refuge (Dec 2025), and Spooky Express are cited by the Godot team as Google Play games whose developers used Godot 4.5's new Android debug symbols for crash reporting. — [Godot 4.5.2 maintenance release (Mar 2026)](https://godotengine.org/article/maintenance-release-godot-4-5-2/); [Ziva blog (third-party, unverified title list)](https://ziva.sh/blogs/godot-mobile)

**Realistic baseline**
- Solo dev Matt Sharp made ~$4,000 in 5 months and argued "we need to stop glamorizing indie development". Successful indie games are "objectively just the exception". (PC context) — [WN Hub](https://wnhub.io/news/analytics/item-1157)

### Inferences
- The most reliable indie-mobile pattern in 2023–2026 is **build a strong PC/Steam game first, then port to mobile** (Vampire Survivors, Balatro). PC communities and streamers provide awareness that would otherwise cost millions in UA. Vampire Survivors' clone problem shows that a PC hit should ship its own mobile version quickly.
- Monetization lesson: Vampire Survivors (rewarded ads only) and Balatro (premium) both kept player goodwill. That respect for players turned into press coverage and word of mouth.
- From background knowledge (not verified with a source in this session): Balatro was made by a single developer (LocalThunk) in LÖVE/Lua; Slay the Spire, Brotato, Mindustry (open-source, Anuke) and Shattered Pixel Dungeon (open-source, Evan Debenham, sold via an optional "supporter" IAP) are long-running small-team or solo mobile successes. The report writer should treat these as context, not cited facts.

### Gaps
- No 2025–2026 data found on Brotato mobile, Slay the Spire mobile, Mindustry, Shattered Pixel Dungeon, Cookie Clicker-like idles, Survivor.io-likes from small teams, or Hole.io revenue/team size.
- No verified mobile-only solo-developer Google Play revenue postmortem (2025–2026) was found. Search results skewed to Steam.
- No documented case of a TikTok-only organic viral mobile hit from an indie in 2025–2026 was found in this session.

---

## 3. Organic growth channels, soft launch, and publisher testing thresholds

### Takeaway
For a small team without UA money there are two realistic routes. (1) **The publisher route** (Voodoo, SayGames, Homa, Supersonic, Kwalee): build cheap prototypes, let the publisher run CPI/retention tests, and scale only the winners. (2) **The community/organic route**: build an audience on Steam, Reddit, Discord and YouTube/TikTok, then launch or port to mobile. Publisher KPIs have become more nuanced than the old fixed thresholds.

### Cited Findings
- Voodoo's model: external studios submit prototypes, Voodoo soft-launches them with **free test campaigns from Day 1**, and gives a verdict within days: "future Hit", "high potential", or "kill". Only the few that clear retention and CPI targets are scaled. — [Voodoo, "Secret Sauce: 0 to $250M hybridcasual revenue in 3 years"](https://voodoo.io/news/voodoo-s-secret-sauce-from-0-to-250m-hybridcasual-revenue-in-3-years); [Sacra](https://sacra.com/chat/h/49f0b53e-65cf-4671-97e6-112ed8c62502/)
- Voodoo produces ~2,000 prototypes a year (2025). — [Deconstructor of Fun, June 2025](https://www.deconstructoroffun.com/blog/2025/06/02/how-voodoo-builds-hits-four-product-lessons-from-a-2000-prototypes-a-year-machine)
- The old hyper-casual rule of thumb was **D1 ≥ 55%, D7 ≥ 22%, CPI < $0.25**. Voodoo now calls such fixed thresholds "short-sighted" and assesses marketability on CPI, CTR and estimated audience "niche" size. (Older source, ~2019–2021) — [GameAnalytics, "How Voodoo diversified and lowered game product KPIs"](https://www.gameanalytics.com/blog/how-voodoo-diversified-and-lowered-game-product-kpis)
- Hybrid-casual scaling targets reported for 2025: **ROAS ~150% at Day 120**, 200–300% over time (secondary). — [Sacra](https://sacra.com/chat/h/49f0b53e-65cf-4671-97e6-112ed8c62502/); [Voodoo](https://voodoo.io/news/voodoo-s-secret-sauce-from-0-to-250m-hybridcasual-revenue-in-3-years)
- Block Blast's scale came from relentless experimentation: 10,000+ A/B tests in 2025. — [BusinessWire](https://www.businesswire.com/news/home/20260108572322/en/Block-Blast-Scales-to-70M-DAU-as-Hungry-Studio-Runs-Over-10000-Experiments-in-a-Single-Year)
- Vampire Survivors reached 5M mobile downloads with no paid marketing, using PC brand awareness. — [Mobilegamer.biz](https://mobilegamer.biz/vampire-survivors-mobile-hits-5m-downloads/)
- Google has run Indie Games Accelerator programs for emerging markets (2018 Asia edition included India, Indonesia, Malaysia, Pakistan, Philippines, Singapore, Thailand and Vietnam; a 2021 edition was a 12-week online program). Play Accelerator India 2026 (non-games-specific, up to 20 startups, applications closed May 24, 2026). No 2026 games-specific Accelerator or Indie Games Fund call was found. — [PocketGamer.biz (2018)](https://pocketgamer.biz/asia/news/68457/google-opens-applications-for-its-indie-games-accelerator-in-asia/); [Inc42](https://inc42.com/?p=128345); [Entrepreneur India](https://india.entrepreneur.com/topic/third-cohort-of-play-accelerator-india)

### Inferences
- **Recommended launch playbook for a Nepal-based small team** (synthesized from the findings above):
  1. Prototype 3–5 small concepts, each in 1–4 weeks. Test marketability cheaply, either by submitting to publisher dashboards (Voodoo/SayGames/Homa/Kwalee/Supersonic offer free test campaigns) or with ~$100–300 of self-run Meta/TikTok/Google UAC tests in low-CPI markets.
  2. Kill fast. Advance only concepts with strong CPI/CTR (for hyper/hybrid-casual) or strong D1/D7 retention (for midcore/idle).
  3. Soft launch on Google Play in a few low-CPI test markets, using Play Console's open testing and pre-registration, before a global launch.
  4. In parallel, build an organic audience: devlogs on TikTok/YouTube Shorts and Reddit (r/AndroidGaming, r/incremental_games, r/roguelites, r/IndieDev), a Discord server, and Steam wishlists if the game can also ship on PC.
  5. If the game is premium or deep (roguelite, puzzle, cozy), pitch Google Play's editorial team/Play Pass and indie showcases rather than relying on UA.
- Ad-monetized games from South Asia face a real constraint: most installs from South Asian markets bring low ad eCPMs, so the game's revenue depends on reaching Tier-1 users (US/EU/JP/KR). A publisher partnership or a premium PC-first strategy helps solve this.

### Gaps
- Exact 2025–2026 test thresholds for SayGames, Homa, Kwalee and Supersonic were not found (generally disclosed only to partner studios).
- No primary data on Google Play featuring/editorial nomination process effectiveness for indies in 2025–2026.
- No quantified data on TikTok/YouTube Shorts organic install conversion for mobile games.

---

## 4. Engine/tech and backend choice for Android in 2026

### Takeaway
**Unity** remains the safest mobile-commercial choice: no Runtime Fee, free Personal tier up to $200K revenue/funding, and the most mature ad/IAP/mediation SDK ecosystem. **Godot 4.5/4.6** is now a credible free alternative for 2D and light 3D, and its Android stability and tooling improved substantially in 2025–2026. Unreal is overkill for a small mobile team. For backend, Firebase is the default (inference). PlayFab or Nakama make sense if real-time multiplayer or heavy live-ops is needed.

### Cited Findings
**Unity**
- Unity cancelled the Runtime Fee in September 2024 for all versions including Unity 6. — [Unity pricing updates](https://unity.com/products/pricing-updates); [Game World Observer (Sep 2024)](https://gameworldobserver.com/2024/09/12/unity-cancels-runtime-fee-new-pricing-changes)
- Unity Personal is free up to **$200K** in revenue + funding (raised from $100K), and the splash screen is optional on Unity 6. Pro went from $2,040 to $2,200/yr in 2024. Enterprise is mandatory above $25M revenue/funding. — [CG Channel (Sep 2024)](https://www.cgchannel.com/2024/09/unity-scraps-controversial-runtime-fee-but-raises-prices); [Unity support](https://support.unity.com/hc/en-us/articles/30322080156692)
- Announced Nov 10, 2025: Unity Pro and Enterprise rose 5% from **Jan 12, 2026** (Pro ≈ $2,310/yr). Havok Physics is no longer included in Pro/Enterprise from Unity 6.3. Personal stays free with the $200K cap. — [Unity pricing updates](https://unity.com/products/pricing-updates); [CG Channel (Nov 2025)](https://www.cgchannel.com/?p=171673)

**Godot**
- Godot 4.5.2 (Mar 19, 2026) shipped important rendering fixes "especially for mobile". The Godot team "strongly recommend[s]" Google Play games using Vulkan Mobile upgrade to 4.5.2+ to resolve many crash reports. — [Godot blog](https://godotengine.org/article/maintenance-release-godot-4-5-2/)
- Godot 4.5 added Android debug symbols for symbolicating Google Play crash logs, used by shipped games Rift Riff, Kamaeru and Spooky Express. — [Godot blog](https://godotengine.org/article/maintenance-release-godot-4-5-2/)
- GABE (Godot Android Build Environment) became stable on June 2, 2026 and is available on Google Play. It enables full Gradle builds on-device, targeting the Godot 4.6 line. — [Godot blog, GABE stable](https://godotengine.org/article/gabe-stable-release/)
- A Godot mobile update was published in April 2026. — [GameDev.net](https://gamedev.net/news/2713-godot-mobile-update-april-2026/)
- Common Android export pitfall: the editor, export templates and JDK version must match (JDK 17 recommended for Godot 4.x). — [SummerEngine guide](https://www.summerengine.com/blog/export-game-android-godot)

### Inferences
- **Recommendation for a 1–5 person Android-first team:**
  - **Unity 6 (Personal)** for F2P ad/IAP-monetized casual/hybrid-casual, or when partnering with publishers. Most hyper/hybrid-casual publishers expect Unity builds and Unity-compatible SDKs (from background knowledge; not verified here). The $200K cap is high enough for nearly all small teams.
  - **Godot 4.5+/4.6** for 2D roguelites, idle, puzzle and premium titles where you want no licensing risk and a light build. Budget extra time for ad/IAP plugin integration and for testing on low-end Android devices (Vulkan vs Compatibility renderer).
  - **Defold** (free, small builds, strong 2D mobile focus) and **Flutter Flame** (good if the team already knows Dart/Flutter, best for simple casual/puzzle) are niche but viable. **Native Kotlin** is only sensible for very simple puzzle/word games. **Unreal** is not recommended for small mobile teams because of build size, device performance and learning curve. (Defold/Flame/Kotlin/Unreal assessments are from background knowledge. No 2026 sources were retrieved for them.)
- **Backend:** Firebase (Analytics, Remote Config for A/B tests, Crashlytics, Firestore, Cloud Functions) covers most single-player-plus-live-ops needs cheaply. PlayFab suits economy/live-ops management. Nakama (open-source, self-hostable) suits real-time multiplayer, leaderboards and chat. (Background knowledge; not verified with 2026 sources here.)

### Gaps
- No 2026 sources retrieved on Defold, Flutter Flame, or Unreal mobile licensing/status.
- No 2026 sources retrieved on Firebase/PlayFab/Nakama pricing changes.
- No verified data on which engines Voodoo/SayGames/Homa require in 2026.

---

## 5. Google Play specifics (policies, fees, billing, verification, target API)

### Takeaway
2026 brought three big changes. (1) After the Epic v. Google settlement, Google cut service fees to **10% on the first $1M** of annual earnings (in the US/UK/EEA from June 30, 2026) and allowed alternative billing and external web links. (2) **Developer identity verification** applies even to sideloaded apps, starting September 30, 2026 in Brazil, Indonesia, Singapore and Thailand, with global expansion in 2027. (3) **Target API 36 (Android 16)** was required for new apps and updates by Aug 31, 2026. A Nepal-based developer must separately confirm merchant/payout eligibility.

### Cited Findings
**Fees and billing (Epic v. Google)**
- Epic and Google filed a joint settlement and modified injunction in early November 2025. It allows alternative in-app payment options and external web links alongside Google Play Billing, and bans Google from forbidding developers to tell users about alternatives. — [MacRumors (Nov 2025)](https://www.macrumors.com/2025/11/05/google-epic-games-antitrust-settlement/); [SiliconAngle](https://siliconangle.com/2025/11/05/google-make-major-changes-app-store-settle-epic-games-lawsuit/); [TechRadar](https://www.techradar.com/phones/android/android-could-soon-change-in-a-big-way-thanks-to-the-google-and-epic-settlement-heres-what-it-means-for-you)
- The original Nov 2025 proposal capped fees at 9% or 20% (20% for purchases giving more than a de minimis gameplay advantage, 9% for cosmetic or similar items), plus 5% when using Play Billing. This was later superseded (see the next point). — [Notebookcheck](https://www.notebookcheck.net/Google-cuts-Play-Store-fees-as-Epic-settlement-reshapes-Android-app-payments.1243278.0.html); [Gigazine](https://gigazine.net/gsc_news/en/20251106-epic-google-agree)
- **Official (Android Developers Blog, June 2026):** from **June 30, 2026** in the US, EEA and UK, the service fee is **10% on the first $1M (USD) annual earnings**, regardless of whether you use Play Billing, alternative billing or external web links. Auto-renewing subscriptions are 10% for all developers. A separate **billing fee of 5%** applies only when using Play Billing, so the combined total is 15%. — [Android Developers Blog](https://android-developers.googleblog.com/2026/06/play-expanded-billing.html); [PocketGamer.biz](https://www.pocketgamer.biz/google-play-expands-billing-options-and-lowers-fees-for-developers/)
- Above $1M: 20% on new installs and 25% on existing installs (secondary sources; verify on Google's program page). — [ProPakistani](https://propakistani.pk/2026/06/27/google-play-store-cuts-fees-and-allows-third-party-billing/); [Shopifreaks](https://www.shopifreaks.com/google-starts-cutting-play-store-fees-to-a-flat-10-service-fee-on-the-first-1m-and-allows-external-payment-links-making-good-on-its-epic-games-settlement/); [AndroidHeadlines](https://www.androidheadlines.com/2026/06/google-play-store-external-billing-fee-changes.html)

**Developer verification (including sideloading)**
- Google requires developer identity verification for apps installed on certified Android devices, **including sideloaded and third-party-store apps**. App registration requirements begin **Sept 30, 2026** for users in Brazil, Indonesia, Singapore and Thailand, with global expansion expected in 2027. Unverified apps will need an "advanced sideloading flow" or ADB. A new Android Developer Console is being built for developers distributing outside Play, with a lighter process for students/hobbyists. Google says it verifies identity, not app content. — [Android Authority timeline](https://www.androidauthority.com/android-sideloading-changes-timeline-3679204/); [9to5Google (Aug 2025)](https://9to5google.com/2025/08/25/android-apps-developer-verification/); [SD Times](https://sdtimes.com/mobile/google-locking-down-android-security-with-upcoming-developer-verification-requirements-for-sideloaded-apps/)
- Critics (Hackaday) argue verification could harm hobbyist/open-source distribution and does not stop scammers from buying verified accounts. — [Hackaday](https://hackaday.com/blog/page/495/?m=true)

**Target API level**
- New apps and updates must target **Android 16 (API 36)** by **Aug 31, 2026** (extension available to **Nov 1, 2026**). Existing apps must target API 35+ to stay visible to new users on newer OS versions. Wear OS/Automotive need API 35, and TV/XR need API 34. — [Android Developers: target SDK requirements](https://developer.android.com/google/play/requirements/target-sdk); [Play Console Help](https://support.google.com/googleplay/android-developer/answer/11926878?hl=en-419)
- Commentary expects API 37 to be next (Aug 2027). — [DEV Community](https://dev.to/mr_manushukla/android-target-api-36-is-due-aug-31-2026-api-37-is-next-the-play-store-migration-checklist-2f9i)

**Nepal-specific: merchant/payout eligibility**
- Nepal appears on Google's list of countries where **users** can buy paid apps. No current source confirming that **Nepal-based developers** can open a merchant account and receive payouts was found. Merchant eligibility depends on the developer's country (tax/agreement-based). The most detailed lists found date from 2015 and do not mention Nepal. — [Google Play Help: Paid app availability](https://support.google.com/googleplay/answer/143779?hl=en); [Android Central (2015)](https://androidcentral.com/google-expands-play-store-merchant-accounts-8-new-countries)

### Inferences
- The 10% service fee on the first $1M applies explicitly to the US/UK/EEA. For an indie, this roughly halves the platform cut versus the old 15% small-business tier only where Play Billing is not used (10% + 5% billing = 15% with Play Billing). Web shops or external links can therefore save ~5 points on Tier-1 revenue, but add integration and payment-processor costs. Most indies earning under $1M likely gain little from building a web shop beyond that.
- **Critical for a Nepal-based developer:** before committing to IAP or premium monetization, verify in Play Console whether Nepal supports merchant accounts. If it does not, the options are ad-only monetization (AdMob/AppLovin pay out through other rails), registering a company or partner entity in a supported country, or using a publisher who handles payments. This could decide the monetization model and should be checked first.
- Developer verification requirements mean the team should complete Play Console identity verification (individual or organization; D-U-N-S for organizations) early. Personal-account Play Console developers also face closed-testing requirements before production (from background knowledge: 12 testers for 14 days for new personal accounts since late 2023. Not re-verified in this session).
- Every project must budget for annual target-API upgrades (API 37 expected in 2027). This favours engines with active Android maintenance (Unity, Godot 4.5+).

### Gaps
- Fee schedules for markets **outside** the US/UK/EEA (including South Asia) after June 2026 were not confirmed.
- Nepal merchant-account eligibility is unconfirmed (critical gap; must be checked directly in Play Console).
- Play Points and Play Games Services (PC/Google Play Games) incentives for indies in 2026 were not researched within the tool budget.
- The current 2026 closed-testing requirement for new personal Play Console accounts was not re-verified.
