import { ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import type { NestExpressApplication } from "@nestjs/platform-express";
import { rateLimit } from "express-rate-limit";
import helmet from "helmet";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const corsOrigins = (process.env.API_CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim());

  app.use(helmet());
  app.set("trust proxy", Number(process.env.TRUST_PROXY_HOPS ?? 0));
  app.enableCors((request, callback) => {
    // Browser tracking keys authorize ingestion only. Dashboard reads and
    // management requests keep the explicit frontend origin allowlist.
    callback(null, {
      origin: request.url.split("?")[0] === "/api/events" ? "*" : corsOrigins,
      credentials: false,
    });
  });
  app.use(
    "/api/auth",
    rateLimit({
      windowMs: 60_000,
      limit: 20,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      skip: (request) => request.method !== "POST",
      message: {
        statusCode: 429,
        message: "Too many authentication attempts. Try again in a minute.",
      },
    }),
  );
  app.setGlobalPrefix("api");
  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      stopAtFirstError: true,
    }),
  );
  app.enableShutdownHooks();

  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port, "0.0.0.0");
}

void bootstrap();
