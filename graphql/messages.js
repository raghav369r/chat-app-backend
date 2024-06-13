const { subscribe } = require("graphql");
const prisma = require("../client/prisma.js");
const { PubSub, withFilter } = require("graphql-subscriptions");

const pubsub = new PubSub();
const MSG_CREATED = "MESSAGE_CREATED";
const TYPING = "typing...";
const typeDefsMsg = `
  type Message {
    id: ID!
    message: String
    senderId: ID
    receiverId: ID
    createdAt: Date
  }
  type Query {
    showMessages:[Message]
    showSentMessages(id:ID!):[Message]
    showReceivedMessages(id:ID!):[Message]
    messagesByUser(id:ID!):[Message]
  }
  
  input newMessage {
    message: String!
    receiverId: ID!
  }
  type typing {
    istyping: Boolean!
    receiverId: ID!
    senderId:ID!
  }
  type Mutation {
    sendMessage(newMsg: newMessage!): Message
    isTyping(receiverId:ID!,istyping:Boolean!):Boolean
  }
  type Subscription {
    messageAdded(sender:ID,receiver:ID):Message
    typing(sender:ID!,receiver:ID!):typing
  }
  
`;

const resolversMsg = {
  Query: {
    showMessages: () => {
      return [{ message: "hlo", id: "2" }];
    },
    showSentMessages: async (_, { id }) => {
      const messages = await prisma.message.findMany({
        where: { senderId: parseInt(id) },
      });
      return messages;
    },
    showReceivedMessages: async (_, { id }) => {
      const messages = await prisma.message.findMany({
        where: { receiverId: parseInt(id) },
      });
      return messages;
    },
    messagesByUser: async (_, { id }, { user }) => {
      if (!user?.id) throw new Error("Missing token");
      const msgs = await prisma.message.findMany({
        orderBy: {
          createdAt: "asc",
        },
        where: {
          OR: [
            { receiverId: parseInt(user.id), senderId: parseInt(id) },
            { receiverId: parseInt(id), senderId: parseInt(user.id) },
          ],
        },
      });
      return msgs;
    },
  },

  Mutation: {
    sendMessage: async (_, { newMsg }, { user }) => {
      if (!user?.id) throw new Error("missing token!!");
      const msg = await prisma.message.create({
        data: {
          receiverId: parseInt(newMsg.receiverId),
          message: newMsg.message,
          senderId: user.id,
        },
      });
      pubsub.publish(MSG_CREATED, {
        messageAdded: msg,
      });
      return msg;
    },
    isTyping: async (_, { istyping, receiverId }, { user }) => {
      if (!user?.id) throw new Error("missing token!!");
      pubsub.publish(TYPING, {
        typing: { receiverId, istyping, senderId: user.id },
      });
      return istyping;
    },
  },
  Subscription: {
    messageAdded: {
      subscribe: withFilter(
        (_, __, { user }) => {
          if (!user) throw new Error("token missing or expired, login again");
          return pubsub.asyncIterator(MSG_CREATED);
        },
        ({ messageAdded: payload }, variables) => {
          const { sender, receiver } = variables;
          return (
            (payload.senderId == sender && payload.receiverId == receiver) ||
            (payload.senderId == receiver && payload.receiverId == sender)
          );
        }
      ),
    },
    typing: {
      // subscribe: (_, __, { user }) => {
      //   if (!user) throw new Error("token missing or expired, login again");
      //   return pubsub.asyncIterator(TYPING);
      // },
      subscribe: withFilter(
        (_, __, { user }) => {
          if (!user) throw new Error("token missing or expired, login again");
          return pubsub.asyncIterator(TYPING);
        },
        ({ typing: payload }, variables) => {
          const { receiver, sender } = variables;
          return receiver == payload.receiverId && sender == payload.senderId;
        }
      ),
    },
  },
  // sub query in get all users
};

module.exports = { resolversMsg, typeDefsMsg };
