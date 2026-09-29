/**
 * Astral Foundry - Game Configuration and Data Definitions
 * Contains buildings, upgrades, research branches, milestones, and ascension perks.
 */

export const CONFIG = {
    SAVE_KEY: 'ASTRAL_FOUNDRY_SAVE_V1',
    AUTOSAVE_INTERVAL_SEC: 30,
    BASE_CLICK_POWER: 1,
    BASE_OFFLINE_EFFICIENCY: 0.50, // 50% offline rate
    BASE_OFFLINE_MAX_SECONDS: 43200, // 12 hours max offline accumulation
    ASCENSION_UNLOCK_AETHER: 10000000, // 10 Million lifetime Aether to unlock Ascension
    ASCENSION_SHARD_DIVISOR: 10000000, // floor(10 * sqrt(lifetime / 10M))
};

export const BUILDINGS_DATA = [
    {
        id: 'aether_condenser',
        name: 'Mint Press',
        desc: 'Mini zecca automatica: stampa banconote a raffica sul nastro.',
        baseCost: 15,
        baseProd: 1.0,
        costMult: 1.15,
        icon: '💵',
        visualKey: 'condenser',
        lore: 'La prima pressa: ogni colpo sforna mazzi di cash croccanti.'
    },
    {
        id: 'resonance_furnace',
        name: 'Gold Furnace',
        desc: 'Fonde lingotti e cola oro liquido nella pressa centrale.',
        baseCost: 100,
        baseProd: 6.0,
        costMult: 1.15,
        icon: '🏭',
        visualKey: 'furnace',
        lore: 'Calore bianco, oro fuso a 1064° — riverbero ipnotico.'
    },
    {
        id: 'void_garden',
        name: 'Money Tree',
        desc: 'Albero mutante le cui foglie sono banconote che ricrescono ogni secondo.',
        baseCost: 1100,
        baseProd: 40.0,
        costMult: 1.15,
        icon: '🌳',
        visualKey: 'garden',
        lore: 'Foglie di dollaro fotosintetico: più luce = più cash.'
    },
    {
        id: 'astral_observatory',
        name: 'Laser Scanner',
        desc: 'Torre laser che scansiona e duplica banconote con luce al neon.',
        baseCost: 12500,
        baseProd: 280.0,
        costMult: 1.15,
        icon: '🔫',
        visualKey: 'observatory',
        lore: 'Fascio turchese che vibra e stampa ologrammi di denaro.'
    },
    {
        id: 'chronal_engine',
        name: 'Quantum Printer',
        desc: 'Stampante quantistica che materializza denaro dal futuro.',
        baseCost: 140000,
        baseProd: 2200.0,
        costMult: 1.15,
        icon: '🖨️',
        visualKey: 'chronal',
        lore: 'Piegare il tempo per spendere prima ancora di aver guadagnato.'
    },
    {
        id: 'celestial_forge',
        name: 'Vault Core Mk II',
        desc: 'Nucleo centrale potenziato: droni orbitali fondono diamanti in cash.',
        baseCost: 1500000,
        baseProd: 18500.0,
        costMult: 1.15,
        icon: '🏦',
        visualKey: 'forge',
        lore: 'Tre droni orbitano la pressa, saldando lingotti al plasma.'
    }
];

