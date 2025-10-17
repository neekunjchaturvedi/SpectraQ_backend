import { getConnection, getChannel } from "./channelManager";
import { v4 as uuidv4 } from "uuid";
import { Message } from "amqplib";

interface RPCOptions {
  timeoutMs?: number;
  persistent?: boolean;
}

/**
 * RPC Request: Sends an RPC call and awaits the result via temporary queue.
 */
export const RPCRequest = async (
  queueName: string,
  payload: any,
  options: RPCOptions = {}
): Promise<any> => {
  const { timeoutMs = 8000, persistent = true } = options;
  const correlationId = uuidv4();
  const channel = await getChannel("rpc-request");

  // Creating a temporary queue for the response
  const tempQueue = await channel.assertQueue("", {
    exclusive: true,
    autoDelete: true,
  });

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      channel.deleteQueue(tempQueue.queue).catch(() => {});
      reject(
        new Error(`RPC timeout after ${timeoutMs}ms for queue: ${queueName}`)
      );
    }, timeoutMs);

    channel.consume(
      tempQueue.queue,
      (msg: Message | null) => {
        if (msg?.properties?.correlationId === correlationId) {
          clearTimeout(timeout);

          try {
            const response = JSON.parse(msg.content.toString());

            // Check if response indicates an error
            if (response.success === false) {
              reject(new Error(response.error || "RPC handler failed"));
            } else {
              resolve(response.data || response);
            }
          } catch (parseErr) {
            reject(new Error("Failed to parse RPC response"));
          }

          channel.deleteQueue(tempQueue.queue).catch(() => {});
        }
      },
      { noAck: true }
    );

    const success = channel.sendToQueue(
      queueName,
      Buffer.from(JSON.stringify(payload)),
      {
        correlationId,
        replyTo: tempQueue.queue,
        persistent,
      }
    );

    if (!success) {
      clearTimeout(timeout);
      channel.deleteQueue(tempQueue.queue).catch(() => {});
      reject(new Error("Failed to send RPC request - channel buffer full"));
    }
  });
};

/**
 * RPC Observer: Listens for incoming RPC requests and responds with data.
 */
export const RPCObserver = async (
  queueName: string,
  handler: (payload: any) => Promise<any>
) => {
  console.log(`👂 Listening to RPC queue: ${queueName}`);

  // Use getChannel instead of creating a new channel directly
  const channel = await getChannel(`rpc-observer-${queueName}`);

  await channel.assertQueue(queueName, { durable: false });
  channel.prefetch(1);

  channel.consume(
    queueName,
    async (msg: Message | null) => {
      if (!msg) return;

      let responsePayload = {};

      try {
        const data = JSON.parse(msg.content.toString());
        const result = await handler(data);
        responsePayload = {
          success: true,
          data: result,
        };
      } catch (err: any) {
        console.error(`❌ RPC Handler error for ${queueName}:`, err);
        responsePayload = {
          success: false,
          error: err.message || "RPC Handler Failed",
          type: err.name || "UnhandledError",
        };
      }

      try {
        if (msg.properties.replyTo && msg.properties.correlationId) {
          channel.sendToQueue(
            msg.properties.replyTo,
            Buffer.from(JSON.stringify(responsePayload)),
            {
              correlationId: msg.properties.correlationId,
            }
          );
        }
      } catch (sendErr) {
        console.error("[RPCObserver] Failed to send response:", sendErr);
      }

      channel.ack(msg);
    },
    { noAck: false }
  );
};
