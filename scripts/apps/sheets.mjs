/**
 * Actor and item sheets (ApplicationV2 + Handlebars).
 */
import { CLASSES_BY_KEY } from "../data/classes.mjs";
import { signed } from "../lib/rules.mjs";
import { rollCommon, rollSkill, rollPanic, rollAttack, rollNpcAttack, useLuckyBreak } from "../rolls.mjs";
import { CharacterCreator } from "./creator.mjs";

const { HandlebarsApplicationMixin } = foundry.applications.api;
const { ActorSheetV2, ItemSheetV2 } = foundry.applications.sheets;
const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

const itemRow = (item) => ({
    id: item.id,
    name: item.name,
    img: item.img,
    system: item.system,
    uuid: item.uuid,
});

/* -------------------------------------------- */
/*  Character                                   */
/* -------------------------------------------- */

export class CharacterSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ["stn", "stn-sheet", "character"],
        position: { width: 760, height: 820 },
        window: { resizable: true },
        form: { submitOnChange: true },
        actions: {
            check: CharacterSheet._onCheck,
            skill: CharacterSheet._onSkill,
            panic: CharacterSheet._onPanic,
            attack: CharacterSheet._onAttack,
            lucky: CharacterSheet._onLucky,
            fatigue: CharacterSheet._onFatigue,
            life: CharacterSheet._onLife,
            editItem: CharacterSheet._onEditItem,
            deleteItem: CharacterSheet._onDeleteItem,
            newItem: CharacterSheet._onNewItem,
            toggleMastery: CharacterSheet._onToggleMastery,
            creator: CharacterSheet._onCreator,
        },
    };

    static PARTS = {
        body: { template: "systems/survive-the-night/templates/character-sheet.hbs", scrollable: [""] },
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const actor = this.actor;
        const sys = actor.system;
        const cls = CLASSES_BY_KEY[sys.classKey];
        const items = [...actor.items];
        const byName = (a, b) => a.name.localeCompare(b.name);

        context.actor = actor;
        context.system = sys;
        context.editable = this.isEditable;
        context.className = cls?.name ?? "";
        context.stats = ["build", "coordination", "perception"].map((key) => ({
            key,
            label: t(`STN.Stat.${key}`),
            value: sys.stats[key],
            text: signed(sys.stats[key]),
            hint: t(`STN.Stat.${key}Hint`),
        }));
        context.derived = {
            ...sys.derived,
            meleeText: signed(sys.derived.meleeDamage),
            rangedText: signed(sys.derived.rangedDamage),
            grappleText: signed(sys.derived.grapple),
        };
        context.skills = items.filter((i) => i.type === "skill").sort(byName).map((i) => ({
            ...itemRow(i),
            bonus: signed(i.system.bonus),
            stat: i.system.stat ? t(`STN.Stat.${i.system.stat}`) : "",
        }));
        context.traits = items.filter((i) => i.type === "trait" && i.system.kind === "trait").sort(byName).map(itemRow);
        context.abilities = items.filter((i) => i.type === "trait" && i.system.kind === "class").sort(byName).map(itemRow);
        context.gear = items.filter((i) => i.type === "gear").sort(byName).map((i) => ({
            ...itemRow(i),
            weapon: i.system.weapon.enabled,
            hasUses: i.system.uses.max > 0,
        }));
        context.canAttackUnarmed = true;
        context.fatigueText = sys.fatiguePenalty ? `−${sys.fatiguePenalty}` : "0";
        context.isWingman = sys.classKey === "wingman";
        context.hasLucky = sys.luckyBreaks.max > 0;
        context.hasPendingCreate = !sys.classKey;
        context.biography = await foundry.applications.ux.TextEditor.implementation.enrichHTML(sys.biography, {
            secrets: actor.isOwner,
            relativeTo: actor,
        });
        return context;
    }

    /** The embedded item whose row contains the clicked element. */
    #item(target) {
        return this.actor.items.get(target.closest("[data-item-id]")?.dataset.itemId);
    }

    static _onCheck(event, target) {
        return rollCommon(this.actor, target.dataset.check, event);
    }

    static _onSkill(event, target) {
        const item = this.#item(target);
        if (item) return rollSkill(this.actor, item, event);
    }

    static _onPanic() {
        return rollPanic(this.actor);
    }

    static _onAttack(event, target) {
        const item = target.dataset.itemId ? this.actor.items.get(target.dataset.itemId) : null;
        return rollAttack(this.actor, item, event);
    }

    static _onLucky() {
        return useLuckyBreak(this.actor);
    }

    static _onFatigue(event, target) {
        const delta = Number(target.dataset.delta);
        return this.actor.update({ "system.fatigue": Math.max(0, this.actor.system.fatigue + delta) });
    }

    static _onLife(event, target) {
        const delta = Number(target.dataset.delta);
        const life = this.actor.system.life;
        return this.actor.update({ "system.life.value": Math.max(0, Math.min(life.max, life.value + delta)) });
    }

    static _onEditItem(event, target) {
        this.#item(target)?.sheet.render({ force: true });
    }

    static async _onDeleteItem(event, target) {
        const item = this.#item(target);
        if (!item) return;
        const ok = await foundry.applications.api.DialogV2.confirm({
            window: { title: t("STN.Sheet.deleteTitle", { name: item.name }) },
            content: `<p>${t("STN.Sheet.deleteText", { name: item.name })}</p>`,
            rejectClose: false,
        });
        if (ok) await item.delete();
    }

    static async _onNewItem(event, target) {
        const type = target.dataset.type;
        const [item] = await this.actor.createEmbeddedDocuments("Item", [{ name: t(`STN.Sheet.new.${type}`), type }]);
        item?.sheet.render({ force: true });
    }

    static _onToggleMastery(event, target) {
        const item = this.#item(target);
        if (item) return item.update({ "system.mastered": !item.system.mastered });
    }

    static _onCreator() {
        return CharacterCreator.open();
    }
}

