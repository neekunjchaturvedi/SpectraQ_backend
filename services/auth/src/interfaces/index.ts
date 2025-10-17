// RPC Related Data
export enum RPCPayloadTypes {
  NEW_USER = "NEW_USER",
}
export enum RabbitMQQueues {
  AUTH_QUEUE = "AUTH_QUEUE",
  EMAIL_QUEUE = "EMAIL_QUEUE",
}
export type AuthServiceRPCPayload = {
  type: RPCPayloadTypes;
  data: any;
};
