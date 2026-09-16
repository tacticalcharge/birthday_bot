import fs from "node:fs";
import path from "node:path";
import { startScheduler } from "../scheduler.js";

const today = new Date();
const date = `${String(today.getUTCDate()).padStart(2, "0")}-${String(today.getUTCMonth() + 1).padStart(2, "0")}`;
const dataPath = path.resolve("src", "data", `${date}.json`);
const hadExistingData = fs.existsSync(dataPath);
const existingData = hadExistingData ? fs.readFileSync(dataPath, "utf8") : null;
const currentTime = `${String(today.getUTCHours()).padStart(2, "0")}:${String(today.getUTCMinutes()).padStart(2, "0")}`;

const testBirthdays = [
	{
		authorid: ["scheduler-test-author"],
		userid: "scheduler-test-user",
		username: "Scheduler Test User"
	}
];

const existingBirthdays = hadExistingData ? JSON.parse(existingData) : [];
if (!Array.isArray(existingBirthdays)) {
	throw new Error(`${dataPath} must contain a JSON array`);
}
fs.writeFileSync(dataPath, JSON.stringify([
		...existingBirthdays.filter(({ userid }) => userid !== "scheduler-test-user"),
		...testBirthdays
], null, 2));

const testSettings = {
	enabled: true,
	destination: "channel",
	channelId: "scheduler-test-channel",
	time: currentTime,
	timezone: "UTC"
};

let resolveMessage;
let rejectMessage;
const messageSent = new Promise((resolve, reject) => {
	resolveMessage = resolve;
	rejectMessage = reject;
});

const testChannel = {
	send(message) {
		console.log("Scheduler sent:", JSON.stringify(message, null, 2));
		resolveMessage(message);
		return Promise.resolve(message);
	}
};

const testClient = {
	channels: {
		fetch(channelId) {
			console.log(`Fetched test channel ${channelId}`);
			return Promise.resolve(testChannel);
		}
	}
};

const scheduler = startScheduler(testClient, "*/5 * * * * *", () => today, () => testSettings);
const timeout = setTimeout(() => {
	rejectMessage(new Error("Scheduler did not run within 10 seconds"));
}, 10000);

try {
	console.log(`Testing scheduler for ${date}. Waiting for the next scheduled run...`);
	await messageSent;
	console.log("Scheduler test passed");
} catch (error) {
	console.error("Scheduler test failed:", error.message);
	process.exitCode = 1;
} finally {
	clearTimeout(timeout);
	scheduler.stop();

	if (hadExistingData) {
		fs.writeFileSync(dataPath, existingData);
	} else {
		fs.unlinkSync(dataPath);
	}
}