import { getChannel } from "./channelManager";
import { sendMail } from "../utils/emails/sendMail";
import { RabbitMQQueues } from "../interfaces";

export async function startEmailConsumer() {
  const channel = await getChannel("email-consumer");
  const queue = RabbitMQQueues.EMAIL_QUEUE;
  await channel.assertQueue(queue, { durable: true });
  channel.consume(
    queue,
    async (msg) => {
      if (!msg) return;
      try {
        const parsed = JSON.parse(msg.content.toString());
        await sendMail(parsed.email, parsed.templateType, parsed.data);
        channel.ack(msg);
      } catch (err) {
        console.error("Email consumer error:", err);
        try {
          channel.nack(msg, false, false);
        } catch (e) {
          console.error("nack failed", e);
        }
      }
    },
    { noAck: false }
  );
}
