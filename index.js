const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const TOKEN = '964527257:AAEJeN2H35vn-i4oX1ijbUqDGIQI-UfxR2A';
const bot = new TelegramBot(TOKEN, {polling: true});

const {Client} = require('pg');
const client = new Client({
	connectionString: process.env.DATABASE_URL,
	ssl: true
});

let logi = {
	loginExpense: null,
	passwordExpense: ''
};
//let loginInputQueue = 0; // очередность ввода, 0 -логин 1-пасс обнуление - логаут
let loginExpense = '';

bot.on('message', msg => {
	if (msg.text === '/start') {
		bot.sendMessage(msg.chat.id, `Hi ${msg.from.first_name}, enter you Expense Login:`);
	} else if (msg.text.length >= 6 && msg.text.includes('@') && msg.text.includes('.')) {
		console.log('here');
		loginExpense = msg.text
		bot.sendMessage(msg.chat.id, `Enter you Expense Password:`)

	} else if (!(msg.text.length >= 6 && msg.text.includes('@') && msg.text.includes('.')) && loginExpense === ''){
			bot.sendMessage(msg.chat.id,`Wrong login. Login must have pattern "email@email.ru". Retry please.`)

	} else if (loginExpense !='') {
		console.log('PASSWORD');
		creedsVerification('SELECT id, office__c FROM salesforce.contact WHERE password__c ='+msg.text);
	}
	console.log(loginExpense)
	console.log('end')

});


function creedsVerification(creedsQuerry) {
	client.connect();
	console.log(creedsQuerry);
	client.query(creedsQuerry, (err, res) => {
		if (err) {
			throw err;
		}
		for (let row of res.rows) {
			console.log(JSON.stringify(row));
		}
		client.end();
	});
}
