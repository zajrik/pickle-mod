'use strict'
import * as path from 'path';
import ModBot from './lib/ModBot';
import ModActions from './lib/ModActions';
const config = require('./config.json');

const bot: ModBot = new ModBot({
	name: 'YAMDBF Mod',
	token: config.token,
	config: config,
	version: '2.0.0',
	statusText: null,
	commandsDir: path.join(__dirname, 'commands'),
		disableBase: [
		'disablegroup',
		'enablegroup',
		'listgroups',
		'version',
		'reload'
	]
})
.removeDefaultSetting('disabledGroups')
.setDefaultSetting('prefix', '?')
.setDefaultSetting('cases', 0)
.start()
.on('ready', () => console.log('\u0007'));

bot.mod = new ModActions(bot);
