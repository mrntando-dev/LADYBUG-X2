/**
 * Knight Bot - A WhatsApp Bot
 * Copyright (c) 2024 Professor
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the MIT License.
 * 
 * Credits:
 * - Baileys Library by @adiwajshing
 * - Pair Code implementation inspired by TechGod143 & DGXEON
 */
require('./settings')
const { Boom } = require('@hapi/boom')
const fs = require('fs')
const chalk = require('chalk')
const FileType = require('file-type')
const path = require('path')
const axios = require('axios')
const { handleMessages, handleGroupParticipantUpdate, handleStatus } = require('./main');
const PhoneNumber = require('awesome-phonenumber')
const { imageToWebp, videoToWebp, writeExifImg, writeExifVid } = require('./lib/exif')
const { smsg, isUrl, generateMessageTag, getBuffer, getSizeMedia, fetch, await, sleep, reSize } = require('./lib/myfunc')
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    generateForwardMessageContent,
    prepareWAMessageMedia,
    generateWAMessageFromContent,
    generateMessageID,
    downloadContentFromMessage,
    jidDecode,
    proto,
    jidNormalizedUser,
    makeCacheableSignalKeyStore,
    delay
} = require("@whiskeysockets/baileys")
const NodeCache = require("node-cache")
const pino = require("pino")
const readline = require("readline")
const { parsePhoneNumber } = require("libphonenumber-js")
const { PHONENUMBER_MCC } = require('@whiskeysockets/baileys/lib/Utils/generics')
const { rmSync, existsSync } = require('fs')
const { join } = require('path')

// Import lightweight store
const store = require('./lib/lightweight_store')

// Import auto-update checker
const { startAutoUpdateChecker } = require('./commands/update');

// Initialize store
store.readFromFile()
const settings = require('./settings')
setInterval(() => store.writeToFile(), settings.storeWriteInterval || 10000)

// ═══════════════════════════════════════════════════════════
// 🛡️ ENHANCED ANTI-BAN & PROTECTION SYSTEM
// ═══════════════════════════════════════════════════════════

// More conservative message rate limiter
const messageRateLimiter = new Map()
const MESSAGE_LIMIT = 10 // Reduced from 20 to 10 per window
const RATE_LIMIT_WINDOW = 60000 // 1 minute

function canSendMessage(jid) {
    const now = Date.now()
    const userLimits = messageRateLimiter.get(jid) || { count: 0, resetTime: now + RATE_LIMIT_WINDOW }
    
    if (now > userLimits.resetTime) {
        messageRateLimiter.set(jid, { count: 1, resetTime: now + RATE_LIMIT_WINDOW })
        return true
    }
    
    if (userLimits.count >= MESSAGE_LIMIT) {
        console.log(chalk.yellow(`⏳ Rate limit for ${jid}: ${MESSAGE_LIMIT}`))
        return false
    }
    
    userLimits.count++
    messageRateLimiter.set(jid, userLimits)
    return true
}

// More human-like delays (CRITICAL FIX)
const SAFE_DELAYS = {
    individual: [2000, 5000],    // 2-5 seconds (increased)
    group: [3000, 7000],         // 3-7 seconds (increased)
    broadcast: [5000, 10000],    // 5-10 seconds (increased)
    typing: [1000, 3000],        // Simulate typing time
    reading: [500, 2000]         // Simulate reading time
}

function getRandomDelay(type = 'individual') {
    const [min, max] = SAFE_DELAYS[type] || SAFE_DELAYS.individual
    return Math.floor(Math.random() * (max - min + 1)) + min
}

// Stricter activity tracker
let lastActivityTime = Date.now()
let messageCount = 0
const MAX_MESSAGES_PER_HOUR = 60 // Reduced from 100 to 60
const COOLDOWN_DURATION = 120000 // 2 minutes cooldown

function updateActivity() {
    const now = Date.now()
    const hourAgo = now - 3600000
    
    if (lastActivityTime < hourAgo) {
        messageCount = 0
    }
    
    messageCount++
    lastActivityTime = now
    
    if (messageCount > MAX_MESSAGES_PER_HOUR) {
        console.log(chalk.red('⚠️ MESSAGE LIMIT REACHED! Enforcing cooldown...'))
        return false
    }
    
    // Warn at 80% capacity
    if (messageCount > MAX_MESSAGES_PER_HOUR * 0.8) {
        console.log(chalk.yellow(`⚠️ Approaching limit: $${messageCount}/$$ {MAX_MESSAGES_PER_HOUR}`))
    }
    
    return true
}

