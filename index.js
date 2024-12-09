const express = require('express');
const { StreamChat } = require('stream-chat');
const { v4: uuidv4 } = require('uuid');
const { Client } = require('pg');


const UserModel = require('./models/User');
const { default: mongoose } = require('mongoose');

const app = express();

const port = 3000;

const apiKey = 'hnut54rtgksj'; // Replace with your actual API key
const apiSecret = 'nr5pc64bjjdn6cbkycwdpv3qye9fsef54puhv7jjm3wqzhxk2fdurfhrsyb4gadx'; // Replace with your actual API secret

const chatClient = StreamChat.getInstance(apiKey, apiSecret);
const client = new Client({
	user: 'becalio_user',
	password: 'JRJGSehPp7I9MAqcAVP59BFOKRkcDM75',
	host: 'dpg-ctbdbphu0jms73f7psm0-a',
	port: 5432,
	database: 'becalio',
});
client
	.connect()
	.then(() => {
		console.log('Connected to PostgreSQL database');
	})
	.catch((err) => {
		console.error('Error connecting to PostgreSQL database', err);
	});
app.use(express.json());



// Endpoint to create a user and generate a chat token
app.post('/create-user', async (req, res) => {
    try {
      const { email, password, mobile } = req.body;
  
      // Validate request body
      if (!email || !password || !mobile) {
        return res.status(400).json({ error: 'Email, Password, and Mobile are required' });
      }
  
      // Verify database connection is active
      if (mongoose.connection.readyState !== 1) {
        throw new Error('Database is not connected');
      }
  
      // Check if a user with the same mobile exists
      let user = await UserModel.findOne({ mobile });
  
      let userId;
      if (user) {
        userId = user.userId;
      } else {
        userId = uuidv4().slice(0, 50);
  
        user = new UserModel({
          userId,
          email,
          mobile,
        });
        await user.save();
      }
  
      // Create user in Stream Chat
      await chatClient.upsertUser({
        id: userId,
        name: `User-${userId}`,
        email,
        role: 'user',
        phone: mobile,
      });
  
      const chatToken = chatClient.createToken(userId);
  
      res.json({ success: true, userId, email, chatToken });
    } catch (error) {
      console.error('Error creating user:', error);
      res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
  });
  
// Endpoint to fetch userId by phone number
app.get('/fetch-user-by-phone/:phone', async (req, res) => {
    try {
        let { phone } = req.params;

        // Nettoyer le numéro de téléphone en supprimant les espaces et les caractères non numériques
        phone = phone.replace(/\s+/g, '').replace(/\D/g, '');

        if (!phone) {
            return res.status(400).json({ error: 'Phone number is required' });
        }

        // Query users by phone number
        const result = await chatClient.queryUsers({ phone });

        // Check if any user matches the phone number
        if (result.users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Return the userId of the first matching user
        const user = result.users[0];
        res.json({ success: true, userId: user.id, name: user.name });
    } catch (error) {
        console.error('Error fetching user by phone:', error);
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
            channel = chatClient.channel('messaging', distinctChannelId.slice(0, 64), { // Truncate channelId to fit 64 chars
                members,
                created_by_id: members[0], // Use the first member as the creator
            });
        } else {
            // Group/public channel
            const channelId = `channel_${Math.floor(10000 + Math.random() * 90000)}`;
            channel = chatClient.channel('messaging', channelId.slice(0, 64), { // Truncate to 64 chars
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

// retourne listeChannel de l'utilisateur
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
        const channelDetails = await Promise.all(
            userChannels.map(async (channel) => {
                // Get members as an array and enrich with phone numbers
                const members = await Promise.all(
                    Object.values(channel.state.members).map(async (member) => {
                        // Fetch the user details to include the phone number
                        const userDetails = await chatClient.queryUsers({ id: member.user.id });

                        // Extract phone and other details from the first user
                        const user = userDetails.users[0];
                        return {
                            userId: user.id,
                            name: user.name,
                            phone: user.phone || null,
                           
                        };
                    })
                );

                return {
                    id: channel.id,
                    name: channel.data.name,
                    image: channel.data.image || null, // Optional channel image
                    lastMessage: channel.state.messages?.[channel.state.messages.length - 1]?.text || '',
                    members: members, // Members now include phone numbers
                };
            })
        );

        res.json({ success: true, channels: channelDetails });
    } catch (error) {
        console.error('Error fetching user channels:', error);
        res.status(500).json({ error: `Internal Server Error: ${error.message}` });
    }
});

// Endpoint to delete a channel
app.delete('/delete-channel', async (req, res) => {
    try {
        const { channelId } = req.body;

        // Validate inputs
        if (!channelId) {
            return res.status(400).json({ error: 'Channel ID is required' });
        }

        // Get the channel
        const channel = chatClient.channel('messaging', channelId);

        // Delete the channel
        await channel.delete();

        res.json({ success: true, message: `Channel ${channelId} deleted` });
    } catch (error) {
        console.error('Error deleting channel:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
});




app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});
