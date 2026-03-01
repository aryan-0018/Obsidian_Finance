import mongoose from "mongoose";
import { Env } from "./env.config";

const connctDatabase = async () => {
  try {
    await mongoose.connect(Env.MONGO_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 8000,
    });
    console.log("Connected to MongoDB database");
  } catch (error) {
    console.error("Error connecting to MongoDB database:", error);
    process.exit(1);
  }
};

export default connctDatabase;
