import { addBirthday, lookup } from "../jsonmanager.js";

const [, , date, userid, authorid, username] = process.argv;

if (!date || !userid || !authorid || !username) {
	console.error("Usage: npm run test:json -- <DD-MM> <userid> <authorid> <username>");
	process.exit(1);
}

addBirthday(date, userid, [authorid], username);
console.log(JSON.stringify(lookup(date), null, 2));