/**
 * Step-by-step character creator. All rules live in lib/creator.mjs; this class only edits the state and shows it.
 */
import { emptyState, summarize, selectableSkills, selectableGear, classGrants } from "../lib/creator.mjs";
import { characterData } from "../lib/items.mjs";
import { CLASSES, GROUPS, CLASSES_BY_KEY } from "../data/classes.mjs";
import { SKILLS_BY_KEY } from "../data/skills.mjs";
import { TRAITS, TRAITS_BY_KEY, ABILITIES_BY_KEY } from "../data/traits.mjs";
import { GEAR_BY_KEY } from "../data/gear.mjs";
import { SAMPLES } from "../data/samples.mjs";
import { STATS, STAT_LIMIT, signed } from "../lib/rules.mjs";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));

const STEPS = ["class", "stats", "skills", "traits", "gear", "review"];

export class CharacterCreator extends HandlebarsApplicationMixin(ApplicationV2) {
    static DEFAULT_OPTIONS = {
        id: "stn-creator",
        classes: ["stn", "stn-creator"],
        position: { width: 900, height: 740 },
        window: { title: "STN.Creator.title", icon: "fa-solid fa-ghost", resizable: true },
        actions: {
            step: CharacterCreator._onStep,
            next: CharacterCreator._onNext,
            back: CharacterCreator._onBack,
            pickClass: CharacterCreator._onPickClass,
            pickAbility: CharacterCreator._onPickAbility,
            stat: CharacterCreator._onStat,
            toggleSkill: CharacterCreator._onToggleSkill,
            toggleFreePick: CharacterCreator._onToggleFreePick,
            trait: CharacterCreator._onTrait,
            toggleGear: CharacterCreator._onToggleGear,
            addGear: CharacterCreator._onAddGear,
            removeGear: CharacterCreator._onRemoveGear,
            addTrait: CharacterCreator._onAddTrait,
            removeTrait: CharacterCreator._onRemoveTrait,
            lucky: CharacterCreator._onLucky,
            sample: CharacterCreator._onSample,
            reset: CharacterCreator._onReset,
            create: CharacterCreator._onCreate,
        },
    };

    static PARTS = {
        main: { template: "systems/survive-the-night/templates/creator.hbs", scrollable: [".stn-step-body"] },
    };

    #state = emptyState();
    #step = "class";

    static open() {
        const existing = foundry.applications.instances.get("stn-creator");
        if (existing) return existing.bringToFront();
        return new CharacterCreator().render({ force: true });
    }

    /* -------------------------------------------- */
    /*  Context                                     */
    /* -------------------------------------------- */

