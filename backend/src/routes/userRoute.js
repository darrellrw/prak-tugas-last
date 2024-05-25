import express from "express";

import { getUsers, register, login, logout, refreshToken, getUsersByID, verifyEmail, sendVerifyEmail } from "../controllers/userController.js";
import { verifyToken } from "../middlewares/verifyToken.js";

const userRouter = express.Router();

userRouter.get("/users", verifyToken, getUsers);
userRouter.get("/users/:id", verifyToken, getUsersByID);
userRouter.post("/register", register);
userRouter.post("/login", login);
userRouter.delete("/logout", logout);
userRouter.get("/token", refreshToken);

userRouter.post("/send", sendVerifyEmail);
userRouter.get("/verify", verifyEmail);

export default userRouter;