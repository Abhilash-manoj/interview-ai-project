import jwt from "jsonwebtoken";

export const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;

    // ✅ FIX: Check if token is actually a string and not "null"
    if (!token || token === "null" || token === "undefined") {
      return res.status(401).json({ error: "No valid token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY);
    req.user = { id: decoded.id };
    next();
  } catch (err) {
    console.error("🔒 Auth Middleware Error:", err.message);
    return res.status(401).json({ error: "Unauthorized" });
  }
};
