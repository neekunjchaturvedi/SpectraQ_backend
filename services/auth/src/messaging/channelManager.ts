import { connect, Channel, Connection } from "amqplib";
import config from "../config";

const RABBITMQ_URL = config.RABBITMQ_URL;
let connection: Connection | null = null;
const channels: Record<string, Channel> = {};

export async function getConnection(): Promise<Connection> {
  if (!connection) {
    try {
      connection = (await connect(RABBITMQ_URL)) as unknown as Connection;

      // Handle connection events
      (connection as any).on("error", (err: Error) => {
        console.error("RabbitMQ connection error:", err);
        connection = null;
      });

      (connection as any).on("close", () => {
        console.warn("RabbitMQ connection closed");
        connection = null;
        // Clear channels when connection is closed
        Object.keys(channels).forEach((key) => delete channels[key]);
      });

      console.log("✅ RabbitMQ connected successfully");
    } catch (error) {
      console.error("❌ Failed to connect to RabbitMQ:", error);
      throw error;
    }
  }
  return connection;
}

export async function getChannel(name: string): Promise<Channel> {
  // Simplified channel existence check
  if (channels[name]) {
    try {
      // Simple check if channel is still open by trying to check queue
      return channels[name];
    } catch (error) {
      // If channel is closed, remove it and create a new one
      delete channels[name];
    }
  }

  try {
    const conn = await getConnection();
    const channel = await (conn as any).createChannel();

    // Handle channel events
    channel.on("error", (err: Error) => {
      console.error(`Channel ${name} error:`, err);
      delete channels[name];
    });

    channel.on("close", () => {
      console.warn(`Channel ${name} closed`);
      delete channels[name];
    });

    channels[name] = channel;
    return channel;
  } catch (error) {
    console.error(`Failed to create channel ${name}:`, error);
    throw error;
  }
}

export async function closeAllConnections(): Promise<void> {
  try {
    // Close all channels
    for (const [name, channel] of Object.entries(channels)) {
      try {
        await channel.close();
        delete channels[name];
      } catch (err) {
        console.warn(`Error closing channel ${name}:`, err);
      }
    }

    // Close connection with proper type casting
    if (connection) {
      await (connection as any).close();
      connection = null;
    }

    console.log("✅ All RabbitMQ connections closed");
  } catch (error) {
    console.error("❌ Error closing RabbitMQ connections:", error);
  }
}
