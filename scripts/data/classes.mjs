/**
 * The twelve classes of Survive the Night, in four groups.
 *
 *  skills        class skill list (a character may buy up to three of them, plus the common allowance)
 *  freeStats     stat bonuses granted for nothing
 *  freeSkills    skills granted for nothing
 *  freePicks     skills granted for nothing that the player chooses from `skills`
 *  abilities     ability keys granted for nothing
 *  chooseAbility the player picks exactly one of these abilities
 *  classGear     extra gear only this class may take
 *  freeGear      additional gear picks that cost nothing
 *  commonSkills  how many common skills the class may buy (Team Players get four)
 *  luckyBreaks   Followers only
 */
export const GROUPS = {
    athlete: { name: "Athletes", note: "Physical abilities; better base stats than other classes." },
    intellectual: { name: "Intellectuals", note: "Minds first; universally higher base Perception." },
    survivalist: { name: "Survivalists", note: "Operate outside society's comforts; specific skills and items." },
    team: { name: "Team Players", note: "No class skill list; four common skills instead of two." },
};

const base = {
    freeStats: {},
    freeSkills: [],
    freePicks: 0,
    abilities: [],
    chooseAbility: null,
    classGear: [],
    freeGear: 0,
    commonSkills: 2,
    luckyBreaks: 0,
    skills: [],
};

const cls = (key, name, group, o) => ({ ...base, key, name, group, ...o });

export const CLASSES = [
    cls("ball-player", "Ball Player", "athlete", {
        summary: "Plays sports that emphasise skill. Picks Great Cardio, For The Team! or Coordinated.",
        skills: ["pitch", "run", "sporting-implements"],
        abilities: ["athlete"],
        chooseAbility: ["great-cardio", "for-the-team", "coordinated"],
    }),
    cls("heavy", "Heavy", "athlete", {
        summary: "Big and strong. Takes punishment and wins fights.",
        skills: ["wrestle", "tackle", "run"],
        freeStats: { build: 2 },
        abilities: ["athlete"],
    }),
    cls("runner", "Runner", "athlete", {
        summary: "Fast and lean, with the best reflexes.",
        skills: ["jump", "dodge", "run"],
        freeStats: { coordination: 2 },
        abilities: ["athlete", "runner"],
    }),
    cls("bookworm", "Bookworm", "intellectual", {
        summary: "Broad academic and practical knowledge. Rerolls any class skill roll.",
        skills: ["science", "local-history", "computer-hacking", "circuitry", "decipher"],
        freeStats: { perception: 1 },
        freeSkills: ["memorization"],
        freePicks: 2,
        abilities: ["bookworm"],
    }),
    cls("paranormal-investigator", "Paranormal Investigator", "intellectual", {
        summary: "Obsessed with the occult. +4 to Paranormal-knowledge rolls.",
        skills: ["exorcism", "paranormal-weaponry", "recording-devices"],
        freeStats: { perception: 1 },
        abilities: ["paranormal-investigator"],
        classGear: ["silver-talisman", "protective-herbs", "emf-recorder"],
    }),
    cls("sleuth", "Sleuth", "intellectual", {
        summary: "Formidable deductive skills. Free Observation skill for +5 to Observation rolls.",
        skills: ["detect-motive", "lockpicking", "sneak"],
        freeStats: { perception: 1 },
        freeSkills: ["observation"],
        abilities: ["sleuth"],
    }),
    cls("camper", "Camper", "survivalist", {
        summary: "Can survive for days in the wilderness. Free Wilderness Survival and two extra gear picks.",
        skills: ["sense-direction", "ropework", "swimming"],
        freeSkills: ["wilderness-survival"],
        freeGear: 2,
    }),
    cls("doomsday-prepper", "Doomsday Prepper", "survivalist", {
        summary: "Keeps caches of useful things hidden away. Can start with a pistol.",
        skills: ["shooting", "melee-weaponry", "barricading"],
        classGear: ["pistol", "combat-knife", "door-jammer"],
    }),
    cls("hunter", "Hunter", "survivalist", {
        summary: "Marksman and tracker. +2 to Perception rolls.",
        skills: ["shooting", "wilderness-survival", "hunting-implements"],
        abilities: ["hunter"],
    }),
    cls("follower", "Follower", "team", {
        summary: "Relies on dumb luck. Three Lucky Breaks that become rerolls or free skills and gear.",
        commonSkills: 4,
        luckyBreaks: 3,
        abilities: ["lucky-break"],
    }),
    cls("leader", "Leader", "team", {
        summary: "Keeps the group together. +2 to Fear rolls and the Rally ability.",
        commonSkills: 4,
        abilities: ["leader"],
    }),
    cls("wingman", "Wingman", "team", {
        summary: "Supports a chosen friend. Both roll two dice on the Panic! table. Picks one supporting ability.",
        commonSkills: 4,
        abilities: ["wingman"],
        chooseAbility: ["devoted-friend", "group-favorite", "encouraging-word"],
    }),
];

export const CLASSES_BY_KEY = Object.fromEntries(CLASSES.map((c) => [c.key, c]));
