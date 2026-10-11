import assert from "node:assert/strict";
import { test } from "node:test";
import * as R from "../scripts/lib/rules.mjs";
import { SKILLS_BY_KEY } from "../scripts/data/skills.mjs";
import { GEAR_BY_KEY } from "../scripts/data/gear.mjs";

test("Build gives +5 Life per point and -3 per penalty", () => {
    assert.equal(R.lifeFromBuild(3), 15);
    assert.equal(R.lifeFromBuild(0), 0);
    assert.equal(R.lifeFromBuild(-1), -3);
    assert.equal(R.lifeFromBuild(-3), -9);
});

test("Panic! table covers 1-6", () => {
    assert.deepEqual(R.PANIC_TABLE.map((r) => r.roll), [6, 5, 4, 3, 2, 1]);
    assert.equal(R.panicResult(6).key, "gasp");
    assert.equal(R.panicResult(1).key, "paralyzedScream");
});

test("a natural 1 always fails; without a difficulty there is no verdict", () => {
    assert.equal(R.judgeRoll({ natural: 1, total: 12, difficulty: 7 }).success, false);
    assert.equal(R.judgeRoll({ natural: 3, total: 7, difficulty: 7 }).success, true);
    assert.equal(R.judgeRoll({ natural: 3, total: 6, difficulty: 7 }).success, false);
    assert.equal(R.judgeRoll({ natural: 6, total: 6, difficulty: null }).success, null);
});

test("book example: Biff's Run roll against difficulty 7 totals 7", () => {
    // Run skill +2, Coordination +1, athlete +1 athletic rolls => +4, rolling a 3
    const tags = new Set(["skill:run", "coordination", "athletic"]);
    const modifiers = [{ target: "athletic", value: 1 }];
    const bonus = R.skillBonusFor([{ key: "run" }], tags) + R.sumModifiers(modifiers, tags) + 1;
    assert.equal(3 + bonus, 7);
    assert.equal(R.judgeRoll({ natural: 3, total: 3 + bonus, difficulty: 7 }).success, true);
});

test("mastery makes a skill +3", () => {
    assert.equal(R.skillBonusFor([{ key: "run", mastered: true }], ["skill:run"]), 3);
    assert.equal(R.skillBonusFor([{ key: "run" }], ["skill:swimming"]), 0);
});

test("Fatigue is reduced by traits, but not for Asthmatics", () => {
    assert.equal(R.fatiguePenalty({ fatigue: 3, removed: 2 }), 1);
    assert.equal(R.fatiguePenalty({ fatigue: 1, removed: 2 }), 0);
    assert.equal(R.fatiguePenalty({ fatigue: 2, removed: 2, blocked: true }), 2);
});

test("small parties are more afraid", () => {
    assert.equal(R.groupFearPenalty(1), 2);
    assert.equal(R.groupFearPenalty(3), 1);
    assert.equal(R.groupFearPenalty(4), 0);
});

test("book example: Walter's boxing hit and damage", () => {
    // Boxing +2 hit; damage 1d6 halved (+2 boxing) +1 Build +2 Stiff Jab
    const p = R.attackProfile({
        weapon: null,
        skills: [{ key: "boxing" }],
        skillData: SKILLS_BY_KEY,
        stats: { build: 1, coordination: 0, perception: 0 },
        modifiers: [{ target: "damage:unarmed", value: 2 }],
    });
    assert.equal(p.hit, 2);
    assert.equal(p.flat, 1 + 2 + 2);
    assert.equal(p.damageFormula, "ceil(1d6 / 2)");
    assert.equal(R.damageFormula(p), "ceil(1d6 / 2) + 5");
});

test("pistol is 4d6, 6d6 with Shooting, and ranged damage uses Coordination", () => {
    const stats = { build: 0, coordination: 2, perception: 0 };
    const plain = R.attackProfile({ weapon: GEAR_BY_KEY.pistol.weapon, skills: [], skillData: SKILLS_BY_KEY, stats });
    assert.equal(R.damageFormula(plain), "4d6 + 2");
    const trained = R.attackProfile({ weapon: GEAR_BY_KEY.pistol.weapon, skills: [{ key: "shooting" }], skillData: SKILLS_BY_KEY, stats });
    assert.equal(R.damageFormula(trained), "6d6 + 2");
    assert.equal(trained.hit, 2);
});

test("a skill only helps with weapons it names", () => {
    const stats = { build: 0, coordination: 0, perception: 0 };
    const bat = R.attackProfile({ weapon: GEAR_BY_KEY["baseball-bat"].weapon, skills: [{ key: "sporting-implements" }], skillData: SKILLS_BY_KEY, stats });
    assert.equal(bat.hit, 2);
    assert.equal(R.damageFormula(bat), "2d6 + 2");
    const knife = R.attackProfile({ weapon: GEAR_BY_KEY["sheath-knife"].weapon, skills: [{ key: "sporting-implements" }], skillData: SKILLS_BY_KEY, stats });
    assert.equal(knife.hit, 0);
});

test("improvised weapons roll 1d6 and thrown ones use Coordination", () => {
    const stats = { build: 3, coordination: 1, perception: 0 };
    const brick = GEAR_BY_KEY.brick.weapon;
    const p = R.attackProfile({ weapon: brick, skills: [], skillData: SKILLS_BY_KEY, stats });
    assert.equal(p.dice, 1);
    assert.equal(p.ranged, true);
    assert.equal(p.flat, 1);
});

test("Dodge adds a point of Dodge Value", () => {
    const d = R.deriveStats({ build: 0, coordination: 3, perception: 0 }, [], [{ key: "dodge", dv: 1 }]);
    assert.equal(d.dv, 7);
});
