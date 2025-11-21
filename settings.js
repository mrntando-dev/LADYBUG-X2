const settings = {
  // ═══════════════════════════════════════════════════════════
  // 🐞 BOT IDENTITY & BRANDING
  // ═══════════════════════════════════════════════════════════
  packname: 'LADYBUG X2',
  author: 'Ntando Team',
  botName: "LADYBUG X2",
  botOwner: 'Ntando Team',
  ownerNumber: '263718456744', // Without + symbol
  themeEmoji: '🐞',
  
  // ═══════════════════════════════════════════════════════════
  // 🔧 BOT CONFIGURATION
  // ═══════════════════════════════════════════════════════════
  commandMode: "public", // "public" or "private"
  prefix: '.', // Default command prefix
  sessionName: 'ladybug-session',
  timezone: 'Africa/Harare', // Zimbabwe timezone
  language: 'en', // Default language
  
  // ═══════════════════════════════════════════════════════════
  // 📊 PERFORMANCE & STORAGE
  // ═══════════════════════════════════════════════════════════
  maxStoreMessages: 20, // Messages to keep in memory
  storeWriteInterval: 10000, // Write to disk every 10 seconds
  maxMemoryMB: 450, // Memory limit before cleanup (MB)
  cacheCleanupInterval: 300000, // 5 minutes
  
  // ═══════════════════════════════════════════════════════════
  // 🛡️ ANTI-BAN & RATE LIMITING
  // ═══════════════════════════════════════════════════════════
  rateLimits: {
    messagesPerMinute: 10,
    messagesPerHour: 60,
    cooldownDuration: 120000, // 2 minutes
  },
  
  delays: {
    individual: [2000, 5000],    // 2-5 seconds
    group: [3000, 7000],         // 3-7 seconds
    broadcast: [5000, 10000],    // 5-10 seconds
    typing: [1000, 3000],        // Typing simulation
    reading: [500, 2000],        // Reading simulation
  },
  
  behavior: {
    presenceUpdateInterval: 180000, // 3 minutes
    presenceUpdateChance: 0.3, // 30% chance
    statusViewChance: 0.3, // View 30% of statuses
    gradualOnlineDelay: 10000, // 10s before appearing online
  },
  
  // ═══════════════════════════════════════════════════════════
  // 🔄 AUTO-UPDATE SYSTEM
  // ═══════════════════════════════════════════════════════════
  version: "3.0.0",
  updateCheckInterval: 3600000, // Check every hour (3600000ms)
  updateZipUrl: "https://github.com/mrntando-dev/LADYBUG-X2/archive/refs/heads/main.zip",
  githubRepo: "mrntando-dev/LADYBUG-X2",
  githubBranch: "main",
  autoUpdateEnabled: true,
  
  // ═══════════════════════════════════════════════════════════
  // 🔌 API KEYS & INTEGRATIONS
  // ═══════════════════════════════════════════════════════════
  apiKeys: {
    giphy: 'qnl7ssQChTdPjsKta2Ax2LMaGXz303tq',
    // Add more API keys here as needed
    // openai: 'your-openai-key',
    // youtube: 'your-youtube-key',
  },
  
  // ═══════════════════════════════════════════════════════════
  // 📱 WHATSAPP FEATURES
  // ═══════════════════════════════════════════════════════════
  features: {
    antiCall: true,
    autoRead: false,
    autoTyping: true,
    autoRecording: false,
    alwaysOnline: false,
    readStatus: true,
    groupOnly: false,
    privateOnly: false,
  },
  
  // ═══════════════════════════════════════════════════════════
  // 🎨 RESPONSE MESSAGES
  // ═══════════════════════════════════════════════════════════
  messages: {
    botPrefix: '🐞',
    loading: '⏳ Processing...',
    error: '❌ An error occurred',
    success: '✅ Success!',
    notOwner: '⛔ This command is only for bot owner',
    notAdmin: '⛔ This command is only for group admins',
    notGroup: '⛔ This command can only be used in groups',
    wait: '⏳ Please wait...',
  },
  
  // ═══════════════════════════════════════════════════════════
  // 🔒 SECURITY & PERMISSIONS
  // ═══════════════════════════════════════════════════════════
  security: {
    maxGroupSize: 500, // Don't join groups larger than this
    blacklistedNumbers: [], // Add numbers to blacklist
    whitelistedNumbers: [], // Priority access numbers
    allowedCountryCodes: [], // Empty = all allowed, or specify like ['263', '27']
    blockInternationalCalls: true,
  },
  
  // ═══════════════════════════════════════════════════════════
  // 📝 LOGGING & MONITORING
  // ═══════════════════════════════════════════════════════════
  logging: {
    level: 'info', // 'debug', 'info', 'warn', 'error'
    saveToFile: true,
    logFilePath: './logs/bot.log',
    maxLogSize: 5242880, // 5MB
    statsInterval: 300000, // Show stats every 5 minutes
  },
  
  // ═══════════════════════════════════════════════════════════
  // 🌐 SOCIAL MEDIA & LINKS
  // ═══════════════════════════════════════════════════════════
  social: {
    github: 'https://github.com/mrntando-dev',
    youtube: 'https://youtube.com/@MrNtando',
    whatsappGroup: 'https://chat.whatsapp.com/KNavuWxP0Or5857brijPYR', // Add your support group link
    website: 'https://ntandostore.zone.id',
  },
  
  // ═══════════════════════════════════════════════════════════
  // 📋 METADATA
  // ═══════════════════════════════════════════════════════════
  description: "LADYBUG X2 - Advanced WhatsApp Bot with Anti-Ban Protection, Auto-Updates, and Comprehensive Features",
  credits: "MR UNIQUE HACKER",
  license: "MIT",
  
  // ═══════════════════════════════════════════════════════════
  // 🔧 ADVANCED OPTIONS
  // ═══════════════════════════════════════════════════════════
  advanced: {
    reconnectAttempts: 5,
    reconnectInterval: 10000,
    messageRetryCount: 3,
    qrCodeTimeout: 60000, // 1 minute
    pairingCodeTimeout: 120000, // 2 minutes
    connectionTimeout: 60000,
    keepAliveInterval: 30000,
  },
  
  // ═══════════════════════════════════════════════════════════
  // 🎭 COMPATIBILITY
  // ═══════════════════════════════════════════════════════════
  compatibility: {
    baileys: '^6.5.0',
    node: '>=18.0.0',
    npm: '>=8.0.0',
  },
};

