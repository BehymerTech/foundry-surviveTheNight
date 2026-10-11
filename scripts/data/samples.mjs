/**
 * The twelve sample characters from the Player's Guide, expressed as creation states. Life and Dodge Value
 * are what the printed character sheets show; the tests check that the creation rules reproduce them.
 */
const s = (name, classKey, rest, expect) => ({ name, classKey, ...rest, expect });

export const SAMPLES = [
    s("Biff", "heavy", {
        stats: { build: 1, coordination: 1 },
        skills: ["run", "swimming", "tackle", "wrestle"],
        traits: { fearful: 1, "good-cardio": 1, weightlifter: 1 },
        gear: ["flashlight"],
    }, { life: 35, dv: 4 }),
    s("Ruth", "runner", {
        stats: { coordination: 1, perception: -1 },
        skills: ["acrobatics", "dodge", "jump", "run", "boxing"],
        traits: { "eye-of-the-tiger": 1, "quick-reflexes": 1, weightlifter: 1 },
        gear: ["water-bottle"],
    }, { life: 20, dv: 7 }),
    s("Tom", "ball-player", {
        ability: "great-cardio",
        stats: { build: 1, coordination: 1, perception: -1 },
        skills: ["driving", "pitch", "run", "sporting-implements"],
        traits: { courageous: 1, "iron-constitution": 1 },
        gear: ["baseball-bat"],
    }, { life: 30, dv: 4 }),
    s("Paige", "bookworm", {
        stats: { build: -1, perception: 2 },
        freePicks: ["science", "local-history"],
        skills: ["computer-hacking", "circuitry", "decipher", "hide"],
        traits: { devoted: 1 },
        gear: ["notepad"],
        customGear: ["Chemistry book (+2 to chemistry rolls)"],
    }, { life: 17, dv: 3 }),
    s("Sheri", "paranormal-investigator", {
        stats: { coordination: -1, perception: 1 },
        skills: ["decipher", "paranormal-weaponry", "recording-devices", "run"],
        traits: { "over-prepared": 1, "courage-under-fire": 1 },
        gear: ["video-camera", "emf-recorder", "flashlight"],
    }, { life: 20, dv: 2 }),
    s("Walter", "sleuth", {
        stats: { build: 1 },
        skills: ["boxing", "detect-motive", "lockpicking", "sneak"],
        traits: { brave: 1 },
        customTraits: [{
            name: "Stiff Jab",
            cost: 1,
            note: "+2 damage when boxing. Narrator-approved custom trait.",
            modifiers: [{ target: "damage:unarmed", value: 2 }],
        }],
        gear: ["brass-knuckles", "lockpicks"],
    }, { life: 25, dv: 3 }),
    s("Cate", "camper", {
        stats: { coordination: 1 },
        skills: ["sense-direction", "ropework", "swimming", "hide"],
        traits: { "eye-of-the-tiger": 1 },
        gear: ["lighter", "rope", "sheath-knife", "water-bottle"],
    }, { life: 20, dv: 4 }),
    s("Randall", "doomsday-prepper", {
        skills: ["shooting", "barricading", "lockpicking", "mechanics"],
        traits: { brave: 1, "iron-constitution": 1, "quick-reflexes": 1 },
        gear: ["pistol", "tire-iron"],
    }, { life: 25, dv: 3 }),
    s("Mitch", "hunter", {
        stats: { build: 1, coordination: 1, perception: 1 },
        skills: ["wilderness-survival", "sense-direction", "hunting-implements", "shooting", "sneak"],
        traits: { "self-serving": 1 },
        customGear: ["Beef jerky"],
    }, { life: 25, dv: 4 }),
    s("Jan", "leader", {
        stats: { perception: 1 },
        skills: ["diplomacy", "first-aid", "sneak"],
        traits: { courageous: 1, "cool-headed": 1 },
        gear: ["flashlight", "first-aid-kit"],
    }, { life: 20, dv: 3 }),
    s("Dave", "wingman", {
        ability: "devoted-friend",
        skills: ["animal-handling", "bluff", "driving", "first-aid"],
        traits: { brave: 1, "cool-headed": 1, devoted: 1 },
        gear: ["booze", "brick"],
    }, { life: 20, dv: 3 }),
    s("Greg", "follower", {
        stats: { coordination: 1, perception: 1 },
        skills: ["bluff", "disguise", "hide", "sleight-of-hand"],
        gear: ["playing-cards", "booze"],
    }, { life: 20, dv: 4 }),
];
