import { Client, GatewayIntentBits, PermissionFlagsBits } from "discord.js";
import "dotenv/config";
import { startScheduler } from "./src/scheduler.js";
import { registerCommands } from "./src/commandregister.js";
import { addBirthday, lookup, removebirthday } from "./src/jsonmanager.js";
import {
	getSettings,
	updateSettings,
	validateTime,
	validateTimezone
} from "./src/settingsmanager.js";
import {
	createChannelPicker,
	createSettingsModal,
	createSettingsPanel
} from "./src/settingsui.js";

const client = new Client({
  intents: [
	GatewayIntentBits.Guilds,
	GatewayIntentBits.GuildMembers,
	GatewayIntentBits.GuildMessages,
	GatewayIntentBits.MessageContent
  ]
});

client.on("clientReady", () => {
	console.log(`Logged in as ${client.user.tag}`);
	registerCommands().catch((error) => {
		console.error("Could not register interaction commands:", error);
	});
	startScheduler(client);
})

client.on("messageCreate", (msg) => {
	if(msg.author.bot) return;

});

function canManageGlobalSettings(interaction) {
	return process.env.OWNER_ID === interaction.user.id
		|| Boolean(interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild));
}

client.on("interactionCreate", async (interaction) => {
	if (interaction.isStringSelectMenu() && interaction.customId.startsWith("birthday-settings-menu:")) {
		const ownerId = interaction.customId.split(":")[1];
		if (ownerId !== interaction.user.id) {
			await interaction.reply({ content: "This settings panel belongs to another user.", ephemeral: true });
			return;
		}
		if (!canManageGlobalSettings(interaction)) {
			await interaction.reply({ content: "You need the Manage Server permission to change settings.", ephemeral: true });
			return;
		}

		const action = interaction.values[0];
		const settings = getSettings();
		if (action === "channel") {
			if (!interaction.guildId) {
				await interaction.reply({ content: "Open /settings in a server to choose a channel.", ephemeral: true });
				return;
			}
			await interaction.update({
				content: "Select the channel for birthday notifications.",
				embeds: [],
				components: createChannelPicker(interaction.user.id)
			});
			return;
		}
		if (action === "time" || action === "timezone") {
			await interaction.showModal(createSettingsModal(
				action,
				interaction.user.id,
				settings[action]
			));
			return;
		}

		const updatedSettings = action === "dm"
			? updateSettings({ destination: "dm", channelId: null, enabled: true })
			: updateSettings({ enabled: !settings.enabled });
		const savedAction = action === "dm"
			? "Direct-message delivery enabled."
			: updatedSettings.enabled ? "Birthday notifications enabled." : "Birthday notifications disabled.";
		await interaction.update({
			...createSettingsPanel(updatedSettings, interaction.user.id),
			content: savedAction
		});
		return;
	}

	if (interaction.isChannelSelectMenu() && interaction.customId.startsWith("birthday-settings-channel:")) {
		const ownerId = interaction.customId.split(":")[1];
		if (ownerId !== interaction.user.id) {
			await interaction.reply({ content: "This settings panel belongs to another user.", ephemeral: true });
			return;
		}
		const channel = interaction.channels.first();
		if (!canManageGlobalSettings(interaction) || !interaction.guildId) {
			await interaction.reply({ content: "You need the Manage Server permission to change settings.", ephemeral: true });
			return;
		}
		if (!channel?.isTextBased()) {
			await interaction.reply({ content: "That channel cannot receive messages.", ephemeral: true });
			return;
		}

		const settings = updateSettings({
			destination: "channel",
			channelId: channel.id
		});
		await interaction.update({
			...createSettingsPanel(settings, interaction.user.id),
			content: "Channel delivery saved."
		});
		return;
	}

	if (interaction.isModalSubmit() && interaction.customId.startsWith("birthday-settings-modal:")) {
		const [, type, ownerId] = interaction.customId.split(":");
		if (ownerId !== interaction.user.id) {
			await interaction.reply({ content: "This settings panel belongs to another user.", ephemeral: true });
			return;
		}
		if (!canManageGlobalSettings(interaction)) {
			await interaction.reply({ content: "You need the Manage Server permission to change settings.", ephemeral: true });
			return;
		}

		try {
			const value = interaction.fields.getTextInputValue("value");
			if (type === "time") validateTime(value);
			else validateTimezone(value);
			const settings = updateSettings({ [type]: value });
			await interaction.reply({
				...createSettingsPanel(settings, interaction.user.id),
				content: `${type === "time" ? "Delivery time" : "Timezone"} saved.`,
				ephemeral: true
			});
		} catch (error) {
			await interaction.reply({ content: error.message, ephemeral: true });
		}
		return;
	}

	if (!interaction.isChatInputCommand()) return;

	if (interaction.commandName === "birthday") {
		const subcommand = interaction.options.getSubcommand();

		switch (subcommand) {
			case "add": {
				const date = interaction.options.getString("date");
				const user = interaction.options.getUser("user");
				try {
					addBirthday(date, user.id, interaction.user.id, user.username);
					interaction.reply(`Added birthday for ${user.username} on ${date}`);
				} catch (error) {
					console.error("Error adding birthday:", error);
					interaction.reply("There was an error adding the birthday.");
				}
				break;
			}
			case "remove": {
				const date = interaction.options.getString("date");
				const removeUser = interaction.options.getUser("user");
				try {
					removebirthday(date, removeUser.id);
					interaction.reply(`Removed birthday for ${removeUser.username}`);
				} catch (error) {
					console.error("Error removing birthday:", error);
					interaction.reply("There was an error removing the birthday.");
				}
				break;
			}
			case "list": {
				const date = interaction.options.getString("date");
				try {
					const birthdays = lookup(date)?.jsonObject ?? [];
					const birthdayList = birthdays.length
						? birthdays.map(({ username }) => username).join(", ")
						: "No birthdays found";
					interaction.reply(`Birthdays for ${date}: ${birthdayList}`);
				} catch (error) {
					console.error("Error listing birthdays:", error);
					interaction.reply("There was an error listing the birthdays.");
				}
				break;
			}
		}
	}

	if (interaction.commandName === "settings") {
		await interaction.reply({ ...createSettingsPanel(getSettings(), interaction.user.id), ephemeral: true });
	}
});

client.login(process.env.TOKEN);