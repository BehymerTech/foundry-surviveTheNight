/**
 * Survive the Night for Foundry VTT.
 */
import { CharacterData, NpcData, SkillData, TraitData, GearData } from "./documents/models.mjs";
import { CharacterSheet, NpcSheet, ItemSheet } from "./apps/sheets.mjs";
import { CharacterCreator } from "./apps/creator.mjs";
import { activateChatListeners } from "./rolls.mjs";

const SYSTEM_ID = "survive-the-night";

Hooks.once("init", () => {
    console.log(`${SYSTEM_ID} | Initializing`);

    CONFIG.Actor.dataModels = { character: CharacterData, npc: NpcData };
    CONFIG.Item.dataModels = { skill: SkillData, trait: TraitData, gear: GearData };
    CONFIG.Actor.trackableAttributes = {
        character: { bar: ["life"], value: ["fatigue", "luckyBreaks.value"] },
        npc: { bar: ["life"], value: ["dv"] },
    };
    CONFIG.Combat.initiative = { formula: "1d6", decimals: 0 };

    const { DocumentSheetConfig } = foundry.applications.apps;
    DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, CharacterSheet, {
        types: ["character"],
        makeDefault: true,
        label: "TYPES.Actor.character",
    });
    DocumentSheetConfig.registerSheet(Actor, SYSTEM_ID, NpcSheet, {
        types: ["npc"],
        makeDefault: true,
        label: "TYPES.Actor.npc",
    });
    DocumentSheetConfig.registerSheet(Item, SYSTEM_ID, ItemSheet, {
        types: ["skill", "trait", "gear"],
        makeDefault: true,
        label: "STN.Sheet.item",
    });

    game.settings.register(SYSTEM_ID, "partySize", {
        name: "STN.Settings.partySize.name",
        hint: "STN.Settings.partySize.hint",
        scope: "world",
        config: true,
        type: new foundry.data.fields.NumberField({ required: true, nullable: false, integer: true, min: 1, max: 12, initial: 4 }),
    });

    game.stn = { openCreator: () => CharacterCreator.open() };
    activateChatListeners();
});

/** A "Create Survivor" button at the top of the Actors sidebar. */
Hooks.on("renderActorDirectory", (_app, html) => {
    const root = html instanceof HTMLElement ? html : html[0];
    if (!root || root.querySelector(".stn-create-survivor")) return;
    if (!game.user.can("ACTOR_CREATE")) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "stn-create-survivor";
    button.innerHTML = `<i class="fa-solid fa-ghost"></i> ${game.i18n.localize("STN.Settings.createButton")}`;
    button.addEventListener("click", () => CharacterCreator.open());
    const host = root.querySelector(".header-actions") ?? root.querySelector("header");
    host?.append(button);
});
