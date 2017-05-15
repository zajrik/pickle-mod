import ModBot from './lib/ModBot';

const bot: ModBot = new ModBot();
bot.start();

bot.on('disconnect', () => process.exit(100));

process.on('unhandledRejection', (reason: string) => {
	if (/ETIMEDOUT|getaddrinfo|Something took too long to do/.test(reason)) process.exit(200);
	else console.error(reason);
});