// ═══════════════════════════════════════════════════════════
// 🔍 VALIDATION
// ═══════════════════════════════════════════════════════════

function validateSettings() {
  const errors = [];
  
  // Validate owner number
  if (!settings.ownerNumber || settings.ownerNumber.length < 10) {
    errors.push('⚠️ Invalid owner number');
  }
  
  // Validate version
  if (!settings.version || !/^\d+\.\d+\.\d+$/.test(settings.version)) {
    errors.push('⚠️ Invalid version format (use x.x.x)');
  }
  
  // Validate update URL
  if (!settings.updateZipUrl || !settings.updateZipUrl.startsWith('http')) {
    errors.push('⚠️ Invalid update URL');
  }
  
  // Validate rate limits
  if (settings.rateLimits.messagesPerMinute < 1 || settings.rateLimits.messagesPerMinute > 60) {
    errors.push('⚠️ Messages per minute should be between 1-60');
  }
  
  if (errors.length > 0) {
    console.warn('⚠️ Settings Validation Warnings:');
    errors.forEach(err => console.warn(err));
  }
  
  return errors.length === 0;
}

// Validate on load
validateSettings();

// ═══════════════════════════════════════════════════════════
// 🔄 HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

settings.getDelay = function(type = 'individual') {
  const [min, max] = this.delays[type] || this.delays.individual;
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

settings.isOwner = function(number) {
  return number.replace(/[^0-9]/g, '') === this.ownerNumber;
};

settings.isWhitelisted = function(number) {
  const cleanNumber = number.replace(/[^0-9]/g, '');
  return this.security.whitelistedNumbers.includes(cleanNumber);
};

settings.isBlacklisted = function(number) {
  const cleanNumber = number.replace(/[^0-9]/g, '');
  return this.security.blacklistedNumbers.includes(cleanNumber);
};

settings.canSendToCountry = function(number) {
  if (this.security.allowedCountryCodes.length === 0) return true;
  const cleanNumber = number.replace(/[^0-9]/g, '');
  return this.security.allowedCountryCodes.some(code => cleanNumber.startsWith(code));
};

// ═══════════════════════════════════════════════════════════
// 📊 DISPLAY SETTINGS (Development Mode)
// ═══════════════════════════════════════════════════════════

if (process.env.NODE_ENV === 'development') {
  console.log('\n🐞 LADYBUG X2 Settings Loaded:');
  console.log(`   Version: ${settings.version}`);
  console.log(`   Owner: ${settings.botOwner}`);
  console.log(`   Mode: ${settings.commandMode}`);
  console.log(`   Anti-Ban: ${settings.rateLimits.messagesPerHour} msg/hr`);
  console.log(`   Auto-Update: ${settings.autoUpdateEnabled ? '✅' : '❌'}`);
  console.log('');
}

module.exports = settings;
