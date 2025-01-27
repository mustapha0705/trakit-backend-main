import express from "express";
import { initializeReminders, setupCleanupJob } from "./utils/reminderService.js";

// Import configs and middleware
import routeNotFound from "./middleware/routeNotFound.js";
import connectDB from "./config/connectDB.js";
import optionalAuth from "./middleware/optionalAuth.js";
import cookieParser from "cookie-parser";

// Import routes
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";
import reminderRoutes from "./routes/reminderRoutes.js";

// Load environment variables and configure the server
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT || 4100;
const MONGO_URI = process.env.MONGO_URI;

const app = express();
// Enable JSON body and cookie parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

app.set("trust proxy", 1);
app.use(
  rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 100, // Limit each IP to 100 requests per `window` (here, per 15 minutes).
    standardHeaders: "draft-8", // draft-6: `RateLimit-*` headers; draft-7 & draft-8: combined `RateLimit` header
    legacyHeaders: false, // Disable the `X-RateLimit-*` headers.
  })
);
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
    credentials: true,
  })
);
app.use(helmet());
app.use(xss());

// Define basic GET route for health check
app.get("/", (req, res) => {
  return res.status(200).send("API working perfectly!");
});

// Use the routers from all routes with optionalAuth middleware
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/users", optionalAuth, userRoutes);
app.use("/api/v1/subscriptions", optionalAuth, subscriptionRoutes);
app.use("/api/v1/reminders", optionalAuth, reminderRoutes);

app.use(routeNotFound);

// Start the server
const start = async () => {
  try {
    await connectDB(MONGO_URI);
    console.log("connected to MongoDB...");

    await setupCleanupJob();

    await initializeReminders();
    console.log("reminders initialized...");

    app.listen(PORT, () => {
      console.log(`server running successfully at address http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("error starting the server:", error);
  }
};

start();
