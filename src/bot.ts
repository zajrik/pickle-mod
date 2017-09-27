import { ModClient } from './client/ModClient';
import { Logger } from 'yamdbf';

const client: ModClient = new ModClient();
client.start();

client.on('disconnect', () => process.exit(100));

process.on('unhandledRejection', (reason: any) => {
	if (/ETIMEDOUT|getaddrinfo|Something took too long to do/.test(reason)) process.exit(200);
	else Logger.instance().error('UnhandledRejection', reason.stack ? reason.stack : reason);
});
