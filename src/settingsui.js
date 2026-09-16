import {
	ActionRowBuilder,
	ChannelSelectMenuBuilder,
	EmbedBuilder,
	ModalBuilder,
	StringSelectMenuBuilder,
	TextInputBuilder,
	TextInputStyle
} from "discord.js";

export function createSettingsEmbed(settings) {
	const destination = settings.destination === "dm"
		? "Direct messages"
		: settings.channelId ? `<#${settings.channelId}>` : "No channel selected";

	return new EmbedBuilder()
		.setColor(settings.enabled ? 0x2ecc71 : 0x95a5a6)
		.setAuthor({ name: "Birthday Bot | Global settings" })
		.setTitle("Notification control panel")
		.setDescription("Manage how and when birthday reminders are delivered.")
		.addFields(
			{ name: "Status", value: settings.enabled ? "Enabled" : "Disabled", inline: true },
			{ name: "Delivery", value: destination, inline: true },
			{ name: "Schedule", value: `${settings.time}\n${settings.timezone}`, inline: true }
		)
		.setFooter({ text: "Select an option below to make a change." });
}

export function createSettingsPanel(settings, userId) {
	const menu = new StringSelectMenuBuilder()
		.setCustomId(`birthday-settings-menu:${userId}`)
		.setPlaceholder("Change a setting")
		.addOptions(
			{ label: "Post birthdays in a channel", value: "channel", description: "Choose the destination channel" },
			{ label: "Send birthdays by direct message", value: "dm", description: "DM each birthday user" },
			{ label: "Set delivery time", value: "time", description: "Use 24-hour HH:mm format" },
			{ label: "Set timezone", value: "timezone", description: "Use an IANA timezone" },
			{
				label: settings.enabled ? "Disable birthday notifications" : "Enable birthday notifications",
				value: "toggle",
				description: settings.enabled ? "Stop scheduled birthday messages" : "Start scheduled birthday messages"
			}
		);

	return {
		embeds: [createSettingsEmbed(settings)],
		components: [new ActionRowBuilder().addComponents(menu)]
	};
}

export function createChannelPicker(userId) {
	const picker = new ChannelSelectMenuBuilder()
		.setCustomId(`birthday-settings-channel:${userId}`)
		.setPlaceholder("Select a text channel")
		.setMinValues(1)
		.setMaxValues(1);

	return [new ActionRowBuilder().addComponents(picker)];
}

export function createSettingsModal(type, userId, currentValue) {
	const isTime = type === "time";
	const input = new TextInputBuilder()
		.setCustomId("value")
		.setLabel(isTime ? "Daily time (HH:mm)" : "Timezone")
		.setStyle(TextInputStyle.Short)
		.setValue(currentValue)
		.setRequired(true);

	return new ModalBuilder()
		.setCustomId(`birthday-settings-modal:${type}:${userId}`)
		.setTitle(isTime ? "Set delivery time" : "Set timezone")
		.addComponents(new ActionRowBuilder().addComponents(input));
}