// Enhanced behavior monitoring
const behaviorMonitor = {
    lastMessageTime: Date.now(),
    messagePattern: [],
    suspiciousCount: 0,
    
    recordMessage() {
        const now = Date.now()
        this.messagePattern.push(now)
        
        // Keep only last 20 messages (reduced from 50)
        if (this.messagePattern.length > 20) {
            this.messagePattern.shift()
        }
        
        this.lastMessageTime = now
    },
    
    isSuspiciousBehavior() {
        if (this.messagePattern.length < 5) return false
        
        const intervals = []
        for (let i = 1; i < this.messagePattern.length; i++) {
            intervals.push(this.messagePattern[i] - this.messagePattern[i - 1])
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length
        const variance = intervals.reduce((sum, interval) => {
            return sum + Math.pow(interval - avgInterval, 2)
        }, 0) / intervals.length
        
        // Too fast
        if (avgInterval < 1500) { // Increased from 500
            this.suspiciousCount++
            console.log(chalk.red('⚠️ WARNING: Messages too fast!'))
            return true
        }
        
        // Too uniform (bot-like pattern)
        if (variance < 100000 && this.messagePattern.length > 10) {
            this.suspiciousCount++
            console.log(chalk.red('⚠️ WARNING: Bot-like pattern detected!'))
            return true
        }
        
        return false
    },
    
    async enforceBreak() {
        if (this.suspiciousCount > 3) {
            console.log(chalk.red('🛑 CRITICAL: Taking mandatory 5-minute break!'))
            this.suspiciousCount = 0
            this.messagePattern = []
            await delay(300000) // 5 minutes
        } else if (this.suspiciousCount > 0) {
            const breakTime = this.suspiciousCount * 30000 // 30s, 60s, 90s
            console.log(chalk.yellow(`⏸️ Taking ${breakTime/1000}s break...`))
            await delay(breakTime)
        }
    }
}

// Auto-restart on connection issues
let reconnectAttempts = 0
const MAX_RECONNECT_ATTEMPTS = 5

// ═══════════════════════════════════════════════════════════
// 💾 MEMORY OPTIMIZATION
// ═══════════════════════════════════════════════════════════

// Enhanced garbage collection
setInterval(() => {
    if (global.gc) {
        global.gc()
        const used = Math.round(process.memoryUsage().rss / 1024 / 1024)
        console.log(`🧹 Garbage collection: ${used}MB RAM used`)
    }
}, 60_000)

// Memory monitoring with dynamic threshold
setInterval(() => {
    const memUsage = process.memoryUsage()
    const usedMB = Math.round(memUsage.rss / 1024 / 1024)
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024)
    
    console.log(chalk.cyan(`📊 Memory: $${usedMB}MB RSS,$$ {heapUsedMB}MB Heap`))
    
    if (usedMB > 450) {
        console.log(chalk.red('⚠️ RAM critical (>450MB), forcing cleanup...'))
        
        // Clear caches
        if (messageRateLimiter.size > 50) {
            const entries = Array.from(messageRateLimiter.entries())
            entries.slice(0, 25).forEach(([key]) => messageRateLimiter.delete(key))
        }
        
        // Force GC
        if (global.gc) global.gc()
        
        setTimeout(() => {
            const newUsed = Math.round(process.memoryUsage().rss / 1024 / 1024)
            if (newUsed > 480) {
                console.log(chalk.red('💥 RAM still too high, restarting...'))
                process.exit(1)
            }
        }, 5000)
    }
}, 30_000)

// ═══════════════════════════════════════════════════════════
// ⚙️ CONFIGURATION
// ═══════════════════════════════════════════════════════════

let phoneNumber = "263718456744"
let owner = JSON.parse(fs.readFileSync('./data/owner.json'))

global.botname = "LADYBUG X BOT"
global.themeemoji = "🐞"
global.sessionName = "ladybug-session"

const pairingCode = !!phoneNumber || process.argv.includes("--pairing-code")
const useMobile = process.argv.includes("--mobile")

const rl = process.stdin.isTTY ? readline.createInterface({ 
    input: process.stdin, 
    output: process.stdout 
}) : null

const question = (text) => {
    if (rl) {
        return new Promise((resolve) => rl.question(text, resolve))
    } else {
        return Promise.resolve(settings.ownerNumber || phoneNumber)
    }
}

// ═══════════════════════════════════════════════════════════
// 🚀 BOT INITIALIZATION
// ═══════════════════════════════════════════════════════════

