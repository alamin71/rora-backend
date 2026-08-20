import compression from "compression";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import app from "../app";

// Setup security middleware
export function setupSecurity() {
  // Apply compression middleware
  app.use(compression());
  // Security headers
  app.use(helmet());
  //   app.use(
  //     helmet({
  //       crossOriginResourcePolicy: false,
  //     }),
  //   );
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  // Apply rate limiting to all routes
  app.use(limiter);
  // Add request timeout
  app.use((req, res, next) => {
    res.setTimeout(30000, () => {
      res.status(503).send("Request timeout");
    });
    next();
  });
}
