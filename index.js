const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const { createServer } = require("http");
const { useServer } = require("graphql-ws/lib/use/ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { WebSocketServer } = require("ws"); // Ensure this const is =( the 'ws' package
const { typeDefsUser, resolversUser } = require("./graphql/user.js");
const { typeDefsMsg, resolversMsg } = require("./graphql/messages.js");
const { gql } = require("apollo-server-express");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const PORT = process.env.PORT || 4000;
console.log("port: ",PORT);
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
  // forgot to add subscription
  // took two days to debug
  Subscription: {
    ...resolversMsg.Subscription,
  },
};

async function startServer() {
  const app = express();

  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const cxt = async ({ req }) => {
    const token = req.headers.authorization;
    if (!token) return { ...req };
    const decoded = await jwt.verify(token, process.env.JWT_KEY);
    return { ...req, user: decoded };
  };
  const apolloServer = new ApolloServer({
    schema,
    context: cxt,
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app });

  const server = createServer(app);

  // Ensure this is the correct way to create a WebSocket server with 'ws'
  const wsServer = new WebSocketServer({
    server,
    path: "/graphql",
  });

  useServer(
    {
      schema,
      onConnect: () => {},
      onDisconnect: () => {},
      // extracting jwt token, decodeing it and making it available to Subscription resolvers
      context: async (ctx, msg, args) => {
        const { connectionParams } = ctx;
        const token = connectionParams?.Authorization;
        var decoded = null;
        try {
          if (token) decoded = await jwt.verify(token, process.env.JWT_KEY);
        } catch (ex) {
          console.log(ex);
        }
        return { user: decoded };
      },
    },
    wsServer
  );

  server.listen(3000, () => {
    console.log(
      `Server is running at http://localhost:${PORT}${apolloServer.graphqlPath}`
    );
    console.log(`WebSocket server is running at ws://localhost:${PORT}/graphql`);
  });
}

startServer();

// const cors =( "cors";
// const express =( "express";
// const jwt =( "jsonwebtoken";
// const { createServer } =( "http";
// const { WebSocketServer } =( "ws";
// // const { ApolloServer } =( "@apollo/server";
// // const { expressMiddleware } =( "@apollo/server/express4";
// const { ApolloServer, gql } =( "apollo-server-express";
// const { makeExecutableSchema } =( "@graphql-tools/schema";
// const { typeDefsUser, resolversUser } =( "./graphql/user.js";
// const { typeDefsMsg, resolversMsg } =( "./graphql/messages.js";
// const { useServer } =( "graphql-ws/lib/use/ws";
// // const { ApolloServerPluginDrainHttpServer } =( "@apollo/server/plugin/drainHttpServer";

// const typeDefs = gql`
//   ${typeDefsUser}
//   ${typeDefsMsg}
// `;
// const resolvers = {
//   Query: {
//     ...resolversMsg.Query,
//     ...resolversUser.Query,
//   },
//   Mutation: {
//     ...resolversMsg.Mutation,
//     ...resolversUser.Mutation,
//   },
// };

// const schema = makeExecutableSchema({ typeDefs, resolvers });

// const cxt = async ({ req }) => {
//   const token = req.headers.authorization;
//   if (!token) return { ...req };
//   const decoded = await jwt.verify(token, process.env.JWT_KEY);
//   return { ...req, user: decoded };
// };

// const app = express();
// const apolloServer = new ApolloServer({ schema, context: cxt });
// await apolloServer.start();
// apolloServer.applyMiddleware({ app, path: "/graphql" });
// const server = app.listen(4000, () => {
//   const wsServer = new WebSocketServer({
//     server,
//     path: "/graphql",
//   });
//   useServer({ schema }, wsServer);
//   console.log("apollo and subscription servevr is up");
// });

// // const schema = makeExecutableSchema({ typeDefs, resolvers });

// // const app = express();
// // const httpServer = createServer(app);

// // const wsServer = new WebSocketServer({
// //   server: httpServer,
// //   path: "/graphql",
// // });

// // const serverCleanup = useServer({ schema }, wsServer);

// // const server = new ApolloServer({
// //   schema,
// //   plugins: [
// //     // Proper shutdown for the HTTP server.
// //     ApolloServerPluginDrainHttpServer({ httpServer }),

// //     // Proper shutdown for the WebSocket server.
// //     {
// //       async serverWillStart() {
// //         return {
// //           async drainServer() {
// //             await serverCleanup.dispose();
// //           },
// //         };
// //       },
// //     },
// //   ],
// // });

// // await server.start();

// // app.use(cors());
// // app.use(express.json());

// // app.use(
// //   "/graphql",
// //   expressMiddleware(server, {
// //     context: async ({ req }) => {
// //       const token = req.headers.authorization;
// //       if (!token) return { ...req };
// //       const decoded = await jwt.verify(token, process.env.JWT_KEY);
// //       return { ...req, user: decoded };
// //     },
// //   })
// // );

// // const PORT = process.env.PORT || 3000;

// // httpServer.listen(PORT, (err) => {
// //   console.log(`server running on port ${PORT}`);
// // });

// // const { ApolloServer, gql } = require("apollo-server");
// // server.listen().then(({ url }) => console.log(`Server running at ${url}`));  //stand alone server
