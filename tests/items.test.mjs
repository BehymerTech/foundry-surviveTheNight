import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyState, summarize } from "../scripts/lib/creator.mjs";
import { characterData } from "../scripts/lib/items.mjs";
import { SAMPLES } from "../scripts/data/samples.mjs";
import { buildSources } from "../tools/build-packs.mjs";

const summaryOf = ({ expect, ...rest }) => summarize({ ...emptyState(), ...rest, stats: { ...emptyState().stats, ...rest.stats } });

test("every sample becomes a character with matching Life and class items", () => {
    for (const sample of SAMPLES) {
        const sum = summaryOf(sample);
        const data = characterData(sum, { name: sample.name });
        assert.equal(data.type, "character");
        assert.equal(data.name, sample.name);
        assert.equal(data.system.life.max, sample.expect.life);
        assert.equal(data.system.classKey, sample.classKey);
        for (const item of data.items) {
            assert.ok(["skill", "trait", "gear"].includes(item.type), `${sample.name}: ${item.name}`);
            assert.ok(item.name);
            assert.equal(typeof item.system, "object");
        }
    }
});

test("Ruth gets her class, free and bought skills as items", () => {
    const ruth = SAMPLES.find((s) => s.name === "Ruth");
    const data = characterData(summaryOf(ruth));
    const names = data.items.filter((i) => i.type === "skill").map((i) => i.name).sort();
    assert.deepEqual(names, ["Acrobatics", "Boxing / Brawling / Karate", "Dodge", "Jump", "Run"]);
    const dodge = data.items.find((i) => i.name === "Dodge");
    assert.equal(dodge.system.dv, 1);
    assert.deepEqual(data.system.stats, { build: 0, coordination: 3, perception: -1 });
});

test("Followers keep unspent Lucky Breaks", () => {
    const greg = characterData(summaryOf(SAMPLES.find((s) => s.name === "Greg")));
    assert.deepEqual(greg.system.luckyBreaks, { value: 3, max: 3 });
});

test("Training: Mastery marks the chosen skill", () => {
    const sum = summarize({ ...emptyState(), classKey: "leader", skills: ["training-mastery", "run"], mastery: "run" });
    const data = characterData(sum);
    assert.equal(data.items.find((i) => i.name === "Run").system.mastered, true);
    assert.equal(data.items.find((i) => i.name === "Training: Mastery").system.mastered, false);
});

test("compendium sources have unique ids and valid keys", () => {
    const sources = buildSources();
    const ids = new Set();
    for (const [pack, docs] of Object.entries(sources)) {
        for (const doc of docs) {
            assert.equal(doc._id.length, 16, `${pack}/${doc.name}`);
            assert.ok(!ids.has(doc._id), `duplicate id ${doc._id}`);
            ids.add(doc._id);
            assert.match(doc._key, /^!(items|actors)!/);
        }
    }
    assert.equal(sources.survivors.length, 12);
    assert.ok(sources.skills.length >= 40);
});
