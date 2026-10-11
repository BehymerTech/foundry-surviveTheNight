/**
 * Gear from the Player's Guide. Every character may take two items; each costs 1 character point
 * (the pistol costs 2). Weapons carry `weapon` data: `dice` d6 of damage and tags that skills match on.
 * An improvised weapon rolls 1d6; unarmed attacks roll 1d6 halved and rounded up.
 */
const item = (key, name, o = {}) => ({ key, name, cost: 1, group: "misc", note: "", modifiers: [], ...o });
const weapon = (dice, tags, extra = {}) => ({ dice, tags, ranged: tags.includes("ranged"), ...extra });

export const GEAR = [
    // Utility
    item("flashlight", "Flashlight", { group: "utility" }),
    item("binoculars", "Binoculars", { group: "utility" }),
    item("rope", "Rope (40 ft.)", { group: "utility" }),
    item("first-aid-kit", "First-Aid Kit", {
        group: "utility",
        note: "+2 to First Aid rolls and +2 Life on a successful First Aid roll. Two uses, never on the same injury.",
        uses: 2,
    }),
    item("duct-tape", "Roll of Duct Tape", { group: "utility" }),
    item("swiss-army-knife", "Swiss Army Knife", { group: "utility" }),
    item("compass", "Compass", { group: "utility" }),

    // Weapons
    item("hammer-nails", "Hammer & Nails", {
        group: "weapon",
        note: "Improvised weapon. +2 to Barricade rolls.",
        weapon: weapon(1, ["melee", "armed", "improvised"]),
        modifiers: [{ target: "barricade", value: 2 }],
    }),
    item("brass-knuckles", "Brass Knuckles", {
        group: "weapon",
        note: "Reroll missed attacks. Counts as unarmed.",
        weapon: weapon(0, ["melee", "unarmed"], { unarmed: true }),
    }),
    item("tire-iron", "Tire Iron", {
        group: "weapon",
        note: "Improvised weapon. +2 to Mechanics rolls.",
        weapon: weapon(1, ["melee", "armed", "improvised"]),
        modifiers: [{ target: "skill:mechanics", value: 2 }],
    }),
    item("sheath-knife", "Sheath Knife", { group: "weapon", weapon: weapon(2, ["melee", "armed", "hunting"]) }),
    item("baseball-bat", "Baseball Bat", { group: "weapon", weapon: weapon(2, ["melee", "armed", "sport"]) }),
    item("walking-stick", "Walking Stick", {
        group: "weapon",
        note: "Improvised weapon. Forgives one Fatigue penalty.",
        weapon: weapon(1, ["melee", "armed", "improvised"]),
        fatigueRemoved: 1,
    }),
    item("brick", "Brick", {
        group: "weapon",
        note: "Improvised weapon that can be thrown.",
        weapon: weapon(1, ["melee", "armed", "improvised", "thrown", "ranged"]),
    }),

    // Miscellaneous
    item("book", "Book"),
    item("blanket", "Blanket"),
    item("playing-cards", "Deck of Playing Cards"),
    item("lighter", "Matchbook / Lighter"),
    item("notepad", "Notepad & Pen"),
    item("lockpicks", "Lockpicks"),
    item("video-camera", "Video Camera"),
    item("snackfood", "Snackfood", { note: "Eating removes one Fatigue penalty, once per game." }),
    item("water-bottle", "Water Bottle", { note: "A refreshing drink removes one Fatigue penalty, once per game." }),
    item("booze", "Bottle of Booze"),
    item("magnifying-glass", "Magnifying Glass", {
        note: "+1 to Observation and Decipher rolls.",
        modifiers: [{ target: "observation", value: 1 }, { target: "skill:decipher", value: 1 }],
    }),
    item("motor-oil", "Motor Oil / WD-40"),
    item("handcuffs", "Handcuffs"),
    item("flash-drive", "Flash Drive"),

    // Class gear
    item("silver-talisman", "Silver Talisman", { group: "class", note: "Defence against supernatural entities, at the Narrator's discretion." }),
    item("protective-herbs", "Protective Herbs", { group: "class", note: "Wolfsbane, garlic and similar, at the Narrator's discretion." }),
    item("emf-recorder", "Audio / EMF Recorder", { group: "class", note: "Detects electromagnetic activity associated with the supernatural." }),
    item("pistol", "Pistol (12 rounds)", {
        group: "class",
        cost: 2,
        note: "4d6 damage, 6d6 with the Shooting skill.",
        weapon: weapon(4, ["ranged", "firearm"]),
        uses: 12,
    }),
    item("combat-knife", "Combat Knife", { group: "class", weapon: weapon(3, ["melee", "armed", "hunting"]) }),
    item("door-jammer", "Door Jammer", { group: "class", note: "+2 to Barricading rolls.", modifiers: [{ target: "barricade", value: 2 }] }),
];

export const GEAR_BY_KEY = Object.fromEntries(GEAR.map((g) => [g.key, g]));

/** Gear everyone may pick from (no class gear). */
export const COMMON_GEAR = GEAR.filter((g) => g.group !== "class").map((g) => g.key);
