const { generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');

const ntandoStoreCommand = async (sock, chatId, message) => {
    const storeMessage = `
╔════════════════════════╗
║    🛍️ *NTANDO STORE* 🛍️    ║
╚════════════════════════╝

*Welcome to Ntando Store - Your Digital Solutions Hub!*

┏━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🌐 *WEB SERVICES*
┣━━━━━━━━━━━━━━━━━━━━━━┫
┃ ✅ Domain Sales
┃ ✅ Website Development
┃ ✅ Website Hosting
┃ ✅ Website Deployment
┗━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━┓
┃ 🤖 *BOT SERVICES*
┣━━━━━━━━━━━━━━━━━━━━━━┫
┃ ✅ Bot Development
┃ ✅ Bot Deployment
┃ ✅ WhatsApp Bots
┃ ✅ Telegram Bots
┗━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📱 *PREMIUM PRODUCTS*
┣━━━━━━━━━━━━━━━━━━━━━━┫
┃ ✅ Premium Apps (All Types)
┃ ✅ Premium Foreign Numbers
┃ ✅ Digital Products
┗━━━━━━━━━━━━━━━━━━━━━━┛

┏━━━━━━━━━━━━━━━━━━━━━━┓
┃ 📞 *CONTACT US*
┣━━━━━━━━━━━━━━━━━━━━━━┫
┃ 💬 WhatsApp: [Your Number]
┃ 📧 Email: [Your Email]
┃ 🌐 Website: [Your Website]
┗━━━━━━━━━━━━━━━━━━━━━━┛

💡 *Why Choose Ntando Store?*
✨ Professional Quality
✨ Affordable Prices
✨ 24/7 Support
✨ Fast Delivery
✨ Trusted by 1000+ Clients

📝 *To Place an Order:*
Type *.order [service]* or contact us directly!

_🔒 Secure & Reliable Service Provider_
    `.trim();

    await sock.sendMessage(chatId, { 
        text: storeMessage 
    }, { 
        quoted: message 
    });
};

const orderCommand = async (sock, chatId, message, service = '') => {
    const orderMessage = `
╔════════════════════════╗
║   📝 *PLACE YOUR ORDER* 📝  ║
╚════════════════════════╝

*How to Order from Ntando Store:*

*Step 1:* Choose your service
*Step 2:* Contact us with details
*Step 3:* Get a quote
*Step 4:* Make payment
*Step 5:* Receive your order!

*📋 Available Services:*

1️⃣ *Domains* - .order domain
2️⃣ *Website Development* - .order website
3️⃣ *Website Hosting* - .order hosting
4️⃣ *Bot Development* - .order bot
5️⃣ *Premium Apps* - .order app
6️⃣ *Premium Numbers* - .order number

*💳 Payment Methods:*
✅ PayPal
✅ Bank Transfer
✅ Crypto
✅ Mobile Money

*📞 Contact:*
WhatsApp: [Your Number]
Email: [Your Email]

_We'll respond within 24 hours!_
    `.trim();

    await sock.sendMessage(chatId, { 
        text: orderMessage 
    }, { 
        quoted: message 
    });
};

const servicesCommand = async (sock, chatId, message, category = 'all') => {
    const services = {
        web: `
╔════════════════════════╗
║  🌐 *WEB SERVICES* 🌐     ║
╚════════════════════════╝

*1. Domain Sales*
   • .com, .net, .org domains
   • Premium domains available
   • Domain transfer assistance
   📌 Starting from $10/year

*2. Website Development*
   • Business Websites
   • E-commerce Stores
   • Portfolio Sites
   • Custom Web Apps
   📌 Starting from $299

*3. Website Hosting*
   • Shared Hosting
   • VPS Hosting
   • Cloud Hosting
   • SSL Certificates Included
   📌 Starting from $5/month

*4. Website Deployment*
   • Quick deployment
   • Server setup
   • DNS configuration
   • Maintenance support
   📌 Starting from $50

💬 Contact us to get started!
        `.trim(),

        bot: `
╔════════════════════════╗
║   🤖 *BOT SERVICES* 🤖    ║
╚════════════════════════╝

*1. WhatsApp Bots*
   • Custom commands
   • AI integration
   • Media handling
   • Group management
   📌 Starting from $199

*2. Telegram Bots*
   • Payment integration
   • Channel automation
   • Custom features
   📌 Starting from $149

*3. Discord Bots*
   • Moderation bots
   • Music bots
   • Custom commands
   📌 Starting from $149

*4. Bot Deployment*
   • 24/7 hosting
   • Server setup
   • Monitoring
   • Updates & support
   📌 Starting from $20/month

🚀 Turn your ideas into reality!
        `.trim(),

        premium: `
╔════════════════════════╗
║ 📱 *PREMIUM PRODUCTS* 📱  ║
╚════════════════════════╝

*1. Premium Apps*
   • Streaming apps (Netflix, Spotify, etc)
   • Productivity apps
   • Design software
   • Gaming apps
   📌 Prices vary by app

*2. Premium Foreign Numbers*
   • USA numbers
   • UK numbers
   • Canada numbers
   • Virtual numbers
   • SMS verification
   📌 Starting from $5

*3. Digital Products*
   • Software licenses
   • API access
   • Premium accounts
   📌 Contact for pricing

🔒 100% Authentic & Working
        `.trim(),

        all: `
╔════════════════════════╗
║  📋 *ALL SERVICES* 📋     ║
╚════════════════════════╝

*View specific categories:*

🌐 *.services web* - Web Services
🤖 *.services bot* - Bot Services  
📱 *.services premium* - Premium Products

*Or view our main store:*
🛍️ *.store* - Main Store Menu

*Ready to order?*
📝 *.order* - Place an Order

💬 Contact us for custom requests!
        `.trim()
    };

    const messageToSend = services[category] || services.all;

    await sock.sendMessage(chatId, { 
        text: messageToSend 
    }, { 
        quoted: message 
    });
};

const pricingCommand = async (sock, chatId, message) => {
    const pricingMessage = `
╔════════════════════════╗
║   💰 *PRICING GUIDE* 💰   ║
╚════════════════════════╝

*🌐 WEB SERVICES*
├ Domains: $10-$50/year
├ Basic Website: $299-$599
├ E-commerce: $799-$1,999
├ Hosting: $5-$50/month
└ Deployment: $50-$200

*🤖 BOT SERVICES*
├ WhatsApp Bot: $7-$14
├ Telegram Bot: $10-$30
├ Discord Bot: $20-$50
└ Bot Hosting: $20/month

*📱 PREMIUM PRODUCTS*
├ Premium Apps: $5-$50
├ Foreign Numbers: $5-$20
└ Custom Products: Contact us

*🎁 PACKAGE DEALS*
├ Website + Hosting: Save 20%
├ Bot + Deployment: Save 15%
└ Bulk Orders: Special discounts

*💡 Payment Plans Available!*

📞 Contact us for a custom quote!
    `.trim();

    await sock.sendMessage(chatId, { 
        text: pricingMessage 
    }, { 
        quoted: message 
    });
};

module.exports = {
    ntandoStoreCommand,
    orderCommand,
    servicesCommand,
    pricingCommand
};
