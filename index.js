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
};

let calendarDay = new Date();
let monthName = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
let idCalendarMessage;
let balanceValue;
let officeNumber;
let userObj;
let isAdmin;
let calendarJSON;

//createCalendar(2019, 3);

function createCalendar(year, month) {
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
						{
							text: monthName[calendarDay.getMonth()] + calendarDay.getFullYear().toString(),
							callback_data: 'select_btn'
						},
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
		if (typeof (calendarJSON.reply_markup.inline_keyboard[3]) == 'undefined') {
			calendarJSON.reply_markup.inline_keyboard.push([]);
		}
		let obj = {text: ' ', callback_data: 'empty_field'};
		calendarJSON.reply_markup.inline_keyboard[3].push(obj);
		//reply_markup.inline_keyboard[0].push(obj);
	}

	// <td> ячейки календаря с датами
	let i = 3; //номер массива
	while (d.getMonth() == mon) {
		calendarJSON.reply_markup.inline_keyboard[i].push({
			text: d.getDate(),
			callback_data: 'date_field:' + d.getDate()
		});

		if (getDay(d) % 7 == 6) { // вс, последний день - перевод строки
			i++;
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
	if (day == 0) {
		day = 7;
	} // сделать воскресенье (0) последним днем
	return day - 1;
}

let loginExpense = '';
let loginResult = false;
bot.on('message', msg => {
	if (msg.text === '/start') {
		bot.sendMessage(msg.chat.id, `Hi, enter you Expense Login:`);
		//clean old login ifo
		userObj = {};
		loginExpense = '';

		newExpenseCardInfo = {
			amount: 0,
			date: new Date(),
			keeper: '',
			description: ''
		};

	} else if (msg.text.length >= 6 && msg.text.includes('@') && msg.text.includes('.')) {
		console.log('EMAIL');
		loginExpense = msg.text;
		bot.sendMessage(msg.chat.id, `Enter you Expense Password:`);

	} else if (!(msg.text.length >= 6 && msg.text.includes('@') && msg.text.includes('.')) && loginExpense === '') {
		bot.sendMessage(msg.chat.id, `Wrong login. Login must have pattern "email@email.ru". Retry please.`);

	} else if (loginExpense != '' && typeof (userObj.sfid) == 'undefined') {
		console.log('PASSWORD');
		creedsVerification(
			'SELECT sfid, office__c, email, firstname, admin__c ' +
			'FROM salesforce.contact ' +
			'WHERE password__c = \'' + msg.text + '\'' +
			' AND email = \'' + loginExpense + '\'', msg);

	} else if (msg.text.match(/\-[0-9]|[0-9]+\.[0-9]+/)) {// && newExpenseCardInfo.amount == 0) {
		///[0-9]+\.[0-9]+/)
		newExpenseCardInfo.amount = msg.text;
		bot.sendMessage(
			msg.chat.id,
			'Enter Description please:'
		);
	} else if (newExpenseCardInfo.amount != 0 ) {//&& newExpenseCardInfo.description == ''

		newExpenseCardInfo.description = msg.text;
		bot.sendMessage(
			msg.chat.id,
			'New Expense created!!',
			{
				'reply_markup': {
					'inline_keyboard': [
						[
							{
								text: 'Balance',
								callback_data: 'balance_btn'
							}
						]
					]
				}
			}
		);

		let insertQuery =
			`INSERT INTO salesforce.Expense_Card__c ( Amount__c, CardDate__c, CardKeeper__c, Description__c, External_Expense__c)
				 VALUES 
				 ( 
				 ${parseInt(newExpenseCardInfo.amount)}, 
				 
				 '${newExpenseCardInfo.date.getMonth()}-${newExpenseCardInfo.date.getDate()}-${newExpenseCardInfo.date.getFullYear()}', 
				 
				 '${newExpenseCardInfo.keeper}', 
				 '${newExpenseCardInfo.description}', 
				 '${idGenerator()}'
				 )`;

		console.log(insertQuery)
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
			console.log('SUCCESS INSERT');
			client.end();

			balanceValue = balanceValue + parseFloat(newExpenseCardInfo.amount);

			// clean object
			// newExpenseCardInfo = {
			// 	amount: 0,
			// 	date: new Date(),
			// 	description: ''
			// };

		});
	}
});

