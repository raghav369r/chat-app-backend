import prisma from "../client/prisma.js";

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
  type Mutation {
    sendMessage(newMsg: newMessage!): Message
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
        orderBy:{
            createdAt:"asc"
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
      return msg;
    },
  },

  // sub query in get all users
};

export { resolversMsg, typeDefsMsg };
