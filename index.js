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
    { id: 'messageId', title: 'MessageID' },
    { id: 'timestamp', title: 'Timestamp' },
    { id: 'author', title: 'Author' },
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

let messages = [];
let logs = [];

client.once('ready', () => {
  console.log('Bot is ready');
  loadExistingMessages();
});

function loadExistingMessages() {
  if (fs.existsSync('messages.csv')) {
    const data = fs.readFileSync('messages.csv', 'utf8');
    const rows = data.split('\n').slice(1); // Skip header
    const messageMap = new Map();

    rows.forEach(row => {
      const [messageId, timestamp, author, ...contentParts] = row.split(',');
      const content = contentParts.join(',').replace(/^"|"$/g, '');
      messageMap.set(messageId, { messageId, timestamp, author, content });
    });

    messages = Array.from(messageMap.values());
    customLog(`Loaded ${messages.length} unique messages from CSV`);
  }
}

function updateOrAddMessage(messageData) {
  const index = messages.findIndex(msg => msg.messageId === messageData.messageId);
  if (index !== -1) {
    messages[index] = messageData;
  } else {
    messages.push(messageData);
  }
}

async function updateCSV() {
  // Clear the CSV file before writing new contents
  fs.writeFileSync('messages.csv', '');

  await csvWriter.writeRecords(messages);
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
      messageId: message.id,
      timestamp: message.createdAt.toISOString(),
      author: message.author.username,
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
      messageId: newMessage.id,
      timestamp: newMessage.editedAt ? newMessage.editedAt.toISOString() : newMessage.createdAt.toISOString(),
      author: newMessage.author.username,
      content: newMessage.content,
    };

    updateOrAddMessage(messageData);
    await updateCSV();
    customLog(`${messageData.author} edited address to: ${messageData.content}`);
  }
});

client.login(process.env.DISCORD_TOKEN);
