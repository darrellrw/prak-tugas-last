import express from "express";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";

import db from "../config/database.js"

import userRouter from "./routes/userRoute.js";

dotenv.config();
const app = express();

try {
    await db.authenticate();
    console.log("Connection has been established successfully.");
    // await db.sync();
} catch (error) {
    console.error("Unable to connect to the database: ", error);
}

app.use(cors({
    credentials: true,
    origin: true
}));
app.use(cookieParser());
app.use(express.json());
app.use(userRouter);

app.listen(process.env.PORT, () => console.log(`Server is running on port ${process.env.PORT}`));