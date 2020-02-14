const TelegramBot = require('node-telegram-bot-api');
require('dotenv').config();
const TOKEN = '964527257:AAEJeN2H35vn-i4oX1ijbUqDGIQI-UfxR2A';
const bot = new TelegramBot(TOKEN, {polling: true});

const {Client} = require('pg');


let newExpenseCardInfo = {
	amount: 0,
	date: new Date(),
	keeper: '',
	description: ''
}

let calendarDay = new Date();
let monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
let idCalendarMessage

let userObj
let calendarJSON
//createCalendar(2019, 3);

function createCalendar(year, month){
	let mon = month; // месяцы в JS идут от 0 до 11, а не от 1 до 12
	let d = new Date(year, mon);
	// пробелы для первого ряда
	// с понедельника до первого дня месяца
	// * * * 1  2  3  4
	 calendarJSON =
		{
			'reply_markup': {
				'inline_keyboard': [
					[
						{text: '<', callback_data: 'last_month_btn'},
						{text: monthName[calendarDay.getMonth()] + calendarDay.getFullYear().toString(), callback_data: 'select_btn'},
						{text: '>', callback_data: 'next_month_btn'}
					],

					[
						{text: 'S', callback_data: 'week_day'},
						{text: 'M', callback_data: 'week_day'},
						{text: 'T', callback_data: 'week_day'},
						{text: 'W', callback_data: 'week_day'},
						{text: 'T', callback_data: 'week_day'},
						{text: 'F', callback_data: 'week_day'},
						{text: 'S', callback_data: 'week_day'}
					],
					[],
					[],
					[],
					[],
					[],
					[],
					[]
				]
			}
		};
	console.log(calendarJSON);

	for (let i = 0; i < getDay(d); i++) {
		if(typeof (calendarJSON.reply_markup.inline_keyboard[3]) == 'undefined'){
			calendarJSON.reply_markup.inline_keyboard.push([]);
		}
		let obj = {text: ' ', callback_data: 'empty_field'}
		 calendarJSON.reply_markup.inline_keyboard[3].push(obj)
			 //reply_markup.inline_keyboard[0].push(obj);
	}

	// <td> ячейки календаря с датами
	let i = 3 //номер массива
	while (d.getMonth() == mon) {
		calendarJSON.reply_markup.inline_keyboard[i].push({text: d.getDate(), callback_data: 'date_field:'+d.getDate()});

		if (getDay(d) % 7 == 6) { // вс, последний день - перевод строки
			i++
		}

		d.setDate(d.getDate() + 1);
	}

	// добить таблицу пустыми ячейками, если нужно
	// 29 30 31 * * * *
	if (getDay(d) != 0) {
		for (let i = getDay(d); i < 7; i++) {
			calendarJSON.reply_markup.inline_keyboard[7].push({text: ' ', callback_data: 'empty_field'});
		}
	}
}

function getDay(date) { // получить номер дня недели, от 0 (пн) до 6 (вс)
	let day = date.getDay();
	if (day == 0) day = 7; // сделать воскресенье (0) последним днем
	return day - 1;
}

let loginExpense = '';
let loginResult = false;
bot.on('message', msg => {
	if (msg.text === '/start') {
		bot.sendMessage(msg.chat.id, `Hi, enter you Expense Login:`);
	} else if (msg.text.length >= 6 && msg.text.includes('@') && msg.text.includes('.')) {
		console.log('EMAIL');
		loginExpense = msg.text;
		bot.sendMessage(msg.chat.id, `Enter you Expense Password:`);

	} else if (!(msg.text.length >= 6 && msg.text.includes('@') && msg.text.includes('.')) && loginExpense === '') {
		bot.sendMessage(msg.chat.id, `Wrong login. Login must have pattern "email@email.ru". Retry please.`);

	} else if (loginExpense != '' && typeof (userObj) == 'undefined') {
		console.log('PASSWORD');
		creedsVerification(
			'SELECT sfid, office__c, email, firstname ' +
			'FROM salesforce.contact ' +
			'WHERE password__c = \'' + msg.text + '\'' +
			' AND email = \'' + loginExpense + '\'', msg);

	} else if (msg.text.match(/[0-9]+\.[0-9]+/) && newExpenseCardInfo.amount == 0) {
		///[0-9]+\.[0-9]+/)
		newExpenseCardInfo.amount = msg.text;
		bot.sendMessage(
			msg.chat.id,
			'Enter Description please:',
		);
	} else if (newExpenseCardInfo.amount != 0 && newExpenseCardInfo.description == '') {

		newExpenseCardInfo.description = msg.text;
		bot.sendMessage(
			msg.chat.id,
			'New Expense created!!',
		);

		let insertQuery =
			`INSERT INTO salesforce.Expense_Card__c ( Amount__c, CardDate__c, CardKeeper__c, Description__c, External_Expense__c)
				 VALUES 
				 ( 
				 ${parseInt(newExpenseCardInfo.amount)}, 
				 
				 '${newExpenseCardInfo.date.getDay()}-${newExpenseCardInfo.date.getMonth()}-${newExpenseCardInfo.date.getFullYear()}', 
				 
				 '${newExpenseCardInfo.keeper}', 
				 '${newExpenseCardInfo.description}', 
				 '${idGenerator()}'
				 )`

		let client = new Client({
			connectionString: process.env.DATABASE_URL,
			ssl: true
		});
		client.connect();
		console.log(insertQuery);
		client.query(insertQuery, (err) => {
			if (err) {
				throw err;
			}
			console.log('SUCCESS')
			client.end();

		});
	}
});

