/**
 * Character creation rules (pure). A creation `state` is what the wizard edits:
 *
 *  { name, classKey, ability, stats:{build,coordination,perception}  (points bought, may be negative),
 *    freePicks:[skill], skills:[skill], mastery:skill|null, traits:{key:count}, customTraits:[{name,cost,note,modifiers}],
 *    gear:[key], customGear:[name], luckyTrades:[{kind:"skill"|"gear", key}] }
 *
 * `summarize` checks the state against the Player's Guide and returns the point ledger, derived values and any
 * rule violations as `{code, ...args}` objects the UI turns into text.
 */
import { CLASSES_BY_KEY } from "../data/classes.mjs";
import { SKILLS_BY_KEY, COMMON_SKILLS } from "../data/skills.mjs";
import { TRAITS_BY_KEY, ABILITIES_BY_KEY } from "../data/traits.mjs";
import { GEAR_BY_KEY, COMMON_GEAR } from "../data/gear.mjs";
import {
    STATS, STAT_COST, STAT_LIMIT, CREATION_POINTS, MAX_CLASS_SKILLS, BASE_GEAR_SLOTS, deriveStats,
} from "./rules.mjs";

export function emptyState() {
    return {
        name: "",
        classKey: null,
        ability: null,
        stats: { build: 0, coordination: 0, perception: 0 },
        freePicks: [],
        skills: [],
        mastery: null,
        traits: {},
        customTraits: [],
        gear: [],
        customGear: [],
        luckyTrades: [],
    };
}

const unique = (list) => [...new Set(list)];

/** Everything about the class the player does not have to pay for. */
export function classGrants(cls) {
    return {
        stats: { build: 0, coordination: 0, perception: 0, ...cls.freeStats },
        skills: cls.freeSkills,
    };
}

