import assert from "node:assert/strict";
import { test } from "node:test";
import { summarize, emptyState } from "../scripts/lib/creator.mjs";
import { SAMPLES } from "../scripts/data/samples.mjs";
import { CLASSES } from "../scripts/data/classes.mjs";
import { SKILLS_BY_KEY } from "../scripts/data/skills.mjs";
import { GEAR_BY_KEY } from "../scripts/data/gear.mjs";
import { TRAITS_BY_KEY, ABILITIES_BY_KEY } from "../scripts/data/traits.mjs";

const stateOf = ({ expect, ...rest }) => ({ ...emptyState(), ...rest, stats: { ...emptyState().stats, ...rest.stats } });

for (const sample of SAMPLES) {
    test(`sample ${sample.name} (${sample.classKey}) spends exactly 10 points and matches the printed sheet`, () => {
        const r = summarize(stateOf(sample));
        assert.deepEqual(r.errors, []);
        assert.equal(r.points.spent, 10, "points spent");
        assert.equal(r.derived.life, sample.expect.life, "life");
        assert.equal(r.derived.dv, sample.expect.dv, "dodge value");
    });
}

test("there are twelve classes and twelve samples, one per class", () => {
    assert.equal(CLASSES.length, 12);
    assert.deepEqual(SAMPLES.map((s) => s.classKey).sort(), CLASSES.map((c) => c.key).sort());
});

test("every key referenced by classes exists in the data", () => {
    for (const c of CLASSES) {
        for (const k of [...c.skills, ...c.freeSkills]) assert.ok(SKILLS_BY_KEY[k], `${c.key}: skill ${k}`);
        for (const k of [...c.abilities, ...(c.chooseAbility ?? [])]) assert.ok(ABILITIES_BY_KEY[k], `${c.key}: ability ${k}`);
        for (const k of c.classGear) assert.ok(GEAR_BY_KEY[k], `${c.key}: gear ${k}`);
    }
});

test("stat bonuses cost 2 points each and penalties return 2", () => {
    const base = { ...emptyState(), classKey: "leader" };
    assert.equal(summarize({ ...base, stats: { build: 1 } }).points.spent, 2);
    assert.equal(summarize({ ...base, stats: { build: -2 } }).points.spent, -4);
});

test("no stat may exceed +3 or -3, including free class bonuses", () => {
    const heavy = { ...emptyState(), classKey: "heavy" };
    assert.ok(summarize({ ...heavy, stats: { build: 1 } }).ok);
    assert.ok(summarize({ ...heavy, stats: { build: 2 } }).errors.some((e) => e.code === "statLimit"));
    assert.ok(summarize({ ...heavy, stats: { coordination: -4 } }).errors.some((e) => e.code === "statLimit"));
});

test("the 10 point budget is enforced", () => {
    const r = summarize({ ...emptyState(), classKey: "leader", stats: { build: 3, coordination: 3 } });
    assert.ok(r.errors.some((e) => e.code === "overBudget"));
});

test("at most three class skills and two common skills (four for team players)", () => {
    const sleuth = { ...emptyState(), classKey: "sleuth" };
    const ok = summarize({ ...sleuth, skills: ["detect-motive", "lockpicking", "sneak", "boxing", "bluff"] });
    assert.ok(!ok.errors.some((e) => e.code.startsWith("tooMany")));
    const bad = summarize({ ...sleuth, skills: ["detect-motive", "lockpicking", "sneak", "boxing", "bluff", "hide"] });
    assert.ok(bad.errors.some((e) => e.code === "tooManyCommonSkills"));

    const leader = { ...emptyState(), classKey: "leader" };
    assert.ok(!summarize({ ...leader, skills: ["boxing", "bluff", "hide", "run"] }).errors.some((e) => e.code === "tooManyCommonSkills"));
    assert.ok(summarize({ ...leader, skills: ["boxing", "bluff", "hide", "run", "sneak"] }).errors.some((e) => e.code === "tooManyCommonSkills"));
});

test("a class skill from another class is not allowed", () => {
    const r = summarize({ ...emptyState(), classKey: "leader", skills: ["shooting"] });
    assert.ok(r.errors.some((e) => e.code === "skillNotAllowed"));
});