export const UPGRADES_DATA = [
    // Production Upgrades
    {
        id: 'lens_crystallization',
        name: 'Lens Crystallization',
        category: 'production',
        cost: 100,
        desc: 'Double the production of all Aether Condensers.',
        icon: '💎',
        target: 'aether_condenser',
        multiplier: 2.0,
        unlockedAt: { building: 'aether_condenser', count: 1 }
    },
    {
        id: 'resonance_tuning',
        name: 'Resonance Tuning',
        category: 'production',
        cost: 600,
        desc: 'Double the production of all Resonance Furnaces.',
        icon: '🔔',
        target: 'resonance_furnace',
        multiplier: 2.0,
        unlockedAt: { building: 'resonance_furnace', count: 1 }
    },
    {
        id: 'astral_spore_graft',
        name: 'Astral Spore Grafting',
        category: 'production',
        cost: 6000,
        desc: 'Double the production of all Void Gardens.',
        icon: '🌸',
        target: 'void_garden',
        multiplier: 2.0,
        unlockedAt: { building: 'void_garden', count: 1 }
    },
    {
        id: 'prismatic_optics',
        name: 'Prismatic Optics',
        category: 'production',
        cost: 65000,
        desc: 'Double the production of all Astral Observatories.',
        icon: '✨',
        target: 'astral_observatory',
        multiplier: 2.0,
        unlockedAt: { building: 'astral_observatory', count: 1 }
    },
    {
        id: 'temporal_reversal',
        name: 'Temporal Reversal Loop',
        category: 'production',
        cost: 700000,
        desc: 'Double the production of all Chronal Engines.',
        icon: '🔄',
        target: 'chronal_engine',
        multiplier: 2.0,
        unlockedAt: { building: 'chronal_engine', count: 1 }
    },
    {
        id: 'stellar_containment',
        name: 'Stellar Magnetic Field',
        category: 'production',
        cost: 7500000,
        desc: 'Double the production of all Celestial Forges.',
        icon: '🛡️',
        target: 'celestial_forge',
        multiplier: 2.0,
        unlockedAt: { building: 'celestial_forge', count: 1 }
    },
    {
        id: 'aetheric_synergy_1',
        name: 'Aetheric Harmonization I',
        category: 'production',
        cost: 2500,
        desc: 'Increase global Aether production by 20%.',
        icon: '🌟',
        target: 'global',
        multiplier: 1.20,
        unlockedAt: { lifetimeAether: 1500 }
    },
    {
        id: 'aetheric_synergy_2',
        name: 'Aetheric Harmonization II',
        category: 'production',
        cost: 150000,
        desc: 'Increase global Aether production by 35%.',
        icon: '🌠',
        target: 'global',
        multiplier: 1.35,
        unlockedAt: { lifetimeAether: 100000 }
    },
    {
        id: 'transcendent_overcharge',
        name: 'Cosmic Overcharge',
        category: 'production',
        cost: 3000000,
        desc: 'Increase global Aether production by 50%.',
        icon: '⚡',
        target: 'global',
        multiplier: 1.50,
        unlockedAt: { lifetimeAether: 2000000 }
    },

    // Efficiency Upgrades
    {
        id: 'astral_attunement',
        name: 'Astral Attunement',
        category: 'efficiency',
        cost: 250,
        desc: 'Manual Core clicks yield +300% more Aether (+3 flat Aether).',
        icon: '✋',
        type: 'click_flat',
        value: 3,
        unlockedAt: { lifetimeAether: 100 }
    },
    {
        id: 'focusing_pylon',
        name: 'Focusing Pylon',
        category: 'efficiency',
        cost: 1500,
        desc: 'Manual Core clicks gain +3% of your current passive Aether/second.',
        icon: '🗼',
        type: 'click_cps_percent',
        value: 0.03,
        unlockedAt: { building: 'resonance_furnace', count: 3 }
    },
    {
        id: 'hardened_brass',
        name: 'Hardened Astral Alloys',
        category: 'efficiency',
        cost: 2000,
        desc: 'Reduces the cost of all buildings by 10%.',
        icon: '⚙️',
        type: 'building_cost_reduction',
        value: 0.10,
        unlockedAt: { building: 'resonance_furnace', count: 5 }
    },
    {
        id: 'harmonic_conduits',
        name: 'Harmonic Conduits',
        category: 'efficiency',
        cost: 45000,
        desc: 'Reduces the cost of all buildings by an additional 10%.',
        icon: '➰',
        type: 'building_cost_reduction',
        value: 0.10,
        unlockedAt: { building: 'astral_observatory', count: 2 }
    },
    {
        id: 'deep_hibernation',
        name: 'Deep Hibernation Shroud',
        category: 'efficiency',
        cost: 12000,
        desc: 'Increases offline Aether generation efficiency by +25% (up to 75%).',
        icon: '🌙',
        type: 'offline_efficiency',
        value: 0.25,
        unlockedAt: { building: 'void_garden', count: 3 }
    },
    {
        id: 'eternal_battery',
        name: 'Eternal Chrono-Vessel',
        category: 'efficiency',
        cost: 250000,
        desc: 'Doubles maximum offline progress duration to 24 hours.',
        icon: '🔋',
        type: 'offline_duration',
        value: 43200,
        unlockedAt: { building: 'chronal_engine', count: 1 }
    },

    // Automation Upgrades
    {
        id: 'conduit_drone',
        name: 'Conduit Drone',
        category: 'automation',
        cost: 800,
        desc: 'Constructs an automated drone that pulses the Aether Core every 3 seconds.',
        icon: '🤖',
        type: 'auto_clicker',
        interval: 3.0,
        unlockedAt: { lifetimeAether: 500 }
    },
    {
        id: 'construct_matrix',
        name: 'Construct Matrix',
        category: 'automation',
        cost: 35000,
        desc: 'Unlocks the automated building constructor to expand your foundry hands-free.',
        icon: '🏗️',
        type: 'unlock_auto_build',
        unlockedAt: { building: 'void_garden', count: 5 }
    },
    {
        id: 'schematic_synthesizer',
        name: 'Schematic Synthesizer',
        category: 'automation',
        cost: 120000,
        desc: 'Unlocks the automated upgrade synthesizer to purchase available upgrades.',
        icon: '📜',
        type: 'unlock_auto_upgrade',
        unlockedAt: { building: 'astral_observatory', count: 3 }
    },
    {
        id: 'chronal_governor',
        name: 'Chronal Governor',
        category: 'automation',
        cost: 800000,
        desc: 'Accelerates all automation routines by 100% and increases auto-click frequency.',
        icon: '⏱️',
        type: 'automation_speed',
        value: 2.0,
        unlockedAt: { building: 'chronal_engine', count: 2 }
    },

    // Visual / Structural Upgrades (Visually evolves the Astral Foundry!)
    {
        id: 'spire_gilding',
        name: 'Runic Spire Gilding',
        category: 'visual',
        cost: 3000,
        desc: 'Etches golden celestial runes onto the central spires. Increases global production by +10%.',
        icon: '🏛️',
        target: 'global',
        multiplier: 1.10,
        visualPart: 'gilded_spires',
        unlockedAt: { building: 'resonance_furnace', count: 5 }
    },
    {
        id: 'radiant_conduit_lattice',
        name: 'Radiant Conduit Lattice',
        category: 'visual',
        cost: 85000,
        desc: 'Installs glowing aetheric circuitry across the dais. Increases global production by +15%.',
        icon: '🌐',
        target: 'global',
        multiplier: 1.15,
        visualPart: 'conduit_lattice',
        unlockedAt: { building: 'astral_observatory', count: 3 }
    },
    {
        id: 'celestial_aureole',
        name: 'Celestial Aureole',
        category: 'visual',
        cost: 1200000,
        desc: 'Ignites an orbital crown of stardust and cosmic rings. Increases global production by +25%.',
        icon: '👑',
        target: 'global',
        multiplier: 1.25,
        visualPart: 'celestial_aureole',
        unlockedAt: { building: 'celestial_forge', count: 1 }
    }
];

