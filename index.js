const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, PermissionsBitField } = require('discord.js');
require('dotenv').config(); // Load environment variables

// === CONFIG ===
const SUPPORT_ROLE_ID = '1307299081676263444'; // Replace with your support role ID
const TICKET_CATEGORY_ID = 'YOUR_CATEGORY_ID_HERE'; // Replace with your ticket category ID

// === CLIENT ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent, // required for message commands
    ],
});

// === READY EVENT ===
client.once(Events.ClientReady, () => {
    console.log(`Logged in as ${client.user.tag}`);
});

// === MESSAGE COMMANDS ===
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    // Simple ping command
    if (message.content.toLowerCase() === 'ping') {
        message.channel.send('Pong!');
    }

    // Simple ticket command (legacy)
    if (message.content.toLowerCase() === 'ticket') {
        message.channel.send(`🎫 ${message.author}, please use the ticket panel to open a ticket with <#${TICKET_CATEGORY_ID}>`);
    }

    // Command to send the ticket panel
    if (message.content.toLowerCase() === '!ticketpanel') {
        const panelEmbed = new EmbedBuilder()
            .setTitle('Ticket Support Panel')
            .setDescription(`Please open a ticket if there is any problem. Our <@&${SUPPORT_ROLE_ID}> will assist you promptly and effectively.\n\nPlease click the button below to open your ticket.`)
            .setColor('Blue')
            .setFooter({ text: 'React with 📩 below to create a ticket' });

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('create_ticket')
                .setLabel('📩 Create a Ticket')
                .setStyle(ButtonStyle.Primary)
        );

        await message.channel.send({ embeds: [panelEmbed], components: [row] });
    }
});

// === INTERACTION CREATE (BUTTONS) ===
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;

    const { customId, guild, user } = interaction;

    // CREATE TICKET
    if (customId === 'create_ticket') {
        const ticketChannel = await guild.channels.create({
            name: `ticket-${user.username}`,
            type: 0,
            parent: TICKET_CATEGORY_ID,
            permissionOverwrites: [
                {
                    id: guild.id,
                    deny: [PermissionsBitField.Flags.ViewChannel],
                },
                {
                    id: user.id,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
                {
                    id: SUPPORT_ROLE_ID,
                    allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages],
                },
            ],
        });

        const ticketEmbed = new EmbedBuilder()
            .setTitle('🎫 New Ticket')
            .setDescription(`Thank you for reaching out! We’ve received your ticket and will assist you as quickly as possible. Could you please provide more details?`)
            .addFields(
                { name: 'Opened by', value: `<@${user.id}>`, inline: true },
                { name: 'Claimed by', value: 'Not claimed', inline: true }
            )
            .setColor('Green')
            .setFooter({ text: 'Use the buttons below to claim or close this ticket' });

        const ticketButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Claim')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );

        await ticketChannel.send({ content: `<@&${SUPPORT_ROLE_ID}>`, embeds: [ticketEmbed], components: [ticketButtons] });
        await interaction.reply({ content: `🎫 Your ticket has been created: ${ticketChannel}`, ephemeral: true });
    }

    // CLAIM TICKET
    if (customId === 'claim_ticket') {
        const embed = EmbedBuilder.from(interaction.message.embeds[0])
            .spliceFields(1, 1, { name: 'Claimed by', value: `<@${user.id}>`, inline: true });
        await interaction.update({ embeds: [embed] });
    }

    // CLOSE TICKET
    if (customId === 'close_ticket') {
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('delete_ticket')
                .setLabel('Delete')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('❌'),
            new ButtonBuilder()
                .setCustomId('reopen_ticket')
                .setLabel('Re-open')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🔓')
        );
        await interaction.update({ components: [row], content: 'This ticket is now closed.' });
    }

    // DELETE TICKET
    if (customId === 'delete_ticket') {
        await interaction.channel.delete();
    }

    // REOPEN TICKET
    if (customId === 'reopen_ticket') {
        const embed = EmbedBuilder.from(interaction.message.embeds[0])
            .spliceFields(1, 1, { name: 'Claimed by', value: 'Not claimed', inline: true });
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('claim_ticket')
                .setLabel('Claim')
                .setStyle(ButtonStyle.Success)
                .setEmoji('✅'),
            new ButtonBuilder()
                .setCustomId('close_ticket')
                .setLabel('Close')
                .setStyle(ButtonStyle.Danger)
                .setEmoji('🔒')
        );
        await interaction.update({ embeds: [embed], components: [row], content: `<@&${SUPPORT_ROLE_ID}> Ticket reopened.` });
    }
});

// LOGIN
client.login(process.env.TOKEN);
