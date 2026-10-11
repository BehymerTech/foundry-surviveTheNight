/**
 * Skills from the Survive the Night Player's Guide (Character Creation, "Skills").
 * Every skill grants +2 to rolls involving it (+3 with Training: Mastery).
 *
 * `stat`   - the stat normally added to a roll with this skill (the Narrator may override).
 * `tags`   - extra roll tags. Trait modifiers target tags, e.g. "athletic" or "knowledge".
 * `weapon` - bonuses applied when attacking with a weapon that carries one of `tags`.
 * `dv`     - flat Dodge Value bonus.
 */
const skill = (key, name, o = {}) => ({ key, name, stat: null, tags: [], note: "", ...o });

const ATHLETIC = ["athletic"];
const KNOWLEDGE = ["knowledge"];

export const SKILLS = [
    // Common skills
    skill("acrobatics", "Acrobatics", { stat: "coordination", tags: ATHLETIC, note: "Tumbling, balance, flips." }),
    skill("animal-handling", "Animal Handling", { stat: "perception", note: "Calming and directing animals." }),
    skill("bluff", "Bluff", { stat: "perception", note: "Lying and misdirection." }),
    skill("boxing", "Boxing / Brawling / Karate", {
        tags: ATHLETIC,
        weapon: { tags: ["unarmed"], hit: 2, damage: 2, dice: 0 },
        note: "+2 to hit and +2 damage when unarmed or with brass knuckles. The three are interchangeable.",
    }),
    skill("climbing", "Climbing", { stat: "build", tags: ATHLETIC }),
    skill("decipher", "Decipher", { stat: "perception", tags: KNOWLEDGE, note: "Decoding and translating." }),
    skill("diplomacy", "Diplomacy", { stat: "perception", note: "Reasoning and negotiating." }),
    skill("disguise", "Disguise", { stat: "perception", note: "Disguising yourself and others." }),
    skill("driving", "Driving Under Pressure", { stat: "coordination" }),
    skill("escape-artist", "Escape Artist", { stat: "coordination" }),
    skill("first-aid", "First Aid", {
        stat: "perception",
        note: "Skill roll vs 6 heals a party member for 1d6 +2 (skill) +2 (first aid kit). No kit required.",
    }),
    skill("hide", "Hide", { stat: "coordination" }),
    skill("lockpicking", "Lockpicking", { stat: "coordination", note: "A hairpin or paperclip is enough." }),
    skill("mechanics", "Mechanics", { stat: "perception", tags: KNOWLEDGE }),
    skill("memorization", "Memorization", { stat: "perception", tags: KNOWLEDGE }),
    skill("run", "Run", { stat: "coordination", tags: ATHLETIC }),
    skill("sense-direction", "Sense Direction", { stat: "perception" }),
    skill("sleight-of-hand", "Sleight of Hand", { stat: "coordination" }),
    skill("sneak", "Sneak", { stat: "coordination" }),
    skill("swimming", "Swimming", { stat: "build", tags: ATHLETIC }),
    skill("training-mastery", "Training: Mastery", {
        note: "Choose one skill you already have. It grants +3 instead of +2.",
    }),

    // Athlete skills
    skill("pitch", "Pitch", {
        stat: "coordination",
        tags: ATHLETIC,
        weapon: { tags: ["thrown"], hit: 2, damage: 2, dice: 0 },
        note: "+2 to hit and +2 damage when throwing a weapon.",
    }),
    skill("sporting-implements", "Sporting Implements", {
        tags: ATHLETIC,
        weapon: { tags: ["sport"], hit: 2, damage: 2, dice: 0 },
        note: "+2 to hit and +2 damage with bats, hockey sticks and similar.",
    }),
    skill("wrestle", "Wrestle", {
        stat: "build",
        tags: [...ATHLETIC, "grapple"],
        note: "+2 to grapple rolls.",
    }),
    skill("tackle", "Tackle", {
        stat: "build",
        tags: [...ATHLETIC, "dragdown"],
        note: "+2 to drag down rolls. Difficulty is usually the target's DV plus their Build.",
    }),
    skill("jump", "Jump", { stat: "coordination", tags: ATHLETIC }),
    skill("dodge", "Dodge", { stat: "coordination", tags: ATHLETIC, dv: 1, note: "+1 Dodge Value and +2 to dodge rolls." }),

    // Intellectual skills
    skill("science", "Science", { stat: "perception", tags: KNOWLEDGE }),
    skill("local-history", "Local History", { stat: "perception", tags: KNOWLEDGE }),
    skill("computer-hacking", "Computer Hacking", { stat: "perception", tags: KNOWLEDGE }),
    skill("circuitry", "Circuitry", { stat: "perception", tags: KNOWLEDGE }),
    skill("exorcism", "Exorcism", { stat: "perception", tags: [...KNOWLEDGE, "paranormal"] }),
    skill("paranormal-weaponry", "Paranormal Weaponry", {
        stat: "perception",
        tags: ["paranormal"],
        note: "+2 to making or using paranormal weapons.",
    }),
    skill("recording-devices", "Recording Devices", {
        stat: "perception",
        note: "+2 to using video, audio and electromagnetic recorders.",
    }),
    skill("detect-motive", "Detect Motive", { stat: "perception", note: "Discerning intent." }),
    skill("observation", "Observation", { stat: "perception", tags: ["observation"] }),

    // Survivalist skills
    skill("wilderness-survival", "Wilderness Survival", { stat: "perception" }),
    skill("ropework", "Ropework", { stat: "coordination" }),
    skill("shooting", "Shooting", {
        stat: "coordination",
        weapon: { tags: ["firearm"], hit: 2, damage: 0, dice: 2 },
        note: "+2 to hit and two additional damage dice with guns.",
    }),
    skill("melee-weaponry", "Melee Weaponry", {
        note: "The guide gives no numbers, so this adds no flat bonus; damage comes from the weapon and Build.",
    }),
    skill("barricading", "Barricading", { stat: "build", tags: ["barricade"] }),
    skill("hunting-implements", "Hunting Implements", {
        stat: "coordination",
        weapon: { tags: ["hunting"], hit: 2, damage: 2, dice: 0 },
        note: "+2 to hit, +2 damage and +2 to crafting bows, spears, knives and snares.",
    }),
];

export const SKILLS_BY_KEY = Object.fromEntries(SKILLS.map((s) => [s.key, s]));

/** Keys of the common skills list, in book order. */
export const COMMON_SKILLS = [
    "acrobatics", "animal-handling", "bluff", "boxing", "climbing", "decipher", "diplomacy", "disguise",
    "driving", "escape-artist", "first-aid", "hide", "lockpicking", "mechanics", "memorization", "run",
    "sense-direction", "sleight-of-hand", "sneak", "swimming", "training-mastery",
];
