import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { addBirthday, lookup } from "../jsonmanager.js";

const date = "test-jsonmanager";
const filePath = path.join("./src/data", `${date}.json`);
const firstBirthdayDate = "02-02";
const secondBirthdayDate = "03-03";
const firstBirthdayPath = path.join("./src/data", `${firstBirthdayDate}.json`);
const secondBirthdayPath = path.join("./src/data", `${secondBirthdayDate}.json`);

try {
	fs.rmSync(filePath, { force: true });
	fs.rmSync(firstBirthdayPath, { force: true });
	fs.rmSync(secondBirthdayPath, { force: true });

	const created = addBirthday(date, "user-1", ["author-1"], "User One");
	assert.deepStrictEqual(created.birthdays, [
		{ authorid: ["author-1"], userid: "user-1", username: "User One" }
	]);

	const updated = addBirthday(date, "user-2", ["author-2"], "User Two");
	assert.equal(updated.birthdays.length, 2);
	assert.deepStrictEqual(lookup(date), { date, jsonObject: updated.birthdays });

	addBirthday(firstBirthdayDate, "unique-user", ["author-1"], "Unique User");
	const moved = addBirthday(secondBirthdayDate, "unique-user", ["author-2"], "Unique User");
	assert.deepStrictEqual(moved.birthdays, [
		{ authorid: ["author-2"], userid: "unique-user", username: "Unique User" }
	]);
	assert.deepStrictEqual(lookup(firstBirthdayDate).jsonObject, []);

	console.log("JSON manager tests passed");
} finally {
	fs.rmSync(filePath, { force: true });
	fs.rmSync(firstBirthdayPath, { force: true });
	fs.rmSync(secondBirthdayPath, { force: true });
}