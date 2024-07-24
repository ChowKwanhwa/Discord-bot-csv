const { Client, GatewayIntentBits, Events } = require('discord.js');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const fs = require('fs');
require('dotenv').config();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

const csvWriter = createCsvWriter({
  path: 'messages.csv',
  header: [
    { id: 'author', title: 'Author' },
    { id: 'timestamp', title: 'Timestamp' },
    { id: 'content', title: 'Content' },
  ],
});

const logCsvWriter = createCsvWriter({
  path: 'logs.csv',
  header: [
    { id: 'timestamp', title: 'Timestamp' },
    { id: 'log', title: 'Log' },
  ],
});

let messages = new Map();
let logs = [];

client.once('ready', () => {
  console.log('Bot is ready');
  loadExistingMessages();
});

function loadExistingMessages() {
  if (fs.existsSync('messages.csv')) {
    const data = fs.readFileSync('messages.csv', 'utf8');
    const rows = data.split('\n').slice(1); // Skip header

    rows.forEach(row => {
      const [author, timestamp, ...contentParts] = row.split(',');
      const content = contentParts.join(',').replace(/^"|"$/g, '');
      messages.set(author, { author, timestamp, content });
    });

    customLog(`Loaded ${messages.size} unique messages from CSV`);
  }
}

function updateOrAddMessage(messageData) {
  messages.set(messageData.author, messageData);
}

async function updateCSV() {
  // Clear the CSV file before writing new contents
  fs.writeFileSync('messages.csv', '');

  await csvWriter.writeRecords(Array.from(messages.values()));
  console.log('Updated messages.csv');
}

function customLog(message) {
  const timestamp = new Date().toISOString();
  console.log(message);
  logs.push({ timestamp, log: message });
  logCsvWriter.writeRecords(logs).catch(err => console.error('Error writing logs:', err));
}

client.on(Events.MessageCreate, async (message) => {
  if (message.channelId === process.env.CHANNEL_ID) {
    const messageData = {
      author: message.author.username,
      timestamp: message.createdAt.toISOString(),
      content: message.content,
    };

    updateOrAddMessage(messageData);
    await updateCSV();
    customLog(`${messageData.author} gives address: ${messageData.content}`);
  }
});

client.on(Events.MessageUpdate, async (oldMessage, newMessage) => {
  if (newMessage.channelId === process.env.CHANNEL_ID) {
    const messageData = {
      author: newMessage.author.username,
      timestamp: newMessage.editedAt ? newMessage.editedAt.toISOString() : newMessage.createdAt.toISOString(),
      content: newMessage.content,
    };

    updateOrAddMessage(messageData);
    await updateCSV();
    customLog(`${messageData.author} edited address to: ${messageData.content}`);
  }
});

client.login(process.env.DISCORD_TOKEN);