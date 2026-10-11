/**
 * Turns catalogue entries and creation summaries into Foundry document data. Pure: no Foundry globals.
 */
import { SKILLS_BY_KEY } from "../data/skills.mjs";
import { GEAR_BY_KEY } from "../data/gear.mjs";
import { TRAITS_BY_KEY, ABILITIES_BY_KEY } from "../data/traits.mjs";
import { CLASSES_BY_KEY } from "../data/classes.mjs";

const html = (text) => (text ? `<p>${text}</p>` : "");

export function skillItemData(key, { mastered = false, free = false } = {}) {
    const s = SKILLS_BY_KEY[key];
    return {
        name: s.name,
        type: "skill",
        system: {
            key,
            stat: s.stat ?? "",
            tags: [...s.tags],
            mastered,
            free,
            dv: s.dv ?? 0,
            weaponBonus: s.weapon ? { ...s.weapon, tags: [...s.weapon.tags] } : { tags: [], hit: 0, damage: 0, dice: 0 },
            description: html(s.note),
        },
    };
}

function traitSystem(spec, kind) {
    return {
        key: spec.key ?? "",
        kind,
        cost: spec.cost ?? 0,
        modifiers: (spec.modifiers ?? []).map((m) => ({ target: m.target, value: m.value })),
        fatigueRemoved: spec.fatigueRemoved ?? 0,
        blocksFatigueRemoval: !!spec.blocksFatigueRemoval,
        description: html(spec.note),
    };
}

export function traitItemData(key, { kind = "trait" } = {}) {
    const spec = TRAITS_BY_KEY[key] ?? ABILITIES_BY_KEY[key];
    return { name: spec.name, type: "trait", system: traitSystem(spec, kind) };
}

export function customTraitItemData(spec) {
    return { name: spec.name, type: "trait", system: traitSystem(spec, "trait") };
}

export function gearItemData(key) {
    const g = GEAR_BY_KEY[key];
    return gearFromSpec(g);
}

export function customGearItemData(name) {
    return gearFromSpec({ key: "", name, cost: 1, group: "misc", note: "", modifiers: [] });
}

function gearFromSpec(g) {
    return {
        name: g.name,
        type: "gear",
        system: {
            key: g.key ?? "",
            group: g.group ?? "misc",
            cost: g.cost ?? 1,
            quantity: 1,
            modifiers: (g.modifiers ?? []).map((m) => ({ target: m.target, value: m.value })),
            fatigueRemoved: g.fatigueRemoved ?? 0,
            uses: { value: g.uses ?? 0, max: g.uses ?? 0 },
            weapon: g.weapon
                ? { enabled: true, dice: g.weapon.dice, tags: [...g.weapon.tags], unarmed: !!g.weapon.unarmed }
                : { enabled: false, dice: 0, tags: [], unarmed: false },
            description: html(g.note),
        },
    };
}

/**
 * Full actor data for a validated creation summary (the result of `summarize`).
 */
export function characterData(summary, { name } = {}) {
    const { state, cls, totals } = summary;
    const items = [];
    for (const key of summary.abilityKeys) items.push(traitItemData(key, { kind: "class" }));
    for (const key of summary.skillKeys) {
        items.push(skillItemData(key, {
            mastered: state.mastery === key,
            free: summary.freeSkills.includes(key) || summary.tradedSkills.includes(key),
        }));
    }
    for (const t of summary.traitList) {
        const entry = t.custom ? customTraitItemData(t) : traitItemData(t.key);
        for (let i = 0; i < t.count; i++) items.push(structuredClone(entry));
    }
    for (const p of summary.gearPicks) items.push(p.key ? gearItemData(p.key) : customGearItemData(p.name));
    for (const key of summary.tradedGear) items.push(gearItemData(key));

    const life = summary.derived.life;
    return {
        name: name || state.name || cls.name,
        type: "character",
        system: {
            classKey: cls.key,
            ability: state.ability ?? "",
            stats: { ...totals },
            life: { value: life, max: life },
            luckyBreaks: { value: cls.luckyBreaks - state.luckyTrades.length, max: cls.luckyBreaks },
            fatigue: 0,
        },
        items,
    };
}

export const classLabel = (key) => CLASSES_BY_KEY[key]?.name ?? key;
