const config = {
    plantGrowthStages: {
        '🌱': ['🌱', '🌿', '🍃'],
        '🥕': ['🌱', '🌿', '🥕'],
        '🌻': ['🌱', '🌿', '🌻'],
        '🌹': ['🌱', '🌿', '🌹'],
        '🍅': ['🌱', '🌿', '🍅'],
        '🌳': ['🌱', '🌿', '🌳'],
        '🎃': ['🌱', '🌿', '🎃']
    },

    harvestValues: {
        '🌱': 8,
        '🥕': 12,
        '🌻': 20,
        '🌹': 30,
        '🍅': 40,
        '🌳': 50,
        '🎃': 100
    },

    growthTimes: {
        '🌱': 3000,
        '🥕': 5000,
        '🌻': 8000,
        '🌹': 12000,
        '🍅': 18000,
        '🌳': 25000,
        '🎃': 30000
    },

    weatherTypes: {
        sunny: { icon: '☀️', name: 'Солнечно', effect: 'growth_boost' },
        rainy: { icon: '🌧️', name: 'Дождливо', effect: 'auto_water' },
        foggy: { icon: '🌫️', name: 'Туманно', effect: 'slow_growth' },
        frosty: { icon: '❄️', name: 'Заморозки', effect: 'freeze_chance' }
    },

    pestConfig: {
        icon: '🐞',
        chance: 0.01, // Base chance per check
        deathTimer: 30000, // 30 seconds for testing
    },

    greenhouseConfig: {
        cost: 50,
        growthBonus: 0.1,
    },

    fruitingConfig: {
        fruitingPlants: ['🌳', '🍅'], // Plants that can bear fruit
        value: 5, // Coins per cycle
        cycle: 10000 // 10 seconds for testing
    },

    levelConfig: {
        xpPerHarvest: 10,
        levels: [
            { xpNeeded: 0, unlocks: ['🌱', '🥕'] },      // Level 1
            { xpNeeded: 50, unlocks: ['🌻'] },         // Level 2
            { xpNeeded: 150, unlocks: ['🌹'] },        // Level 3
            { xpNeeded: 300, unlocks: ['🍅'] },        // Level 4
            { xpNeeded: 500, unlocks: ['🌳'] },        // Level 5
            { xpNeeded: 1000, unlocks: ['🎃'] }         // Level 6
        ]
    }
};
