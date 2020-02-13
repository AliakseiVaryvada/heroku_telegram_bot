const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const TOKEN = '964527257:AAEJeN2H35vn-i4oX1ijbUqDGIQI-UfxR2A';
const bot = new TelegramBot(TOKEN, {polling: true});

const {Client} = require('pg');
const client = new Client({
	connectionString: process.env.DATABASE_URL,
	ssl: true
});

//let loginInputQueue = 0; // очередность ввода, 0 -логин 1-пасс обнуление - логаут
let loginExpense = '';
let loginResult = false
bot.on('message', msg => {
	if (msg.text === '/start') {
		bot.sendMessage(msg.chat.id, `Hi, enter you Expense Login:`);
	} else if (msg.text.length >= 6 && msg.text.includes('@') && msg.text.includes('.')) {
		console.log('EMAIL');
		loginExpense = msg.text
		bot.sendMessage(msg.chat.id, `Enter you Expense Password:`)

	} else if (!(msg.text.length >= 6 && msg.text.includes('@') && msg.text.includes('.')) && loginExpense === ''){
			bot.sendMessage(msg.chat.id,`Wrong login. Login must have pattern "email@email.ru". Retry please.`)

	} else if (loginExpense !='') {
		console.log('PASSWORD');

		creedsVerification(
			'SELECT id, office__c, email, firstname ' +
			'FROM salesforce.contact ' +
			'WHERE password__c = \''+msg.text+'\'' +
			' AND email = \''+ loginExpense +'\'', msg);

		console.log(loginResult)
	}
});

function creedsVerification(creedsQuerry, msg) {
	client.connect();
	console.log(creedsQuerry);
	let loginSuccess = false;
	client.query(creedsQuerry, (err, res) => {
		if (err) {
			throw err;
		}
		for (let row of res.rows) {
			console.log(JSON.stringify(row));
		}
		client.end();
		res.rows.length == 1 ? bot.sendMessage(msg.chat.id, `Hello ${res.rows[0].firstname}! Login Success!! :)`)
			: bot.sendMessage(msg.chat.id, `Wrong login or password :( Retry Please`)
		loginResult = true
	});


}
