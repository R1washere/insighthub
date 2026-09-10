import { Injectable } from "@nestjs/common";
import { createHash, randomBytes } from "node:crypto";

@Injectable()
export class ApiKeyService {
  generateProjectApiKey() {
    const secret = randomBytes(32).toString("base64url");
    const rawKey = `ihub_${secret}`;

    return {
      rawKey,
      keyHash: this.hashApiKey(rawKey),
      prefix: rawKey.slice(0, 12),
    };
  }

  hashApiKey(rawKey: string) {
    return createHash("sha256").update(rawKey).digest("hex");
  }
}