bot.on('callback_query', (callbackQuery) => {
	const msg = callbackQuery.message;
	console.log(callbackQuery.data);
	let dateButtonValue;
	if (callbackQuery.data.includes(':')) {

		let dateArray = callbackQuery.data.split(':');
		callbackQuery.data = dateArray[0];
		dateButtonValue = dateArray[1];

	}

	if (callbackQuery.data.includes('Office ')) {

		let officeArray = callbackQuery.data.split(' ');
		officeNumber = callbackQuery.data;
		callbackQuery.data = 'office_selector';
		console.log(officeNumber);
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
									callback_data: 'cancel_btn'
								}
							]
						]
					}
				}
			);
			break;

		case 'today_btn':
			let dateForNewExpense = new Date();

			newExpenseCardInfo.date = new Date(dateForNewExpense.getFullYear(),
				dateForNewExpense.getMonth() + 1, dateForNewExpense.getDate()
			);
			bot.sendMessage(
				msg.chat.id,
				'Enter Amount value please (in currency format, example: 12.34):'
			);
			break;

		case 'last_month_btn':
			bot.deleteMessage(
				callbackQuery.message.chat.id,
				callbackQuery.message.message_id
			).catch(function (err) {
				if (err) {
					console.log('delMessage error');
				}
			});

			calendarDay.setMonth(calendarDay.getMonth() - 1);

			createCalendar(calendarDay.getFullYear(), calendarDay.getMonth());
			bot.sendMessage(
				msg.chat.id,
				'Choose a day with calendar:',
				calendarJSON
			);
			break;

		case 'next_month_btn':
			bot.deleteMessage(
				callbackQuery.message.chat.id,
				callbackQuery.message.message_id
			).catch(function (err) {
				if (err) {
					console.log('delMessage error');
				}
			});

			calendarDay.setMonth(calendarDay.getMonth() + 1);

			createCalendar(calendarDay.getFullYear(), calendarDay.getMonth());
			bot.sendMessage(
				msg.chat.id,
				'Choose a day with calendar:',
				calendarJSON
			);
			break;

		case 'calendar_btn':
			createCalendar(calendarDay.getFullYear(), calendarDay.getMonth() + 1);
			bot.sendMessage(
				msg.chat.id,
				'Choose a day with calendar:',
				calendarJSON
			);

		case 'date_field':

			newExpenseCardInfo.date =
				new Date(calendarDay.getFullYear(), calendarDay.getMonth(), parseInt(dateButtonValue) + 1);
			bot.sendMessage(
				msg.chat.id,
				'Enter Amount value please (in currency format, example: 12.34):'
			);

			break;

		case 'balance_btn':


			let balanceYear = new Date().getFullYear();
			let clientBalance = new Client({
				connectionString: process.env.DATABASE_URL,
				ssl: true
			});

			let balanceQuery

			if (isAdmin == false) {

				 balanceQuery = `SELECT (SUM(Balance__c) -
				(SELECT SUM(Amount__c) FROM salesforce.expense_card__c WHERE CardKeeper__c = '${userObj.sfid}' AND
				date_part('year', carddate__c) = '${balanceYear}')) as balance
				FROM salesforce.Monthly_Expense__c WHERE Keeper__c = '${userObj.sfid}'
				AND date_part('year', monthdate__c) = '${balanceYear}'`;

			} else {

				balanceQuery =
					`SELECT  SUM(Balance__c) as balance
					FROM salesforce.Monthly_Expense__c WHERE
        			(SELECT office__c FROM salesforce.contact WHERE sfid = keeper__c) = '${officeNumber}'
					AND date_part('year', monthdate__c) = '${balanceYear}' 
       				UNION
        			SELECT SUM(amount__c) as amount
					FROM salesforce.expense_card__c
					WHERE (SELECT office__c FROM salesforce.contact WHERE sfid = cardkeeper__c)  = '${officeNumber}' 
					AND date_part('year', carddate__c) = '${balanceYear}'`;

				console.log(balanceQuery)
			}

			clientBalance.connect();
			clientBalance.query(balanceQuery, (err, res) => {

				console.log(balanceValue);
				console.log(JSON.stringify(res.rows));

				if(isAdmin == false){
				balanceValue = parseFloat(JSON.stringify(res.rows[0].balance));
				} else {
					balanceValue = parseFloat(JSON.stringify(res.rows[0].balance)) -
						parseFloat(JSON.stringify(res.rows[1].balance));
				}


				if (err) {
					throw err;
				}

				clientBalance.end();

				bot.sendMessage(msg.chat.id, `Balance summary in this year = ${balanceValue.toFixed(2)}$`,
					{
						'reply_markup': {
							'inline_keyboard': [
								[
									{
										text: 'New Expense Card',
										callback_data: 'new_expense_btn'
									}
								]
							]
						}
					}
				);
			});


			break;

		case 'cancel_btn':
			bot.sendMessage(
				msg.chat.id,
				`For logout enter /start . Select action: `,
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
			break;

		case 'office_selector':
			adminSelectOffice(officeNumber, msg);
			break;

	}
});

