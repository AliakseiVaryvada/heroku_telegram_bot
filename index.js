const dotenv 			= require('dotenv').config();
const TelegramBot		= require('node-telegram-bot-api');
const calendar 			= require('./calendar');
const adminFunction 	= require('./AdminFunction');
const TOKEN 			= '964527257:AAEJeN2H35vn-i4oX1ijbUqDGIQI-UfxR2A';
const constQueryJSON 	= require('./QueryAndJSON')
const bot				= new TelegramBot(TOKEN, {polling: true});
const {Client} 			= require('pg');

const PORT = process.env.PORT || 3000;
bot.listen(PORT, () => {
	console.log(`Our app is running on port ${ PORT }`);
});

let newExpenseCardInfo = {
	amount: 	0,
	date: 		new Date(),
	keeper: 	'',
	description: ''
};

let balanceValue;
let officeNumber;
let userObj;
let isAdmin;
let loginExpense 	= '';
let loginResult 	= false;

// event for enter messages
bot.on('message', msg => {

	if (msg.text === '/start') {
		bot.sendMessage(msg.chat.id, `✋ Hi, enter you Expense Login:`);
		//clean old login ifo
		userObj 	 = {};
		loginExpense = '';

		newExpenseCardInfo = {
			amount: 	0,
			date: 		new Date(),
			keeper: 	'',
			description: ''
		};
	//check email true case
	} else if (msg.text.length >= 6 && msg.text.includes('@') && msg.text.includes('.')) {

		loginExpense = msg.text;

		bot.sendMessage(
			msg.chat.id,
			`✒ Enter you Expense Password:`
		);

	//check email wrong case
	} else if (!(msg.text.length >= 6 && msg.text.includes('@') && msg.text.includes('.')) && loginExpense === '') {

		bot.sendMessage(
			msg.chat.id,
			`❌ Wrong login. <em>Login must have pattern "email@email.ru".</em>\n<strong>Retry please.</strong>`,
			{parse_mode: 'html'}

		);

	//get password
	} else if (loginExpense != '' && typeof (userObj.sfid) == 'undefined') {
		//query for login
		creedsVerification(
			'SELECT sfid, office__c, email, firstname, admin__c ' +
			'FROM salesforce.contact ' +
			'WHERE password__c = \'' + msg.text + '\'' +
			' AND email = \'' + loginExpense + '\'', msg);

	//enter currency check
	} else if (msg.text.match(/\-[0-9]|[0-9]+\.[0-9]+/)) {

		newExpenseCardInfo.amount = msg.text;
		bot.sendMessage(
			msg.chat.id,
			'✒ Enter <strong>Description</strong> please:',
			{parse_mode: 'html'}

		);

	//insert case
	} else if (newExpenseCardInfo.amount != 0 ) {

		newExpenseCardInfo.description = msg.text;
		bot.sendMessage(
			msg.chat.id,
			'✅ <strong>New Expense created!!</strong>',
			constQueryJSON.formBalanceBtn
		);

		let client = new Client({
			connectionString: process.env.DATABASE_URL,
			ssl: true
		});

		let insertQuery =
		`INSERT INTO salesforce.Expense_Card__c ( Amount__c, CardDate__c, CardKeeper__c, Description__c, External_Expense__c)
		VALUES ( 
		${parseInt(newExpenseCardInfo.amount)}, 
		'${newExpenseCardInfo.date.getMonth()+1}-${newExpenseCardInfo.date.getDate()}-${newExpenseCardInfo.date.getFullYear()}', 
		'${newExpenseCardInfo.keeper}', 
		'${newExpenseCardInfo.description}', 
		'${idGenerator()}')`;


		client.connect();

		client.query(insertQuery, (err) => {
			if (err) {
				throw err;
			}
			console.log('SUCCESS INSERT');
			client.end();

			balanceValue = balanceValue + parseFloat(newExpenseCardInfo.amount);

		});
	} else {
		bot.sendMessage(
			msg.chat.id,
			`☝ <strong>Retry please.</strong>`,
			{parse_mode: 'html'}
		);
	}
});


//event for every button

