import fs from "node:fs";
import path from "node:path";

const settingsPath = path.resolve("src", "data", "settings.json");

export const defaultSettings = {
	enabled: false,
	destination: "channel",
	channelId: null,
	time: "12:00",
	timezone: "UTC"
};

function readSettings() {
	if (!fs.existsSync(settingsPath)) return { ...defaultSettings };
	const storedSettings = JSON.parse(fs.readFileSync(settingsPath, "utf8"));
	if (typeof storedSettings.enabled === "boolean") {
		return { ...defaultSettings, ...storedSettings };
	}

	const legacySettings = Object.values(storedSettings)[0];
	return { ...defaultSettings, ...(legacySettings ?? {}) };
}

function writeSettings(settings) {
	fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
}

export function getSettings() {
	return readSettings();
}

export function getAllSettings() {
	return { global: getSettings() };
}

export function updateSettings(updates) {
	const settings = { ...readSettings(), ...updates };
	writeSettings(settings);
	return settings;
}

export function validateTime(time) {
	if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
		throw new Error("Time must use 24-hour HH:mm format, for example 18:30");
	}
}

export function validateTimezone(timezone) {
	try {
		new Intl.DateTimeFormat("en-US", { timeZone: timezone }).format();
	} catch {
		throw new Error(`Unknown timezone: ${timezone}`);
	}
}