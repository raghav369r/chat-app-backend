const { verify } = require("jsonwebtoken");
module.exports.auth = async (req, res, next) => {
  const token = req.headers?.authorization;
  if (!token)
    return res
      .status(401)
      .json({ error: { message: "Access denied missing token!" } });
  let user = null;
  try {
    user = await verify(token, process.env.JWT_KEY);
  } catch (ex) {
    return res
      .status(400)
      .json({ error: { message: "Token missing or expired, login again!" } });
  }
  req.user = user;
  next();
};
