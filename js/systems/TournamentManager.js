/**
 * TournamentManager.js - 8-Team Knockout Cup (Copa das Tampinhas)
 * Manages brackets, AI match simulations, advancing rounds, and Championship Trophy.
 * Futebol de Tampinha
 */

class TournamentManager {
  constructor(saveManager) {
    this.save = saveManager;
    this.currentRound = 0; // 0 = Quarterfinals, 1 = Semifinals, 2 = Final, 3 = Champion
    this.roundNames = ["Quartas de Final", "Semifinais", "Grande Final"];
    this.bracket = [];
    this.playerTeam = null;

    this.presetTeams = [
      { name: "Argentina Clássico", primaryColor: "#38bdf8", secondaryColor: "#ffffff", rimColor: "#0284c7", pattern: "stripes", skin: "plastic" },
      { name: "Furacão Rubro-Negro", primaryColor: "#ef4444", secondaryColor: "#18181b", rimColor: "#991b1b", pattern: "stripes", skin: "plastic" },
      { name: "Cruzmaltino FC", primaryColor: "#1e293b", secondaryColor: "#ffffff", rimColor: "#0f172a", pattern: "halved", skin: "metal" },
      { name: "Galácticos Neon", primaryColor: "#a855f7", secondaryColor: "#f43f5e", rimColor: "#7e22ce", pattern: "halved", skin: "neon" },
      { name: "Samba Beach Club", primaryColor: "#facc15", secondaryColor: "#15803d", rimColor: "#ca8a04", pattern: "solid", skin: "plastic" },
      { name: "Manchester Cap", primaryColor: "#0284c7", secondaryColor: "#ffffff", rimColor: "#0369a1", pattern: "solid", skin: "plastic" },
      { name: "Samurai FC", primaryColor: "#e11d48", secondaryColor: "#ffffff", rimColor: "#be123c", pattern: "stripes", skin: "carbon" }
    ];

    this.startNewTournament();
  }

  startNewTournament(playerCustomTeam) {
    this.playerTeam = playerCustomTeam || this.save.data.playerTeam;
    this.currentRound = 0;

    // Pick 7 opponent teams
    const shuffledPresets = [...this.presetTeams].sort(() => 0.5 - Math.random());
    const opponents = shuffledPresets.slice(0, 7);

    // Initial 8 teams
    const teams = [this.playerTeam, ...opponents];

    // Setup Round 1 (Quarterfinals: 4 matches)
    this.bracket = [
      // Round 0: Quarterfinals (4 matches)
      [
        { teamA: teams[0], teamB: teams[1], scoreA: null, scoreB: null, winner: null, isPlayerMatch: true },
        { teamA: teams[2], teamB: teams[3], scoreA: null, scoreB: null, winner: null, isPlayerMatch: false },
        { teamA: teams[4], teamB: teams[5], scoreA: null, scoreB: null, winner: null, isPlayerMatch: false },
        { teamA: teams[6], teamB: teams[7], scoreA: null, scoreB: null, winner: null, isPlayerMatch: false }
      ],
      // Round 1: Semifinals (2 matches)
      [
        { teamA: null, teamB: null, scoreA: null, scoreB: null, winner: null, isPlayerMatch: true },
        { teamA: null, teamB: null, scoreA: null, scoreB: null, winner: null, isPlayerMatch: false }
      ],
      // Round 2: Final (1 match)
      [
        { teamA: null, teamB: null, scoreA: null, scoreB: null, winner: null, isPlayerMatch: true }
      ]
    ];
  }

  getCurrentMatch() {
    const roundMatches = this.bracket[this.currentRound];
    if (!roundMatches) return null;
    return roundMatches.find(m => m.isPlayerMatch);
  }

  recordPlayerResult(playerScore, opponentScore) {
    const playerMatch = this.getCurrentMatch();
    if (!playerMatch) return;

    playerMatch.scoreA = playerScore;
    playerMatch.scoreB = opponentScore;

    if (playerScore >= opponentScore) {
      playerMatch.winner = playerMatch.teamA; // Player advances!
      // Simulate rest of matches in this round
      this.simulateOtherMatchesInRound(this.currentRound);
      
      // Advance to next round if won
      if (this.currentRound < 2) {
        this.setupNextRound();
        this.currentRound++;
        return { advanced: true, champion: false };
      } else {
        // Player won the Final! Champion!
        this.currentRound = 3;
        this.save.addCoins(250);
        this.save.recordTournamentWin();
        return { advanced: true, champion: true };
      }
    } else {
      playerMatch.winner = playerMatch.teamB;
      return { advanced: false, champion: false }; // Eliminated
    }
  }

  simulateOtherMatchesInRound(roundIdx) {
    const round = this.bracket[roundIdx];
    for (const match of round) {
      if (match.isPlayerMatch) continue;

      // Simulate match score between two AI teams
      let sA = Math.floor(Math.random() * 4);
      let sB = Math.floor(Math.random() * 4);
      if (sA === sB) {
        // Penalty cap flick tiebreaker
        if (Math.random() > 0.5) sA++;
        else sB++;
      }

      match.scoreA = sA;
      match.scoreB = sB;
      match.winner = sA > sB ? match.teamA : match.teamB;
    }
  }

  setupNextRound() {
    const nextRoundIdx = this.currentRound + 1;
    const currentMatches = this.bracket[this.currentRound];
    const nextMatches = this.bracket[nextRoundIdx];

    for (let i = 0; i < nextMatches.length; i++) {
      const match1 = currentMatches[i * 2];
      const match2 = currentMatches[i * 2 + 1];

      nextMatches[i].teamA = match1.winner;
      nextMatches[i].teamB = match2.winner;
      nextMatches[i].isPlayerMatch = (nextMatches[i].teamA === this.playerTeam || nextMatches[i].teamB === this.playerTeam);
      
      // Ensure player is always teamA for consistent left/right layout
      if (nextMatches[i].teamB === this.playerTeam) {
        const temp = nextMatches[i].teamA;
        nextMatches[i].teamA = nextMatches[i].teamB;
        nextMatches[i].teamB = temp;
      }
    }
  }
}

window.TournamentManager = TournamentManager;