bot.on('callback_query', (callbackQuery) => {
	const msg = callbackQuery.message;
	console.log(callbackQuery.data);
	let dateButtonValue;

	if(callbackQuery.data.includes(':')){
		console.log('split!!!')
		let dateArray = callbackQuery.data.split(':');
		callbackQuery.data = dateArray[0]
		dateButtonValue = dateArray[1]
		console.log(dateArray)
	}

	switch (callbackQuery.data) {
		case 'new_expense_btn':
			bot.sendMessage(
				msg.chat.id,
				'Choose a day to create a card:',
				{
					'reply_markup': {
						'inline_keyboard': [
							[
								{
									text: 'Today',
									callback_data: 'today_btn'
								},
								{
									text: 'Calendar',
									callback_data: 'calendar_btn'
								},
								{
									text: 'Cancel',
									callback_data: 'new_expense_btn'
								}
							]
						]
					}
				}
			);
			break;

		case 'today_btn':
			let dateForNewExpense = new Date();
			break

		case 'last_month_btn':
			bot.deleteMessage(
					callbackQuery.message.chat.id,
					callbackQuery.message.message_id,
				).catch(function (err) {
					if (err)
						console.log("delMessage error");
				});

			calendarDay.setMonth(calendarDay.getMonth() - 1)

			createCalendar(calendarDay.getFullYear(), calendarDay.getMonth());
			bot.sendMessage(
				msg.chat.id,
				'Choose a day with calendar:',
				calendarJSON
			);
			break

		case 'next_month_btn':
			bot.deleteMessage(
				callbackQuery.message.chat.id,
				callbackQuery.message.message_id,
			).catch(function (err) {
				if (err)
					console.log("delMessage error");
			});

			calendarDay.setMonth(calendarDay.getMonth() + 1)

			createCalendar(calendarDay.getFullYear(), calendarDay.getMonth());
			bot.sendMessage(
				msg.chat.id,
				'Choose a day with calendar:',
				calendarJSON
			);
			break

		case 'calendar_btn':
			createCalendar(calendarDay.getFullYear(), calendarDay.getMonth()+1);
			bot.sendMessage(
				msg.chat.id,
				'Choose a day with calendar:',
				calendarJSON
			);

		case 'date_field':
			newExpenseCardInfo.date = new Date(calendarDay.getFullYear(), calendarDay.getMonth(), parseInt(dateButtonValue)+1)
			bot.sendMessage(
				msg.chat.id,
				'Enter Amount value please (in currency format, example: 12.34):',
			);

			break
	}
});

bot.on("polling_error", (err) => console.log(err));

function idGenerator() {
	let number = Math.random().toString(36);
	return number.toString(36).substr(2, 10);
}

function creedsVerification(creedsQuerry, msg) {
	let client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: true
	});
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

		if (res.rows.length == 1) {
			bot.sendMessage(
				msg.chat.id,
				`Hello ${res.rows[0].firstname}! Login Success!! Select action: `,
				{
					'reply_markup': {
						'inline_keyboard': [
							[
								{
									text: 'Current Balance',
									callback_data: 'balance_btn'
								},
								{
									text: 'New Expense Card',
									callback_data: 'new_expense_btn'
								}
							]
						]
					}
				}
			);
			userObj = res.rows[0]
			console.log(res.rows[0])
			newExpenseCardInfo.keeper = userObj.sfid
			console.log(newExpenseCardInfo.keeper)
		} else {
			bot.sendMessage(msg.chat.id, `Wrong login or password :( Retry Please`);
		}
		//TODO add json in const and wrong password msg
		loginResult = true;
	});


}

