import express from "express";
import { signup, signin, me } from "../controllers/authController.js";
import { signupRules, signinRules, validate } from "../middleware/validate.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

// POST /api/auth/signup
router.post("/signup", signupRules, validate, signup);

// POST /api/auth/signin
router.post("/signin", signinRules, validate, signin);

// GET /api/auth/me (protected)
router.get("/me", requireAuth, me);

export default router;
