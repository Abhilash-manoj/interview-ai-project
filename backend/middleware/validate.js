import { body,validationResult } from 'express-validator';


export const signupRules = [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("VAlid email is required"),
    body("password").isLength({ min: 8}).withMessage("Password must be atleast 8 characters")
];

export const signinRules = [
    body("email").isEmail().withMessage("Valid Email is required"),
    body("password").notEmpty().withMessage("Password is required")
];


export const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (errors.isEmpty()) return next();
  return res.status(400).json({
    error: "Validation failed",
    details: errors.array().map(e => ({ field: e.param, msg: e.msg }))
  });
};
