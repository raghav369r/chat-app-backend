import { ApolloServer } from '@apollo/server';
import { expressMiddleware } from '@apollo/server/express4';
import { ApolloServerPluginDrainHttpServer } from '@apollo/server/plugin/drainHttpServer';
import { createServer } from 'http';
import express from 'express';
import { makeExecutableSchema } from '@graphql-tools/schema';
import { WebSocketServer } from 'ws';
import { useServer } from 'graphql-ws/lib/use/ws';
import cors from 'cors';
import resolvers from './resolvers';
import typeDefs from './typeDefs';

// Create the schema, which will be used separately by ApolloServer and
// the WebSocket server.
const schema = makeExecutableSchema({ typeDefs, resolvers });

// Create an Express app and HTTP server; we will attach both the WebSocket
// server and the ApolloServer to this HTTP server.
const app = express();
const httpServer = createServer(app);

// Create our WebSocket server using the HTTP server we just set up.
const wsServer = new WebSocketServer({
  server: httpServer,
  path: '/subscriptions',
});
// Save the returned server's info so we can shutdown this server later
const serverCleanup = useServer({ schema }, wsServer);

// Set up ApolloServer.
const server = new ApolloServer({
  schema,
  plugins: [
    // Proper shutdown for the HTTP server.
    ApolloServerPluginDrainHttpServer({ httpServer }),

    // Proper shutdown for the WebSocket server.
    {
      async serverWillStart() {
        return {
          async drainServer() {
            await serverCleanup.dispose();
          },
        };
      },
    },
  ],
});

await server.start();
app.use('/graphql', cors(), express.json(), expressMiddleware(server));

const PORT = 4000;
// Now that our HTTP server is fully set up, we can listen to it.
httpServer.listen(PORT, () => {
  console.log(`Server is now running on http://localhost:${PORT}/graphql`);
});



// import { ApolloServer } from "@apollo/server";
// import { expressMiddleware } from "@apollo/server/express4";
// import cors from "cors";
// import express from "express";
// import { typeDefsUser, resolversUser } from "./graphql/user.js";
// import { typeDefsMsg, resolversMsg } from "./graphql/messages.js";
// import jwt from "jsonwebtoken";
// import { gql } from "apollo-server-express";

// const app = express();
// app.use(cors());
// app.use(express.json());

// const server = new ApolloServer({
//   typeDefs: gql`
//     ${typeDefsUser}
//     ${typeDefsMsg}
//   `,
//   resolvers: {
//     Query: {
//       ...resolversMsg.Query,
//       ...resolversUser.Query,
//     },
//     Mutation: {
//       ...resolversMsg.Mutation,
//       ...resolversUser.Mutation,
//     },
//   },
//   context: ({ req }) => {
//     console.log(":mw");
//     return { ...req };
//   },
// });
// await server.start();
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

// app.listen(3000, (err) => {
//   console.log("server running on port 3000");
// });

// // const { ApolloServer, gql } = require("apollo-server");
// // server.listen().then(({ url }) => console.log(`Server running at ${url}`));  //stand alone server
