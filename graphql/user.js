const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const prisma = require("../client/prisma.js");
const typeDefsUser = `
  scalar Date

  type User {
    id: ID!
    firstName: String
    lastName: String
    email: String
    createdAt: Date
    about:String
    profileURL:String
  }
  type Token {
    token: String
  }
  type Query {
    getAllUsers: [User]
    getUser(id: ID!): User
    signInUser(user: signIn): Token
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
  type About{
    about:String
  }
  type Name{
    name:String
  }
  type Mutation {
    registerUser(newUser: NewUser!): Token
    updateAbout(about:String):About
    updateName(name:String):Name
    updateNameNAbout(name:String,about:String):User
  }
`;

const resolversUser = {
  Query: {
    getAllUsers: async (_, __, { user }) => {
      const users = await prisma.user.findMany({
        orderBy: {
          createdAt: "desc",
        },
        where: { id: { not: user?.id } },
      });
      // console.log(users)
      return users;
    },
    getUser: async (_, { id }) => {
      const user = await prisma.user.findUnique({
        where: { id: parseInt(id) },
      });
      if (user) return user;
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

  // sub query in get all users
};

module.exports = { resolversUser, typeDefsUser };
