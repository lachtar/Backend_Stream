const express = require('express');
const { StreamChat } = require('stream-chat');
const { v4: uuidv4 } = require('uuid');

const app = express();
const port = 3000;

const apiKey = 'hnut54rtgksj'; // Replace with your actual API key
const apiSecret = 'nr5pc64bjjdn6cbkycwdpv3qye9fsef54puhv7jjm3wqzhxk2fdurfhrsyb4gadx'; // Replace with your actual API secret

const chatClient = StreamChat.getInstance(apiKey, apiSecret);

app.use(express.json());

// Endpoint to create a user and generate a chat token

app.post('/create-user', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate request body
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and Password are required' });
        }

        // Generate a unique user ID (and ensure it fits within the 64 character limit)
        let userId = uuidv4();

        // Truncate userId to fit Stream Chat's 64-character limit (if needed)
        userId = userId.slice(0, 50); // Ensure it does not exceed 64 characters

        // Create a user in Stream Chat
        await chatClient.upsertUser({
            id: userId, // Use the valid user ID
            name: `User-${userId}`,
            email,
            role: 'user',
        });

        // Generate a chat token for the user
        const chatToken = chatClient.createToken(userId);

        res.json({ success: true, userId, email, chatToken });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
});





// Endpoint to create a chat channel
app.post('/create-channel', async (req, res) => {
    try {
        const { channelName, userId, members } = req.body;

        // Validate inputs
        if (!members && (!userId || !channelName)) {
            return res.status(400).json({ 
                error: 'Provide either members for a private channel or userId and channelName for a group channel' 
            });
        }

        let channel;

        if (members) {
            // Private channel (distinct channel)
            const distinctChannelId = `distinct_${members.sort().join('_')}`;
            channel = chatClient.channel('messaging', distinctChannelId, {
                members,
                created_by_id: members[0], // Use the first member as the creator
            });
        } else {
            // Group/public channel
            const channelId = `channel_${Math.floor(10000 + Math.random() * 90000)}`;
            channel = chatClient.channel('messaging', channelId, {
                name: channelName,
                created_by_id: userId, // Specify the creator
                members: [userId], // Start with the creator as a member
            });
        }

        // Create the channel
        await channel.create();

        // Query the channel state to get the members
        const channelState = await channel.query();

        res.json({ 
            success: true,
            channelId: channel.id,
            name: channelName || 'Distinct Channel',
            members: Object.keys(channelState.members).map(memberId => memberId),
        });
    } catch (error) {
        console.error('Error creating channel:', error); // Log the full error
        res.status(500).json({ error: `Internal Server Error: ${error.message}` }); // Send error message to the client
    }
});




// Endpoint to dynamically add members to a group channel
app.post('/add-members', async (req, res) => {
    try {
        const { channelId, userIds } = req.body;

        // Validate inputs
        if (!channelId || !userIds || userIds.length === 0) {
            return res.status(400).json({ error: 'Channel ID and user IDs are required' });
        }

        // Add the members to the channel
        const channel = chatClient.channel('messaging', channelId);
        await channel.addMembers(userIds);

        res.json({ success: true, message: `Users ${userIds.join(', ')} added to channel ${channelId}` });
    } catch (error) {
        console.error('Error adding members:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

// Endpoint to fetch all members of a channel
app.get('/channel-members/:channelId', async (req, res) => {
    try {
        const { channelId } = req.params;

        if (!channelId) {
            return res.status(400).json({ error: 'Channel ID is required' });
        }

        // Query the channel and get its members
        const channel = chatClient.channel('messaging', channelId);
        const members = Object.values(channel.state.members).map((member) => ({
            userId: member.user.id,
            name: member.user.name,
            role: member.role,
        }));

        res.json({ success: true, members });
    } catch (error) {
        console.error('Error fetching channel members:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});

app.get('/user-channels/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }

        // Query all channels where the user is a member
        const userChannels = await chatClient.queryChannels({
            members: { $in: [userId] }, // Channels where the user is a member
        });

        // Format the channel data
        const channelDetails = userChannels.map((channel) => ({
            id: channel.id,
            name: channel.data.name,
            image: channel.data.image || null, // Optional channel image
            lastMessage: channel.state.messages?.[channel.state.messages.length - 1]?.text || '',
            members: channel.state.members.map((member) => ({
                userId: member.user.id,
                name: member.user.name,
            })),
        }));

        res.json({ success: true, channels: channelDetails });
    } catch (error) {
        console.error('Error fetching user channels:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});


app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
