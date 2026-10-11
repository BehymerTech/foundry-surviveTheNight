/**
 * Chat-integrated rolls: difficulty rolls, Fear and Panic!, attacks and Lucky Breaks.
 */
import { judgeRoll, panicResult, signed, attackProfile, damageFormula } from "./lib/rules.mjs";
import { buildCheck, COMMON_CHECKS } from "./lib/checks.mjs";

const { DialogV2 } = foundry.applications.api;
const t = (key, data) => (data ? game.i18n.format(key, data) : game.i18n.localize(key));
const esc = (s) => foundry.utils.escapeHTML(String(s));

export const partySize = () => game.settings.get("survive-the-night", "partySize");

/** Dodge Value of the first targeted token, if any. */
function targetedDv() {
    const actor = [...(game.user?.targets ?? [])][0]?.actor;
    return actor?.system?.derived?.dv ?? actor?.system?.dv ?? null;
}

/** What the rules library needs to know about an actor. */
function view(actor) {
    const s = actor.system;
    return {
        stats: s.stats,
        modifiers: s.modifiers,
        skills: s.ownedSkills,
        fatiguePenalty: s.fatiguePenalty,
    };
}

const num = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
};

async function askRoll({ title, difficulty = true, difficultyValue = "", stat = undefined, hint = "" }) {
    const statOptions = ["", "build", "coordination", "perception"]
        .map((k) => `<option value="${k}" ${k === (stat ?? "") ? "selected" : ""}>${k ? t(`STN.Stat.${k}`) : t("STN.Roll.noStat")}</option>`)
        .join("");
    const content = `
        <div class="stn-roll-dialog">
            ${hint ? `<p class="hint">${esc(hint)}</p>` : ""}
            ${difficulty ? `<div class="form-group"><label>${t("STN.Roll.difficulty")}</label>
                <div class="form-fields"><input type="number" name="difficulty" value="${esc(difficultyValue)}" placeholder="—"></div></div>` : ""}
            ${stat !== undefined ? `<div class="form-group"><label>${t("STN.Roll.addStat")}</label>
                <div class="form-fields"><select name="stat">${statOptions}</select></div></div>` : ""}
            <div class="form-group"><label>${t("STN.Roll.modifier")}</label>
                <div class="form-fields"><input type="number" name="extra" value="0"></div></div>
        </div>`;
    const result = await DialogV2.input({
        window: { title },
        content,
        ok: { label: t("STN.Roll.roll"), icon: "fa-solid fa-dice-d6" },
        rejectClose: false,
    });
    if (!result) return null;
    return {
        difficulty: result.difficulty === "" || result.difficulty == null ? null : num(result.difficulty),
        extra: num(result.extra),
        stat: result.stat ?? stat,
    };
}

function partsHtml(parts) {
    return parts
        .map((p) => {
            const label = p.label ? t(`STN.Stat.${p.label}`) : t(`STN.Roll.part.${p.key}`);
            return `<li><span>${esc(label)}</span><b>${signed(p.value)}</b></li>`;
        })
        .join("");
}

function verdictHtml(verdict, difficulty) {
    if (verdict.success === null) return verdict.criticalFail ? `<p class="stn-verdict fail">${t("STN.Roll.naturalOne")}</p>` : "";
    const key = verdict.success ? "success" : verdict.criticalFail ? "naturalOneFail" : "fail";
    return `<p class="stn-verdict ${verdict.success ? "success" : "fail"}">${t(`STN.Roll.${key}`, { dc: difficulty })}</p>`;
}

/**
 * Roll d6 + bonuses against an optional difficulty and post it to chat.
 * @returns {Promise<{roll:Roll, verdict:object}|null>}
 */
