/**
 * SaveManager.js - LocalStorage Persistence & Economy
 * Manages coins, unlocked cosmetics, teams, custom colors, and career stats.
 * Futebol de Tampinha
 */

class SaveManager {
  constructor() {
    this.storageKey = "futebol_tampinha_save_v1";
    this.data = this.getDefaultData();
    this.load();
  }

  getDefaultData() {
    // Standard high-contrast team presets
    this.TEAM_PRESETS = [
      { id: "brasil", name: "Brasil Canarinho", primaryColor: "#facc15", secondaryColor: "#15803d", rimColor: "#1e40af", pattern: "solid" },
      { id: "flamengo", name: "Furacão Rubro-Negro", primaryColor: "#ef4444", secondaryColor: "#18181b", rimColor: "#991b1b", pattern: "stripes" },
      { id: "argentina", name: "Argentina Albiceleste", primaryColor: "#38bdf8", secondaryColor: "#ffffff", rimColor: "#0284c7", pattern: "stripes" },
      { id: "alvinegro", name: "Alvinegro Clássico", primaryColor: "#09090b", secondaryColor: "#ffffff", rimColor: "#334155", pattern: "stripes" },
      { id: "verdao", name: "Verdão Esmeralda", primaryColor: "#059669", secondaryColor: "#ffffff", rimColor: "#065f46", pattern: "solid" },
      { id: "cruzeiro", name: "Azulão Campeão", primaryColor: "#2563eb", secondaryColor: "#ffffff", rimColor: "#1e3a8a", pattern: "solid" },
      { id: "cyber", name: "Cyber Synthwave", primaryColor: "#a855f7", secondaryColor: "#f43f5e", rimColor: "#06b6d4", pattern: "halved" },
      { id: "holanda", name: "Laranja Mecânica", primaryColor: "#ea580c", secondaryColor: "#18181b", rimColor: "#9a3412", pattern: "solid" }
    ];

    return {
      coins: 100, // Starting bonus
      unlockedSkins: ["plastic"],
      unlockedDecals: ["default"],
      unlockedStadiums: ["grass", "dirt"],
      
      // User's custom team (Team 1 - Yellow Canarinho)
      playerTeam: {
        name: "Brasil Canarinho",
        primaryColor: "#facc15",
        secondaryColor: "#15803d",
        rimColor: "#1e40af",
        pattern: "solid",
        skin: "plastic",
        decal: null
      },

      // Team 2 (Opponent / AI - Fire Red & Black)
      aiTeam: {
        name: "Furacão Rubro-Negro",
        primaryColor: "#ef4444",
        secondaryColor: "#18181b",
        rimColor: "#991b1b",
        pattern: "stripes",
        skin: "plastic",
        decal: null
      },

      // General preferences
      matchDuration: 120, // 2 minutes
      difficulty: "normal", // 'easy', 'normal', 'hard'
      selectedStadium: "grass",

      // Career Stats
      stats: {
        matchesPlayed: 0,
        matchesWon: 0,
        matchesDrawn: 0,
        matchesLost: 0,
        goalsScored: 0,
        goalsConceded: 0,
        tournamentsWon: 0,
        topShotSpeedKmH: 0
      }
    };
  }

  load() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Merge with defaults to ensure all fields exist
        this.data = {
          ...this.getDefaultData(),
          ...parsed,
          playerTeam: { ...this.getDefaultData().playerTeam, ...(parsed.playerTeam || {}) },
          aiTeam: { ...this.getDefaultData().aiTeam, ...(parsed.aiTeam || {}) },
          stats: { ...this.getDefaultData().stats, ...(parsed.stats || {}) }
        };
        // Fix if aiTeam had old blue color or duplicate colors
        if (this.data.aiTeam.primaryColor === "#0284c7" || this.data.aiTeam.primaryColor === this.data.playerTeam.primaryColor) {
          this.data.aiTeam = { ...this.getDefaultData().aiTeam };
          this.save();
        }
      }
    } catch (e) {
      console.warn("Could not load save data:", e);
    }
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.data));
    } catch (e) {
      console.warn("Could not save data:", e);
    }
  }

  addCoins(amount) {
    this.data.coins += amount;
    this.save();
    return this.data.coins;
  }

  canAfford(cost) {
    return this.data.coins >= cost;
  }

  unlockItem(category, itemId, cost) {
    if (!this.canAfford(cost)) return false;

    let list;
    if (category === "skin") list = this.data.unlockedSkins;
    else if (category === "decal") list = this.data.unlockedDecals;
    else if (category === "stadium") list = this.data.unlockedStadiums;

    if (!list || list.includes(itemId)) return true;

    this.data.coins -= cost;
    list.push(itemId);
    this.save();
    return true;
  }

  isUnlocked(category, itemId) {
    if (category === "skin") return this.data.unlockedSkins.includes(itemId);
    if (category === "decal") return this.data.unlockedDecals.includes(itemId);
    if (category === "stadium") return this.data.unlockedStadiums.includes(itemId);
    return false;
  }

  recordMatchResult(playerGoals, opponentGoals, maxSpeedKmH = 0) {
    this.data.stats.matchesPlayed++;
    this.data.stats.goalsScored += playerGoals;
    this.data.stats.goalsConceded += opponentGoals;

    if (playerGoals > opponentGoals) {
      this.data.stats.matchesWon++;
    } else if (playerGoals === opponentGoals) {
      this.data.stats.matchesDrawn++;
    } else {
      this.data.stats.matchesLost++;
    }

    if (maxSpeedKmH > this.data.stats.topShotSpeedKmH) {
      this.data.stats.topShotSpeedKmH = Math.round(maxSpeedKmH);
    }

    this.save();
  }

  recordTournamentWin() {
    this.data.stats.tournamentsWon++;
    this.save();
  }
}

window.SaveManager = SaveManager;
