import mongoose from "mongoose";
import { Env } from "./env.config";

const connctDatabase = async () => {
  mongoose.connection.on("disconnected", () => {
    console.warn("[MongoDB] Disconnected from Atlas. Attempting reconnection...");
  });

  mongoose.connection.on("reconnected", () => {
    console.log("[MongoDB] Reconnected to Atlas successfully.");
  });

  mongoose.connection.on("error", (err) => {
    console.error("[MongoDB] Connection error:", err.message);
  });

  try {
    await mongoose.connect(Env.MONGO_URI, {
      autoIndex: true,
      serverSelectionTimeoutMS: 15000,
      heartbeatFrequencyMS: 10000,
      socketTimeoutMS: 45000,
      connectTimeoutMS: 20000,
      retryWrites: true,
    });
    console.log("Connected to MongoDB database");
  } catch (error) {
    console.error("Error connecting to MongoDB database:", error);
    process.exit(1);
  }
};

export default connctDatabase;