export const RESEARCH_BRANCHES = [
    {
        id: 'engineering',
        name: 'Aether Engineering',
        desc: 'Pneumatics, conduits, and mechanical amplification of cosmic currents.',
        icon: '⚙️',
        nodes: [
            {
                id: 'ae_1',
                name: 'Fluidic Dynamics',
                cost: 400,
                desc: 'Aether Condensers produce +50% more Aether.',
                icon: '💧',
                requires: [],
                effect: { type: 'building_mult', target: 'aether_condenser', value: 1.5 }
            },
            {
                id: 'ae_2',
                name: 'Harmonic Induction',
                cost: 4500,
                desc: 'Resonance Furnaces boost Condenser production by 3% for each Furnace owned.',
                icon: '🔄',
                requires: ['ae_1'],
                effect: { type: 'building_synergy', from: 'resonance_furnace', to: 'aether_condenser', percent: 0.03 }
            },
            {
                id: 'ae_3',
                name: 'Superconducting Lattice',
                cost: 50000,
                desc: 'Increases global Aether production by +25%.',
                icon: '⚡',
                requires: ['ae_2'],
                effect: { type: 'global_mult', value: 1.25 }
            },
            {
                id: 'ae_4',
                name: 'Zero-Point Siphon',
                cost: 950000,
                desc: 'Celestial Forges operate with +100% increased power.',
                icon: '🌀',
                requires: ['ae_3'],
                effect: { type: 'building_mult', target: 'celestial_forge', value: 2.0 }
            }
        ]
    },
    {
        id: 'biology',
        name: 'Astral Biology',
        desc: 'Cultivation of void-adapted organisms and organic resonance structures.',
        icon: '🌱',
        nodes: [
            {
                id: 'ab_1',
                name: 'Void Spore Propagation',
                cost: 2500,
                desc: 'Void Gardens generate +50% more Aether.',
                icon: '🍄',
                requires: [],
                effect: { type: 'building_mult', target: 'void_garden', value: 1.5 }
            },
            {
                id: 'ab_2',
                name: 'Bioluminescent Symbiosis',
                cost: 22000,
                desc: 'Manual clicks gain bonus Aether equal to 15% of Void Garden output.',
                icon: '✨',
                requires: ['ab_1'],
                effect: { type: 'click_from_building', source: 'void_garden', ratio: 0.15 }
            },
            {
                id: 'ab_3',
                name: 'Void Chlorophyll',
                cost: 150000,
                desc: 'Every building owned gains +1% production per Void Garden owned.',
                icon: '🍃',
                requires: ['ab_2'],
                effect: { type: 'garden_global_scaling', percent: 0.01 }
            },
            {
                id: 'ab_4',
                name: 'Astral Biosphere',
                cost: 800000,
                desc: 'Offline efficiency increased by +25%. Plants continue thriving in the dark.',
                icon: '🪐',
                requires: ['ab_3'],
                effect: { type: 'offline_efficiency', value: 0.25 }
            }
        ]
    },
    {
        id: 'temporal',
        name: 'Temporal Mechanics',
        desc: 'Manipulation of localized chronological dilation and retroactive energy loops.',
        icon: '⏳',
        nodes: [
            {
                id: 'tm_1',
                name: 'Micro-Chronal Loops',
                cost: 220000,
                desc: 'Chronal Engines produce +50% more Aether.',
                icon: '🔁',
                requires: [],
                effect: { type: 'building_mult', target: 'chronal_engine', value: 1.5 }
            },
            {
                id: 'tm_2',
                name: 'Retrospective Flux',
                cost: 750000,
                desc: 'Every tick has a 2% chance to trigger a 10x Chronal Burst for 3 seconds.',
                icon: '⚡',
                requires: ['tm_1'],
                effect: { type: 'chronal_burst_chance', chance: 0.02, multiplier: 10, duration: 3 }
            },
            {
                id: 'tm_3',
                name: 'Timeless Fabric',
                cost: 3200000,
                desc: 'Reduces the cost scaling multiplier of all buildings from 1.15 to 1.135.',
                icon: '🌌',
                requires: ['tm_2'],
                effect: { type: 'reduce_scaling', newMult: 1.135 }
            }
        ]
    },
    {
        id: 'void',
        name: 'Void Studies',
        desc: 'Unraveling the deep mysteries of null-space and cosmic singularities.',
        icon: '🔮',
        nodes: [
            {
                id: 'vs_1',
                name: 'Null-Point Containment',
                cost: 30000,
                desc: 'Astral Observatories gain +50% production from void lensing.',
                icon: '👁️',
                requires: [],
                effect: { type: 'building_mult', target: 'astral_observatory', value: 1.5 }
            },
            {
                id: 'vs_2',
                name: 'Dark Astral Distillation',
                cost: 180000,
                desc: 'Manual Core clicks have a 5% chance to trigger an Astral Alignment surge (+50% CpS for 15s).',
                icon: '🌠',
                requires: ['vs_1'],
                effect: { type: 'surge_on_click', chance: 0.05, duration: 15, mult: 1.5 }
            },
            {
                id: 'vs_3',
                name: 'Cosmic Singularity Gateway',
                cost: 2000000,
                desc: 'Permanently increases Astral Shards gained from Ascension by +30%.',
                icon: '🌌',
                requires: ['vs_2'],
                effect: { type: 'shard_gain_mult', value: 1.30 }
            }
        ]
    }
];