export async function rollCheck(actor, def, { label, event = null, askStat = false } = {}) {
    let opts = { difficulty: null, extra: 0, stat: def.stat };
    if (!event?.shiftKey) {
        const answer = await askRoll({
            title: label,
            stat: askStat ? (def.stat ?? "") : undefined,
            hint: def.tags.includes?.("fear") ? t("STN.Roll.fearHint") : "",
        });
        if (!answer) return null;
        opts = answer;
    }
    const used = { ...def, stat: opts.stat || null };
    const check = buildCheck(view(actor), used, { extra: opts.extra, partySize: partySize() });
    const roll = await new Roll(check.bonus ? `1d6 ${check.bonus < 0 ? "-" : "+"} ${Math.abs(check.bonus)}` : "1d6").evaluate();
    const natural = roll.dice[0].total;
    const verdict = judgeRoll({ natural, total: roll.total, difficulty: opts.difficulty });

    const failedFear = used.tags.includes("fear") && verdict.success === false;
    const panicButton = used.tags.includes("fear") && verdict.success === null
        ? `<button type="button" class="stn-panic-button" data-actor-uuid="${actor.uuid}"><i class="fa-solid fa-skull"></i> ${t("STN.Roll.rollPanic")}</button>`
        : "";
    const flavor = `<div class="stn-card">
        <h3>${esc(label)}</h3><ul class="stn-parts">${partsHtml(check.parts)}</ul>
        ${verdictHtml(verdict, opts.difficulty)}${panicButton}</div>`;
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });

    if (failedFear) await rollPanic(actor, { auto: true });
    return { roll, verdict };
}

/** Roll for a skill item. */
export function rollSkill(actor, item, event) {
    const s = item.system;
    const def = { tags: s.rollTags, stat: s.stat || null };
    return rollCheck(actor, def, { label: item.name, event, askStat: true });
}

export function rollCommon(actor, name, event) {
    return rollCheck(actor, COMMON_CHECKS[name], { label: t(`STN.Check.${name}`), event });
}

/**
 * Roll on the Panic! table. A Wingman with their friend nearby rolls two dice and keeps the highest.
 */
export async function rollPanic(actor, { auto = false } = {}) {
    const wingman = actor.system.classKey === "wingman" && actor.system.friendNearby;
    const check = buildCheck(view(actor), COMMON_CHECKS.panic, { partySize: partySize() });
    const base = wingman ? "2d6kh" : "1d6";
    const formula = check.bonus ? `${base} ${check.bonus < 0 ? "-" : "+"} ${Math.abs(check.bonus)}` : base;
    const roll = await new Roll(formula).evaluate();
    const table = Math.max(1, Math.min(6, roll.total));
    const result = panicResult(table);
    const flavor = `<div class="stn-card">
        <h3>${t("STN.Check.panic")}${wingman ? ` <small>${t("STN.Roll.wingman")}</small>` : ""}</h3>
        <ul class="stn-parts">${partsHtml(check.parts)}</ul>
        <p class="stn-panic"><b>${t(`STN.Panic.${result.key}.name`)}</b> ${t(`STN.Panic.${result.key}.text`)}</p></div>`;
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
    return { roll, result, auto };
}

/** Spend a Lucky Break: reroll with +2. */
export async function useLuckyBreak(actor) {
    const lb = actor.system.luckyBreaks;
    if (lb.value <= 0) {
        ui.notifications.warn(t("STN.Lucky.none"));
        return null;
    }
    await actor.update({ "system.luckyBreaks.value": lb.value - 1 });
    const roll = await new Roll("1d6 + 2").evaluate();
    const flavor = `<div class="stn-card"><h3>${t("STN.Lucky.title")}</h3>
        <p>${t("STN.Lucky.text", { left: lb.value - 1 })}</p></div>`;
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ actor }), flavor });
    return roll;
}

/**
 * Attack with a weapon (or unarmed when `weapon` is null): roll to hit, then roll damage.
 */
