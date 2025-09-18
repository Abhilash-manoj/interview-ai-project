import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import jwt from 'jsonwebtoken';

const signToken = (userId) =>
    jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "1h" });

export const signup = async (req, res, next) => {
    try{
        const { email, password, name } = req.body;

        const exists = await User.findOne({ email });
        if(exists) return res.status(409).json({ message: "Email already registered" });

        const hashed = await bcrypt.hash(password, 10);
        const user = await User.create({ email, password: hashed, name });

        const token = signToken(user._id);
        res.status(201).json({
            token,
            user: { id: user._id, email: user.email, name }
        });
    } catch (err){
        next(err);
    }
};

export const signin = async (req, res, next) => {
    try{
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ message: "Invalid credentials"});

        const ok = await bcrypt.compare(password, user.password);
        if(!ok) return res.status(400).json({ message: "Invalid credentials"});

        const token = signToken(user._id);
        res.json({
            token,
            user: { id: user._id, email: user.email, name: user.name }
        });

    } catch (err) {
        next(err);
    }
};

export const me = async (req, res, next) => {
    try{
        const user = await User.findById(req.user.id).select("_id email name createdAt");
        res.json({ user });

    } catch (err) {
        next (err);
    }
};