require("dotenv").config();
const mongoose = require("mongoose");
const Post = require("./models/Post");

async function main() {
  await mongoose.connect(process.env.MONGO_URI); // confirm this matches your .env var name
  const posts = await Post.find({}).lean();
  console.log(JSON.stringify(posts, null, 2));
  await mongoose.disconnect();
}

main().catch(console.error);