    async _prepareContext(options) {
        const context = await super._prepareContext(options);
        const sum = summarize(this.#state);
        const cls = sum.cls;
        const st = this.#state;
        const stepIndex = STEPS.indexOf(this.#step);

        context.steps = STEPS.map((id, i) => ({
            id,
            label: t(`STN.Creator.step.${id}`),
            active: id === this.#step,
            done: i < stepIndex,
            locked: !cls && id !== "class",
        }));
        context.step = this.#step;
        context.isFirst = stepIndex === 0;
        context.isLast = stepIndex === STEPS.length - 1;
        context.canAdvance = !!cls;
        context.name = st.name;
        context.hasClass = !!cls;

        // Points bar
        context.points = {
            ...sum.points,
            over: sum.points.remaining < 0,
            pips: Array.from({ length: sum.points.budget }, (_, i) => ({ filled: i < Math.max(0, sum.points.spent) })),
        };
        context.errors = sum.errors.map((e) => t(`STN.CreatorError.${e.code}`, errorArgs(e)));
        context.warnings = sum.warnings.map((e) => t(`STN.CreatorWarning.${e.code}`, e));
        context.ok = sum.ok;

        // Class step
        context.groups = Object.entries(GROUPS).map(([id, g]) => ({
            id,
            name: g.name,
            note: g.note,
            classes: CLASSES.filter((c) => c.group === id).map((c) => ({
                key: c.key,
                name: c.name,
                summary: c.summary,
                selected: c.key === st.classKey,
            })),
        }));
        context.samples = SAMPLES.map((s) => ({ name: s.name, class: CLASSES_BY_KEY[s.classKey].name, index: SAMPLES.indexOf(s) }));
        context.classInfo = cls && {
            name: cls.name,
            summary: cls.summary,
            skills: cls.skills.map((k) => SKILLS_BY_KEY[k].name).join(", ") || t("STN.Creator.noClassSkills"),
            abilities: cls.abilities
                .map((k) => ABILITIES_BY_KEY[k])
                .filter(Boolean)
                .map((a) => ({ name: a.name, note: a.note })),
            chooseAbility: cls.chooseAbility?.map((k) => ({
                key: k,
                name: ABILITIES_BY_KEY[k].name,
                note: ABILITIES_BY_KEY[k].note,
                selected: st.ability === k,
            })),
            freeSkills: cls.freeSkills.map((k) => SKILLS_BY_KEY[k].name),
            freeGear: cls.freeGear,
        };

        // Stats step
        const free = cls ? classGrants(cls).stats : {};
        context.stats = STATS.map((stat) => {
            const bought = st.stats[stat] ?? 0;
            const total = sum.totals[stat];
            return {
                key: stat,
                label: t(`STN.Stat.${stat}`),
                text: t(`STN.Creator.statText.${stat}`),
                free: free[stat] ?? 0,
                bought,
                total,
                totalText: signed(total),
                canUp: total < STAT_LIMIT,
                canDown: total > -STAT_LIMIT,
            };
        });
        context.statLimit = STAT_LIMIT;

        // Skills step
        const lists = selectableSkills(cls);
        const classSkills = lists.class.filter((k) => !sum.freeSkills.includes(k));
        const row = (key) => {
            const s = SKILLS_BY_KEY[key];
            return {
                key,
                name: s.name,
                note: s.note,
                selected: st.skills.includes(key),
                traded: sum.tradedSkills.includes(key),
            };
        };
        context.classSkills = classSkills.map(row);
        context.commonSkills = lists.common.filter((k) => !sum.freeSkills.includes(k)).map(row);
        context.freeSkills = sum.freeSkills.map((k) => ({
            name: SKILLS_BY_KEY[k].name,
            pickable: cls.freePicks > 0 && cls.skills.includes(k),
            picked: st.freePicks.includes(k),
            key: k,
        }));
        context.freePickList = cls?.freePicks
            ? cls.skills.filter((k) => !cls.freeSkills.includes(k)).map((k) => ({
                key: k,
                name: SKILLS_BY_KEY[k].name,
                picked: st.freePicks.includes(k),
            }))
            : [];
        context.freePicksNeeded = cls?.freePicks ?? 0;
        context.slots = sum.slots;
        context.canMaster = st.skills.includes("training-mastery");
        context.masteryOptions = sum.skillKeys
            .filter((k) => k !== "training-mastery")
            .map((k) => ({ key: k, name: SKILLS_BY_KEY[k].name, selected: st.mastery === k }));

        // Lucky Breaks (Followers)
        context.lucky = cls?.luckyBreaks
            ? {
                  left: cls.luckyBreaks - st.luckyTrades.length,
                  max: cls.luckyBreaks,
                  trades: st.luckyTrades.map((tr, i) => ({
                      index: i,
                      label: tr.kind === "skill" ? SKILLS_BY_KEY[tr.key]?.name : GEAR_BY_KEY[tr.key]?.name,
                      kind: tr.kind,
                  })),
                  skills: Object.values(SKILLS_BY_KEY)
                      .filter((s) => s.key !== "training-mastery")
                      .map((s) => ({ key: s.key, name: s.name })),
                  gear: Object.values(GEAR_BY_KEY).filter((g) => g.group !== "class").map((g) => ({ key: g.key, name: g.name })),
              }
            : null;

        // Traits step
        const traitRow = (tr) => ({
            key: tr.key,
            name: tr.name,
            cost: tr.cost,
            costText: signed(tr.cost),
            note: tr.note,
            count: st.traits[tr.key] ?? 0,
            stack: !!tr.stack,
            selected: (st.traits[tr.key] ?? 0) > 0,
        });
        context.traitGroups = [
            { id: "one", label: t("STN.Creator.traitGroup.one"), traits: TRAITS.filter((x) => x.cost === 1).map(traitRow) },
            { id: "two", label: t("STN.Creator.traitGroup.two"), traits: TRAITS.filter((x) => x.cost === 2).map(traitRow) },
            { id: "neg", label: t("STN.Creator.traitGroup.negative"), traits: TRAITS.filter((x) => x.cost < 0).map(traitRow) },
        ];
        context.customTraits = st.customTraits.map((c, i) => ({ ...c, index: i, costText: signed(Number(c.cost) || 0) }));

        // Gear step
        const gearKeys = selectableGear(cls);
        const gearRow = (key) => {
            const g = GEAR_BY_KEY[key];
            return { key, name: g.name, cost: g.cost, note: g.note, selected: st.gear.includes(key), group: g.group };
        };
        context.gearGroups = [
            { id: "utility", label: t("STN.Creator.gearGroup.utility"), items: gearKeys.filter((k) => GEAR_BY_KEY[k].group === "utility").map(gearRow) },
            { id: "weapon", label: t("STN.Creator.gearGroup.weapon"), items: gearKeys.filter((k) => GEAR_BY_KEY[k].group === "weapon").map(gearRow) },
            { id: "misc", label: t("STN.Creator.gearGroup.misc"), items: gearKeys.filter((k) => GEAR_BY_KEY[k].group === "misc").map(gearRow) },
            { id: "class", label: t("STN.Creator.gearGroup.class"), items: gearKeys.filter((k) => GEAR_BY_KEY[k].group === "class").map(gearRow) },
        ].filter((g) => g.items.length);
        context.customGear = st.customGear.map((name, index) => ({ name, index }));

        // Review step
        context.review = {
            className: cls?.name,
            life: sum.derived.life,
            dv: sum.derived.dv,
            stats: STATS.map((stat) => ({ label: t(`STN.Stat.${stat}`), value: signed(sum.totals[stat]) })),
            abilities: sum.abilityKeys.map((k) => ABILITIES_BY_KEY[k].name),
            skills: sum.skillKeys.map((k) => SKILLS_BY_KEY[k].name + (st.mastery === k ? " ★" : "")),
            traits: sum.traitList.map((tr) => (tr.count > 1 ? `${tr.name} ×${tr.count}` : tr.name)),
            gear: [...sum.gearPicks.map((p) => p.name), ...sum.tradedGear.map((k) => GEAR_BY_KEY[k].name)],
        };
        return context;
    }

    _onRender(context, options) {
        super._onRender?.(context, options);
        const nameInput = this.element.querySelector("[name=charName]");
        nameInput?.addEventListener("change", (e) => {
            this.#state.name = e.target.value;
        });
        this.element.querySelector("[name=mastery]")?.addEventListener("change", (e) => {
            this.#state.mastery = e.target.value || null;
            this.render();
        });
        this.element.querySelectorAll("[name=luckyPick]").forEach((sel) => {
            sel.addEventListener("change", (e) => {
                if (!e.target.value) return;
                const kind = e.target.dataset.kind;
                this.#state.luckyTrades.push({ kind, key: e.target.value });
                this.render();
            });
        });
    }

    /* -------------------------------------------- */
    /*  Actions                                     */
    /* -------------------------------------------- */

    #go(step) {
        if (!STEPS.includes(step)) return;
        if (!this.#state.classKey && step !== "class") return;
        this.#step = step;
        this.render();
    }

    static _onStep(event, target) {
        this.#go(target.dataset.step);
    }

    static _onNext() {
        this.#go(STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(this.#step) + 1)]);
    }

    static _onBack() {
        this.#go(STEPS[Math.max(0, STEPS.indexOf(this.#step) - 1)]);
    }

    static _onPickClass(event, target) {
        const key = target.dataset.class;
        if (this.#state.classKey === key) return;
        const keep = { name: this.#state.name };
        this.#state = { ...emptyState(), ...keep, classKey: key };
        this.render();
    }

    static _onPickAbility(event, target) {
        this.#state.ability = target.dataset.key;
        this.render();
    }

    static _onStat(event, target) {
        const stat = target.dataset.stat;
        const delta = Number(target.dataset.delta);
        const next = (this.#state.stats[stat] ?? 0) + delta;
        const cls = CLASSES_BY_KEY[this.#state.classKey];
        const total = (cls?.freeStats?.[stat] ?? 0) + next;
        if (Math.abs(total) > STAT_LIMIT) return;
        this.#state.stats[stat] = next;
        this.render();
    }

    static _onToggleSkill(event, target) {
        const key = target.dataset.key;
        const list = this.#state.skills;
        const i = list.indexOf(key);
        if (i >= 0) {
            list.splice(i, 1);
            if (key === "training-mastery") this.#state.mastery = null;
            if (this.#state.mastery === key) this.#state.mastery = null;
        } else list.push(key);
        this.render();
    }

    static _onToggleFreePick(event, target) {
        const key = target.dataset.key;
        const cls = CLASSES_BY_KEY[this.#state.classKey];
        const list = this.#state.freePicks;
        const i = list.indexOf(key);
        if (i >= 0) list.splice(i, 1);
        else if (list.length < (cls?.freePicks ?? 0)) {
            list.push(key);
            // A free pick can no longer also be bought
            this.#state.skills = this.#state.skills.filter((k) => k !== key);
        }
        this.render();
    }

    static _onTrait(event, target) {
        const key = target.dataset.key;
        const delta = Number(target.dataset.delta);
        const spec = TRAITS_BY_KEY[key];
        const cur = this.#state.traits[key] ?? 0;
        const next = Math.max(0, spec.stack ? cur + delta : Math.min(1, cur + delta));
        if (next) this.#state.traits[key] = next;
        else delete this.#state.traits[key];
        this.render();
    }

    static _onToggleGear(event, target) {
        const key = target.dataset.key;
        const list = this.#state.gear;
        const i = list.indexOf(key);
        if (i >= 0) list.splice(i, 1);
        else list.push(key);
        this.render();
    }

    static _onAddGear() {
        const input = this.element.querySelector("[name=customGearName]");
        const name = input?.value.trim();
        if (!name) return;
        this.#state.customGear.push(name);
        this.render();
    }

    static _onRemoveGear(event, target) {
        this.#state.customGear.splice(Number(target.dataset.index), 1);
        this.render();
    }

    static _onAddTrait() {
        const name = this.element.querySelector("[name=customTraitName]")?.value.trim();
        const cost = Number(this.element.querySelector("[name=customTraitCost]")?.value);
        const note = this.element.querySelector("[name=customTraitNote]")?.value.trim() ?? "";
        if (!name || !Number.isFinite(cost)) {
            ui.notifications.warn(t("STN.Creator.customTraitMissing"));
            return;
        }
        this.#state.customTraits.push({ name, cost: Math.trunc(cost), note, modifiers: [] });
        this.render();
    }

    static _onRemoveTrait(event, target) {
        this.#state.customTraits.splice(Number(target.dataset.index), 1);
        this.render();
    }

    static _onLucky(event, target) {
        this.#state.luckyTrades.splice(Number(target.dataset.index), 1);
        this.render();
    }

    static _onSample(event, target) {
        const sample = SAMPLES[Number(target.dataset.index)];
        const { expect, ...rest } = sample;
        this.#state = { ...emptyState(), ...structuredClone(rest), stats: { ...emptyState().stats, ...rest.stats } };
        this.#step = "review";
        this.render();
    }

    static _onReset() {
        this.#state = emptyState();
        this.#step = "class";
        this.render();
    }

    static async _onCreate() {
        const sum = summarize(this.#state);
        if (!sum.ok) {
            ui.notifications.error(t("STN.Creator.fixErrors"));
            return;
        }
        if (!game.user.can("ACTOR_CREATE")) {
            ui.notifications.error(t("STN.Creator.noPermission"));
            return;
        }
        const name = this.element.querySelector("[name=charName]")?.value.trim() || this.#state.name || sum.cls.name;
        const data = characterData(sum, { name });
        data.prototypeToken = {
            name,
            actorLink: true,
            disposition: 1,
            bar1: { attribute: "life" },
        };
        const actor = await Actor.create(data);
        if (!actor) return;
        ui.notifications.info(t("STN.Creator.created", { name: actor.name }));
        await this.close();
        actor.sheet.render({ force: true });
    }
}

function errorArgs(e) {
    const args = { ...e };
    if (e.key) args.name = SKILLS_BY_KEY[e.key]?.name ?? TRAITS_BY_KEY[e.key]?.name ?? GEAR_BY_KEY[e.key]?.name ?? e.key;
    if (e.other) args.other = TRAITS_BY_KEY[e.other]?.name ?? e.other;
    if (e.stat) args.stat = t(`STN.Stat.${e.stat}`);
    return args;
}
