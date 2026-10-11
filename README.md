# Survive the Night for Foundry VTT

A game system for **Survive the Night**, the horror role-playing game by Brian Crenshaw. It follows the Player's Guide (`Survive The Night-compressed.pdf` in this repository) and ships no artwork.

Requires Foundry VTT v14.

## Install

In Foundry's **Game Systems** tab choose **Install System** and paste:

```
https://github.com/BehymerTech/foundry-surviveTheNight/releases/latest/download/system.json
```

## What is in it

**Survivor Creator.** A step-by-step wizard (Class, Stats, Skills, Traits, Gear, Review) with a live 10-point budget. Open it from the **Create Survivor** button in the Actors sidebar, from an empty survivor sheet, or with `game.stn.openCreator()`. It enforces the guide:

- 10 character points; +1 in a stat costs 2 and a -1 penalty returns 2; no stat above +3 or below -3 (free class bonuses count).
- Up to three class skills and two common skills (four for Team Players). Free class skills (Memorization, Observation, Wilderness Survival, Bookworm's two picks) do not count against the limits.
- Traits at 1 or 2 points, negative traits returning points, Over-prepared and Well-rounded stacking, Mr. Olympia / True Grit not stacking with their weaker versions, and custom traits agreed with the Narrator.
- Two gear items (Over-prepared adds one, Campers get two more free), class-only gear, the 2-point pistol, and custom items.
- Class choices: Ball Player and Wingman pick one ability, Bookworm picks two free skills, Followers trade Lucky Breaks for skills and gear.
- Training: Mastery (+3 instead of +2) on a skill you hold.
- The twelve sample characters from the guide can be loaded and edited. A test checks each one spends exactly 10 points and reproduces the Life and Dodge Value printed on its sheet.

**Survivor sheet.** Life, Dodge Value, Fatigue, stats, and one-click rolls:

- Difficulty rolls (d6 + modifiers vs. a difficulty): Perception, Observation, intelligence, Strength, Reflex and every skill, with a natural 1 always failing. Shift-click skips the dialog.
- Fear rolls apply the small-party penalty (world setting *Party size*), then roll on the **Panic!** table when they fail. Wingmen with their friend nearby roll two dice and keep the highest.
- Fatigue penalties apply to every difficulty and Panic! roll, reduced by Good Cardio, Eye of the Tiger, the walking stick and similar, and not at all for Asthmatics.
- Attacks roll to hit against the targeted token's Dodge Value, then damage: weapon dice, +2 hit/damage from matching skills (Shooting adds two dice), Build for melee and Coordination for ranged, unarmed attacks at 1d6 halved and rounded up.
- Lucky Breaks reroll with +2.

**Monsters and NPCs.** A compact sheet with Life, Dodge Value, an attack, a Fear difficulty and notes.

**Compendiums.** Skills, traits and class abilities, gear, and the twelve sample survivors.

## How modifiers work

Traits and gear carry modifiers `{ target, value }`. A roll carries tags, and a modifier applies when its target matches a tag:

| Target | Applies to |
| --- | --- |
| `fear`, `panic` | Fear and Panic! rolls |
| `strength`, `coordination`, `perception` | Rolls that add Build, Coordination or Perception |
| `athletic`, `knowledge`, `observation`, `paranormal` | Skills and rolls carrying that tag |
| `skill:run` | A particular skill |
| `life`, `dv` | Maximum Life, Dodge Value |
| `damage:melee`, `damage:ranged`, `damage:unarmed` | Damage with weapons carrying that tag |

Item sheets expose these, so Narrators can invent traits and gear the way the guide encourages.

## Notes on the rules

The guide leaves a few things open; the system chooses:

- *Melee Weaponry* has no numbers in the guide. It adds no flat bonus; melee damage comes from the weapon and Build.
- Narrator-judged things (what difficulty to set, whether a skill applies, which skills count as mental) stay manual. Stat selection on skill rolls defaults to a sensible stat and can be changed in the roll dialog.
- Rally, Devoted, injuries and death are left to the table.

## Development

```
npm install
npm test               # rules, creation and compendium-source tests (plain node)
npm run build:packs    # compiles packs/ from the data in scripts/data
```

Rules are pure functions in `scripts/lib` and are tested without Foundry; the Foundry layer (data models, sheets, creator app, rolls) is in `scripts/documents`, `scripts/apps` and `scripts/rolls.mjs`. Packs are generated and not committed. Pushing a `v*` tag runs the release workflow, which tests, builds packs, and publishes `system.json` and `system.zip`.

## Credits and legal

Survive the Night is © 2018-2019 Brian Crenshaw. This is an unofficial implementation that restates the game's rules as data; get the book from its publisher. Check the creator's terms before distributing this system beyond your own table.
