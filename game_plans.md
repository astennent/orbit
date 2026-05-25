# Project Codex: Orbit Harvest (Working Title)
**Game Design Document for LLM-Assisted Prototyping**

## 1. Executive Summary & Design Pillars
*Orbit Harvest* is a casual, physics-based roguelike played on a 2D space plane. It combines the high-stakes mechanical satisfaction of a vector-aiming game with the deep, compounding engine-building of modern roguelike deckbuilders. A full run is tightly paced to last **15 to 30 minutes**.

* **Pillar 1: One Launch, One Life (Skill & Tension):** The player gets exactly one launch per level. They must hit the target quota or touch the Exit Portal during this single flight. Crashing or running out of momentum below the quota results in an immediate Game Over.
* **Pillar 2: Procedural Cosmic Chaos (Luck):** Every sector features a randomized layout of celestial bodies (planets, black holes, asteroid fields) that create unpredictable, interconnected gravity wells.
* **Pillar 3: Hands-Off Trigger Automation (Build):** Once launched, player input is 100% hands-off. The probe acts as a physics-driven automation engine, executing cascading "If/Then" logic based on its inventory.

---

## 2. Core Game Loop Architecture

[ PRE-LAUNCH ] -> Player sets angle & initial velocity (Thrust).
│
▼
[ SIMULATION ] -> 100% Hands-off physics simulation.
│
├─► [ CRASH / DEAD STOP < 1.0x QUOTA ] ──► GAME OVER
│
├─► [ TOUCHES EXIT PORTAL ] ─────────────► FORCE EXIT (Earns exactly 1 Yield)
│
└─► [ PASSES >1.0x QUOTA & STOPS ] ──────► FORCE EXIT (Earns Multiplier Yields)

### The Economy Loop ("Yields")
Instead of counting raw data points, the player currency is strictly tied to an arcade-style **Quota Multiplier**.

$$\text{Yields Earned} = \lfloor \frac{\text{Data Collected}}{\text{Sector Quota}} \rfloor$$

* **The Floor:** Hitting 1.0x to 1.99x of the quota awards **1 Yield**.
* **The Greed:** Hitting 5.2x of the quota awards **5 Yields**.
* **The Exit Portal:** A physical geometric target on the board. Touching it instantly injects the exact remaining data needed to hit 1.0x quota and forces a successful level exit (awarding exactly 1 Yield).
* **The Hard Cap:** Players can hold a maximum of **10 Yields**. Any surplus earned past this cap is discarded to prevent hoarding and force a heavy "Harvest -> Spend" cycle.
* **Forced Advancement:** The millisecond a probe safely comes to a rest *after* passing the 1.0x threshold, the level ends. The player cannot try again on that board.

---

## 3. Inventory Ecosystem: Modules vs. Perks

The player’s loadout is strictly divided into two distinct technical frameworks:

### A. Modules (The Hardware)
* **Capacity:** Max 6 Slots.
* **Scope:** Tangible physics modifiers and in-flight "If/Then" event hooks.
* **The Stack-Upgrade Mechanic:** Buying a duplicate module and dropping it onto an existing one upgrades it from **Base** to **Upgraded**. 
    * Upgrading doubles the raw stats (e.g., radius sizes).
    * Upgrading removes RNG elements, changing partial trigger probabilities (e.g., 30% chance) into 100% guarantees.

### B. Perks (The Software)
* **Capacity:** Max 3 Slots.
* **Scope:** Global meta-rule manipulations, probability manipulation, and item interaction hacks. They do not alter flight physics directly, but rewrite system rules.

---

## 4. Technical Data Specifications & Tiering

To code this, items use a strict tiering system **(Common, Uncommon, Rare, Epic, Legendary)** that dictates how aggressively they warp the simulation.

### Item Rarity Definitions
* **Common:** Linear physical reactions (Bouncing, flat momentum retention).
* **Uncommon:** Attribute scaling or localized collection radiuses.
* **Rare:** Item-spawning hooks (Sub-probes, projectiles).
* **Epic:** Global hazard manipulation or Exit Portal manipulation.
* **Legendary:** Game-breaking mechanics (Altering celestial geometry mid-flight).

### Implementation Reference Tables for LLM Coding

#### Sample Modules
| Name | Rarity | Base Effect (Conditional Hook) | Upgraded Effect (Stack Benefit) |
| :--- | :--- | :--- | :--- |
| **Shattershot Core** | Rare | *On Collision with Planet:* Do not die. Shatter into 3 sub-probes that collect data for 3 seconds. | Spawns 5 sub-probes that last for 5 seconds. |
| **Black Box Telemetry**| Uncommon | *On Lethal Collision:* Multiply flight data by 1.5x before resolving. If total crosses 1.0x, you pass the level instead of dying. | Flashes to a 2.5x data multiplier before resolving. |
| **Atmospheric Scoop** | Common | *On Entering Atmosphere:* 50% chance to generate forward thrust instead of experiencing friction slowdown. | 100% chance to convert atmospheric friction into a massive velocity boost. |
| **Wormhole Attractor** | Epic | *Every 5 Seconds of Flight:* Magnetically pull the Exit Portal 10% closer to the probe's current position. | Pulls the Exit Portal 25% closer every 3 seconds. |

#### Sample Perks
| Name | Type | Ruleset Manipulation |
| :--- | :--- | :--- |
| **Loaded Dice** | Greed / Long-term | Achieving a 3x quota or higher guarantees that the next storefront will feature at least one Legendary Module. |
| **Jury-Rigged** | Synergy / Logic | When your probe dies, there is a 50% chance to automatically trigger the conditional effect of your highest-value Module before the level resolves. |
| **Dark Matter Mapping**| UI / Skill | Extends the pre-launch UI trajectory prediction line by 200%, allowing it to read through the first two gravity wells accurately. |
| **Monopoly** | Economy / Stack | If you possess an Upgraded module in Slots 1 and 2, all shop items matching those modules cost 50% fewer Yields. |

---

## 5. MVP Physics & UI Requirements

To build the initial grey-box prototype, the engine requires three baseline scripts:

1.  **The Gravitational Attractor Script:**
    Applied to all celestial body objects. Uses standard 2D gravity simulation calculations based on distance and object mass:
    $$F = \frac{G \cdot m_1 \cdot m_2}{r^2}$$
2.  **The Predictive UI Trajectory Line:**
    A click-and-drag line rendering a vector path. It should show a solid, clear projection line through empty space, but fade out or turn into a dotted, unpredictable line the moment it crosses into a planet's gravitational radius to preserve the Skill vs. Luck balance.
3.  **The Game State Resolution Matrix:**
    A background loop evaluating the Probe's status every frame:
    * If `velocity == 0` AND `data < quota` -> Trigger Loss (Game Over).
    * If `velocity == 0` AND `data >= quota` -> Trigger Win (Mint Yields -> Proceed).
    * If `collision == Portal` -> Auto-fill Quota to 1.0x -> Trigger Win (Mint 1 Yield -> Proceed).
    * If `collision == Hazard/Planet` AND `no_shields` -> Trigger Loss (Game Over).

    