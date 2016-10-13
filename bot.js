const Bot = require('yamdbf').Bot;
const config = require('./config.json');
const path = require('path');
const ModActions = require('./lib/ModActions').default;

const bot = new Bot({
	name: 'YAMDBF Mod',
	token: config.token,
	config: config,
	selfbot: false,
	version: '1.0.0',
	statusText: 'Obey the law.',
	commandsDir: path.join(__dirname, 'commands'),
	disableBase: [
		'setprefix',
		'disablegroup',
		'enablegroup',
		'listgroups',
		'version'
	]
}).start();

bot.setDefaultSetting('prefix', '?');
bot.storage.setItem('checkingAppeals', false);
bot.storage.setItem('checkingMutes', false);
bot.storage.setItem('checkingBans', false);
bot.mod = new ModActions(bot);
