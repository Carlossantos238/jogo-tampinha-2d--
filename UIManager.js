/**
 * UIManager.js - Manages Screen Transitions, HUD Updates, Bracket Visualizer,
 * Live Cap Preview, Shop Purchases, and Dialog Modals.
 * Futebol de Tampinha
 */

class UIManager {
  constructor(saveManager, audioManager) {
    this.save = saveManager;
    this.audio = audioManager;

    // Cache DOM Elements
    this.screens = {
      menu: document.getElementById("screen-menu"),
      setup: document.getElementById("screen-setup"),
      tournament: document.getElementById("screen-tournament"),
      customization: document.getElementById("screen-customization"),
      settings: document.getElementById("screen-settings")
    };

    this.hud = document.getElementById("game-hud");
    this.modalPause = document.getElementById("modal-pause");
    this.modalGameOver = document.getElementById("modal-game-over");

    // Callbacks to main game
    this.onStartMatch = null;
    this.onResumeMatch = null;
    this.onRestartMatch = null;
    this.onQuitMatch = null;

    this.initEventListeners();
    this.updateCoinsDisplay();
  }

  showScreen(screenName) {
    this.audio.playClick();
    Object.keys(this.screens).forEach(key => {
      if (this.screens[key]) {
        this.screens[key].classList.add("hidden");
      }
    });

    if (this.screens[screenName]) {
      this.screens[screenName].classList.remove("hidden");
    }

    if (this.hud) {
      if (screenName === 'game') {
        this.hud.classList.remove("hidden");
      } else {
        this.hud.classList.add("hidden");
      }
    }

    if (screenName === 'customization') {
      this.renderCustomizationPreview();
    }
  }

  hideAllScreens() {
    Object.keys(this.screens).forEach(key => {
      if (this.screens[key]) this.screens[key].classList.add("hidden");
    });
    if (this.hud) this.hud.classList.remove("hidden");
  }

  updateCoinsDisplay() {
    const coinEls = document.querySelectorAll(".coin-count");
    coinEls.forEach(el => {
      el.textContent = this.save.data.coins;
    });
  }

