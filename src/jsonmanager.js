import fs from "fs";
import path from "path";

function readJSON(filePath) {
	return JSON.parse(fs.readFileSync(filePath, "utf8"));
}
function writeJSON(filePath, data) {
	fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

export function lookup(date) {
	const dataFolder = "./src/data";
	try {
		const file = `${date}.json`;
		const fullPath = path.join(dataFolder, file);

		if (path.extname(file) === ".json" && fs.existsSync(fullPath)) {
			const jsonObject = readJSON(fullPath);

			return { date, jsonObject };
		}
	} catch (err) { console.error(err); }

}

export function addBirthday(date, userid, authorid, username) {
	const dataFolder = "./src/data";
	try {
		const file = `${date}.json`;
		const fullPath = path.join(dataFolder, file);
		const birthdayFiles = fs.readdirSync(dataFolder)
			.filter((filename) => /^\d{2}-\d{2}\.json$/.test(filename));

		for (const birthdayFile of birthdayFiles) {
			const birthdayPath = path.join(dataFolder, birthdayFile);
			const existingBirthdays = readJSON(birthdayPath);
			if (!Array.isArray(existingBirthdays)) {
				throw new Error(`${birthdayFile} must contain a JSON array`);
			}

			const withoutUser = existingBirthdays.filter((birthday) => birthday.userid !== userid);
			if (withoutUser.length !== existingBirthdays.length) {
				writeJSON(birthdayPath, withoutUser);
			}
		}

		const birthdays = fs.existsSync(fullPath) ? readJSON(fullPath) : [];

		if (!Array.isArray(birthdays)) {
			throw new Error(`${file} must contain a JSON array`);
		}

		birthdays.push({ authorid, userid, username });
		writeJSON(fullPath, birthdays);

		return { date, birthdays };
	} catch (err) { console.error(err); }
}

export function removebirthday(date, userid) {
	const dataFolder = "./src/data";
	try {
		const file = `${date}.json`;
		const fullPath = path.join(dataFolder, file);
		const birthdays = fs.existsSync(fullPath) ? readJSON(fullPath) : [];
		const updatedBirthdays = birthdays.filter((b) => b.userid !== userid);
		writeJSON(fullPath, updatedBirthdays);

		return { date, birthdays: updatedBirthdays };
	} catch (err) { console.error(err); }
}