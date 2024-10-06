const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const prisma = require("../client/prisma.js");
const { gql } = require("apollo-server-express");
const { signedUrl } = require("../services/s3.js");
const typeDefsUser = gql`
  scalar Date

  type User {
    id: ID!
    firstName: String
    lastName: String
    email: String
    createdAt: Date
    about: String
    profileURL: String
  }
  type Group {
    id: ID!
    firstName: String
    lastName: String
    createdBy: ID!
    createdAt: Date
    about: String
    profileURL: String
  }
  type Token {
    token: String
  }
  type UserInt {
    users: [User]
    groups: [Group]
  }
  type Message {
    id: ID!
    message: String
    senderId: ID
    receiverId: ID
    createdAt: Date
  }
  type UserWithMessages {
    id: ID!
    firstName: String
    lastName: String
    email: String
    createdAt: Date
    about: String
    profileURL: String
  }
  type interaction {
    userId: ID
    isGroup: Boolean
    contactId: ID
    lastInteracted: Date
    lastReadMessage: ID
    unReadMessages: Int
    typing: Boolean
    user: User
    chat: [Message]
  }
  type userEmails {
    email: String
    id: ID
  }
  type Query {
    getAllUsers: [User]
    getUser(id: ID!): User
    signInUser(user: signIn): Token
    getAllInt: UserInt
    getAllInteractions: [interaction]
    Chat: [Message]
    searchUsers(userName: String!): [userEmails]
    getIntraction(id: ID!): interaction
  }

  input NewUser {
    firstName: String!
    lastName: String!
    email: String!
    password: String!
  }

  input signIn {
    email: String
    password: String
  }
  type About {
    about: String
  }
  type Name {
    name: String
  }
  input interactionInput {
    contactId: ID!
    isGroup: Boolean!
  }
  type Mutation {
    registerUser(newUser: NewUser!): Token
    updateAbout(about: String): About
    updateName(name: String): Name
    updateNameNAbout(name: String, about: String): User
    addInteraction(newInt: interactionInput!): interaction
  }
`;

const resolversUser = {
  Query: {
    getIntraction: async (_, { id }, { user }) => {
      if (!user)
        throw new Error("missing or expired token, Login and try again!!");
      const res = prisma.userInteractions.findFirst({
        where: {
          userId: parseInt(user.id),
          contactId: parseInt(id),
          isGroup: false,
        },
      });
      return res;
    },
    getAllUsers: async (_, __, { user }) => {
      const users = await prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
        where: { id: { not: user?.id } },
      });
      return users;
    },
    searchUsers: async (_, { userName }, {}) => {
      const emails = await prisma.user.findMany({
        where: { email: { contains: userName } },
        select: { email: true, id: true },
      });
      return emails;
    },
    getAllInteractions: async (_, __, { user }) => {
      if (!user)
        throw new Error("missing or expired token, Login and try again!!");
      const interactions = await prisma.userInteractions.findMany({
        where: { userId: user.id },
        orderBy: { lastInteracted: "desc" },
      });
      return interactions;
    },
    Chat: async (_, __, { user }) => {
      console.log("in Chat");
      return [];
    },
    getUser: async (_, { id }) => {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
      });
      if (user) return userNsignedurl(user);
      throw new Error("No user found With Given ID");
    },
    signInUser: async (_, { user }) => {
      const userinfo = await prisma.user.findUnique({
        where: { email: user.email },
      });
      if (!userinfo) throw new Error("no user Exist with email!!");
      const match = await bcrypt.compare(user.password, userinfo.password);
      if (!match) throw new Error("Incorrect password!!");
      const token = await jwt.sign(
        {
          id: userinfo.id,
          email: userinfo.email,
          name: userinfo.firstName,
        },
        process.env.JWT_KEY
      );
      return { token };
    },
  },

  Mutation: {
    addInteraction: async (_, { newInt }, { user }) => {
      const res = await prisma.userInteractions.create({
        data: {
          contactId: parseInt(newInt.contactId),
          isGroup: newInt.isGroup,
          userId: parseInt(user.id),
          lastReadMessage: 0,
        },
      });
      const ex = await prisma.userInteractions.findFirst({
        where: {
          isGroup: newInt.isGroup,
          userId: parseInt(newInt.contactId),
          contactId: parseInt(user.id),
        },
      });
      if (!ex) {
        const newi = await prisma.userInteractions.create({
          data: {
            contactId: user.id,
            isGroup: newInt.isGroup,
            userId: parseInt(newInt.contactId),
            lastReadMessage: 0,
          },
        });
      }
      return res;
    },
    updateAbout: async (_, { about }, { user }) => {
      if (!user)
        throw new Error("missing or expired token, Login and try again!!");
      const res = await prisma.user.update({
        data: { about: about },
        where: { id: user.id },
      });
      return { about: res.about };
    },
    updateName: async (_, { name }, { user }) => {
      if (!user)
        throw new Error("missing or expired token, Login and try again!!");
      const res = await prisma.user.update({
        data: { firstName: name },
        where: { id: user.id },
      });
      return { name: res.firstName };
    },
    updateNameNAbout: async (_, { name, about }, { user }) => {
      if (!user)
        throw new Error("missing or expired token, Login and try again!!");
      const res = await prisma.user.update({
        data: { firstName: name, about: about },
        where: { id: user.id },
      });
      return res;
    },
    registerUser: async (_, { newUser }) => {
      const user = await prisma.user.findUnique({
        where: { email: newUser.email },
      });
      if (user) throw new Error("User already exists with this email!!");

      const hashedPass = await bcrypt.hash(newUser.password, 10);
      const createdUser = await prisma.user.create({
        data: {
          ...newUser,
          password: hashedPass,
        },
      });
      const token = await jwt.sign(
        {
          id: createdUser.id,
          email: createdUser.email,
          name: createdUser.firstName,
        },
        process.env.JWT_KEY
      );
      return { token };
    },
  },
};
const typeResolversUser = {
  interaction: {
    user: async (parent, {}, { user }) => {
      const currUser = await prisma.user.findUnique({
        where: { id: parent.contactId },
      });
      return userNsignedurl(currUser);
    },
    chat: async (parent, __, { user }) => {
      const messages = await prisma.message.findMany({
        where: {
          OR: [
            { AND: [{ senderId: parent.contactId }, { receiverId: user.id }] },
            { AND: [{ senderId: user.id }, { receiverId: parent.contactId }] },
          ],
        },
        orderBy: {
          createdAt: "asc",
        },
      });
      parent.firstName = "changes";
      return messages;
    },
  },
};

module.exports = { resolversUser, typeDefsUser, typeResolversUser };
const userNsignedurl = async (user) => {
  let url = user.profileURL;
  if (!url) return user;
  try {
    url = await signedUrl(url);
  } catch (ex) {
    url = "";
  }
  return { ...user, profileURL: url };
};