/* -------------------------------------------- */
/*  NPC / monster                               */
/* -------------------------------------------- */

export class NpcSheet extends HandlebarsApplicationMixin(ActorSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ["stn", "stn-sheet", "npc"],
        position: { width: 520, height: 600 },
        window: { resizable: true },
        form: { submitOnChange: true },
        actions: {
            attack: NpcSheet._onAttack,
            life: NpcSheet._onLife,
            fear: NpcSheet._onFear,
        },
    };

    static PARTS = {
        body: { template: "systems/survive-the-night/templates/npc-sheet.hbs", scrollable: [""] },
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const { TextEditor } = foundry.applications.ux;
        context.actor = this.actor;
        context.system = this.actor.system;
        context.editable = this.isEditable;
        const enrich = (html) => TextEditor.implementation.enrichHTML(html, { secrets: this.actor.isOwner, relativeTo: this.actor });
        context.abilities = await enrich(this.actor.system.abilities);
        context.biography = await enrich(this.actor.system.biography);
        return context;
    }

    static _onAttack(event) {
        return rollNpcAttack(this.actor, event);
    }

    static _onLife(event, target) {
        const delta = Number(target.dataset.delta);
        const life = this.actor.system.life;
        return this.actor.update({ "system.life.value": Math.max(0, Math.min(life.max, life.value + delta)) });
    }

    /** Remind the Narrator which difficulty to call for when this creature is first seen. */
    static _onFear() {
        const dc = this.actor.system.fearDifficulty;
        return ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: this.actor }),
            content: `<div class="stn-card"><h3>${t("STN.Npc.fearCall")}</h3><p>${t("STN.Npc.fearText", { dc, name: this.actor.name })}</p></div>`,
            whisper: ChatMessage.getWhisperRecipients("GM"),
        });
    }
}

/* -------------------------------------------- */
/*  Items                                       */
/* -------------------------------------------- */

const LIST_FIELDS = ["system.tags", "system.weapon.tags", "system.weaponBonus.tags"];

export class ItemSheet extends HandlebarsApplicationMixin(ItemSheetV2) {
    static DEFAULT_OPTIONS = {
        classes: ["stn", "stn-sheet", "item"],
        position: { width: 480, height: 560 },
        window: { resizable: true },
        form: { submitOnChange: true },
        actions: {
            addModifier: ItemSheet._onAddModifier,
            removeModifier: ItemSheet._onRemoveModifier,
        },
    };

    static PARTS = {
        body: { template: "systems/survive-the-night/templates/item-sheet.hbs", scrollable: [""] },
    };

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const item = this.item;
        context.item = item;
        context.system = item.system;
        context.editable = this.isEditable;
        context.type = item.type;
        context.isSkill = item.type === "skill";
        context.isTrait = item.type === "trait";
        context.isGear = item.type === "gear";
        context.tags = (item.system.tags ?? []).join(", ");
        context.weaponTags = (item.system.weapon?.tags ?? []).join(", ");
        context.bonusTags = (item.system.weaponBonus?.tags ?? []).join(", ");
        context.stats = ["", "build", "coordination", "perception"].map((k) => ({
            key: k,
            label: k ? t(`STN.Stat.${k}`) : "—",
            selected: item.system.stat === k,
        }));
        context.description = await foundry.applications.ux.TextEditor.implementation.enrichHTML(item.system.description, {
            secrets: item.isOwner,
            relativeTo: item,
        });
        return context;
    }

    _processFormData(event, form, formData) {
        const data = super._processFormData(event, form, formData);
        for (const path of LIST_FIELDS) {
            const value = foundry.utils.getProperty(data, path);
            if (typeof value === "string") {
                foundry.utils.setProperty(data, path, value.split(",").map((s) => s.trim()).filter(Boolean));
            }
        }
        return data;
    }

    static _onAddModifier() {
        const mods = this.item.system.modifiers.map((m) => ({ target: m.target, value: m.value }));
        mods.push({ target: "fear", value: 1 });
        return this.item.update({ "system.modifiers": mods });
    }

    static _onRemoveModifier(event, target) {
        const mods = this.item.system.modifiers.map((m) => ({ target: m.target, value: m.value }));
        mods.splice(Number(target.dataset.index), 1);
        return this.item.update({ "system.modifiers": mods });
    }
}
