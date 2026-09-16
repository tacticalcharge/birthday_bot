import { REST, Routes, SlashCommandBuilder } from "discord.js";
import "dotenv/config";
import { fileURLToPath } from "node:url";

export const commands = [
	new SlashCommandBuilder()
		.setName("birthday")
		.setDescription("Manage birthdays")
		.addSubcommand((subcommand) => subcommand
				.setName("add")
				.setDescription("Add a birthday")
				.addStringOption((option) =>
					option.setName("date")
						.setDescription("The date of the birthday in DD-MM format")
						.setRequired(true))
				.addUserOption((option) =>
					option.setName("user")
						.setDescription("The user whose birthday is being added")
						.setRequired(true)))
		.addSubcommand((subcommand) => subcommand
				.setName("remove")
				.setDescription("Remove a birthday")
				.addStringOption((option) => option
					.setName("date")
					.setDescription("The date of the birthday in DD-MM format")
					.setRequired(true))
				.addUserOption((option) =>
					option.setName("user")
						.setDescription("The user whose birthday is being removed")
						.setRequired(true)))
		.addSubcommand((subcommand) => subcommand
				.setName("list")
				.setDescription("List all birthdays for a given date")
				.addStringOption((option) =>
					option.setName("date")
						.setDescription("The date to list birthdays for in DD-MM format")
						.setRequired(true))),
	new SlashCommandBuilder()
		.setName("settings")
		.setDescription("Configure birthday notifications")

];

export async function registerCommands() {
	if (!commands.length) {
		console.log("No interaction commands to register");
		return [];
	}

	const { TOKEN, CLIENT_ID } = process.env;

	if (!TOKEN || !CLIENT_ID) {
		throw new Error("TOKEN and CLIENT_ID must be configured");
	}

	const rest = new REST({ version: "10" }).setToken(TOKEN);
	const registeredCommands = await rest.put(
		Routes.applicationCommands(CLIENT_ID),
		{ body: commands.map((command) => command.toJSON()) }
	);

	console.log(`Registered ${registeredCommands.length} interaction command(s)`);
	return registeredCommands;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
	registerCommands().catch((error) => {
		console.error("Could not register interaction commands:", error);
		process.exitCode = 1;
	});
}
