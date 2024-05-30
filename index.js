import { ApolloServer } from "@apollo/server";
import { expressMiddleware } from "@apollo/server/express4";
import cors from "cors";
import express from "express";
import { typeDefsUser, resolversUser } from "./graphql/user.js";
import { typeDefsMsg, resolversMsg } from "./graphql/messages.js";
import jwt from "jsonwebtoken";
import { gql } from "apollo-server-express";

const app = express();
app.use(cors());
app.use(express.json());

const server = new ApolloServer({
  typeDefs: gql`
    ${typeDefsUser}
    ${typeDefsMsg}
  `,
  resolvers: {
    Query: {
      ...resolversMsg.Query,
      ...resolversUser.Query,
    },
    Mutation: {
      ...resolversMsg.Mutation,
      ...resolversUser.Mutation,
    },
  },
  context: ({ req }) => {
    console.log(":mw");
    return { ...req };
  },
});
await server.start();
app.use(
  "/graphql",
  expressMiddleware(server, {
    context: async ({ req }) => {
      const token = req.headers.authorization;
      if (!token) return { ...req };
      const decoded = await jwt.verify(token, process.env.JWT_KEY);
      return { ...req, user: decoded };
    },
  })
);

app.listen(3000, (err) => {
  console.log("server running on port 3000");
});

// const { ApolloServer, gql } = require("apollo-server");
// server.listen().then(({ url }) => console.log(`Server running at ${url}`));  //stand alone server
