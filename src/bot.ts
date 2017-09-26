import { ModClient } from './lib/ModClient';
import { Logger } from 'yamdbf';

const client: ModClient = new ModClient();
client.start();

client.on('disconnect', () => process.exit(100));

process.on('unhandledRejection', (reason: string) => {
	if (/ETIMEDOUT|getaddrinfo|Something took too long to do/.test(reason)) process.exit(200);
	else Logger.instance().error('UnhandledRejection', reason);
});
