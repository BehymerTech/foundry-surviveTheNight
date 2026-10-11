/**
 * Builds the compendium packs from the data modules.
 *
 *   node tools/build-packs.mjs          writes packs/_source/**.json and compiles packs/<name> (LevelDB)
 *
 * The packs are generated, so they are not committed; the release workflow runs this before zipping.
 */
import { createHash } from "node:crypto";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SKILLS } from "../scripts/data/skills.mjs";
import { TRAITS, CLASS_ABILITIES } from "../scripts/data/traits.mjs";
import { GEAR } from "../scripts/data/gear.mjs";
import { SAMPLES } from "../scripts/data/samples.mjs";
import { emptyState, summarize } from "../scripts/lib/creator.mjs";
import { skillItemData, traitItemData, gearItemData, characterData } from "../scripts/lib/items.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const SYSTEM = "survive-the-night";

/** Stable 16 character ids so rebuilding never changes document identity. */
const idFor = (kind, key) => createHash("sha1").update(`${SYSTEM}:${kind}:${key}`).digest("base64url").slice(0, 16);

const stats = (key) => ({
    coreVersion: "14",
    systemId: SYSTEM,
    systemVersion: "0.1.0",
    createdTime: 0,
    modifiedTime: 0,
    lastModifiedBy: null,
});

const withMeta = (kind, key, data) => ({
    _id: idFor(kind, key),
    ...data,
    img: data.img ?? undefined,
    folder: null,
    sort: 0,
    ownership: { default: 0 },
    flags: {},
    _stats: stats(key),
    _key: `!${kind === "actor" ? "actors" : "items"}!${idFor(kind, key)}`,
});

export function buildSources() {
    const skills = SKILLS.map((s) => withMeta("item", `skill:${s.key}`, skillItemData(s.key)));
    const traits = [
        ...TRAITS.map((t) => withMeta("item", `trait:${t.key}`, traitItemData(t.key))),
        ...CLASS_ABILITIES.map((t) => withMeta("item", `ability:${t.key}`, traitItemData(t.key, { kind: "class" }))),
    ];
    const gear = GEAR.map((g) => withMeta("item", `gear:${g.key}`, gearItemData(g.key)));
    const survivors = SAMPLES.map((sample) => {
        const { expect, ...rest } = sample;
        const sum = summarize({ ...emptyState(), ...rest, stats: { ...emptyState().stats, ...rest.stats } });
        if (!sum.ok) throw new Error(`Sample ${sample.name} is invalid: ${JSON.stringify(sum.errors)}`);
        const data = characterData(sum, { name: sample.name });
        const actorId = idFor("actor", sample.name);
        const items = data.items.map((item, i) => {
            const _id = idFor("embedded", `${sample.name}:${i}`);
            return { ...item, _id, flags: {}, sort: i * 10, _key: `!actors.items!${actorId}.${_id}` };
        });
        return withMeta("actor", sample.name, {
            ...data,
            items,
            prototypeToken: { name: sample.name, actorLink: true, disposition: 1, bar1: { attribute: "life" } },
        });
    });
    return { skills, traits, gear, survivors };
}

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

async function main() {
    const { compilePack } = await import("@foundryvtt/foundryvtt-cli");
    const sources = buildSources();
    for (const [pack, docs] of Object.entries(sources)) {
        const src = join(root, "packs", "_source", pack);
        rmSync(src, { recursive: true, force: true });
        mkdirSync(src, { recursive: true });
        for (const doc of docs) {
            writeFileSync(join(src, `${slug(doc.name)}-${doc._id}.json`), JSON.stringify(doc, null, 2));
        }
        const dest = join(root, "packs", pack);
        rmSync(dest, { recursive: true, force: true });
        await compilePack(src, dest, { log: false });
        console.log(`packs/${pack}: ${docs.length} documents`);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main();
