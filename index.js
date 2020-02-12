const TelegramBot = require('node-telegram-bot-api')
const TOKEN = '964527257:AAEJeN2H35vn-i4oX1ijbUqDGIQI-UfxR2A'
const bot = new TelegramBot(TOKEN, {polling:true})

const { Client } = require('pg');

const client = new Client({
	connectionString: process.env.DATABASE_URL,
	ssl: true,
});
bot.on('message', msg => {
	bot.sendMessage(msg.chat.id, "Enter Login:")
})

client.connect();

client.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, res) => {
	if (err) throw err;
	for (let row of res.rows) {
		console.log(JSON.stringify(row));
	}
	client.end();
});

