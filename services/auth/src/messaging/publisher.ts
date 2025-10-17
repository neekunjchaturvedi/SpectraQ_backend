import { getChannel } from "./channelManager";

export async function publishToQueue(queue: string, message: any) {
  const channel = await getChannel("publisher");
  await channel.assertQueue(queue, { durable: true });

  channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
    persistent: true,
  });
}
