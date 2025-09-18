import jwt from "jsonwebtoken";

// Minimal example; adapt to your key/algorithms
export const requireAuth = (req, res, next) => {
  try {
    const auth = req.headers.authorization || "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Unauthorized" });

    // For RS256 use public key; for HS256 use shared secret
    const decoded = jwt.verify(token, process.env.JWT_PUBLIC_KEY);
    req.user = { id: decoded.sub };
    return next();
  } catch (e) {
    return res.status(401).json({ error: "Unauthorized" });
  }
};