bot.on('polling_error', (err) => console.log(err));


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
	client.query(creedsQuerry, (err, res) => {
		if (err) {
			bot.sendMessage(msg.chat.id, `Ooops!!  Wrong password or email.
			 Please check entered information, CapsLock button and retry.`);
		}
		for (let row of res.rows) {
			console.log(JSON.stringify(row));
		}
		client.end();


		if (res.rows.length == 1) {
			isAdmin = false;
			userObj = res.rows[0];
			newExpenseCardInfo.keeper = userObj.sfid;
			if (userObj.admin__c == false) {
				bot.sendMessage(
					msg.chat.id,
					`Hello ${res.rows[0].firstname}! Login Success!! For logout enter /start . Select action: `,
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
			} else {
				adminLoginCase(msg);

			}
			console.log(newExpenseCardInfo.keeper);
		} else {
			bot.sendMessage(msg.chat.id, `Wrong login or password :( Retry Please`);
		}
		//TODO add json in const; Balance for today year
		loginResult = true;
	});

}

function adminSelectOffice(officeNumber, msg) {

	let client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: true
	});

	let adminQuery = `SELECT sfid, email, firstname FROM salesforce.contact WHERE 
		 admin__c = true AND office__c = '${officeNumber}'`;
	console.log(adminQuery);
	client.connect();

	client.query(adminQuery, (err, res) => {
		if (err) {
			bot.sendMessage(msg.chat.id, `Ooops!! Load office is error :( Please retry or login with PC.`);
		}
		client.end();

		bot.sendMessage(
			msg.chat.id,
			`Select office Success!! For logout enter /start . Select action: `,
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
		isAdmin = true;
		userObj = res.rows[0];
		newExpenseCardInfo.keeper = userObj.sfid;
	});
}

function adminLoginCase(msg) {
	let option =
		{
			'reply_markup': {
				'inline_keyboard': [
					[]
				]
			}
		};

	let client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: true
	});
	client.connect();

	client.query(
			`SELECT DISTINCT(office__c) FROM salesforce.contact WHERE office__c !='NULL' ORDER BY office__c DESC`,
		(err, res) => {
			if (err) {
				bot.sendMessage(msg.chat.id, `Ooops!! Load office list error :( Please retry.`);
			}
			client.end();


			for (let row of res.rows) {
				option.reply_markup.inline_keyboard[0].push({text: row.office__c, callback_data: row.office__c});
			}
			bot.sendMessage(
				msg.chat.id,
				`Hello Dear Admin! Login Success!! For logout or change office enter /start .\nSelect office: `,
				option
			);

		}
	);
}



