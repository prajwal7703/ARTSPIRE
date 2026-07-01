require("dotenv").config();
const mongoose = require("mongoose");
const Post = require("./models/Post");

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  const result = await Post.deleteMany({ mediaUrl: { $exists: false } });
  console.log(`Deleted ${result.deletedCount} legacy post(s)`);
  await mongoose.disconnect();
}

main().catch(console.error);
