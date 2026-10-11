/**
 * Builds the bonus and the itemised breakdown for a difficulty roll. Pure: takes plain data.
 */
import { sumModifiers, skillBonusFor, groupFearPenalty } from "./rules.mjs";

export const STAT_TAG = { build: "strength", coordination: "coordination", perception: "perception" };

/** Roll definitions for the common difficulty rolls (Player's Guide, "Common Difficulty Rolls"). */
export const COMMON_CHECKS = {
    perception: { tags: ["perception"], stat: "perception" },
    observation: { tags: ["observation", "skill:observation"], stat: "perception" },
    intelligence: { tags: ["intelligence"], stat: "perception" },
    strength: { tags: [], stat: "build" },
    reflex: { tags: ["reflex"], stat: "coordination" },
    fear: { tags: ["fear"], stat: null },
    panic: { tags: ["panic"], stat: null },
};

/**
 * @param {object} actor  plain view: { stats, modifiers, skills:[{key,mastered}], fatiguePenalty }
 * @param {{tags:string[], stat:string|null}} def
 * @param {{extra?:number, partySize?:number}} opts
 * @returns {{bonus:number, parts:{key:string, value:number, label?:string}[], tags:Set<string>}}
 */
export function buildCheck(actor, def, { extra = 0, partySize = 4 } = {}) {
    const tags = new Set(def.tags);
    if (def.stat) tags.add(STAT_TAG[def.stat]);

    const parts = [];
    const push = (key, value, label) => {
        if (value) parts.push({ key, value, label });
    };

    if (def.stat) push("stat", actor.stats[def.stat], def.stat);
    push("skill", skillBonusFor(actor.skills, tags));
    push("traits", sumModifiers(actor.modifiers, tags));
    if (tags.has("fear")) push("party", -groupFearPenalty(partySize));
    // Fatigue hits all difficulty rolls and Panic! rolls
    push("fatigue", -actor.fatiguePenalty);
    push("extra", extra);

    return { bonus: parts.reduce((n, p) => n + p.value, 0), parts, tags };
}
