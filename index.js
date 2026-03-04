// index.js
// A simple Discord bot template for Railway deployment

// Import the discord.js library
const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config(); // Load .env variables

// Create a new client instance
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// When the bot is ready
client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// Listen to messages
client.on('messageCreate', (message) => {
    // Ignore messages from bots
    if (message.author.bot) return;

    // Simple ping-pong command
    if (message.content.toLowerCase() === 'ping') {
        message.channel.send('Pong!');
    }
});

// Login to Discord using the token in your .env
client.login(process.env.TOKEN);