async function startXeonBotInc() {
    try {
        let { version, isLatest } = await fetchLatestBaileysVersion()
        console.log(chalk.blue(`📱 Using WA version ${version}`))
        
        const { state, saveCreds } = await useMultiFileAuthState(`./session`)
        const msgRetryCounterCache = new NodeCache()

        const XeonBotInc = makeWASocket({
            version,
            logger: pino({ level: 'silent' }),
            printQRInTerminal: !pairingCode,
            browser: ["Ubuntu", "Chrome", "20.0.04"], // More realistic browser
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
            },
            markOnlineOnConnect: false, // CRITICAL: Don't mark online immediately
            generateHighQualityLinkPreview: true,
            syncFullHistory: false,
            retryRequestDelayMs: 10000,
            transactionOpts: { maxCommitRetries: 10, delayBetweenTriesMs: 3000 },
            maxMsgRetryCount: 3, // Reduced from 5
            appStateMacVerification: {
                patch: true,
                snapshot: true,
            },
            getMessage: async (key) => {
                let jid = jidNormalizedUser(key.remoteJid)
                let msg = await store.loadMessage(jid, key.id)
                return msg?.message || ""
            },
            msgRetryCounterCache,
            defaultQueryTimeoutMs: 60000,
            connectTimeoutMs: 60000,
            keepAliveIntervalMs: 30000,
            emitOwnEvents: false,
            fireInitQueries: false, // CRITICAL: Reduce initial queries
            shouldSyncHistoryMessage: () => false,
            // CRITICAL: Add these options
            downloadHistory: false,
            linkPreviewImageThumbnailWidth: 192,
        })

        // Save credentials when they update
        XeonBotInc.ev.on('creds.update', saveCreds)

        store.bind(XeonBotInc.ev)

        // ═══════════════════════════════════════════════════════════
        // 📨 ENHANCED MESSAGE HANDLING WITH STRONGER ANTI-BAN
        // ═══════════════════════════════════════════════════════════

        XeonBotInc.ev.on('messages.upsert', async chatUpdate => {
            try {
                const mek = chatUpdate.messages[0]
                if (!mek.message) return
                
                mek.message = (Object.keys(mek.message)[0] === 'ephemeralMessage') 
                    ? mek.message.ephemeralMessage.message 
                    : mek.message
                
                // Handle status updates
                if (mek.key && mek.key.remoteJid === 'status@broadcast') {
                    // Don't auto-view all statuses (suspicious)
                    if (Math.random() > 0.3) { // Only 30% chance to view
                        await handleStatus(XeonBotInc, chatUpdate);
                    }
                    return;
                }
                
                // Private mode check
                if (!XeonBotInc.public && !mek.key.fromMe && chatUpdate.type === 'notify') {
                    const isGroup = mek.key?.remoteJid?.endsWith('@g.us')
                    if (!isGroup) return
                }
                
                // Skip BAE5 messages
                if (mek.key.id.startsWith('BAE5') && mek.key.id.length === 16) return

                const chatId = mek.key.remoteJid
                const isGroup = chatId?.endsWith('@g.us')

                // CRITICAL: Simulate reading message first
                await delay(getRandomDelay('reading'))

                // Anti-ban: Rate limiting
                if (!canSendMessage(chatId)) {
                    console.log(chalk.yellow(`⏳ Rate limit reached for ${chatId}, skipping...`))
                    return
                }

                // Anti-ban: Activity monitoring
                if (!updateActivity()) {
                    console.log(chalk.red('🛑 HOURLY LIMIT REACHED! Cooldown for 2 minutes...'))
                    await delay(COOLDOWN_DURATION)
                    messageCount = Math.floor(MAX_MESSAGES_PER_HOUR * 0.5) // Reset to 50%
                }

                // Record behavior
                behaviorMonitor.recordMessage()
                
                // Check for suspicious patterns and enforce break
                if (behaviorMonitor.isSuspiciousBehavior()) {
                    await behaviorMonitor.enforceBreak()
                }

                // CRITICAL: Simulate typing before responding
                const typingTime = getRandomDelay('typing')
                try {
                    await XeonBotInc.sendPresenceUpdate('composing', chatId)
                    await delay(typingTime)
                    await XeonBotInc.sendPresenceUpdate('paused', chatId)
                } catch (e) {
                    // Ignore presence errors
                }

                // Clear message retry cache
                if (XeonBotInc?.msgRetryCounterCache) {
                    XeonBotInc.msgRetryCounterCache.clear()
                }

                try {
                    // Add natural delay before processing
                    const delayType = isGroup ? 'group' : 'individual'
                    await delay(getRandomDelay(delayType))
                    
                    await handleMessages(XeonBotInc, chatUpdate, true)
                } catch (err) {
                    console.error("Error in handleMessages:", err)
                    
                    // Don't send error messages to every user (suspicious)
                    if (mek.key && mek.key.fromMe) return
                    
                    // Only send error to owner
                    const isOwner = owner.includes(chatId.split('@')[0])
                    if (isOwner) {
                        try {
                            await delay(getRandomDelay('individual'))
                            await XeonBotInc.sendMessage(mek.key.remoteJid, {
                                text: '❌ An error occurred processing that command.'
                            })
                        } catch (sendErr) {
                            console.error('Failed to send error message:', sendErr)
                        }
                    }
                }
            } catch (err) {
                console.error("Error in messages.upsert:", err)
            }
        })

        // ═══════════════════════════════════════════════════════════
        // 👤 CONTACT & NAME HANDLING
        // ═══════════════════════════════════════════════════════════

        XeonBotInc.decodeJid = (jid) => {
            if (!jid) return jid
            if (/:\d+@/gi.test(jid)) {
                let decode = jidDecode(jid) || {}
                return decode.user && decode.server && decode.user + '@' + decode.server || jid
            } else return jid
        }

        XeonBotInc.ev.on('contacts.update', update => {
            for (let contact of update) {
                let id = XeonBotInc.decodeJid(contact.id)
                if (store && store.contacts) store.contacts[id] = { id, name: contact.notify }
            }
        })

        XeonBotInc.getName = (jid, withoutContact = false) => {
            id = XeonBotInc.decodeJid(jid)
            withoutContact = XeonBotInc.withoutContact || withoutContact
            let v
            if (id.endsWith("@g.us")) return new Promise(async (resolve) => {
                v = store.contacts[id] || {}
                if (!(v.name || v.subject)) v = XeonBotInc.groupMetadata(id) || {}
                resolve(v.name || v.subject || PhoneNumber('+' + id.replace('@s.whatsapp.net', '')).getNumber('international'))
            })
            else v = id === '0@s.whatsapp.net' ? {
                id,
                name: 'WhatsApp'
            } : id === XeonBotInc.decodeJid(XeonBotInc.user.id) ?
                XeonBotInc.user :
                (store.contacts[id] || {})
            return (withoutContact ? '' : v.name) || v.subject || v.verifiedName || PhoneNumber('+' + jid.replace('@s.whatsapp.net', '')).getNumber('international'))
        }

        XeonBotInc.public = true
        XeonBotInc.serializeM = (m) => smsg(XeonBotInc, m, store)

        // ═══════════════════════════════════════════════════════════
        // 🔐 CRITICALLY ENHANCED SEND MESSAGE
        // ═══════════════════════════════════════════════════════════

        const originalSendMessage = XeonBotInc.sendMessage.bind(XeonBotInc)
        XeonBotInc.sendMessage = async (jid, content, options = {}) => {
            try {
                // Rate limiting check
                if (!canSendMessage(jid)) {
                    console.log(chalk.yellow(`⏳ Delaying message to ${jid} due to rate limit`))
                    await delay(10000) // 10 second delay
                }

                // CRITICAL: Remove newsletter/forwarding context (very suspicious)
                if (content.contextInfo) {
                    delete content.contextInfo.forwardingScore
                    delete content.contextInfo.isForwarded
                    delete content.contextInfo.forwardedNewsletterMessageInfo
                }

                // Add natural human delay
                const isGroup = jid?.endsWith('@g.us')
                await delay(getRandomDelay(isGroup ? 'group' : 'individual'))

                // Simulate presence
                try {
                    await XeonBotInc.sendPresenceUpdate('composing', jid)
                    await delay(Math.random() * 2000 + 1000)
                    await XeonBotInc.sendPresenceUpdate('paused', jid)
                } catch (e) {
                    // Ignore
                }

                // Record activity
                behaviorMonitor.recordMessage()

                return await originalSendMessage(jid, content, options)
            } catch (error) {
                console.error('Send message error:', error)
                throw error
            }
        }

        // ═══════════════════════════════════════════════════════════
        // 📞 PAIRING CODE HANDLER
        // ═══════════════════════════════════════════════════════════

        if (pairingCode && !XeonBotInc.authState.creds.registered) {
            if (useMobile) throw new Error('Cannot use pairing code with mobile api')

            let phoneNumber
            if (!!global.phoneNumber) {
                phoneNumber = global.phoneNumber
            } else {
                phoneNumber = await question(chalk.bgBlack(chalk.greenBright(`🐞 Please type your WhatsApp number\nFormat: 6281376552730 (without + or spaces): `)))
            }

            phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

            const pn = require('awesome-phonenumber');
            if (!pn('+' + phoneNumber).isValid()) {
                console.log(chalk.red('❌ Invalid phone number. Please try again.'));
                process.exit(1);
            }

            setTimeout(async () => {
                try {
                    let code = await XeonBotInc.requestPairingCode(phoneNumber)
                    code = code?.match(/.{1,4}/g)?.join("-") || code
                    console.log(chalk.black(chalk.bgGreen(`🐞 Your Pairing Code: `)), chalk.black(chalk.white(code)))
                    console.log(chalk.yellow(`\n📱 Enter this code in WhatsApp:\n1. Open WhatsApp\n2. Settings > Linked Devices\n3. Link a Device\n4. Enter code: ${code}`))
                } catch (error) {
                    console.error('❌ Error requesting pairing code:', error)
                }
            }, 3000)
        }

        // ═══════════════════════════════════════════════════════════
        // 🔌 CONNECTION HANDLING WITH AUTO-RECONNECT
        // ═══════════════════════════════════════════════════════════

        XeonBotInc.ev.on('connection.update', async (s) => {
            const { connection, lastDisconnect, qr } = s
            
            if (qr) {
                console.log(chalk.yellow('📱 QR Code generated. Scan with WhatsApp.'))
            }
            
            if (connection === 'connecting') {
                console.log(chalk.yellow('🔄 Connecting to WhatsApp...'))
            }
            
            if (connection == "open") {
                reconnectAttempts = 0
                console.log(chalk.magenta(` `))
                console.log(chalk.green(`🐞 Connected to => ` + JSON.stringify(XeonBotInc.user, null, 2)))

                // ✅ START AUTO-UPDATE CHECKER WHEN BOT CONNECTS
                try {
                    startAutoUpdateChecker(XeonBotInc);
                    console.log(chalk.cyan('🔄 Auto-update checker started'))
                } catch (error) {
                    console.error(chalk.red('❌ Failed to start auto-update checker:'), error)
                }

                await delay(1999)
                console.log(chalk.yellow(`\n\n                  ${chalk.bold.magenta(`[ ${global.botname || 'LADYBUG X BOT'} ]`)}\n\n`))
                console.log(chalk.cyan(`< ================================================== >`))
                console.log(chalk.magenta(`\n${global.themeemoji} YT CHANNEL: MR UNIQUE HACKER`))
                console.log(chalk.magenta(`${global.themeemoji} GITHUB: mruniquehacker`))
                console.log(chalk.magenta(`${global.themeemoji} WA NUMBER: ${owner}`))
                console.log(chalk.magenta(`${global.themeemoji} CREDIT: MR UNIQUE HACKER`))
                console.log(chalk.green(`${global.themeemoji} 🤖 Bot Status: ONLINE ✅`))
                console.log(chalk.blue(`${global.themeemoji} Version: ${settings.version}`))
                console.log(chalk.yellow(`${global.themeemoji} 🛡️ Anti-Ban Protection: ACTIVE`))
                console.log(chalk.cyan(`${global.themeemoji} 🔄 Auto-Update: ENABLED`))
                console.log(chalk.cyan(`< ================================================== >`))

                // CRITICAL: Gradually come online
                setTimeout(async () => {
                    try {
                        await XeonBotInc.sendPresenceUpdate('available')
                    } catch (e) {}
                }, 10000) // Wait 10 seconds before appearing online
            }
            
            if (connection === 'close') {
                const shouldReconnect = (lastDisconnect?.error)?.output?.statusCode !== DisconnectReason.loggedOut
                const statusCode = lastDisconnect?.error?.output?.statusCode
                const reason = lastDisconnect?.error?.message || 'Unknown'
                
                console.log(chalk.red(`❌ Connection closed: ${reason} (Code: ${statusCode})`))
                
                if (statusCode === DisconnectReason.loggedOut || statusCode === 401) {
                    try {
                        if (existsSync('./session')) {
                            rmSync('./session', { recursive: true, force: true })
                            console.log(chalk.yellow('🗑️ Session deleted. Please re-authenticate.'))
                        }
                    } catch (error) {
                        console.error('Error deleting session:', error)
                    }
                    console.log(chalk.red('🔒 Session logged out. Restart bot to re-authenticate.'))
                    process.exit(0)
                }
                
                // CRITICAL: Check if banned
                if (statusCode === 428 || statusCode === 419 || statusCode === 515) {
                    console.log(chalk.red('🚫 ACCOUNT BANNED OR RESTRICTED!'))
                    console.log(chalk.yellow('Wait 12-24 hours before trying again.'))
                    process.exit(1)
                }
                
                if (shouldReconnect) {
                    reconnectAttempts++
                    
                    if (reconnectAttempts > MAX_RECONNECT_ATTEMPTS) {
                        console.log(chalk.red(`❌ Max reconnection attempts (${MAX_RECONNECT_ATTEMPTS}) reached. Exiting...`))
                        process.exit(1)
                    }
                    
                    const waitTime = Math.min(10000 * reconnectAttempts, 60000) // Max 1 minute
                    console.log(chalk.yellow(`🔄 Reconnecting in $${waitTime/1000}s... (Attempt$$ {reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`))
                    await delay(waitTime)
                    startXeonBotInc()
                }
            }
        })

        // ═══════════════════════════════════════════════════════════
        // 📞 SAFER ANTI-CALL SYSTEM
        // ═══════════════════════════════════════════════════════════

        const antiCallNotified = new Set();
        const callBlockDelay = 5000; // 5 second delay before blocking

        XeonBotInc.ev.on('call', async (calls) => {
            try {
                const { readState: readAnticallState } = require('./commands/anticall');
                const state = readAnticallState();
                if (!state.enabled) return;

                for (const call of calls) {
                    const callerJid = call.from || call.peerJid || call.chatId;
                    if (!callerJid) continue;

                    try {
                        // Reject call naturally
                        try {
                            if (typeof XeonBotInc.rejectCall === 'function' && call.id) {
                                await delay(2000) // Wait 2 seconds before rejecting
                                await XeonBotInc.rejectCall(call.id, callerJid);
                            }
                        } catch {}

                        // Notify caller (once)
                        if (!antiCallNotified.has(callerJid)) {
                            antiCallNotified.add(callerJid);
                            setTimeout(() => antiCallNotified.delete(callerJid), 300000); // 5 minutes
                            
                            await delay(3000)
                            await XeonBotInc.sendMessage(callerJid, { 
                                text: '📵 Sorry, I cannot accept calls at the moment. Please send a message instead.' 
                            });
                        }
                    } catch {}
                }
            } catch (e) {
                console.error('Anti-call error:', e)
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 👥 GROUP & STATUS EVENT HANDLERS
        // ═══════════════════════════════════════════════════════════

        XeonBotInc.ev.on('group-participants.update', async (update) => {
            try {
                await delay(getRandomDelay('group'))
                await handleGroupParticipantUpdate(XeonBotInc, update);
            } catch (error) {
                console.error('Group participant update error:', error)
            }
        });

        XeonBotInc.ev.on('messages.reaction', async (reaction) => {
            try {
                // Don't react to every reaction (suspicious)
                if (Math.random() > 0.5) return
                await handleStatus(XeonBotInc, reaction);
            } catch (error) {
                console.error('Reaction handler error:', error)
            }
        });

        // ═══════════════════════════════════════════════════════════
        // 🛡️ ADDITIONAL SAFETY FEATURES
        // ═══════════════════════════════════════════════════════════

        // Auto-clear old rate limiter entries
        setInterval(() => {
            const now = Date.now()
            for (const [jid, data] of messageRateLimiter.entries()) {
                if (now > data.resetTime + 300000) { // 5 minutes old
                    messageRateLimiter.delete(jid)
                }
            }
            
            // Log cleanup
            if (messageRateLimiter.size > 0) {
                console.log(chalk.gray(`🧹 Cleaned rate limiter cache (${messageRateLimiter.size} entries)`))
            }
        }, 300000) // Every 5 minutes

                // Connection health check with natural intervals
        setInterval(() => {
            try {
                if (XeonBotInc.ws.readyState !== XeonBotInc.ws.OPEN) {
                    console.log(chalk.yellow('⚠️ WebSocket not open, attempting reconnect...'))
                    XeonBotInc.ws.close()
                }
            } catch (e) {
                console.error('Health check error:', e)
            }
        }, 90000) // Every 90 seconds (less frequent)

        // Periodic presence updates to appear more human
        setInterval(async () => {
            try {
                // Randomly go online/offline like a human would
                const states = ['available', 'unavailable']
                const randomState = states[Math.floor(Math.random() * states.length)]
                
                // Only update 30% of the time
                if (Math.random() < 0.3) {
                    await XeonBotInc.sendPresenceUpdate(randomState)
                }
            } catch (e) {
                // Ignore presence errors
            }
        }, 180000) // Every 3 minutes

        // Reset behavior monitor periodically
        setInterval(() => {
            if (behaviorMonitor.messagePattern.length === 0) {
                behaviorMonitor.suspiciousCount = 0
            }
            
            // Decay suspicious count over time
            if (behaviorMonitor.suspiciousCount > 0) {
                behaviorMonitor.suspiciousCount = Math.max(0, behaviorMonitor.suspiciousCount - 1)
                console.log(chalk.green(`✅ Suspicious count decreased to ${behaviorMonitor.suspiciousCount}`))
            }
        }, 600000) // Every 10 minutes

        return XeonBotInc
    } catch (error) {
        console.error('❌ Error in startXeonBotInc:', error)
        reconnectAttempts++
        
        if (reconnectAttempts <= MAX_RECONNECT_ATTEMPTS) {
            const backoffTime = 5000 * Math.pow(2, reconnectAttempts) // Exponential backoff
            console.log(chalk.yellow(`⏳ Waiting ${backoffTime/1000}s before retry...`))
            await delay(backoffTime)
            return startXeonBotInc()
        } else {
            console.log(chalk.red('❌ Fatal error, could not start bot'))
            process.exit(1)
        }
    }
}

// ═══════════════════════════════════════════════════════════
// 🚀 START BOT WITH ERROR HANDLING
// ═══════════════════════════════════════════════════════════

console.log(chalk.magenta(`
╔═══════════════════════════════════════════════════════╗
║                                                       ║
║            🐞 LADYBUG X BOT v2.0 🐞                  ║
║                                                       ║
║       Enhanced Anti-Ban Protection System            ║
║                                                       ║
║  • Human-like delays (2-10s)                        ║
║  • Rate limiting (10 msg/min, 60 msg/hr)            ║
║  • Behavior monitoring & auto-breaks                ║
║  • No auto-blocking on calls                        ║
║  • Realistic presence updates                       ║
║  • Memory optimized (<512MB)                        ║
║  • Auto-update checker enabled                      ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
`))

console.log(chalk.cyan('📋 ANTI-BAN FEATURES:'))
console.log(chalk.white('  ✓ 2-5s delays for individual chats'))
console.log(chalk.white('  ✓ 3-7s delays for group chats'))
console.log(chalk.white('  ✓ 5-10s delays for broadcasts'))
console.log(chalk.white('  ✓ Typing simulation before replies'))
console.log(chalk.white('  ✓ Reading delays on messages'))
console.log(chalk.white('  ✓ 60 messages/hour limit with cooldowns'))
console.log(chalk.white('  ✓ Bot pattern detection & auto-breaks'))
console.log(chalk.white('  ✓ Gradual online presence (10s delay)'))
console.log(chalk.white('  ✓ No immediate connection broadcasts'))
console.log(chalk.white('  ✓ Disabled auto-call blocking'))
console.log(chalk.white('  ✓ Status view throttling (30% rate)'))
console.log(chalk.white('  ✓ Auto-update checker (checks updates)\n'))

console.log(chalk.yellow('⚠️  IMPORTANT TIPS TO AVOID BANS:'))
console.log(chalk.white('  1. Don\'t use the bot for spam'))
console.log(chalk.white('  2. Keep usage under 50-60 messages/hour'))
console.log(chalk.white('  3. If you see "suspicious behavior" warnings, take a break'))
console.log(chalk.white('  4. Don\'t add the bot to too many groups at once'))
console.log(chalk.white('  5. Let the bot rest for 6-8 hours daily'))
console.log(chalk.white('  6. Use a separate number for bot (not your personal)\n'))

startXeonBotInc().catch(error => {
    console.error(chalk.red('❌ Fatal startup error:'), error)
    console.log(chalk.yellow('\n💡 Troubleshooting:'))
    console.log(chalk.white('  1. Check your internet connection'))
    console.log(chalk.white('  2. Verify your phone number is correct'))
    console.log(chalk.white('  3. Delete ./session folder and re-authenticate'))
    console.log(chalk.white('  4. Check if your number is banned (wait 24hrs)'))
    console.log(chalk.white('  5. Update Baileys: npm install @whiskeysockets/baileys@latest\n'))
    process.exit(1)
})

// ═══════════════════════════════════════════════════════════
// 🛡️ PROCESS ERROR HANDLERS
// ═══════════════════════════════════════════════════════════

process.on('uncaughtException', (err) => {
    console.error(chalk.red('💥 Uncaught Exception:'), err)
    
    // Only exit on critical errors
    if (err.message.includes('ECONNRESET') || err.message.includes('ETIMEDOUT')) {
        console.log(chalk.yellow('🔄 Network error, will retry...'))
        // Don't exit, let reconnect logic handle it
    } else {
        console.log(chalk.red('⚠️ Critical error, attempting graceful shutdown...'))
        store.writeToFile()
        setTimeout(() => process.exit(1), 2000)
    }
})

process.on('unhandledRejection', (err) => {
    console.error(chalk.red('💥 Unhandled Rejection:'), err)
    
    // Log but don't exit - most unhandled rejections are non-critical
    if (err.message && err.message.includes('Connection Closed')) {
        console.log(chalk.yellow('🔄 Connection issue, reconnection will be attempted'))
    }
})

process.on('SIGINT', () => {
    console.log(chalk.yellow('\n\n👋 Gracefully shutting down...'))
    console.log(chalk.cyan('💾 Saving store data...'))
    
    try {
        store.writeToFile()
        console.log(chalk.green('✅ Data saved successfully'))
    } catch (e) {
        console.error(chalk.red('❌ Error saving data:'), e)
    }
    
    console.log(chalk.magenta('🐞 Ladybug X Bot stopped\n'))
    process.exit(0)
})

process.on('SIGTERM', () => {
    console.log(chalk.yellow('\n👋 Received SIGTERM, shutting down gracefully...'))
    
    try {
        store.writeToFile()
        console.log(chalk.green('✅ Data saved'))
    } catch (e) {
        console.error(chalk.red('❌ Save error:'), e)
    }
    
    process.exit(0)
})

// ═══════════════════════════════════════════════════════════
// 📊 RUNTIME STATISTICS
// ═══════════════════════════════════════════════════════════

let startTime = Date.now()

setInterval(() => {
    const uptime = Math.floor((Date.now() - startTime) / 1000)
    const hours = Math.floor(uptime / 3600)
    const minutes = Math.floor((uptime % 3600) / 60)
    const seconds = uptime % 60
    
    const mem = process.memoryUsage()
    const memMB = Math.round(mem.rss / 1024 / 1024)
    const heapMB = Math.round(mem.heapUsed / 1024 / 1024)
    
    console.log(chalk.blue('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'))
    console.log(chalk.cyan(`📊 BOT STATISTICS`))
    console.log(chalk.white(`⏱️  Uptime: $${hours}h$$ {minutes}m ${seconds}s`))
    console.log(chalk.white(`💬 Messages sent: $${messageCount}/$$ {MAX_MESSAGES_PER_HOUR} (last hour)`))
    console.log(chalk.white(`🧠 Memory: ${memMB}MB (Heap: ${heapMB}MB)`))
    console.log(chalk.white(`🔒 Rate limiter entries: ${messageRateLimiter.size}`))
    console.log(chalk.white(`⚠️  Suspicious events: ${behaviorMonitor.suspiciousCount}`))
    console.log(chalk.white(`📈 Behavior patterns: ${behaviorMonitor.messagePattern.length}`))
    
    // Health status
    let status = chalk.green('✅ HEALTHY')
    if (messageCount > MAX_MESSAGES_PER_HOUR * 0.9) {
        status = chalk.red('⚠️  NEAR LIMIT')
    } else if (messageCount > MAX_MESSAGES_PER_HOUR * 0.7) {
        status = chalk.yellow('⚠️  BUSY')
    } else if (behaviorMonitor.suspiciousCount > 2) {
        status = chalk.yellow('⚠️  SUSPICIOUS')
    }
    
    console.log(chalk.white(`🏥 Status: ${status}`))
    console.log(chalk.blue('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'))
}, 300000) // Every 5 minutes

// ═══════════════════════════════════════════════════════════
// 🔄 HOT RELOAD (Development Only)
// ═══════════════════════════════════════════════════════════

if (process.env.NODE_ENV === 'development') {
    let file = require.resolve(__filename)
    fs.watchFile(file, () => {
        fs.unwatchFile(file)
        console.log(chalk.magenta(`🔄 Update detected: ${__filename}`))
        console.log(chalk.yellow('⚠️  Restart required for changes to take effect'))
        delete require.cache[file]
        // Don't auto-require in production
    })
}

// ═══════════════════════════════════════════════════════════
// 🎯 FINAL INITIALIZATION
// ═══════════════════════════════════════════════════════════

console.log(chalk.green('\n✅ Ladybug X Bot initialized successfully!'))
console.log(chalk.cyan('🔗 Join our community:'))
console.log(chalk.white('   YouTube: MR UNIQUE HACKER'))
console.log(chalk.white('   GitHub: mruniquehacker'))
console.log(chalk.magenta('\n🐞 Bot is now starting...\n'))

// Optional: Auto-cleanup on low memory
if (process.platform !== 'win32') {
    process.on('warning', (warning) => {
        if (warning.name === 'MaxListenersExceededWarning') {
            console.log(chalk.yellow('⚠️ Max listeners warning, cleaning up...'))
            
            // Clear old listeners
            if (global.gc) global.gc()
        }
    })
}

// Ensure clean exit
process.on('exit', (code) => {
    console.log(chalk.gray(`\n👋 Process exit with code: ${code}`))
})

// Export for testing (optional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        startXeonBotInc,
        messageRateLimiter,
        behaviorMonitor,
        canSendMessage,
        getRandomDelay
    }
}
