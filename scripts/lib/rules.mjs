/**
 * Survive the Night rules as pure functions (no Foundry globals) so they can be unit tested with node.
 *
 * A "modifier" is { target, value }. A roll carries a set of tags; every modifier whose target is in the
 * tags applies. Owned skills add +2 (+3 mastered) when the roll carries the tag "skill:<key>".
 */

export const STATS = ["build", "coordination", "perception"];
export const STAT_LIMIT = 3;
export const STAT_COST = 2;
export const BASE_LIFE = 20;
export const BASE_DV = 3;
export const CREATION_POINTS = 10;
export const SKILL_BONUS = 2;
export const MASTERY_BONUS = 3;
export const MAX_CLASS_SKILLS = 3;
export const BASE_GEAR_SLOTS = 2;

export const clampStat = (n) => Math.max(-STAT_LIMIT, Math.min(STAT_LIMIT, n));
export const signed = (n) => (n >= 0 ? `+${n}` : `${n}`);

/** +5 Life per point of Build, -3 per point of penalty. */
export const lifeFromBuild = (build) => (build >= 0 ? build * 5 : build * 3);

export function sumModifiers(modifiers, tags) {
    const wanted = tags instanceof Set ? tags : new Set(tags);
    let total = 0;
    for (const m of modifiers) if (wanted.has(m.target)) total += Number(m.value) || 0;
    return total;
}

/** The +2/+3 bonus from owned skills named in the roll's tags. */
export function skillBonusFor(skills, tags) {
    const wanted = tags instanceof Set ? tags : new Set(tags);
    let total = 0;
    for (const s of skills) if (wanted.has(`skill:${s.key}`)) total += s.mastered ? MASTERY_BONUS : SKILL_BONUS;
    return total;
}

/** Fatigue penalty after traits and items cancel some of it. Asthmatic blocks any removal. */
export function fatiguePenalty({ fatigue = 0, removed = 0, blocked = false }) {
    if (blocked) return Math.max(0, fatigue);
    return Math.max(0, fatigue - removed);
}

/** Fear rolls suffer -1 in a party of less than four, -2 alone. */
export function groupFearPenalty(partySize) {
    if (partySize <= 1) return 2;
    if (partySize < 4) return 1;
    return 0;
}

export const PANIC_TABLE = [
    { roll: 6, key: "gasp" },
    { roll: 5, key: "shout" },
    { roll: 4, key: "escape" },
    { roll: 3, key: "flee" },
    { roll: 2, key: "paralyzed" },
    { roll: 1, key: "paralyzedScream" },
];

export const panicResult = (d6) => PANIC_TABLE.find((r) => r.roll === d6) ?? PANIC_TABLE[PANIC_TABLE.length - 1];

/**
 * Evaluate a difficulty roll. A natural 1 always fails; with no difficulty the outcome is undefined.
 */
export function judgeRoll({ natural, total, difficulty = null }) {
    if (difficulty === null || difficulty === undefined || Number.isNaN(difficulty)) {
        return { success: null, criticalFail: natural === 1 };
    }
    if (natural === 1) return { success: false, criticalFail: true };
    return { success: total >= difficulty, criticalFail: false };
}

/**
 * Derived character values.
 * @param {{build:number,coordination:number,perception:number}} stats
 * @param {{target:string,value:number}[]} modifiers all trait/gear modifiers
 * @param {{key:string,mastered?:boolean,dv?:number}[]} skills owned skills (data with `dv`)
 */
export function deriveStats(stats, modifiers, skills = []) {
    const dodge = skills.reduce((n, s) => n + (s.dv ?? 0), 0);
    const life = BASE_LIFE + lifeFromBuild(stats.build) + sumModifiers(modifiers, ["life"]);
    const dv = BASE_DV + stats.coordination + dodge + sumModifiers(modifiers, ["dv"]);
    return {
        life,
        dv,
        meleeDamage: stats.build + sumModifiers(modifiers, ["damage:melee"]),
        rangedDamage: stats.coordination + sumModifiers(modifiers, ["damage:ranged"]),
        grapple: stats.build + sumModifiers(modifiers, ["grapple"]),
        halfLife: Math.floor(life / 2),
    };
}

/**
 * Work out how an attack with `weapon` is made.
 *
 * Unarmed attacks (a weapon with no dice and the "unarmed" tag, or no weapon at all) roll 1d6 halved and
 * rounded up. Skills whose weapon tags overlap the weapon's tags add to hit, damage and damage dice.
 * Melee damage adds Build, ranged damage (including thrown) adds Coordination.
 */
export function attackProfile({ weapon, skills = [], skillData = {}, stats, modifiers = [] }) {
    const tags = new Set(weapon?.tags ?? ["melee", "unarmed"]);
    const unarmed = !weapon || (weapon.dice === 0 && tags.has("unarmed"));
    const ranged = tags.has("ranged");
    const side = ranged ? "ranged" : "melee";

    let hit = 0;
    let flat = ranged ? stats.coordination : stats.build;
    let dice = unarmed ? 0 : weapon.dice;
    const notes = [];

    for (const owned of skills) {
        const spec = skillData[owned.key]?.weapon;
        if (!spec || !spec.tags.some((t) => tags.has(t))) continue;
        hit += spec.hit;
        flat += spec.damage;
        dice += spec.dice;
        notes.push(owned.key);
    }

    hit += sumModifiers(modifiers, [`hit:${side}`, ...[...tags].map((t) => `hit:${t}`)]);
    flat += sumModifiers(modifiers, [`damage:${side}`, ...[...tags].filter((t) => t !== side).map((t) => `damage:${t}`)]);

    const damageFormula = unarmed
        ? `ceil(1d6 / 2)${dice ? ` + ${dice}d6` : ""}`
        : `${dice}d6`;
    return { hit, flat, dice, unarmed, ranged, damageFormula, skillKeys: notes };
}

/** Damage formula string for Foundry's Roll, e.g. "2d6 + 3". */
export function damageFormula(profile) {
    if (!profile.flat) return profile.damageFormula;
    return `${profile.damageFormula} ${profile.flat < 0 ? "-" : "+"} ${Math.abs(profile.flat)}`;
}