  initEventListeners() {
    // Menu Buttons
    this.bindClick("btn-menu-quick", () => this.openSetup('quick'));
    this.bindClick("btn-menu-tournament", () => this.openTournamentScreen());
    this.bindClick("btn-menu-2p", () => this.openSetup('2p'));
    this.bindClick("btn-menu-training", () => {
      if (this.onStartMatch) {
        this.onStartMatch({
          mode: 'training',
          duration: Infinity,
          stadium: this.save.data.selectedStadium,
          difficulty: 'normal'
        });
      }
    });
    this.bindClick("btn-menu-customization", () => this.showScreen('customization'));
    this.bindClick("btn-menu-settings", () => this.showScreen('settings'));

    // Back Buttons
    this.bindClick("btn-setup-back", () => this.showScreen('menu'));
    this.bindClick("btn-tournament-back", () => this.showScreen('menu'));
    this.bindClick("btn-custom-back", () => this.showScreen('menu'));
    this.bindClick("btn-settings-back", () => this.showScreen('menu'));

    // Setup Start Match Button
    this.bindClick("btn-setup-start", () => {
      const stadium = document.getElementById("select-stadium").value;
      const duration = parseInt(document.getElementById("select-duration").value, 10);
      const difficulty = document.getElementById("select-difficulty").value;

      const t1PresetId = document.getElementById("select-team1-preset") ? document.getElementById("select-team1-preset").value : 'custom';
      const t2PresetId = document.getElementById("select-team2-preset") ? document.getElementById("select-team2-preset").value : 'flamengo';

      let team1Data = { ...this.save.data.playerTeam };
      if (t1PresetId !== 'custom') {
        const found = this.save.TEAM_PRESETS.find(p => p.id === t1PresetId);
        if (found) team1Data = { ...found, skin: this.save.data.playerTeam.skin, decal: this.save.data.playerTeam.decal };
      }

      let team2Data = { ...this.save.data.aiTeam };
      if (t2PresetId) {
        const found = this.save.TEAM_PRESETS.find(p => p.id === t2PresetId);
        if (found) team2Data = { ...found, skin: 'plastic', decal: null };
      }

      if (this.onStartMatch) {
        this.onStartMatch({
          mode: this.currentSetupMode || 'quick',
          stadium: stadium,
          duration: duration,
          difficulty: difficulty,
          team1: team1Data,
          team2: team2Data
        });
      }
    });

    // Pause Modal Buttons
    this.bindClick("btn-pause-toggle", () => this.openPauseModal());
    this.bindClick("btn-pause-resume", () => this.closePauseModal());
    this.bindClick("btn-pause-restart", () => {
      this.closePauseModal();
      if (this.onRestartMatch) this.onRestartMatch();
    });
    this.bindClick("btn-pause-quit", () => {
      this.closePauseModal();
      if (this.onQuitMatch) this.onQuitMatch();
      this.showScreen('menu');
    });

    // Game Over Buttons
    this.bindClick("btn-over-rematch", () => {
      this.modalGameOver.classList.add("hidden");
      if (this.onRestartMatch) this.onRestartMatch();
    });
    this.bindClick("btn-over-menu", () => {
      this.modalGameOver.classList.add("hidden");
      if (this.onQuitMatch) this.onQuitMatch();
      this.showScreen('menu');
    });

    // Audio Toggles
    this.bindClick("btn-toggle-sfx", () => {
      const active = this.audio.toggleSFX();
      const el = document.getElementById("btn-toggle-sfx");
      if (el) el.textContent = active ? "🔊 Efeitos: LIGADO" : "🔇 Efeitos: MUTADO";
    });

    // Customization inputs
    const teamNameInput = document.getElementById("input-team-name");
    if (teamNameInput) {
      teamNameInput.value = this.save.data.playerTeam.name;
      teamNameInput.addEventListener("input", (e) => {
        this.save.data.playerTeam.name = e.target.value.trim() || "Meu Time";
        this.save.save();
        this.renderCustomizationPreview();
      });
    }

    const patternSelect = document.getElementById("select-pattern");
    if (patternSelect) {
      patternSelect.value = this.save.data.playerTeam.pattern || "solid";
      patternSelect.addEventListener("change", (e) => {
        this.save.data.playerTeam.pattern = e.target.value;
        this.save.save();
        this.renderCustomizationPreview();
      });
    }

    const primaryColorInput = document.getElementById("input-primary-color");
    if (primaryColorInput) {
      primaryColorInput.value = this.save.data.playerTeam.primaryColor;
      primaryColorInput.addEventListener("input", (e) => {
        this.save.data.playerTeam.primaryColor = e.target.value;
        this.save.data.playerTeam.rimColor = e.target.value;
        this.save.save();
        this.renderCustomizationPreview();
      });
    }

    const secondaryColorInput = document.getElementById("input-secondary-color");
    if (secondaryColorInput) {
      secondaryColorInput.value = this.save.data.playerTeam.secondaryColor;
      secondaryColorInput.addEventListener("input", (e) => {
        this.save.data.playerTeam.secondaryColor = e.target.value;
        this.save.save();
        this.renderCustomizationPreview();
      });
    }
  }

  applyTeamPreset(presetId) {
    if (!this.save || !this.save.TEAM_PRESETS) return;
    const preset = this.save.TEAM_PRESETS.find(p => p.id === presetId);
    if (!preset) return;

    this.save.data.playerTeam.name = preset.name;
    this.save.data.playerTeam.primaryColor = preset.primaryColor;
    this.save.data.playerTeam.secondaryColor = preset.secondaryColor;
    this.save.data.playerTeam.rimColor = preset.rimColor;
    this.save.data.playerTeam.pattern = preset.pattern;
    this.save.save();

    const nameInput = document.getElementById("input-team-name");
    if (nameInput) nameInput.value = preset.name;
    const priInput = document.getElementById("input-primary-color");
    if (priInput) priInput.value = preset.primaryColor;
    const secInput = document.getElementById("input-secondary-color");
    if (secInput) secInput.value = preset.secondaryColor;
    const patSelect = document.getElementById("select-pattern");
    if (patSelect) patSelect.value = preset.pattern;

    this.audio.playClick();
    this.renderCustomizationPreview();
  }

