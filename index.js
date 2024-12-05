const express = require('express');
const { StreamClient } = require('@stream-io/node-sdk');
const { v4: uuidv4 } = require('uuid');
const { StreamChat } = require('stream-chat');

const app = express();
const port = 3000;

const apiKey = 'hnut54rtgksj'; // Replace with your actual API key
const apiSecret = 'nr5pc64bjjdn6cbkycwdpv3qye9fsef54puhv7jjm3wqzhxk2fdurfhrsyb4gadx'; // Replace with your actual API secret

const client = new StreamClient(apiKey, apiSecret, { timeout: 3000 });
const chatClient = StreamChat.getInstance(apiKey, apiSecret);

app.use(express.json());

let channels = []; // In-memory storage for created channels

// Endpoint to generate a user token
app.post('/generateUserToken', (req, res) => {
    try {
        const userId = uuidv4();
        const token = chatClient.createToken(userId);
        res.json({ userId, token });
    } catch (error) {
        console.error('Error generating user token:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to create a channel and store it
app.post('/createChannel', async (req, res) => {
    try {
        const { name, members } = req.body;
        if (!name || !members || members.length === 0) {
            return res.status(400).json({ error: 'Channel name and members are required' });
        }

        const channel = chatClient.channel('messaging', uuidv4(), {
            name,
            members,
        });

        await channel.create();

        // Store the channel details
        channels.push({ id: channel.id, name, members });

        res.json({ success: true, channelId: channel.id });
    } catch (error) {
        console.error('Error creating channel:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to display all created channels
app.get('/channels', (req, res) => {
    res.json(channels);
});

// Endpoint to join a channel for chatting
app.post('/joinChannel', async (req, res) => {
    try {
        const { channelId, userId } = req.body;
        if (!channelId || !userId) {
            return res.status(400).json({ error: 'Channel ID and User ID are required' });
        }

        const channel = chatClient.channel('messaging', channelId);
        await channel.addMembers([userId]);

        res.json({ success: true, message: `User ${userId} joined channel ${channelId}` });
    } catch (error) {
        console.error('Error joining channel:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to delete a channel
app.delete('/deleteChannel', async (req, res) => {
    try {
        const { channelId } = req.body;
        if (!channelId) {
            return res.status(400).json({ error: 'Channel ID is required' });
        }

        const channel = chatClient.channel('messaging', channelId);
        await channel.delete();

        // Remove the channel from in-memory storage
        channels = channels.filter((ch) => ch.id !== channelId);

        res.json({ success: true, message: `Channel ${channelId} deleted successfully` });
    } catch (error) {
        console.error('Error deleting channel:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
