const TelegramBot = require('node-telegram-bot-api')

const TOKEN = '964527257:AAEJeN2H35vn-i4oX1ijbUqDGIQI-UfxR2A'

const bot = new TelegramBot(TOKEN, {polling:true})

bot.on('message', msg => {
	bot.sendMessage(msg.chat.id, `Hello from HEROKU,
	bot says: " Hi ${msg.from.first_name}"`)
})
