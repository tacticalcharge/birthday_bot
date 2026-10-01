import cron from "node-cron";
import { EmbedBuilder } from "discord.js";
import { lookup } from "./jsonmanager.js";
import { getSettings } from "./settingsmanager.js";

// FIXED: Generates an accurate target date string matching a specific time zone layout
function getTodayDate(timezone = "UTC") {
	const today = new Date();
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: timezone,
		day: "2-digit",
		month: "2-digit"
	}).formatToParts(today);
	
	const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
	return `${values.day}-${values.month}`;
}

function getLocalDateTime(timezone, date = new Date()) {
	const parts = new Intl.DateTimeFormat("en-GB", {
		timeZone: timezone,
		day: "2-digit",
		month: "2-digit",
		hour: "2-digit",
		minute: "2-digit",
		hourCycle: "h23"
	}).formatToParts(date);
	const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

	return {
		date: `${values.day}-${values.month}`,
		time: `${values.hour}:${values.minute}`
	};
}

function createBirthdayEmbed(birthdays) {
	const names = birthdays.map(({ username }) => username || "Unknown User");
	const nameList = names.length > 1
		? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
		: names[0];
	const userList = birthdays
		.map(({ username, userid }) => `- ${username || "Unknown"} (<@${userid}>)`)
		.join("\n");

	return new EmbedBuilder()
		.setColor(0xf1c40f)
		.setAuthor({ name: "Birthday reminder" })
		.setTitle("Birthdays today")
		.setDescription(`It's ${nameList}'s birthday(s) today.`)
		.addFields({ name: "Today's users", value: userList.slice(0, 1024) })
		.setFooter({ text: "Birthday Bot" })
		.setTimestamp();
}

export async function sendBirthdayNotifications(client, settings, date = new Date(), birthdaysOverride) {
	if (!settings?.enabled) return 0;

	// Use configured time zone to calculate the true localized timestamp window
	const localDateTime = getLocalDateTime(settings.timezone || "UTC", date);
	if (localDateTime.time !== settings.time) return 0;

	const birthdays = birthdaysOverride ?? lookup(localDateTime.date)?.jsonObject ?? [];
	if (!birthdays.length) return 0;

	let destination;
	if (settings.destination === "channel") {
		if (!settings.channelId) return 0;
		destination = await client.channels.fetch(settings.channelId);
	}

	const authorIds = [...new Set(birthdays.flatMap(({ authorid }) =>
		(Array.isArray(authorid) ? authorid : [authorid]).filter(Boolean)
	))];
	const message = { embeds: [createBirthdayEmbed(birthdays)] };

	if (settings.destination === "dm") {
		for (const authorId of authorIds) {
			try {
				const author = await client.users.fetch(authorId);
				await author.send(message);
			} catch (err) {
				console.error(`Could not send DM to user ${authorId}:`, err);
			}
		}
	} else if (destination) {
		await destination.send({
			content: authorIds.map((authorId) => `<@${authorId}>`).join(" ") || undefined,
			embeds: message.embeds
		});
	}

	return birthdays.length;
}

export function startScheduler(
	client,
	schedule = "* * * * *",
	nowProvider = () => new Date(),
	settingsProvider = getSettings
) {
	return cron.schedule(schedule, async () => {
		try {
			const sent = await sendBirthdayNotifications(client, settingsProvider(), nowProvider());
			if (sent) console.log(`Sent ${sent} birthday notification(s)`);
		} catch (error) {
			console.error("Could not send birthday notifications:", error);
		}
	});
}

// FIXED: No longer hard-coded to server host date. Reads settings to verify correct time zone calendar date.
export function runBirthdayJob(date, channel) {
	const settings = getSettings();
	const targetedDate = date ?? getTodayDate(settings?.timezone || "UTC");
	const birthdays = lookup(targetedDate);

	console.log(`Running manual birthday lookup for ${targetedDate}:`, birthdays);

	if (!birthdays?.jsonObject?.length || !channel) {
		return birthdays;
	}

	const users = birthdays.jsonObject;
	const authorIds = [...new Set(users.flatMap(({ authorid }) =>
		Array.isArray(authorid) ? authorid : [authorid]
	).filter(Boolean))];
	
	const mentions = authorIds.map((authorId) => `<@${authorId}>`).join(" ");

	channel.send({
		content: mentions || undefined,
		embeds: [createBirthdayEmbed(users)]
	}).catch((err) => console.error("Could not send birthday message:", err));

	return birthdays;
}
