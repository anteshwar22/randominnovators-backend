const mongoose = require('mongoose');
const DataVersion = require('../models/DataVersion');

// Use this helper to atomically increment the data version when mutations happen
const incrementPublicDataVersion = async () => {
  try {
    // Make sure we only execute this if we have a real DB connection
    if (mongoose.connection && mongoose.connection.readyState === 1) {
      await DataVersion.findOneAndUpdate(
        { key: 'public-data-version' },
        { $inc: { version: 1 } },
        { upsert: true, new: true }
      );
    }
  } catch (err) {
    console.error('[Version Helper] Failed to increment public data version:', err);
  }
};

module.exports = { incrementPublicDataVersion };
