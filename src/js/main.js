class Game {
    constructor() {
        this.state = {}; // State will be loaded or initialized

        // DOM Elements
        this.coinsEl = document.getElementById('coins');
        this.plantsEl = document.getElementById('plants');
        this.harvestedEl = document.getElementById('harvested');
        this.gardenEl = document.getElementById('garden');
        this.messageEl = document.getElementById('message');
        this.weatherDisplayEl = document.getElementById('weather-display');
        this.buySprayerBtn = document.getElementById('buy-sprayer');
        this.sprayBtn = document.querySelector('.btn-spray');
        this.buyGreenhouseBtn = document.getElementById('buy-greenhouse');
        this.greenhouseBtn = document.querySelector('.btn-greenhouse');

        // Level UI
        this.levelEl = document.getElementById('level');
        this.xpEl = document.getElementById('xp');
        this.xpNeededEl = document.getElementById('xp-needed');
        this.xpProgressEl = document.getElementById('xp-progress');


        this.init();
    }

    init() {
        this.loadState();
        this.initGarden();
        this.attachEventListeners();
        this.updateAllPlots();
        this.updateStats();
        this.updateLevelUI();
        this.updateShop();
        // this.updateSprayerUI(); // Pest system disabled
        this.updateGreenhouseUI();
        // this.checkWarmButton(); // Weather system disabled
        this.setMode('plant');
        this.showMessage('Добро пожаловать в сад! Выберите семена и начните сажать.', 'info');

        // Start the weather cycle
        // this.updateWeather(); // Weather system disabled
        // setInterval(() => this.updateWeather(), 30000); // Weather system disabled

        // Start the main game loop
        setInterval(() => this.gameLoop(), 1000); // Runs every second
    }

    gameLoop() {
        this.updateGrowth();
        this.updateFruiting();
        this.updateAllPlots(); // To update timers
    }

    updateGrowth() {
        Object.keys(this.state.garden).forEach(plotId => {
            const plant = this.state.garden[plotId];
            if (plant && plant.growthFinishTime && Date.now() > plant.growthFinishTime) {
                plant.stage++;
                plant.watered = false;
                plant.growthFinishTime = null;

                // Check for fruiting stage
                if (plant.stage === 2 && plant.hasGreenhouse && config.fruitingConfig.fruitingPlants.includes(plant.type)) {
                    plant.isFruiting = true;
                    plant.lastFruitedAt = Date.now();
                }
                this.saveState();
            }
        });
    }

    updateFruiting() {
        Object.keys(this.state.garden).forEach(plotId => {
            const plant = this.state.garden[plotId];
            if (plant && plant.isFruiting && Date.now() - plant.lastFruitedAt > config.fruitingConfig.cycle) {
                this.state.coins += config.fruitingConfig.value;
                plant.lastFruitedAt = Date.now();
                this.showAnimation(`+${config.fruitingConfig.value}💰`, this.gardenEl.querySelector(`[data-id='${plotId}']`), '#FFD700');
                this.updateStats();
                this.saveState();
            }
        });
    }

    checkForPests() {
        let needsUpdate = false;
        Object.keys(this.state.garden).forEach(plotId => {
            const plant = this.state.garden[plotId];
            if (!plant || plant.isInfested) {
                // If plant is already infested, check if it should die
                if (plant && plant.infestedAt && Date.now() - plant.infestedAt > config.pestConfig.deathTimer) {
                    delete this.state.garden[plotId];
                    needsUpdate = true;
                }
                return;
            }

            let pestChance = config.pestConfig.chance;
            if (this.state.weather === 'foggy') {
                pestChance *= 2; // Double chance in fog
            }
            if (plant.vulnerableUntil && plant.vulnerableUntil > Date.now()) {
                pestChance *= 5; // 5x chance if vulnerable
            }

            if (Math.random() < pestChance) {
                plant.isInfested = true;
                plant.infestedAt = Date.now();
                needsUpdate = true;
            }
        });

        if (needsUpdate) {
            this.updateAllPlots();
        }
    }

    updateWeather() {
        const weatherKeys = Object.keys(config.weatherTypes);
        const newWeatherKey = weatherKeys[Math.floor(Math.random() * weatherKeys.length)];
        this.state.weather = newWeatherKey;
        const weather = config.weatherTypes[newWeatherKey];

        this.weatherDisplayEl.innerHTML = `${weather.icon} ${weather.name}`;
        this.showMessage(`Погода изменилась: ${weather.name}`, 'info');

        // Apply immediate effects
        if (weather.effect === 'auto_water') {
            Object.values(this.state.garden).forEach(plant => {
                plant.watered = true;
            });
            this.updateAllPlots();
        } else if (weather.effect === 'freeze_chance') {
            Object.keys(this.state.garden).forEach(plotId => {
                const plant = this.state.garden[plotId];
                if (plant && !plant.hasGreenhouse && Math.random() < 0.25) { // 25% chance
                    plant.isFrozen = true;
                }
            });
            this.updateAllPlots();
        }

        this.checkWarmButton();
        this.saveState();
    }

    saveState() {
        localStorage.setItem('growAGardenState', JSON.stringify(this.state));
    }

    loadState() {
        const savedState = localStorage.getItem('growAGardenState');
        if (savedState) {
            try {
                this.state = JSON.parse(savedState);

                // Migration: remove old weather keys from save
                if (this.state.weather) delete this.state.weather;
                if (this.state.lastWeatherUpdate) delete this.state.lastWeatherUpdate;

            } catch (error) {
                console.error("Failed to parse saved state, resetting game.", error);
                this.state = this.getInitialState();
            }
        } else {
            this.state = this.getInitialState();
        }
    }

    getInitialState() {
        return {
            coins: 50,
            plants: 0,
            harvested: 0,
            level: 1,
            xp: 0,
            mode: 'plant',
            selectedSeed: { emoji: '🌱', cost: 5 },
            garden: {},
            hasSprayer: false,
            greenhouseInventory: 0
        };
    }

    resetGame() {
        localStorage.removeItem('growAGardenState');
        location.reload();
    }

    initGarden() {
        this.gardenEl.innerHTML = '';
        for (let i = 0; i < 25; i++) {
            const plot = document.createElement('div');
            plot.className = 'plot';
            plot.dataset.id = i;
            this.gardenEl.appendChild(plot);
        }
    }

    attachEventListeners() {
        // Mode buttons
        document.querySelector('.btn-plant').addEventListener('click', () => this.setMode('plant'));
        document.querySelector('.btn-water').addEventListener('click', () => this.setMode('water'));
        document.querySelector('.btn-harvest').addEventListener('click', () => this.setMode('harvest'));
        document.querySelector('.btn-dig').addEventListener('click', () => this.setMode('dig'));
        document.querySelector('.btn-warm').addEventListener('click', () => this.setMode('warm'));
        this.sprayBtn.addEventListener('click', () => this.setMode('spray'));
        this.greenhouseBtn.addEventListener('click', () => this.setMode('build'));

        // Shop items
        this.buySprayerBtn.addEventListener('click', () => this.buySprayer());
        this.buyGreenhouseBtn.addEventListener('click', () => this.buyGreenhouse());
        document.getElementById('btn-reset').addEventListener('click', () => {
            if (confirm('Сбросить прогресс? Это действие нельзя отменить.')) {
                this.resetGame();
            }
        });

        // Seed selection
        document.querySelectorAll('.seed').forEach(seedEl => {
            seedEl.addEventListener('click', () => {
                const emoji = seedEl.dataset.seed;
                // A bit of a hack to get the cost from the text content
                const cost = parseInt(seedEl.textContent.match(/\((\d+)/)[1]);
                this.selectSeed(emoji, cost);
            });
        });

        // Garden plots
        this.gardenEl.addEventListener('click', (e) => {
            if (e.target.classList.contains('plot')) {
                const plotId = e.target.dataset.id;
                this.handlePlotClick(plotId);
            }
        });
    }

    setMode(mode) {
        this.state.mode = mode;
        document.querySelectorAll('.btn').forEach(btn => btn.style.opacity = '0.7');
        document.querySelector(`.btn-${mode}`).style.opacity = '1';
        const modeText = {
            plant: 'Посадка',
            water: 'Полив',
            harvest: 'Сбор',
            warm: 'Согревание',
            spray: 'Опрыскивание',
            dig: 'Выкопать'
        };
        this.showMessage(`Режим: ${modeText[mode] || mode}`, 'info');
        this.updatePlotHints();
        this.saveState();
    }

    selectSeed(emoji, cost) {
        this.state.selectedSeed = { emoji, cost };
        document.querySelectorAll('.seed').forEach(seed => {
            seed.classList.remove('selected');
        });
        document.querySelector(`[data-seed="${emoji}"]`).classList.add('selected');
        this.showMessage(`Выбрано: ${emoji} (${cost} монет)`, 'info');
        this.saveState();
    }

    handlePlotClick(plotId) {
        const plotEl = this.gardenEl.querySelector(`[data-id='${plotId}']`);
        const plantData = this.state.garden[plotId];

        switch (this.state.mode) {
            case 'plant':
                this.plantSeed(plotId, plotEl);
                break;
            case 'water':
                this.waterPlant(plotId, plotEl, plantData);
                break;
            case 'harvest':
                this.harvestPlant(plotId, plotEl, plantData);
                break;
            case 'warm':
                this.warmPlant(plotId, plotEl, plantData);
                break;
            case 'spray':
                this.sprayPlant(plotId, plotEl, plantData);
                break;
            case 'build':
                this.buildGreenhouse(plotId, plotEl, plantData);
                break;
            case 'dig':
                this.digUpPlant(plotId, plotEl, plantData);
                break;
        }
    }

    digUpPlant(plotId, plotEl, plantData) {
        if (!plantData) {
            this.showMessage('Здесь нечего выкапывать.', 'info');
            return;
        }
        delete this.state.garden[plotId];
        this.state.plants--;
        this.updatePlot(plotId, plotEl);
        this.updateStats();
        this.updatePlotHints(); // To remove the hint from the now-empty plot
        this.saveState();
        this.showMessage('Вы очистили грядку.', 'success');
    }

    plantSeed(plotId, plotEl) {
        if (this.state.garden[plotId]) {
            this.showMessage('Здесь уже что-то растет!', 'info');
            return;
        }
        if (this.state.coins < this.state.selectedSeed.cost) {
            this.showMessage('Недостаточно монет!', 'info');
            return;
        }

        this.state.coins -= this.state.selectedSeed.cost;
        this.state.plants++;
        this.state.garden[plotId] = {
            type: this.state.selectedSeed.emoji,
            stage: 0,
            watered: false,
            isFrozen: false,
            isInfested: false,
            infestedAt: null,
            vulnerableUntil: null,
            hasGreenhouse: false,
            isFruiting: false,
            lastFruitedAt: null,
            growthFinishTime: null,
            plantedAt: Date.now()
        };

        this.updatePlot(plotId, plotEl);
        this.updateStats();
        this.showMessage(`Посажено ${this.state.selectedSeed.emoji}!`, 'success');
        this.saveState();
    }

    waterPlant(plotId, plotEl, plantData) {
        if (!plantData) {
            this.showMessage('Здесь ничего не растет!', 'info');
            return;
        }
        if (plantData.isFrozen) {
            this.showMessage('Нельзя поливать замороженное растение!', 'info');
            return;
        }
        if (plantData.isInfested) {
            this.showMessage('Нельзя поливать больное растение!', 'info');
            return;
        }
        if (plantData.watered) {
            this.showMessage('Уже полито!', 'info');
            return;
        }

        plantData.watered = true;

        let growthTime = config.growthTimes[plantData.type] || 3000;
        if (plantData.hasGreenhouse) {
            growthTime *= (1 - config.greenhouseConfig.growthBonus);
        }
        plantData.growthFinishTime = Date.now() + growthTime;

        this.showAnimation('💧', plotEl);
        this.updatePlot(plotId, plotEl); // Update visuals immediately
        this.saveState(); // Save watered state

        this.showMessage('Растение полито! Оно скоро вырастет.', 'success');
    }

    warmPlant(plotId, plotEl, plantData) {
        if (!plantData || !plantData.isFrozen) {
            this.showMessage('Это растение не замерзло.', 'info');
            return;
        }
        plantData.isFrozen = false;
        plantData.vulnerableUntil = Date.now() + 60000; // Vulnerable for 1 minute for testing
        this.updatePlot(plotId, plotEl);
        this.checkWarmButton();
        this.saveState();
        this.showMessage('Вы согрели растение! Оно теперь уязвимо для вредителей.', 'success');
    }

    buySprayer() {
        const cost = 100;
        if (this.state.hasSprayer) {
            this.showMessage('У вас уже есть опрыскиватель.', 'info');
            return;
        }
        if (this.state.coins < cost) {
            this.showMessage('Недостаточно монет!', 'info');
            return;
        }
        this.state.coins -= cost;
        this.state.hasSprayer = true;
        this.updateSprayerUI();
        this.updateStats();
        this.saveState();
        this.showMessage('Вы купили опрыскиватель!', 'success');
    }

    buyGreenhouse() {
        const cost = config.greenhouseConfig.cost;
        if (this.state.coins < cost) {
            this.showMessage('Недостаточно монет!', 'info');
            return;
        }
        this.state.coins -= cost;
        this.state.greenhouseInventory++;
        this.updateGreenhouseUI();
        this.updateStats();
        this.saveState();
        this.showMessage('Вы купили теплицу!', 'success');
    }

    buildGreenhouse(plotId, plotEl, plantData) {
        if (plantData && plantData.hasGreenhouse) {
            this.showMessage('Здесь уже есть теплица.', 'info');
            return;
        }
        if (this.state.greenhouseInventory < 1) {
            this.showMessage('У вас нет теплиц для постройки.', 'info');
            return;
        }
        if (!plantData) {
            this.showMessage('Сначала нужно что-то посадить.', 'info');
            return;
        }

        this.state.greenhouseInventory--;
        plantData.hasGreenhouse = true;
        this.updatePlot(plotId, plotEl);
        this.updateGreenhouseUI();
        this.saveState();
        this.showMessage('Теплица построена!', 'success');
    }

    sprayPlant(plotId, plotEl, plantData) {
        const cost = 5;
        if (!plantData || !plantData.isInfested) {
            this.showMessage('Здесь нет вредителей.', 'info');
            return;
        }
        if (this.state.coins < cost) {
            this.showMessage(`Нужно ${cost} монет для опрыскивания!`, 'info');
            return;
        }
        this.state.coins -= cost;
        plantData.isInfested = false;
        plantData.infestedAt = null;
        this.updatePlot(plotId, plotEl);
        this.updateStats();
        this.saveState();
        this.showMessage('Вы избавились от вредителей!', 'success');
    }

    harvestPlant(plotId, plotEl, plantData) {
        if (!plantData) {
            this.showMessage('Здесь ничего нет для сбора!', 'info');
            return;
        }
        if (plantData.isInfested) {
            this.showMessage('Нельзя собрать больное растение!', 'info');
            return;
        }
        if (plantData.isFruiting) {
            this.showMessage('Это растение приносит плоды! Его нельзя собрать.', 'info');
            return;
        }
        if (plantData.stage < 2) {
            this.showMessage('Растение еще не созрело!', 'info');
            return;
        }

        const value = config.harvestValues[plantData.type];
        this.state.coins += value;
        this.state.harvested++;
        this.state.plants--;

        this.addXp(config.levelConfig.xpPerHarvest);

        this.showAnimation(`+${value}💰`, plotEl, '#FFD700');

        delete this.state.garden[plotId];

        plotEl.style.transition = 'opacity 0.5s ease';
        plotEl.style.opacity = '0.5';
        setTimeout(() => {
            plotEl.innerHTML = '';
            plotEl.className = 'plot';
            plotEl.style.background = '#D2B48C';
            plotEl.style.border = '2px solid #A0522D';
            plotEl.style.opacity = '1';
        }, 500);

        this.updateStats();
        this.showMessage(`Собрано ${plantData.type}! +${value} монет`, 'success');
        this.saveState();
    }

    updateAllPlots() {
        for (const plotId in this.state.garden) {
            const plotEl = this.gardenEl.querySelector(`[data-id='${plotId}']`);
            if (plotEl) {
                this.updatePlot(plotId, plotEl);
            }
        }
    }

    updatePlot(plotId, plotEl) {
        const plantData = this.state.garden[plotId];
        if (!plantData) {
            plotEl.innerHTML = '';
            plotEl.className = 'plot';
            return;
        }

        const stages = config.plantGrowthStages[plantData.type];
        const currentStageEmoji = stages[plantData.stage];

        plotEl.innerHTML = `<div class="plant">${currentStageEmoji}</div>`;

        if (plantData.isFrozen) {
            plotEl.innerHTML += '<div style="position:absolute; top:0; left:0; right:0; bottom:0; background:rgba(173, 216, 230, 0.5); border-radius: 8px;"></div>';
        }
        if (plantData.isInfested) {
            plotEl.innerHTML += `<div style="position:absolute; top: -10px; right: -5px; font-size: 1.5em;">${config.pestConfig.icon}</div>`;
        }
        if (plantData.hasGreenhouse) {
            plotEl.innerHTML += '<div style="position:absolute; top:0; left:0; right:0; bottom:0; border: 4px solid rgba(141, 110, 99, 0.5); border-radius: 12px; box-sizing: border-box;"></div>';
        }

        // Display growth timer
        if (plantData.growthFinishTime && plantData.growthFinishTime > Date.now()) {
            const remainingSeconds = Math.ceil((plantData.growthFinishTime - Date.now()) / 1000);
            plotEl.innerHTML += `<div class="plot-timer">${remainingSeconds}s</div>`;
        }

        const growthIndicator = document.createElement('div');
        growthIndicator.className = 'growth-indicator';
        const growthProgress = document.createElement('div');
        growthProgress.className = `growth-progress stage-${plantData.stage}`;
        growthIndicator.appendChild(growthProgress);
        plotEl.appendChild(growthIndicator);

        plotEl.className = 'plot';
        if (plantData.watered) {
            plotEl.style.background = '#87CEEB';
            plotEl.style.border = '2px solid #4682B4';
        } else {
            plotEl.style.background = '#D2B48C';
            plotEl.style.border = '2px solid #A0522D';
        }
        if (plantData.isFruiting) {
            plotEl.innerHTML += `<div style="position:absolute; bottom: 5px; left: 5px; font-size: 1.2em;">🍎</div>`;
        } else if (plantData.stage === 2) {
            plotEl.classList.add('ready-to-harvest');
        }
    }

    checkWarmButton() {
        const warmButton = document.querySelector('.btn-warm');
        const hasFrozenPlant = Object.values(this.state.garden).some(p => p.isFrozen);
        warmButton.style.display = hasFrozenPlant ? 'inline-block' : 'none';
    }

    updatePlotHints() {
        const isDigMode = this.state.mode === 'dig';
        this.gardenEl.querySelectorAll('.plot').forEach(plotEl => {
            const plotId = plotEl.dataset.id;
            const hasPlant = this.state.garden[plotId];
            if (isDigMode && hasPlant) {
                plotEl.classList.add('diggable');
            } else {
                plotEl.classList.remove('diggable');
            }
        });
    }

    updateSprayerUI() {
        if (this.state.hasSprayer) {
            this.sprayBtn.style.display = 'inline-block';
            this.buySprayerBtn.classList.add('owned');
            this.buySprayerBtn.textContent = 'Опрыскиватель (куплено)';
        } else {
            this.sprayBtn.style.display = 'none';
        }
    }

    updateGreenhouseUI() {
        if (this.state.greenhouseInventory > 0) {
            this.greenhouseBtn.style.display = 'inline-block';
            this.greenhouseBtn.textContent = `🏡 Построить (${this.state.greenhouseInventory})`;
        } else {
            this.greenhouseBtn.style.display = 'none';
        }
    }

    updateStats() {
        this.coinsEl.textContent = this.state.coins;
        this.plantsEl.textContent = this.state.plants;
        this.harvestedEl.textContent = this.state.harvested;
    }

    addXp(amount) {
        this.state.xp += amount;
        this.checkForLevelUp();
        this.updateLevelUI();
    }

    checkForLevelUp() {
        const currentLevel = this.state.level;
        const nextLevelInfo = config.levelConfig.levels[currentLevel]; // next level is current level index

        if (!nextLevelInfo) return; // Max level reached

        if (this.state.xp >= nextLevelInfo.xpNeeded) {
            this.state.level++;
            // Don't reset XP, let it accumulate. Or reset it: this.state.xp -= nextLevelInfo.xpNeeded;
            this.showMessage(`Поздравляем! Вы достигли ${this.state.level} уровня!`, 'success');
            this.updateShop();
        }
    }

    updateLevelUI() {
        const currentLevel = this.state.level;
        const levelIndex = currentLevel - 1;

        this.levelEl.textContent = currentLevel;

        const xpForCurrentLevel = config.levelConfig.levels[levelIndex]?.xpNeeded ?? this.state.xp;
        const xpForNextLevel = config.levelConfig.levels[levelIndex + 1]?.xpNeeded;

        if (xpForNextLevel) {
            this.xpEl.textContent = this.state.xp;
            this.xpNeededEl.textContent = xpForNextLevel;
            const progress = (this.state.xp - xpForCurrentLevel) / (xpForNextLevel - xpForCurrentLevel) * 100;
            this.xpProgressEl.style.width = `${progress}%`;
        } else {
            // Max level
            this.xpEl.textContent = this.state.xp;
            this.xpNeededEl.textContent = 'МАКС';
            this.xpProgressEl.style.width = '100%';
        }
    }

    updateShop() {
        const currentLevel = this.state.level;
        const unlockedSeeds = new Set();

        for (let i = 0; i < currentLevel; i++) {
            config.levelConfig.levels[i].unlocks.forEach(seed => unlockedSeeds.add(seed));
        }

        document.querySelectorAll('.seed').forEach(seedEl => {
            const seedEmoji = seedEl.dataset.seed;
            if (unlockedSeeds.has(seedEmoji)) {
                seedEl.style.display = 'inline-block';
            } else {
                seedEl.style.display = 'none';
            }
        });
    }

    showMessage(text, type = 'info') {
        this.messageEl.textContent = text;
        this.messageEl.className = `message ${type}`;

        setTimeout(() => {
            if (this.messageEl.textContent === text) {
                this.messageEl.textContent = '';
                this.messageEl.className = 'message';
            }
        }, 3000);
    }

    showAnimation(text, element, color = 'black') {
        const animEl = document.createElement('div');
        animEl.className = 'watering-animation';
        animEl.textContent = text;
        animEl.style.color = color;
        if (color === '#FFD700') {
            animEl.style.fontWeight = 'bold';
        }
        element.appendChild(animEl);

        setTimeout(() => {
            animEl.remove();
        }, 2000);
    }
}

// Initialize the game once the DOM is fully loaded
document.addEventListener('DOMContentLoaded', () => {
    new Game();
});
