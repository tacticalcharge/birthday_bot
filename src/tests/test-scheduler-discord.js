import { Client, GatewayIntentBits } from "discord.js";
import "dotenv/config";
import { sendBirthdayNotifications } from "../scheduler.js";

const { TOKEN, TEST_CHANNEL_ID, TEST_USER_ID = "scheduler-test-user" } = process.env;

if (!TOKEN || !TEST_CHANNEL_ID) {
	throw new Error("TOKEN and TEST_CHANNEL_ID must be configured for the Discord delivery test");
}

const now = new Date();
const time = `${String(now.getUTCHours()).padStart(2, "0")}:${String(now.getUTCMinutes()).padStart(2, "0")}`;
const client = new Client({ intents: [GatewayIntentBits.Guilds] });

try {
	await client.login(TOKEN);
	const sent = await sendBirthdayNotifications(client, {
		enabled: true,
		destination: "channel",
		channelId: TEST_CHANNEL_ID,
		time,
		timezone: "UTC"
	}, now, [{
		authorid: [],
		userid: TEST_USER_ID,
		username: "Scheduler Discord Test"
	}]);

	console.log(`Sent ${sent} test embed(s) to channel ${TEST_CHANNEL_ID}`);
} finally {
	client.destroy();
}