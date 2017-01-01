'use strict';
import * as path from 'path';
import ModBot from './lib/ModBot';
import ModActions from './lib/ModActions';
const config: any = require('./config.json');

const bot: ModBot = new ModBot({
	name: 'YAMDBF Mod',
	token: config.token,
	config: config,
	version: '3.0.0',
	statusText: 'Obey the law.',
	readyText: 'Ready\u0007',
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
.on('disconnect', () => process.exit());