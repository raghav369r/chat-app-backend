import cors from "cors";
import express from "express";
import jwt from "jsonwebtoken";
import { createServer } from "http";
import { WebSocketServer } from "ws";
// import { ApolloServer } from "@apollo/server";
// import { expressMiddleware } from "@apollo/server/express4";
import { ApolloServer, gql } from "apollo-server-express";
import { makeExecutableSchema } from "@graphql-tools/schema";
import { typeDefsUser, resolversUser } from "./graphql/user.js";
import { typeDefsMsg, resolversMsg } from "./graphql/messages.js";
import { useServer } from "graphql-ws/lib/use/ws";
// import { ApolloServerPluginDrainHttpServer } from "@apollo/server/plugin/drainHttpServer";

const typeDefs = gql`
  ${typeDefsUser}
  ${typeDefsMsg}
`;
const resolvers = {
  Query: {
    ...resolversMsg.Query,
    ...resolversUser.Query,
  },
  Mutation: {
    ...resolversMsg.Mutation,
    ...resolversUser.Mutation,
  },
};

const schema = makeExecutableSchema({ typeDefs, resolvers });

const cxt = async ({ req }) => {
  const token = req.headers.authorization;
  if (!token) return { ...req };
  const decoded = await jwt.verify(token, process.env.JWT_KEY);
  return { ...req, user: decoded };
};

const app = express();
const apolloServer = new ApolloServer({ schema, context: cxt });
await apolloServer.start();
apolloServer.applyMiddleware({ app, path: "/graphql" });
const server = app.listen(4000, () => {
  const wsServer = new WebSocketServer({
    server,
    path: "/graphql",
  });
  useServer({ schema }, wsServer);
  console.log("apollo and subscription servevr is up");
});

// const schema = makeExecutableSchema({ typeDefs, resolvers });

// const app = express();
// const httpServer = createServer(app);

// const wsServer = new WebSocketServer({
//   server: httpServer,
//   path: "/graphql",
// });

// const serverCleanup = useServer({ schema }, wsServer);

// const server = new ApolloServer({
//   schema,
//   plugins: [
//     // Proper shutdown for the HTTP server.
//     ApolloServerPluginDrainHttpServer({ httpServer }),

//     // Proper shutdown for the WebSocket server.
//     {
//       async serverWillStart() {
//         return {
//           async drainServer() {
//             await serverCleanup.dispose();
//           },
//         };
//       },
//     },
//   ],
// });

// await server.start();

// app.use(cors());
// app.use(express.json());

// app.use(
//   "/graphql",
//   expressMiddleware(server, {
//     context: async ({ req }) => {
//       const token = req.headers.authorization;
//       if (!token) return { ...req };
//       const decoded = await jwt.verify(token, process.env.JWT_KEY);
//       return { ...req, user: decoded };
//     },
//   })
// );

// const PORT = process.env.PORT || 3000;

// httpServer.listen(PORT, (err) => {
//   console.log(`server running on port ${PORT}`);
// });

// const { ApolloServer, gql } = require("apollo-server");
// server.listen().then(({ url }) => console.log(`Server running at ${url}`));  //stand alone server