export const MILESTONES_DATA = [
    {
        id: 'first_spark',
        name: 'First Spark',
        desc: 'Harvest your first drop of Aether from the dormant core.',
        lore: 'The long slumber ends. A faint tremor echoes through the basalt foundations.',
        condition: (state) => state.lifetimeAether >= 1,
        rewardText: 'Manual Core Channeling unlocked.'
    },
    {
        id: 'foundry_stirs',
        name: 'The Foundry Stirs',
        desc: 'Construct your first Aether Condenser.',
        lore: 'Vapor siphons groan as cold mist rushes into the primary conduits.',
        condition: (state) => (state.buildings['aether_condenser'] || 0) >= 1,
        rewardText: '+5% global Aether production.'
    },
    {
        id: 'harmonic_vibrations',
        name: 'Harmonic Vibrations',
        desc: 'Construct 5 Resonance Furnaces.',
        lore: 'A deep acoustic resonance aligns the crystal arrays, purging impurities.',
        condition: (state) => (state.buildings['resonance_furnace'] || 0) >= 5,
        rewardText: 'Resonance Furnaces produce +10% Aether.'
    },
    {
        id: 'cosmic_botanist',
        name: 'Cosmic Botanist',
        desc: 'Cultivate 10 Void Gardens on the lower terraces.',
        lore: 'Phosphorescent spores drift over the parapets like living starlight.',
        condition: (state) => (state.buildings['void_garden'] || 0) >= 10,
        rewardText: 'Void Gardens produce +10% Aether.'
    },
    {
        id: 'gazing_eternity',
        name: 'Gazing Into Eternity',
        desc: 'Construct an Astral Observatory.',
        lore: 'The brass armillary swings towards an unmapped nebula. Ancient coordinates align.',
        condition: (state) => (state.buildings['astral_observatory'] || 0) >= 1,
        rewardText: 'Unlocks deeper cosmic lore in the Archive.'
    },
    {
        id: 'bending_stream',
        name: 'Bending the Stream',
        desc: 'Construct a Chronal Engine.',
        lore: 'The ticks of time fold over themselves. The future feeds the present.',
        condition: (state) => (state.buildings['chronal_engine'] || 0) >= 1,
        rewardText: '+15% global Aether production.'
    },
    {
        id: 'stellar_blacksmith',
        name: 'Stellar Blacksmith',
        desc: 'Ignite your first Celestial Forge.',
        lore: 'A miniature star is captured within the magnetic crucible. The foundry hums with godlike power.',
        condition: (state) => (state.buildings['celestial_forge'] || 0) >= 1,
        rewardText: 'Ascension Gateway becomes visible.'
    },
    {
        id: 'industrial_awakening',
        name: 'Industrial Awakening',
        desc: 'Reach 1,000 Aether generated per second.',
        lore: 'The foundry is no longer a silent ruin; it is an industrial organism of cosmic scale.',
        condition: (state) => state.lastCalculatedCps >= 1000,
        rewardText: '+10% global Aether production.'
    },
    {
        id: 'grand_conductor',
        name: 'The Grand Conductor',
        desc: 'Own 50 total buildings across the Astral Foundry.',
        lore: 'Every platform, pipe, and pylon vibrates in perfect unison.',
        condition: (state) => {
            const total = Object.values(state.buildings).reduce((a, b) => a + b, 0);
            return total >= 50;
        },
        rewardText: 'All building costs reduced by 5%.'
    },
    {
        id: 'master_codex',
        name: 'Master of the Codex',
        desc: 'Complete 8 Research Projects.',
        lore: 'The forgotten knowledge of the Astral Architects is transcribed into the central codex.',
        condition: (state) => (state.researchedNodes || []).length >= 8,
        rewardText: 'All remaining research costs reduced by 15%.'
    },
    {
        id: 'ascendant_horizon',
        name: 'Ascendant Horizon',
        desc: 'Amass 10,000,000 lifetime Aether.',
        lore: 'The crucible has reached critical mass. The dimensional anchors are ready to dissolve.',
        condition: (state) => state.lifetimeAether >= CONFIG.ASCENSION_UNLOCK_AETHER,
        rewardText: 'The Ascension Ritual is ready to be initiated.'
    },
    {
        id: 'beyond_time',
        name: 'Beyond Time',
        desc: 'Ascend the Astral Foundry to a higher cosmic plane.',
        lore: 'The old structure dissolves into radiant light, reborn in higher dimensional space.',
        condition: (state) => state.ascensionCount >= 1,
        rewardText: 'Permanent +25% production across all future cycles.'
    }
];