test("Well-rounded adds a common skill slot and Over-prepared a gear slot, and both stack", () => {
    const leader = { ...emptyState(), classKey: "leader" };
    const r = summarize({
        ...leader,
        traits: { "well-rounded": 2, "over-prepared": 2 },
        skills: ["boxing", "bluff", "hide", "run", "sneak", "swimming"],
        gear: ["flashlight", "compass", "book", "blanket"],
    });
    assert.deepEqual(r.errors.filter((e) => e.code !== "overBudget"), []);
    assert.equal(r.slots.commonSkills.max, 6);
    assert.equal(r.slots.gear.max, 4);
});

test("other traits cannot be taken twice, and strong traits do not stack with their weaker versions", () => {
    const leader = { ...emptyState(), classKey: "leader" };
    assert.ok(summarize({ ...leader, traits: { brave: 2 } }).errors.some((e) => e.code === "traitStack"));
    assert.ok(summarize({ ...leader, traits: { weightlifter: 1, "mr-olympia": 1 } }).errors.some((e) => e.code === "traitOverlap"));
});

test("only two pieces of gear unless Over-prepared; class gear needs the right class", () => {
    const leader = { ...emptyState(), classKey: "leader" };
    assert.ok(summarize({ ...leader, gear: ["flashlight", "compass", "book"] }).errors.some((e) => e.code === "tooMuchGear"));
    assert.ok(summarize({ ...leader, gear: ["pistol"] }).errors.some((e) => e.code === "gearNotAllowed"));
    assert.ok(!summarize({ ...emptyState(), classKey: "doomsday-prepper", gear: ["pistol"] }).errors.some((e) => e.code === "gearNotAllowed"));
});

test("Campers get two free extra gear picks", () => {
    const r = summarize({ ...emptyState(), classKey: "camper", gear: ["flashlight", "compass", "rope", "book"] });
    assert.deepEqual(r.errors, []);
    assert.equal(r.points.spent, 2);
});

test("classes that must choose an ability, and Bookworm free picks, are required", () => {
    assert.ok(summarize({ ...emptyState(), classKey: "ball-player" }).errors.some((e) => e.code === "noAbility"));
    assert.ok(summarize({ ...emptyState(), classKey: "wingman" }).errors.some((e) => e.code === "noAbility"));
    assert.ok(summarize({ ...emptyState(), classKey: "bookworm" }).errors.some((e) => e.code === "freePicksLeft"));
});

test("Training: Mastery needs a target the character has", () => {
    const leader = { ...emptyState(), classKey: "leader", skills: ["training-mastery", "run"] };
    assert.ok(summarize(leader).errors.some((e) => e.code === "masteryTarget"));
    assert.deepEqual(summarize({ ...leader, mastery: "run" }).errors, []);
});

test("Lucky Breaks buy skills and gear outside normal limits, up to three", () => {
    const f = { ...emptyState(), classKey: "follower" };
    const trades = [{ kind: "skill", key: "shooting" }, { kind: "gear", key: "pistol" }, { kind: "skill", key: "dodge" }];
    const r = summarize({ ...f, luckyTrades: trades });
    assert.deepEqual(r.errors, []);
    assert.equal(r.points.spent, 0);
    assert.ok(r.skillKeys.includes("shooting"));
    assert.ok(summarize({ ...f, luckyTrades: [...trades, trades[0]] }).errors.some((e) => e.code === "tooManyLuckyTrades"));
    assert.ok(summarize({ ...emptyState(), classKey: "leader", luckyTrades: [trades[0]] }).errors.some((e) => e.code === "tooManyLuckyTrades"));
});

test("trait costs match the book (1 point, 2 points, negative traits)", () => {
    assert.equal(TRAITS_BY_KEY["brave"].cost, 1);
    assert.equal(TRAITS_BY_KEY["courageous"].cost, 2);
    assert.equal(TRAITS_BY_KEY["true-grit"].cost, 2);
    assert.equal(TRAITS_BY_KEY["fearful"].cost, -1);
    assert.equal(TRAITS_BY_KEY["asthmatic"].cost, -2);
    assert.equal(GEAR_BY_KEY["pistol"].cost, 2);
});
