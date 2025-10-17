import { getChannel } from "./channelManager";
import { Message } from "amqplib";

interface ConsumeOptions {
  maxRetries?: number;
  retryDelayMs?: number;
  deadLetterQueue?: string;
}

export async function consumeFromQueue(
  queue: string,
  callback: (data: any) => Promise<void>,
  options: ConsumeOptions = {}
) {
  const { maxRetries = 3, retryDelayMs = 5000, deadLetterQueue } = options;

  const channel = await getChannel("consumer");
  await channel.assertQueue(queue, { durable: true });

  // Set up dead letter queue if specified
  if (deadLetterQueue) {
    await channel.assertQueue(deadLetterQueue, { durable: true });
  }

  channel.consume(queue, async (msg: Message | null) => {
    if (!msg) return;

    try {
      const data = JSON.parse(msg.content.toString());
      await callback(data);
      channel.ack(msg);
      console.log(`✅ Message processed successfully from ${queue}`);
    } catch (err) {
      const headers = msg.properties.headers || {};
      const currentRetryCount = (headers["x-retry-count"] as number) || 0;

      console.error(
        `❌ Error processing message from ${queue}, retry count: ${currentRetryCount}`,
        err
      );

      if (currentRetryCount < maxRetries) {
        // Exponential backoff for retries
        const delay = retryDelayMs * Math.pow(2, currentRetryCount);

        setTimeout(() => {
          channel.sendToQueue(queue, msg.content, {
            headers: {
              "x-retry-count": currentRetryCount + 1,
              "x-first-death-reason":
                headers["x-first-death-reason"] || "rejected",
            },
            persistent: true,
          });
        }, delay);

        console.log(
          `🔄 Retrying message in ${delay}ms (attempt ${
            currentRetryCount + 1
          }/${maxRetries})`
        );
      } else {
        if (deadLetterQueue) {
          // Send to dead letter queue
          channel.sendToQueue(deadLetterQueue, msg.content, {
            headers: {
              "x-retry-count": currentRetryCount,
              "x-death-reason": "max-retries-exceeded",
              "x-original-queue": queue,
            },
            persistent: true,
          });
          console.log(
            `💀 Message sent to dead letter queue: ${deadLetterQueue}`
          );
        } else {
          console.error(`🚫 Discarding message after ${maxRetries} retries.`);
        }
      }

      channel.ack(msg);
    }
  });

  console.log(`👂 Listening to queue: ${queue}`);
}
