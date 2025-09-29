import jwt from "jsonwebtoken";
import ApiErr from "../utils/ApiErr.js";

const verifyJWT = (req, res, next) => {
  const token = req.cookies?.accessToken;
  if (!token) throw new ApiErr("Unauthorized: No access token", 401);

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) throw new ApiErr("Forbidden: Invalid token", 403);

    req.user = decoded;
    next();
  });
};

export default verifyJWT;