export function summarize(input) {
    const state = { ...emptyState(), ...input, stats: { ...emptyState().stats, ...input.stats } };
    const errors = [];
    const warnings = [];
    const lines = [];
    const cls = CLASSES_BY_KEY[state.classKey] ?? null;
    if (!cls) errors.push({ code: "noClass" });

    // ---- Stats -------------------------------------------------------------------------------------------------
    const free = cls ? classGrants(cls).stats : { build: 0, coordination: 0, perception: 0 };
    const totals = {};
    let statCost = 0;
    for (const stat of STATS) {
        const bought = Math.trunc(state.stats[stat] ?? 0);
        totals[stat] = free[stat] + bought;
        statCost += bought * STAT_COST;
        if (Math.abs(totals[stat]) > STAT_LIMIT) errors.push({ code: "statLimit", stat, limit: STAT_LIMIT });
    }
    if (statCost) lines.push({ kind: "stats", cost: statCost });

    // ---- Class ability -----------------------------------------------------------------------------------------
    const abilityKeys = cls ? [...cls.abilities] : [];
    if (cls?.chooseAbility) {
        if (!cls.chooseAbility.includes(state.ability)) errors.push({ code: "noAbility" });
        else abilityKeys.push(state.ability);
    }
    const abilityKeysFinal = abilityKeys.filter((k) => ABILITIES_BY_KEY[k]);
    if (cls?.group === "athlete" && !abilityKeysFinal.includes("athlete")) abilityKeysFinal.unshift("athlete");

    // ---- Traits ------------------------------------------------------------------------------------------------
    const overPrepared = state.traits["over-prepared"] ?? 0;
    const wellRounded = state.traits["well-rounded"] ?? 0;
    let traitCost = 0;
    const traitList = [];
    for (const [key, count] of Object.entries(state.traits)) {
        if (!count) continue;
        const t = TRAITS_BY_KEY[key];
        if (!t) {
            errors.push({ code: "unknownTrait", key });
            continue;
        }
        if (count > 1 && !t.stack) errors.push({ code: "traitStack", key });
        traitCost += t.cost * count;
        traitList.push({ ...t, count });
        if (t.replaces && state.traits[t.replaces]) errors.push({ code: "traitOverlap", key, other: t.replaces });
    }
    for (const t of state.customTraits) {
        traitCost += Number(t.cost) || 0;
        traitList.push({ key: null, ...t, count: 1, custom: true });
    }
    if (traitCost) lines.push({ kind: "traits", cost: traitCost });

    // ---- Skills ------------------------------------------------------------------------------------------------
    const freeSkills = [...(cls?.freeSkills ?? [])];
    for (const pick of state.freePicks) {
        if (!cls?.skills.includes(pick)) errors.push({ code: "freePickNotInClass", key: pick });
        else if (freeSkills.includes(pick)) errors.push({ code: "duplicateSkill", key: pick });
        else freeSkills.push(pick);
    }
    if (cls && state.freePicks.length < cls.freePicks) {
        errors.push({ code: "freePicksLeft", count: cls.freePicks - state.freePicks.length });
    }

    const tradedSkills = state.luckyTrades.filter((t) => t.kind === "skill").map((t) => t.key);
    const paid = unique(state.skills);
    let classSkillsUsed = 0;
    let commonSkillsUsed = 0;
    for (const key of paid) {
        if (!SKILLS_BY_KEY[key]) {
            errors.push({ code: "unknownSkill", key });
            continue;
        }
        if (freeSkills.includes(key) || tradedSkills.includes(key)) {
            errors.push({ code: "duplicateSkill", key });
            continue;
        }
        const inClass = cls?.skills.includes(key);
        if (inClass && classSkillsUsed < MAX_CLASS_SKILLS) classSkillsUsed++;
        else if (COMMON_SKILLS.includes(key)) commonSkillsUsed++;
        else errors.push({ code: inClass ? "tooManyClassSkills" : "skillNotAllowed", key });
    }
    const commonAllowance = (cls?.commonSkills ?? 0) + wellRounded;
    if (commonSkillsUsed > commonAllowance) {
        errors.push({ code: "tooManyCommonSkills", allowed: commonAllowance, used: commonSkillsUsed });
    }
    if (paid.length) lines.push({ kind: "skills", cost: paid.length });

    const allSkillKeys = unique([...freeSkills, ...tradedSkills, ...paid.filter((k) => SKILLS_BY_KEY[k])]);
    if (paid.includes("training-mastery")) {
        if (!state.mastery || state.mastery === "training-mastery" || !allSkillKeys.includes(state.mastery)) {
            errors.push({ code: "masteryTarget" });
        }
    }

    // ---- Gear --------------------------------------------------------------------------------------------------
    const tradedGear = state.luckyTrades.filter((t) => t.kind === "gear").map((t) => t.key);
    const picks = [];
    for (const key of state.gear) {
        const g = GEAR_BY_KEY[key];
        if (!g) {
            errors.push({ code: "unknownGear", key });
            continue;
        }
        if (g.group === "class" && !cls?.classGear.includes(key)) errors.push({ code: "gearNotAllowed", key });
        picks.push({ key, name: g.name, cost: g.cost });
    }
    for (const name of state.customGear) picks.push({ key: null, name, cost: 1, custom: true });
    const gearSlots = BASE_GEAR_SLOTS + overPrepared + (cls?.freeGear ?? 0);
    if (picks.length > gearSlots) errors.push({ code: "tooMuchGear", allowed: gearSlots, used: picks.length });
    const discounts = [...picks].sort((a, b) => b.cost - a.cost).slice(0, cls?.freeGear ?? 0).reduce((n, p) => n + p.cost, 0);
    const gearCost = picks.reduce((n, p) => n + p.cost, 0) - discounts;
    if (gearCost) lines.push({ kind: "gear", cost: gearCost });
    if (tradedGear.some((k) => !GEAR_BY_KEY[k])) errors.push({ code: "unknownGear", key: tradedGear.find((k) => !GEAR_BY_KEY[k]) });

    // ---- Lucky breaks ------------------------------------------------------------------------------------------
    const luckyBreaks = cls?.luckyBreaks ?? 0;
    if (state.luckyTrades.length > luckyBreaks) errors.push({ code: "tooManyLuckyTrades", allowed: luckyBreaks });
    for (const t of state.luckyTrades) {
        if (t.kind === "skill" && !SKILLS_BY_KEY[t.key]) errors.push({ code: "unknownSkill", key: t.key });
    }

    // ---- Points ------------------------------------------------------------------------------------------------
    const spent = statCost + traitCost + paid.length + gearCost;
    const remaining = CREATION_POINTS - spent;
    if (remaining < 0) errors.push({ code: "overBudget", over: -remaining });
    if (remaining > 0) warnings.push({ code: "unspentPoints", remaining });

    // ---- Derived values ----------------------------------------------------------------------------------------
    const modifiers = [
        ...abilityKeysFinal.flatMap((k) => ABILITIES_BY_KEY[k].modifiers),
        ...traitList.flatMap((t) => Array(t.count).fill(t.modifiers ?? []).flat()),
        ...picks.flatMap((p) => (p.key ? GEAR_BY_KEY[p.key].modifiers : [])),
    ];
    const ownedSkills = allSkillKeys.map((key) => ({ key, ...SKILLS_BY_KEY[key] }));
    const derived = deriveStats(totals, modifiers, ownedSkills);

    return {
        state,
        cls,
        errors,
        warnings,
        ok: errors.length === 0 && !!cls,
        points: { budget: CREATION_POINTS, spent, remaining, lines },
        totals,
        derived,
        abilityKeys: abilityKeysFinal,
        traitList,
        gearPicks: picks,
        tradedGear,
        skillKeys: allSkillKeys,
        freeSkills,
        tradedSkills,
        slots: {
            classSkills: { used: classSkillsUsed, max: MAX_CLASS_SKILLS },
            commonSkills: { used: commonSkillsUsed, max: commonAllowance },
            gear: { used: picks.length, max: gearSlots },
            luckyBreaks: { used: state.luckyTrades.length, max: luckyBreaks },
        },
    };
}

/** Skills a player may still add given the class, in the order they should be displayed. */
export function selectableSkills(cls) {
    const classKeys = cls?.skills ?? [];
    const common = cls?.commonSkills ? COMMON_SKILLS : [];
    return {
        class: classKeys,
        common: common.filter((k) => !classKeys.includes(k)),
    };
}

/** Gear a class may choose from. */
export function selectableGear(cls) {
    return [...COMMON_GEAR, ...(cls?.classGear ?? [])];
}
