// modes/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true, unique: true },
});

module.exports = mongoose.model('User', userSchema);
l