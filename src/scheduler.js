import cron from "node-cron";
import { EmbedBuilder } from "discord.js";
import { lookup } from "./jsonmanager.js";
import { getSettings } from "./settingsmanager.js";

function getTodayDate() {
	const today = new Date();
	const day = String(today.getDate()).padStart(2, "0");
	const month = String(today.getMonth() + 1).padStart(2, "0");

	return `${day}-${month}`;
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
	const names = birthdays.map(({ username }) => username);
	const nameList = names.length > 1
		? `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`
		: names[0];
	const userList = birthdays
		.map(({ username, userid }) => `- ${username} (<@${userid}>)`)
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
	if (!settings.enabled) return 0;

	const localDateTime = getLocalDateTime(settings.timezone, date);
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
			const author = await client.users.fetch(authorId);
			await author.send(message);
		}
	} else {
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

export function runBirthdayJob(date = getTodayDate(), channel) {
	const birthdays = lookup(date);

	console.log(`Running birthday lookup for ${date}:`, birthdays);

	if (!birthdays?.jsonObject?.length || !channel) {
		return birthdays;
	}

	const users = birthdays.jsonObject;
	const authorIds = [...new Set(users.flatMap(({ authorid }) =>
		Array.isArray(authorid) ? authorid : [authorid]
	).filter(Boolean))];
	const mentions = authorIds.map((authorId) => `<@${authorId}>`).join(" ");
	const userList = users
		.map(({ username, userid }) => `- ${username} (<@${userid}>)`)
		.join("\n");

	channel.send({
		content: mentions || undefined,
		embeds: [new EmbedBuilder()
			.setColor(0xf1c40f)
			.setAuthor({ name: "Birthday reminder" })
			.setTitle("Birthdays today")
			.setDescription(userList)
			.setFooter({ text: "Birthday Bot" })
			.setTimestamp()]
	}).catch((err) => console.error("Could not send birthday message:", err));

	return birthdays;
}
