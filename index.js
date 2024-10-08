const cors = require("cors");
const express = require("express");
const { ApolloServer } = require("apollo-server-express");
const { createServer } = require("http");
const { useServer } = require("graphql-ws/lib/use/ws");
const { makeExecutableSchema } = require("@graphql-tools/schema");
const { gql } = require("apollo-server-express");
const { WebSocketServer } = require("ws");
const {
  typeDefsUser,
  resolversUser,
  typeResolversUser,
} = require("./graphql/user.js");
const { typeDefsMsg, resolversMsg } = require("./graphql/messages.js");
const jwt = require("jsonwebtoken");
const profileUpload=require("./controlers/profileupload.js");
const { auth } = require("./middlewares/auth.js");
require("dotenv").config();

const PORT = process.env.PORT || 4000;
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
  ...typeResolversUser,
};
const app = express();

app.use(cors());
app.use("/uploadprofile",auth,profileUpload);
async function startServer() {
  const schema = makeExecutableSchema({ typeDefs, resolvers });

  const cxt = async ({ req }) => {
    const token = req.headers.authorization;
    if (!token) return { ...req };
    let decoded = null;
    try {
      decoded = await jwt.verify(token, process.env.JWT_KEY);
    } catch (ex) {
      console.log(ex.message);
    }
    return { ...req, user: decoded };
  };
  const apolloServer = new ApolloServer({
    schema,
    context: cxt,
  });

  await apolloServer.start();
  apolloServer.applyMiddleware({ app, cors: false }); // Disable default CORS handling

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
          console.log("error decoding jwt");
        }
        return { user: decoded };
      },
    },
    wsServer
  );

  server.listen(PORT, () => {
    console.log(
      `Server is running at http://localhost:${PORT}${apolloServer.graphqlPath}`
    );
    console.log(
      `WebSocket server is running at ws://localhost:${PORT}/graphql`
    );
  });
}

startServer();

// "start": "npx prisma generate && node index.js",