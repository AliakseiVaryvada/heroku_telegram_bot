let indexVariable = require('./index')
const {Client} = require('pg');
require('dotenv').config();

let adminSelectOffice = function adminSelectOffice(officeNumber, msg) {

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
			indexVariable.bot.sendMessage(msg.chat.id, `Ooops!! Load office is error :( Please retry or login with PC.`);
		}
		client.end();

		indexVariable.bot.sendMessage(
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
		indexVariable.isAdmin = true;
		indexVariable.userObj = res.rows[0];
		indexVariable.newExpenseCardInfo.keeper = indexVariable.userObj.sfid;
	});
}

let adminLoginCase = function adminLoginCase(msg) {
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
				indexVariable.bot.sendMessage(msg.chat.id, `Ooops!! Load office list error :( Please retry.`);
			}
			client.end();


			for (let row of res.rows) {
				option.reply_markup.inline_keyboard[0].push({text: row.office__c, callback_data: row.office__c});
			}
			indexVariable.bot.sendMessage(
				msg.chat.id,
				`Hello Dear Admin! Login Success!! For logout or change office enter /start .\nSelect office: `,
				option
			);

		}
	);
}

module.exports.adminLoginCase = adminLoginCase;
module.exports.adminSelectOffice = adminSelectOffice;
