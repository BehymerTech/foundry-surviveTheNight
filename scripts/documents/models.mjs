/**
 * Data models for the Survive the Night actors and items.
 */
import { deriveStats, fatiguePenalty, STATS } from "../lib/rules.mjs";

const { SchemaField, NumberField, StringField, BooleanField, ArrayField, HTMLField } = foundry.data.fields;

const int = (initial = 0, extra = {}) => new NumberField({ required: true, nullable: false, integer: true, initial, ...extra });
const modifierField = () =>
    new ArrayField(new SchemaField({
        target: new StringField({ required: true, blank: false, initial: "fear" }),
        value: int(1),
    }));
const tagsField = () => new ArrayField(new StringField({ blank: false }));

/* -------------------------------------------- */
/*  Items                                       */
/* -------------------------------------------- */

export class SkillData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            key: new StringField({ required: true, blank: true, initial: "" }),
            stat: new StringField({ required: true, blank: true, initial: "", choices: ["", ...STATS] }),
            tags: tagsField(),
            mastered: new BooleanField({ initial: false }),
            free: new BooleanField({ initial: false }),
            dv: int(0),
            weaponBonus: new SchemaField({
                tags: tagsField(),
                hit: int(0),
                damage: int(0),
                dice: int(0),
            }),
            description: new HTMLField(),
        };
    }

    /** +2, or +3 with Training: Mastery. */
    get bonus() {
        return this.mastered ? 3 : 2;
    }

    /** Tags a roll with this skill carries. */
    get rollTags() {
        return [`skill:${this.key || this.parent.name}`, ...this.tags];
    }
}

export class TraitData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            key: new StringField({ required: true, blank: true, initial: "" }),
            kind: new StringField({ required: true, initial: "trait", choices: ["trait", "class"] }),
            cost: int(1),
            modifiers: modifierField(),
            fatigueRemoved: int(0, { min: 0 }),
            blocksFatigueRemoval: new BooleanField({ initial: false }),
            description: new HTMLField(),
        };
    }
}

export class GearData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            key: new StringField({ required: true, blank: true, initial: "" }),
            group: new StringField({ required: true, initial: "misc" }),
            cost: int(1),
            quantity: int(1, { min: 0 }),
            modifiers: modifierField(),
            fatigueRemoved: int(0, { min: 0 }),
            uses: new SchemaField({ value: int(0, { min: 0 }), max: int(0, { min: 0 }) }),
            weapon: new SchemaField({
                enabled: new BooleanField({ initial: false }),
                dice: int(1, { min: 0 }),
                tags: tagsField(),
                unarmed: new BooleanField({ initial: false }),
            }),
            description: new HTMLField(),
        };
    }

    /** Weapon data in the shape the rules library expects. */
    get weaponProfile() {
        const w = this.weapon;
        if (!w.enabled) return null;
        return { dice: w.dice, tags: [...w.tags], unarmed: w.unarmed, ranged: w.tags.includes("ranged") };
    }
}

/* -------------------------------------------- */
/*  Actors                                      */
/* -------------------------------------------- */

const statsSchema = () =>
    new SchemaField(Object.fromEntries(STATS.map((s) => [s, int(0, { min: -9, max: 9 })])));

class CreatureData extends foundry.abstract.TypeDataModel {
    /** Every modifier from traits, gear and skills, flattened. */
    #collectModifiers() {
        const mods = [];
        for (const item of this.parent.items) {
            if (item.type === "trait" || item.type === "gear") {
                const q = item.type === "gear" ? item.system.quantity : 1;
                if (q > 0) mods.push(...item.system.modifiers.map((m) => ({ target: m.target, value: m.value })));
            }
        }
        return mods;
    }

    get ownedSkills() {
        return this.parent.items
            .filter((i) => i.type === "skill")
            .map((i) => ({
                key: i.system.key || i.name,
                mastered: i.system.mastered,
                dv: i.system.dv,
                weapon: i.system.weaponBonus.tags.length ? { ...i.system.weaponBonus, tags: [...i.system.weaponBonus.tags] } : undefined,
            }));
    }

    prepareDerivedData() {
        const mods = this.#collectModifiers();
        const skills = this.ownedSkills;
        this.modifiers = mods;
        this.derived = deriveStats(this.stats, mods, skills);

        let removed = 0;
        let blocked = false;
        for (const item of this.parent.items) {
            if (item.type === "trait" || item.type === "gear") {
                removed += item.system.fatigueRemoved;
                blocked ||= !!item.system.blocksFatigueRemoval;
            }
        }
        this.fatiguePenalty = fatiguePenalty({ fatigue: this.fatigue, removed, blocked });
        this.life.max = this.derived.life;
        this.life.value = Math.min(this.life.value, this.life.max);
        this.life.pct = this.life.max ? Math.max(0, Math.min(100, (this.life.value / this.life.max) * 100)) : 0;
        this.winded = this.life.value <= Math.floor(this.life.max / 2);
    }
}

export class CharacterData extends CreatureData {
    static defineSchema() {
        return {
            classKey: new StringField({ required: true, blank: true, initial: "" }),
            ability: new StringField({ required: true, blank: true, initial: "" }),
            stats: statsSchema(),
            life: new SchemaField({
                value: int(20),
                max: int(20),
            }),
            fatigue: int(0, { min: 0 }),
            luckyBreaks: new SchemaField({ value: int(0, { min: 0 }), max: int(0, { min: 0 }) }),
            friendNearby: new BooleanField({ initial: false }),
            appearance: new StringField({ required: true, blank: true, initial: "" }),
            biography: new HTMLField(),
        };
    }
}

export class NpcData extends foundry.abstract.TypeDataModel {
    static defineSchema() {
        return {
            life: new SchemaField({ value: int(10), max: int(10, { min: 1 }) }),
            dv: int(4, { min: 0 }),
            attack: new SchemaField({
                label: new StringField({ required: true, blank: true, initial: "" }),
                hit: int(2),
                damage: new StringField({ required: true, initial: "1d6" }),
            }),
            fearDifficulty: int(4, { min: 0 }),
            abilities: new HTMLField(),
            biography: new HTMLField(),
        };
    }

    prepareDerivedData() {
        this.life.pct = this.life.max ? Math.max(0, Math.min(100, (this.life.value / this.life.max) * 100)) : 0;
    }
}