bot.on('callback_query', (callbackQuery) => {
	let msg = callbackQuery.message;

	let dateButtonValue;

	//check date in calendar. After : day number
	if (callbackQuery.data.includes(':')) {

		let dateArray = callbackQuery.data.split(':');
		callbackQuery.data = dateArray[0];
		dateButtonValue = dateArray[1];

	}

	//check office number in admin case
	if (callbackQuery.data.includes('Office ')) {

		let officeArray = callbackQuery.data.split(' ');
		officeNumber = callbackQuery.data;
		callbackQuery.data = 'office_selector';
		console.log(officeNumber);
	}

	//switch for buttons
	switch (callbackQuery.data) {
		case 'new_expense_btn':
			bot.sendMessage(
				msg.chat.id,
				'✅ Choose a day to create a card:',
				constQueryJSON.formExpense
			);
			break;

		case 'today_btn':
			let dateForNewExpense = new Date();

			newExpenseCardInfo.date = new Date(dateForNewExpense.getFullYear(),
				dateForNewExpense.getMonth() + 1, dateForNewExpense.getDate()
			);
			bot.sendMessage(
				msg.chat.id,
				'Enter <strong>Amount</strong> value please <em>(in currency format, example: 12.34)</em>:',
				{parse_mode: 'html'}
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

			calendar.calendarDay.setMonth(calendar.calendarDay.getMonth() - 1);

			bot.sendMessage(
				msg.chat.id,
				'📆 Choose a day with calendar:',
				calendar.createCalendar(calendar.calendarDay.getFullYear(), calendar.calendarDay.getMonth())
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

			calendar.calendarDay.setMonth(calendar.calendarDay.getMonth() + 1);

			bot.sendMessage(
				msg.chat.id,
				'📆 Choose a day with calendar:',
				calendar.createCalendar(calendar.calendarDay.getFullYear(), calendar.calendarDay.getMonth())
			);
			break;

		case 'calendar_btn':

			bot.sendMessage(
				msg.chat.id,
				'📆 Choose a day with calendar:',
				calendar.createCalendar(calendar.calendarDay.getFullYear(), calendar.calendarDay.getMonth())
			);

		case 'date_field':

			newExpenseCardInfo.date =
				new Date(calendar.calendarDay.getFullYear(), calendar.calendarDay.getMonth(), parseInt(dateButtonValue) + 1);
			bot.sendMessage(
				msg.chat.id,
				'Enter <strong>Amount</strong> value please <em>(in currency format, example: 12.34)</em>:',
				{parse_mode: 'html'}
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

				 balanceQuery =
				 `SELECT (SUM(Balance__c) -
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
			}

			clientBalance.connect();
			clientBalance.query(balanceQuery, (err, res) => {

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

				bot.sendMessage(msg.chat.id,
					`💰 <strong>Balance</strong> summary in this year = <ins>${balanceValue.toFixed(2)}$</ins>`,
					constQueryJSON.formNewExpenseCard
				);
			});


			break;

		case 'cancel_btn':
			bot.sendMessage(
				msg.chat.id,
				`✅ <b>For logout enter</b> /start . <em>Select action:</em> `,
				constQueryJSON.formAfterLogin
			);
			break;

		case 'office_selector':
			adminFunction.adminSelectOffice(officeNumber, msg);
			break;

		default :
			bot.sendMessage(
				msg.chat.id,
				`☝ <strong>Retry please.</strong>`,
				{parse_mode: 'html'}

		);
	}
});


//event for make error readable
bot.on('polling_error', (err) => console.log(err));

// generate id for INSERT query. External id.

function idGenerator() {
	let number = Math.random().toString(36);
	return number.toString(36).substr(2, 10);
}

// method for authorisation.Get query as parameter and check User/Admin.

function creedsVerification(creedsQuerry, msg) {
	let client = new Client({
		connectionString: process.env.DATABASE_URL,
		ssl: true
	});
	client.connect();

	client.query(creedsQuerry, (err, res) => {
		if (err) {
			bot.sendMessage(msg.chat.id, `\xE2\x9B\x94 <strong>Ooops!!</strong>  Wrong password or email.
			 <em>Please check entered information, CapsLock button and retry.</em>`,
			{parse_mode: 'html'}
			)
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
					`✅ Hello ${res.rows[0].firstname}! <strong>Login Success!!</strong> For logout enter /start . Select action: `,
					constQueryJSON.formAfterLogin

				);
			} else {
				adminFunction.adminLoginCase(msg);
			}
			console.log(newExpenseCardInfo.keeper);
		} else {
			bot.sendMessage(msg.chat.id, `⛔ <strong>Ooops!!</strong>  Wrong password or email.
			 <em>Please check entered information, CapsLock button and retry.</em>`,
				{parse_mode: 'html'}
			)
		}
		loginResult = true;
	});

}

//export part

module.exports.officeNumber = officeNumber
module.exports.userObj = userObj
module.exports.isAdmin = isAdmin
module.exports.newExpenseCardInfo = newExpenseCardInfo
module.exports.bot = bot
