// Configuration file for OSRS Leaderboard
// Extracted from script.js for better maintainability

export const CONFIG = {
  // Color palette for player leaders (assigned in order)
  COLOR_PALETTE: [
    'purple', 'black', 'white', 'blue', 'green', 'crimson', 'goldenrod',
    'teal', 'orangered', 'slateblue', 'darkmagenta', 'darkslategray'
  ],

  // Default player icons (can be overridden by data/player_icons.json)
  DEFAULT_PLAYER_ICONS: {
    'vaopa': './images/gim.png',
    'scuttlebrut': './images/gim.png',
    'jackiechunn': './images/ironman.png'
  },

  // Pretty display names for certain minigame keys
  DISPLAY_NAMES: {
    "PVPARENA": "PvP Arena - Rank"
  },

  // Skill icon paths
  SKILL_ICONS: {
    'Overall': './images/Overall icon.png',
    'Attack': './images/Attack icon.png',
    'Defence': './images/Defence icon.png',
    'Strength': './images/Strength icon.png',
    'Hitpoints': './images/Hitpoints icon.png',
    'Ranged': './images/Ranged icon.png',
    'Prayer': './images/Prayer icon.png',
    'Magic': './images/Magic icon.png',
    'Cooking': './images/Cooking icon.png',
    'Woodcutting': './images/Woodcutting icon.png',
    'Fletching': './images/Fletching icon.png',
    'Fishing': './images/Fishing icon.png',
    'Firemaking': './images/Firemaking icon.png',
    'Crafting': './images/Crafting icon.png',
    'Smithing': './images/Smithing icon.png',
    'Mining': './images/Mining icon.png',
    'Herblore': './images/Herblore icon.png',
    'Agility': './images/Agility icon.png',
    'Thieving': './images/Thieving icon.png',
    'Slayer': './images/Slayer icon.png',
    'Farming': './images/Farming icon.png',
    'Runecraft': './images/Runecraft icon.png',
    'Hunter': './images/Hunter icon.png',
    'Construction': './images/Construction icon.png',
    'Sailing': './images/Sailing icon.png'
  },

  // Category definitions for minigames/bosses/raids
  CUSTOM_CATEGORIES: {
    Bosses: {
      skills: [],
      minigames: [
        'Abyssal Sire', 'Alchemical Hydra', 'Amoxliatl', 'Araxxor', 'Artio',
        'Barrows', 'Brutus', 'Bryophyta', 'Callisto', 'Calvarion', 'Cerberus',
        'Chaos Elemental', 'Chaos Fanatic', 'Commander Zilyana', 'Corporeal Beast',
        'Crazy Archaeologist', 'Dagannoth Prime', 'Dagannoth Rex', 'Dagannoth Supreme',
        'Deranged Archaeologist', 'Doom of Mokhaiotl', 'Duke Sucellus', 'General Graardor', 'Giant Mole',
        'Grotesque Guardians', 'Hespori', 'Kalphite Queen', 'King Black Dragon',
        'Kraken', "Kree'Arra", "K'ril Tsutsaroth", 'Lunar Chests', 'Mimic',
        'Nex', 'Nightmare', "Phosani's Nightmare", 'Obor', 'Phantom Muspah',
        'Sarachnis', 'Scorpia', 'Scurrius', 'Shellbane Gryphon', 'Skotizo', 'Sol Heredit',
        'Spindel', 'The Gauntlet', 'The Corrupted Gauntlet', 'The Hueycoatl',
        'The Leviathan', 'The Royal Titans', 'The Whisperer', 'Thermonuclear Smoke Devil',
        'TzKal-Zuk', 'TzTok-Jad', 'Vardorvis', "Venenatis", "Vet'ion",
        'Vorkath', 'Yama', 'Zulrah'
      ]
    },
    Raids: {
      skills: [],
      minigames: [
        'Tombs of Amascut', 'Tombs of Amascut - Expert Mode',
        'Chambers of Xeric', 'Chambers of Xeric - Challenge Mode',
        'Theatre of Blood', 'Theatre of Blood - Hard Mode'
      ]
    },
    Clues: {
      skills: [],
      minigames: [
        'Clue Scrolls (all)', 'Clue Scrolls (beginner)', 'Clue Scrolls (easy)',
        'Clue Scrolls (medium)', 'Clue Scrolls (hard)', 'Clue Scrolls (elite)',
        'Clue Scrolls (master)'
      ]
    },
    Others: {
      skills: [],
      minigames: [
        'Collections Logged', 'Colosseum Glory', 'LMS - Rank', 'PVPARENA', 'Soul Wars Zeal'
      ]
    },
    Minigames: {
      skills: [],
      minigames: ['Tempoross', 'Wintertodt', 'Rifts closed', 'Zalcano']
    }
  },

  // Configuration for top N leaderboards
  TOP_N_LEADERS: 5,
  SAILING_TOP_N: 10,

  // Refresh schedule (Helsinki timezone, 06:00 daily)
  REFRESH_TIMEZONE: 'Europe/Helsinki',
  REFRESH_HOUR: 6,

  // Cache settings
  CACHE_DURATION_MS: 5 * 60 * 1000, // 5 minutes

  // Animation settings
  ANIMATION_STAGGER_DELAY: 100, // ms between each card animation
  MAX_STAGGER_ITEMS: 20 // Maximum items to stagger before repeating
};