export const ASCENSION_PERKS = [
    {
        id: 'astral_memory',
        name: 'Astral Memory',
        desc: '+15% global Aether production per rank.',
        cost: 1,
        costScale: 1.5,
        maxLevel: 10,
        icon: '🌌',
        effect: (lvl) => ({ globalMult: 1 + lvl * 0.15 })
    },
    {
        id: 'transcendent_spark',
        name: 'Transcendent Spark',
        desc: 'Core clicks generate +1.5% of passive CpS per rank.',
        cost: 2,
        costScale: 2.0,
        maxLevel: 5,
        icon: '✨',
        effect: (lvl) => ({ clickCpsRatio: lvl * 0.015 })
    },
    {
        id: 'cosmic_blueprint',
        name: 'Cosmic Blueprint',
        desc: 'Start new Ascensions with +2 Condensers and +1 Furnace per rank.',
        cost: 3,
        costScale: 2.0,
        maxLevel: 5,
        icon: '📐',
        effect: (lvl) => ({ startCondensers: lvl * 2, startFurnaces: lvl * 1 })
    },
    {
        id: 'chronal_conduit',
        name: 'Chronal Conduit',
        desc: 'Offline progress efficiency increased by +10% per rank.',
        cost: 2,
        costScale: 2.0,
        maxLevel: 5,
        icon: '⏳',
        effect: (lvl) => ({ offlineEfficiencyBonus: lvl * 0.10 })
    },
    {
        id: 'aetheric_compression',
        name: 'Aetheric Compression',
        desc: 'Reduces all building base costs by 5% per rank.',
        cost: 4,
        costScale: 2.5,
        maxLevel: 5,
        icon: '💠',
        effect: (lvl) => ({ buildingCostDiscount: lvl * 0.05 })
    }
];
