// index.js
const { Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events, PermissionsBitField, REST, Routes, SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

// === CONFIG ===
const SUPPORT_ROLE_ID = '1307299081676263444'; // Support role ID
const TICKET_CATEGORY_ID = 'YOUR_CATEGORY_ID_HERE'; // Ticket category ID
const OWNER_ID = 'YOUR_DISCORD_USER_ID'; // Your Discord ID for /status

// === CLIENT ===
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// === READY EVENT & REGISTER GUILD SLASH COMMANDS ===
client.once(Events.ClientReady, async () => {
    console.log(`Logged in as ${client.user.tag}`);

    const commands = [
        new SlashCommandBuilder()
            .setName('sendpanel')
            .setDescription('Send the ticket panel in a specific channel')
            .addChannelOption(option =>
                option.setName('channel')
                    .setDescription('Channel to send the ticket panel')
                    .setRequired(true)
            ),
        new SlashCommandBuilder()
            .setName('status')
            .setDescription('Change bot status (owner only)')
            .addStringOption(option =>
                option.setName('type')
                    .setDescription('Status type: playing, watching, listening, streaming')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option.setName('text')
                    .setDescription('Status text')
                    .setRequired(true)
            )
    ].map(cmd => cmd.toJSON());

    const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

    try {
        await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands }
        );
        console.log('✅ Slash commands registered!');
    } catch (error) {
        console.error('Error registering commands:', error);
    }
});

// === MESSAGE COMMANDS ===
client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    if (message.content.toLowerCase() === 'ping') {
        message.channel.send('Pong!');
    }

    if (message.content.toLowerCase() === 'ticket') {
        message.channel.send(`🎫 ${message.author}, please use the ticket panel to open a ticket.`);
    }
});

// === SLASH COMMAND HANDLER ===
client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isChatInputCommand()) {
        const { commandName } = interaction;

        if (commandName === 'sendpanel') {
            try {
                const channel = interaction.options.getChannel('channel');

                if (!channel.permissionsFor(interaction.guild.members.me).has(PermissionsBitField.Flags.SendMessages)) {
                    return interaction.reply({ content: '❌ I do not have permission to send messages in that channel.', ephemeral: true });
                }

                const panelEmbed = new EmbedBuilder()
                    .setTitle('Ticket Support Panel')
                    .setDescription(`Please open a ticket if there is any problem. Our <@&${SUPPORT_ROLE_ID}> will assist you promptly and effectively.\n\nClick the button below to open your ticket.`)
                    .setColor('Blue')
                    .setFooter({ text: 'Click 📩 to create a ticket' });

                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId('create_ticket')
                        .setLabel('📩 Create a Ticket')
                        .setStyle(ButtonStyle.Primary)
                );

                await channel.send({ embeds: [panelEmbed], components: [row] });
                await interaction.reply({ content: `✅ Ticket panel sent in ${channel}`, ephemeral: true });
            } catch (error) {
                console.error(error);
                await interaction.reply({ content: '❌ Failed to send ticket panel.', ephemeral: true });
            }
        }

        if (commandName === 'status') {
            if (interaction.user.id !== OWNER_ID) return interaction.reply({ content: '❌ Only the bot owner can change status.', ephemeral: true });

            const type = interaction.options.getString('type').toLowerCase();
            const text = interaction.options.getString('text');

            let activityType;
            switch (type) {
                case 'playing': activityType = 0; break;
                case 'streaming': activityType = 1; break;
                case 'listening': activityType = 2; break;
                case 'watching': activityType = 3; break;
                default: return interaction.reply({ content: '❌ Invalid status type.', ephemeral: true });
            }

            client.user.setActivity(text, { type: activityType });
            await interaction.reply({ content: `✅ Status updated to **${type} ${text}**`, ephemeral: true });
        }
    }
});

// === BUTTON HANDLER ===
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isButton()) return;
    const { customId, guild, user } = interaction;

    // === CREATE TICKET ===
    if (customId === 'create_ticket') {
        try {
            await interaction.deferReply({ ephemeral: true });

            // Permission check
            const botMember = guild.members.me;
            if (!botMember.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
                return await interaction.editReply('❌ I need Manage Channels permission to create tickets.');
            }

            // Check category
            const category = guild.channels.cache.get(TICKET_CATEGORY_ID);
            if (!category || category.type !== 4) { // 4 = category
                return await interaction.editReply('❌ Invalid ticket category ID.');
            }

            // Create ticket channel
            const ticketChannel = await guild.channels.create({
                name: `ticket-${user.username}`,
                type: 0,
                parent: TICKET_CATEGORY_ID,
                permissionOverwrites: [
                    { id: guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
                    { id: user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                    { id: SUPPORT_ROLE_ID, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
                ],
            });

            const ticketEmbed = new EmbedBuilder()
                .setTitle('🎫 New Ticket')
                .setDescription('Thank you for reaching out! We’ve received your ticket and will assist you as quickly as possible. Please provide more details.')
                .addFields(
                    { name: 'Opened by', value: `<@${user.id}>`, inline: true },
                    { name: 'Claimed by', value: 'Not claimed', inline: true }
                )
                .setColor('Green')
                .setFooter({ text: 'Use the buttons below to claim or close this ticket' });

            const ticketButtons = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );

            await ticketChannel.send({ content: `<@&${SUPPORT_ROLE_ID}>`, embeds: [ticketEmbed], components: [ticketButtons] });
            await interaction.editReply({ content: `🎫 Your ticket has been created: ${ticketChannel}` });

        } catch (error) {
            console.error(error);
            if (interaction.deferred || interaction.replied) {
                await interaction.editReply('❌ Failed to create ticket. Check bot permissions and category ID.');
            } else {
                await interaction.reply({ content: '❌ Failed to create ticket.', ephemeral: true });
            }
        }
    }

    // === CLAIM TICKET ===
    if (customId === 'claim_ticket') {
        try {
            await interaction.deferUpdate();
            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .spliceFields(1, 1, { name: 'Claimed by', value: `<@${user.id}>`, inline: true });
            await interaction.message.edit({ embeds: [embed] });
        } catch (error) { console.error(error); }
    }

    // === CLOSE TICKET ===
    if (customId === 'close_ticket') {
        try {
            await interaction.deferUpdate();
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('delete_ticket').setLabel('Delete').setStyle(ButtonStyle.Danger).setEmoji('❌'),
                new ButtonBuilder().setCustomId('reopen_ticket').setLabel('Re-open').setStyle(ButtonStyle.Secondary).setEmoji('🔓')
            );
            await interaction.message.edit({ components: [row], content: 'This ticket is now closed.' });
        } catch (error) { console.error(error); }
    }

    // === DELETE TICKET ===
    if (customId === 'delete_ticket') {
        try {
            await interaction.deferUpdate();
            await interaction.channel.delete();
        } catch (error) { console.error(error); }
    }

    // === REOPEN TICKET ===
    if (customId === 'reopen_ticket') {
        try {
            await interaction.deferUpdate();
            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .spliceFields(1, 1, { name: 'Claimed by', value: 'Not claimed', inline: true });
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId('claim_ticket').setLabel('Claim').setStyle(ButtonStyle.Success).setEmoji('✅'),
                new ButtonBuilder().setCustomId('close_ticket').setLabel('Close').setStyle(ButtonStyle.Danger).setEmoji('🔒')
            );
            await interaction.message.edit({ embeds: [embed], components: [row], content: `<@&${SUPPORT_ROLE_ID}> Ticket reopened.` });
        } catch (error) { console.error(error); }
    }
});

// === LOGIN ===
client.login(process.env.TOKEN);
