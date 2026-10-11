/**
 * Traits from the Player's Guide (Character Creation, "Traits"), plus the abilities that classes grant.
 *
 * `modifiers` target roll tags (see rules.mjs): "fear", "panic", "strength", "coordination", "perception",
 * "athletic", "knowledge", "acrobatics" ... or derived values: "life", "dv", "damage:melee", "damage:ranged".
 * `fatigueRemoved` is how many Fatigue penalties the trait cancels.
 * `stack` - the trait may be taken more than once (Over-prepared, Well-rounded).
 */
const trait = (key, name, cost, note, o = {}) => ({ key, name, cost, note, modifiers: [], fatigueRemoved: 0, ...o });
const mod = (target, value) => ({ target, value });

export const TRAITS = [
    // 1 point
    trait("brave", "Brave", 1, "+1 to Fear rolls.", { modifiers: [mod("fear", 1)] }),
    trait("cool-headed", "Cool Headed", 1, "+1 to Panic! rolls.", { modifiers: [mod("panic", 1)] }),
    trait("good-cardio", "Good Cardio", 1, "Remove the first Fatigue penalty.", { fatigueRemoved: 1 }),
    trait("iron-constitution", "Iron Constitution", 1, "+5 Life.", { modifiers: [mod("life", 5)] }),
    trait("quick-reflexes", "Quick Reflexes", 1, "+1 to Coordination rolls and +1 to Acrobatics rolls.", {
        modifiers: [mod("coordination", 1), mod("skill:acrobatics", 1)],
    }),
    trait("over-prepared", "Over-prepared", 1, "Take an extra entry from the Gear list.", { stack: true }),
    trait("weightlifter", "Weightlifter", 1, "+1 to strength rolls and +1 to melee damage.", {
        modifiers: [mod("strength", 1), mod("damage:melee", 1)],
    }),
    trait("well-rounded", "Well-rounded", 1, "Take an extra skill from the Common Skills list.", { stack: true }),

    // 2 points
    trait("courageous", "Courageous", 2, "+2 to Fear rolls.", { modifiers: [mod("fear", 2)] }),
    trait("courage-under-fire", "Courage Under Fire", 2, "+2 to Panic! rolls.", { modifiers: [mod("panic", 2)] }),
    trait("devoted", "Devoted", 2, "Use a turn to cut short another character's paralysis (not your own)."),
    trait("eye-of-the-tiger", "Eye of the Tiger", 2, "Remove the first two Fatigue penalties.", { fatigueRemoved: 2 }),
    trait("mr-olympia", "Mr. Olympia", 2, "+2 to strength rolls and +2 to melee damage.", {
        modifiers: [mod("strength", 2), mod("damage:melee", 2)],
        replaces: "weightlifter",
    }),
    trait("true-grit", "True Grit", 2, "+10 Life.", { modifiers: [mod("life", 10)], replaces: "iron-constitution" }),

    // Negative traits return points
    trait("fearful", "Fearful", -1, "-1 to Fear rolls.", { modifiers: [mod("fear", -1)] }),
    trait("frantic", "Frantic", -1, "-1 to Panic! rolls.", { modifiers: [mod("panic", -1)] }),
    trait("feeble", "Feeble", -1, "-1 to strength rolls and -1 to melee damage.", {
        modifiers: [mod("strength", -1), mod("damage:melee", -1)],
    }),
    trait("out-of-shape", "Out of Shape", -1, "It takes two factors (cardio, food, ...) to remove the first Fatigue penalty."),
    trait("phobia", "Phobia", -1, "-2 to Fear and Panic! rolls for one particular fear, agreed with the Narrator."),
    trait("sluggish", "Sluggish", -1, "-1 to Coordination rolls and -1 to Acrobatics rolls.", {
        modifiers: [mod("coordination", -1), mod("skill:acrobatics", -1)],
    }),
    trait("weak-constitution", "Weak Constitution", -1, "-5 Life.", { modifiers: [mod("life", -5)] }),
    trait("asthmatic", "Asthmatic", -2, "Fatigue penalties cannot be removed.", { blocksFatigueRemoval: true }),
    trait("cowardly", "Cowardly", -2, "-2 to Fear rolls.", { modifiers: [mod("fear", -2)] }),
    trait("hysterical", "Hysterical", -2, "-2 to Panic! rolls.", { modifiers: [mod("panic", -2)] }),
    trait("self-serving", "Self-serving", -2, "Unable to put yourself at risk to help others."),
];

export const TRAITS_BY_KEY = Object.fromEntries(TRAITS.map((t) => [t.key, t]));

/**
 * Abilities that come with a class, not bought with points. They are stored as trait items with cost 0.
 */
export const CLASS_ABILITIES = [
    trait("athlete", "Athlete", 0, "+1 to all athletic rolls.", { modifiers: [mod("athletic", 1)] }),
    trait("great-cardio", "Great Cardio", 0, "Removes the first Fatigue penalty and stacks with other Fatigue traits.", {
        fatigueRemoved: 1,
    }),
    trait("for-the-team", "For The Team!", 0, "+1 to Fear and Panic! rolls while with the group.", {
        modifiers: [mod("fear", 1), mod("panic", 1)],
    }),
    trait("coordinated", "Coordinated", 0, "+2 to all non-combat Coordination rolls.", { modifiers: [mod("coordination", 2)] }),
    trait("runner", "Runner", 0, "+2 to Run rolls.", { modifiers: [mod("skill:run", 2)] }),
    trait("bookworm", "Bookworm", 0, "+1 to knowledge rolls. Reroll any skill roll made with a class skill.", {
        modifiers: [mod("knowledge", 1)],
    }),
    trait("paranormal-investigator", "Paranormal Investigator", 0, "+4 to Paranormal-knowledge rolls.", {
        modifiers: [mod("paranormal", 4)],
    }),
    trait("sleuth", "Sleuth", 0, "+2 to Observation rolls (on top of the free Observation skill).", {
        modifiers: [mod("observation", 2)],
    }),
    trait("hunter", "Hunter", 0, "+2 to Perception rolls.", { modifiers: [mod("perception", 2)] }),
    trait("lucky-break", "Lucky Breaks", 0, "Three Lucky Breaks. Spend one to reroll a difficulty or damage roll with +2, and keep going while you have breaks. Before play, trade them for skills or gear."),
    trait("leader", "Leader", 0, "+2 to Fear rolls. Rally: any Fear roll a friendly character fails may be rerolled, unless the Leader failed it too.", {
        modifiers: [mod("fear", 2)],
    }),
    trait("wingman", "Wingman", 0, "Befriend one character at the start of the game. While that friend is nearby, both of you roll two dice on the Panic! table and choose the highest."),
    trait("devoted-friend", "Devoted Friend", 0, "+1 to Fear rolls for the chosen friend and the Wingman."),
    trait("group-favorite", "Group Favorite", 0, "Choose two characters at the start of the game for the Wingman's Panic! bolstering."),
    trait("encouraging-word", "Encouraging Word", 0, "+1 to Rally rolls for a group in the presence of a Leader."),
];

export const ABILITIES_BY_KEY = Object.fromEntries(CLASS_ABILITIES.map((t) => [t.key, t]));