  bindClick(id, handler) {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("click", () => {
        this.audio.playClick();
        handler();
      });
    }
  }

  openSetup(mode = 'quick') {
    this.currentSetupMode = mode;
    const titleEl = document.getElementById("setup-mode-title");
    if (titleEl) {
      titleEl.textContent = mode === '2p' ? "Configurar 2 Jogadores (Local)" : "Configurar Partida Rápida";
    }
    const diffContainer = document.getElementById("setup-diff-container");
    if (diffContainer) {
      diffContainer.style.display = mode === '2p' ? "none" : "block";
    }
    this.showScreen('setup');
  }

  openTournamentScreen() {
    this.showScreen('tournament');
    this.renderTournamentBracket();
  }

  renderTournamentBracket() {
    const container = document.getElementById("tournament-bracket-container");
    if (!container || !window.tournament) return;

    const t = window.tournament;
    const currentRound = t.currentRound;

    let html = `<div class="bracket-rounds">`;

    for (let r = 0; r < t.bracket.length; r++) {
      const matches = t.bracket[r];
      const isRoundActive = (r === currentRound);
      const roundName = t.roundNames[r];

      html += `<div class="bracket-round ${isRoundActive ? 'active-round' : ''}">
        <h4 class="round-title">${roundName}</h4>
        <div class="matches-list">`;

      for (let m = 0; m < matches.length; m++) {
        const match = matches[m];
        const isPlayer = match.isPlayerMatch;
        const nameA = match.teamA ? match.teamA.name : "A definir";
        const nameB = match.teamB ? match.teamB.name : "A definir";
        const scoreA = match.scoreA !== null ? match.scoreA : "-";
        const scoreB = match.scoreB !== null ? match.scoreB : "-";
        const colorA = match.teamA ? match.teamA.primaryColor : "#64748b";
        const colorB = match.teamB ? match.teamB.primaryColor : "#64748b";

        html += `
          <div class="bracket-match-card ${isPlayer ? 'player-match' : ''}">
            <div class="match-team ${match.winner === match.teamA ? 'team-winner' : ''}">
              <span class="team-dot" style="background: ${colorA}"></span>
              <span class="team-name">${nameA}</span>
              <span class="team-score">${scoreA}</span>
            </div>
            <div class="match-team ${match.winner === match.teamB ? 'team-winner' : ''}">
              <span class="team-dot" style="background: ${colorB}"></span>
              <span class="team-name">${nameB}</span>
              <span class="team-score">${scoreB}</span>
            </div>
          </div>
        `;
      }

      html += `</div></div>`;
    }

    html += `</div>`;

    // Action button
    if (currentRound < 3) {
      html += `
        <div class="tournament-action-box">
          <button id="btn-tournament-play" class="btn btn-primary btn-large glow-btn">
            ⚔️ JOGAR ${t.roundNames[currentRound].toUpperCase()}
          </button>
        </div>
      `;
    } else {
      // Champion!
      html += `
        <div class="tournament-champion-box">
          <div class="trophy-icon">🏆</div>
          <h2 class="gold-text">PARABÉNS! CAMPEÃO DA COPA!</h2>
          <p>Você levantou a taça e ganhou <strong>+250 Moedas</strong>!</p>
          <button id="btn-tournament-restart" class="btn btn-secondary">NOVO TORNEIO</button>
        </div>
      `;
    }

    container.innerHTML = html;

    const playBtn = document.getElementById("btn-tournament-play");
    if (playBtn) {
      playBtn.addEventListener("click", () => {
        this.audio.playClick();
        const currentMatch = t.getCurrentMatch();
        if (currentMatch && this.onStartMatch) {
          this.onStartMatch({
            mode: 'tournament',
            team1: currentMatch.teamA,
            team2: currentMatch.teamB,
            duration: 90,
            difficulty: currentRound === 0 ? 'easy' : (currentRound === 1 ? 'normal' : 'hard'),
            stadium: currentRound === 2 ? 'futuristic' : 'grass'
          });
        }
      });
    }

    const restartBtn = document.getElementById("btn-tournament-restart");
    if (restartBtn) {
      restartBtn.addEventListener("click", () => {
        t.startNewTournament(this.save.data.playerTeam);
        this.renderTournamentBracket();
      });
    }
  }

  renderCustomizationPreview() {
    const canvas = document.getElementById("preview-cap-canvas");
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Create temporary Cap entity for preview
    const previewCap = new Cap({
      x: canvas.width / 2,
      y: canvas.height / 2,
      team: 1,
      number: 10,
      primaryColor: this.save.data.playerTeam.primaryColor,
      secondaryColor: this.save.data.playerTeam.secondaryColor,
      rimColor: this.save.data.playerTeam.rimColor,
      pattern: this.save.data.playerTeam.pattern || "solid",
      skin: this.save.data.playerTeam.skin,
      decal: this.save.data.playerTeam.decal
    });
    previewCap.radius = 48; // Enlarged for preview
    previewCap.draw(ctx);

    const descEl = document.getElementById("preview-cap-desc");
    if (descEl) descEl.textContent = `${this.save.data.playerTeam.name} (#10)`;

    // Render Skin Selection Cards
    this.renderSkinCards();
    this.renderDecalCards();
  }

  renderSkinCards() {
    const container = document.getElementById("skins-container");
    if (!container) return;

    const skins = [
      { id: "plastic", name: "Plástico Clássico", price: 0 },
      { id: "metal", name: "Coroa Metálica", price: 100 },
      { id: "gold", name: "Ouro Campeão", price: 250 },
      { id: "neon", name: "Cyber Neon", price: 200 },
      { id: "carbon", name: "Fibra de Carbono", price: 300 }
    ];

    container.innerHTML = skins.map(skin => {
      const isUnlocked = this.save.isUnlocked("skin", skin.id);
      const isEquipped = (this.save.data.playerTeam.skin === skin.id);

      return `
        <div class="custom-card ${isEquipped ? 'equipped' : ''}" onclick="window.ui.handleSkinClick('${skin.id}', ${skin.price})">
          <div class="card-name">${skin.name}</div>
          <div class="card-status">
            ${isEquipped ? '✔️ EQUIPADO' : (isUnlocked ? 'EQUIPAR' : `🪙 ${skin.price}`)}
          </div>
        </div>
      `;
    }).join("");
  }

  handleSkinClick(skinId, price) {
    if (this.save.isUnlocked("skin", skinId)) {
      this.save.data.playerTeam.skin = skinId;
      this.save.save();
      this.renderCustomizationPreview();
      this.audio.playClick();
    } else {
      if (this.save.unlockItem("skin", skinId, price)) {
        this.save.data.playerTeam.skin = skinId;
        this.save.save();
        this.updateCoinsDisplay();
        this.renderCustomizationPreview();
        this.audio.playPostHit(300);
      } else {
        alert("Moedas insuficientes! Jogue partidas para ganhar mais moedas.");
      }
    }
  }

  renderDecalCards() {
    const container = document.getElementById("decals-container");
    if (!container) return;

    const decals = [
      { id: "default", name: "Número #10", decal: null, price: 0 },
      { id: "star", name: "Estrela Dourada", decal: "star", price: 80 },
      { id: "crown", name: "Coroa Real", decal: "crown", price: 150 },
      { id: "lightning", name: "Raio Veloz", decal: "lightning", price: 120 }
    ];

    container.innerHTML = decals.map(item => {
      const isUnlocked = item.id === "default" || this.save.isUnlocked("decal", item.id);
      const isEquipped = (this.save.data.playerTeam.decal === item.decal);

      return `
        <div class="custom-card ${isEquipped ? 'equipped' : ''}" onclick="window.ui.handleDecalClick('${item.id}', '${item.decal || ''}', ${item.price})">
          <div class="card-name">${item.name}</div>
          <div class="card-status">
            ${isEquipped ? '✔️ EQUIPADO' : (isUnlocked ? 'EQUIPAR' : `🪙 ${item.price}`)}
          </div>
        </div>
      `;
    }).join("");
  }

  handleDecalClick(id, decalVal, price) {
    const decal = decalVal || null;
    if (id === "default" || this.save.isUnlocked("decal", id)) {
      this.save.data.playerTeam.decal = decal;
      this.save.save();
      this.renderCustomizationPreview();
      this.audio.playClick();
    } else {
      if (this.save.unlockItem("decal", id, price)) {
        this.save.data.playerTeam.decal = decal;
        this.save.save();
        this.updateCoinsDisplay();
        this.renderCustomizationPreview();
        this.audio.playPostHit(300);
      } else {
        alert("Moedas insuficientes!");
      }
    }
  }

  updateHUD(match, turnManager) {
    if (!this.hud || this.hud.classList.contains("hidden")) return;

    // Team names & badges
    const t1Name = document.getElementById("hud-team1-name");
    const t2Name = document.getElementById("hud-team2-name");
    const t1Dot = document.getElementById("hud-team1-dot");
    const t2Dot = document.getElementById("hud-team2-dot");
    if (t1Name) t1Name.textContent = match.team1.name;
    if (t2Name) t2Name.textContent = match.team2.name;
    if (t1Dot) t1Dot.style.background = match.team1.primaryColor;
    if (t2Dot) t2Dot.style.background = match.team2.primaryColor;

    // Scores
    const s1 = document.getElementById("hud-score1");
    const s2 = document.getElementById("hud-score2");
    if (s1) s1.textContent = match.team1Score;
    if (s2) s2.textContent = match.team2Score;

    // Match Timer
    const timerEl = document.getElementById("hud-timer");
    if (timerEl) {
      if (match.mode === 'training') {
        timerEl.textContent = "TREINO";
      } else {
        const mins = Math.floor(match.matchTime / 60);
        const secs = Math.floor(match.matchTime % 60);
        timerEl.textContent = `${mins}:${secs.toString().padStart(2, "0")}`;
      }
    }

    // Turn Indicator Banner
    const turnBanner = document.getElementById("hud-turn-indicator");
    if (turnBanner) {
      if (turnManager.state === 'GOAL_CELEBRATION') {
        turnBanner.textContent = "⚽ GOOOOL!";
        turnBanner.className = "turn-banner banner-goal";
      } else if (turnManager.currentTurn === 1) {
        turnBanner.textContent = match.mode === '2p' ? `VEZ DE ${match.team1.name}` : "SUA VEZ DE JOGAR!";
        turnBanner.className = "turn-banner banner-player";
      } else {
        turnBanner.textContent = match.mode === '2p' ? `VEZ DE ${match.team2.name}` : "VEZ DO ADVERSÁRIO (IA)";
        turnBanner.className = "turn-banner banner-opponent";
      }
    }

    // Training Panel
    const trainingBox = document.getElementById("hud-training-panel");
    if (trainingBox) {
      if (match.mode === 'training') {
        trainingBox.classList.remove("hidden");
        const scoreVal = document.getElementById("training-score-val");
        const speedVal = document.getElementById("training-speed-val");
        if (scoreVal) scoreVal.textContent = match.stats.trainingScore;
        const currentSpeedKmH = Math.round(match.ball.vel.mag() * 0.18);
        if (speedVal) speedVal.textContent = `${currentSpeedKmH} km/h`;
      } else {
        trainingBox.classList.add("hidden");
      }
    }
  }

  showGameOver(result, match) {
    if (!this.modalGameOver) return;

    this.modalGameOver.classList.remove("hidden");
    const titleEl = document.getElementById("over-title");
    const scoreEl = document.getElementById("over-score");
    const coinsEl = document.getElementById("over-coins-earned");

    if (result.winner === 1) {
      titleEl.textContent = "🎉 VITÓRIA ESPETACULAR!";
      titleEl.className = "over-title win-title";
    } else if (result.winner === 2) {
      titleEl.textContent = "💔 DERROTA!";
      titleEl.className = "over-title lose-title";
    } else {
      titleEl.textContent = "🤝 EMPATE EMOCIONANTE!";
      titleEl.className = "over-title draw-title";
    }

    if (scoreEl) {
      scoreEl.textContent = `${match.team1Score} - ${match.team2Score}`;
    }

    if (coinsEl) {
      coinsEl.textContent = `+${result.coinsEarned} Moedas Ganhas! 🪙`;
    }

    // Stats Table
    document.getElementById("stat-shots").textContent = `${result.stats.shotsT1} vs ${result.stats.shotsT2}`;
    document.getElementById("stat-saves").textContent = `${result.stats.savesT1} vs ${result.stats.savesT2}`;
    document.getElementById("stat-speed").textContent = `${result.stats.maxSpeedKmH} km/h`;
    document.getElementById("stat-collisions").textContent = `${result.stats.collisionsCount}`;

    this.updateCoinsDisplay();

    // In Tournament mode, handle progression
    const tourneyBtn = document.getElementById("btn-over-tournament");
    if (tourneyBtn) {
      if (match.mode === 'tournament') {
        tourneyBtn.classList.remove("hidden");
        tourneyBtn.onclick = () => {
          this.modalGameOver.classList.add("hidden");
          const tourneyResult = window.tournament.recordPlayerResult(match.team1Score, match.team2Score);
          this.openTournamentScreen();
        };
      } else {
        tourneyBtn.classList.add("hidden");
      }
    }
  }

  openPauseModal() {
    if (this.modalPause) {
      this.modalPause.classList.remove("hidden");
      if (window.game) window.game.isPaused = true;
    }
  }

  closePauseModal() {
    if (this.modalPause) {
      this.modalPause.classList.add("hidden");
      if (window.game) window.game.isPaused = false;
    }
  }
}

window.UIManager = UIManager;