export async function rollAttack(actor, weapon, event) {
    const targetDv = targetedDv();
    let opts = { difficulty: targetDv, extra: 0 };
    const name = weapon?.name ?? t("STN.Attack.unarmed");
    if (!event?.shiftKey) {
        const answer = await askRoll({ title: t("STN.Attack.title", { weapon: name }), difficultyValue: targetDv ?? "", hint: t("STN.Attack.hint") });
        if (!answer) return null;
        opts = answer;
    }

    const owned = actor.system.ownedSkills;
    const profile = attackProfile({
        weapon: weapon?.system.weaponProfile ?? null,
        skills: owned,
        skillData: Object.fromEntries(owned.map((s) => [s.key, { weapon: s.weapon }])),
        stats: actor.system.stats,
        modifiers: actor.system.modifiers,
    });

    const check = buildCheck(view(actor), { tags: [], stat: null }, { extra: opts.extra });
    const toHit = check.bonus + profile.hit;
    const parts = [...check.parts];
    if (profile.hit) parts.splice(0, 0, { key: "weaponSkill", value: profile.hit });
    const roll = await new Roll(toHit ? `1d6 ${toHit < 0 ? "-" : "+"} ${Math.abs(toHit)}` : "1d6").evaluate();
    const verdict = judgeRoll({ natural: roll.dice[0].total, total: roll.total, difficulty: opts.difficulty });
    const speaker = ChatMessage.getSpeaker({ actor });
    const flavor = `<div class="stn-card"><h3>${esc(t("STN.Attack.title", { weapon: name }))}</h3>
        <ul class="stn-parts">${partsHtml(parts)}</ul>${verdictHtml(verdict, opts.difficulty)}</div>`;
    await roll.toMessage({ speaker, flavor });

    if (verdict.success === false) return { roll, verdict };
    const dmg = await new Roll(damageFormula(profile)).evaluate();
    await dmg.toMessage({
        speaker,
        flavor: `<div class="stn-card"><h3>${t("STN.Attack.damage")}</h3>${
            verdict.success === null ? `<p class="hint">${t("STN.Attack.ifHit")}</p>` : ""}</div>`,
    });
    return { roll, verdict, damage: dmg };
}

/** NPC attack from the stat block. */
export async function rollNpcAttack(actor, event) {
    const s = actor.system;
    const targetDv = targetedDv();
    let opts = { difficulty: targetDv, extra: 0 };
    if (!event?.shiftKey) {
        const answer = await askRoll({ title: t("STN.Attack.title", { weapon: s.attack.label || actor.name }), difficultyValue: targetDv ?? "" });
        if (!answer) return null;
        opts = answer;
    }
    const bonus = s.attack.hit + opts.extra;
    const roll = await new Roll(bonus ? `1d6 ${bonus < 0 ? "-" : "+"} ${Math.abs(bonus)}` : "1d6").evaluate();
    const verdict = judgeRoll({ natural: roll.dice[0].total, total: roll.total, difficulty: opts.difficulty });
    const speaker = ChatMessage.getSpeaker({ actor });
    await roll.toMessage({
        speaker,
        flavor: `<div class="stn-card"><h3>${esc(s.attack.label || actor.name)}</h3>${verdictHtml(verdict, opts.difficulty)}</div>`,
    });
    if (verdict.success === false) return { roll, verdict };
    const dmg = await new Roll(s.attack.damage || "1d6").evaluate();
    await dmg.toMessage({ speaker, flavor: `<div class="stn-card"><h3>${t("STN.Attack.damage")}</h3></div>` });
    return { roll, verdict, damage: dmg };
}

/** Wire up the "Roll Panic!" buttons that fear rolls without a difficulty leave in chat. */
export function activateChatListeners() {
    Hooks.on("renderChatMessageHTML", (_message, html) => {
        html.querySelectorAll(".stn-panic-button").forEach((button) => {
            button.addEventListener("click", async (event) => {
                event.preventDefault();
                const actor = await fromUuid(button.dataset.actorUuid);
                if (actor) rollPanic(actor);
            });
        });
    });
}
