import users from "../models/userModel.js";
import bycrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

import transporter from "../../config/email.js";

dotenv.config();

export const getUsers = async (req, res) => {
    try {
        const allUsers = await users.findAll({
            attributes: {
                exclude: ["password"]
            }
        });
        res.json(allUsers);
    } catch (error) {
        console.error(error.message);
    }
}

export const getUsersByID = async (req, res) => {
    const id = req.params.id;
    try {
        const user = await users.findOne({
            where: {
                id: id
            },
            attributes: {
                exclude: ["password"]
            }
        });
        res.json(user);
    } catch (error) {
        console.error(error.message);
    }

}

export const refreshToken = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(403).json({ message: "Access denied" });
    }

    const user = await users.findOne({
        where: {
            refresh_token: refreshToken
        }
    });

    if (!user) {
        return res.status(403).json({ message: "Access denied" });
    }

    jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: "Token is not valid" });
        }

        const accessToken = jwt.sign({ id: user.id, name: user.name, email: user.email, verified: user.verified }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "20s"
        });

        res.json({ accessToken });
    });
}

export const register = async (req, res) => {
    const { name, email, password, confirmPassword } = req.body;
    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
    } else {
        try {
            const salt = await bycrypt.genSalt();
            const hashedPassword = await bycrypt.hash(password, salt);
            const newUser = await users.create({
                name: name,
                email: email,
                password: hashedPassword,
                verified: false
            });

            res.json(newUser);
        } catch (error) {
            console.error(error.message);
        }
    }
}

export const login = async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await users.findOne({ 
            where: { 
                email: email
            } 
        });

        if (!user) {
            return res.status(400).json({ message: "User does not exist" });
        }

        const isMatch = await bycrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(400).json({ message: "Invalid credentials" });
        }

        const accessToken = jwt.sign({ id: user.id, name: user.name, email: user.email, verified: user.verified }, process.env.ACCESS_TOKEN_SECRET, {
            expiresIn: "20s"
        });

        const refreshToken = jwt.sign({ id: user.id, name: user.name, email: user.email, verified: user.verified }, process.env.REFRESH_TOKEN_SECRET, {
            expiresIn: "1h"
        });

        await users.update({ refresh_token: refreshToken }, {
            where: {
                id: user.id
            }
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000,
        });

        res.json({ accessToken });
    } catch (error) {
        console.error(error.message);
    }
}

export const logout = async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        return res.status(204).json({ message: "No Content" });
    }

    const user = await users.findOne({
        where: {
            refresh_token: refreshToken
        }
    });

    if (!user) {
        return res.status(204).json({ message: "No Content" });
    }
    
    await users.update({ refresh_token: null }, {
        where: {
            id: user.id
        }
    });

    res.clearCookie("refreshToken");
    res.json({ message: "Logged out" });
}

export const sendVerifyEmail = async (req, res) => {
    const { email } = req.body;
    try {
        const user = await users.findOne({
            where: {
                email: email
            }
        });

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        const token = jwt.sign({ id: user.id, email: user.email }, process.env.EMAIL_SECRET, {
            expiresIn: "1d"
        });

        const url = `http://localhost:3000/redirect?token=${token}`;
        const mailOptions = {
            to: email,
            subject: "Verify Email",
            html: `Hallo there! Click <a href="${url}">here</a> to verify your email.`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.error(err.message);
            } else {
                console.log("Email sent: " + info.response);
            }
        });

        res.json({ message: "Email sent" });
    } catch (error) {
        console.error(error.message);
    }
}

export const verifyEmail = async (req, res) => {
    const token = req.query.token;
    try {
        console.log(token);
        const decoded = jwt.verify(token, process.env.EMAIL_SECRET);
        await users.update({ verified: true }, {
            where: {
                id: decoded.id
            }
        });

        res.json({ message: "Email verified" });
    } catch (error) {
        console.error(error.message);
    }
}