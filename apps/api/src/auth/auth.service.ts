import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { JwtSignOptions } from "@nestjs/jwt";
import * as argon2 from "argon2";
import { UsersService } from "../users/users.service";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { JwtPayload } from "./types/jwt-payload";

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const passwordHash = await argon2.hash(dto.password);

    const user = await this.usersService.createUser({
      email: normalizedEmail,
      name: dto.name?.trim() || undefined,
      passwordHash,
    });

    return {
      user,
      accessToken: await this.signAccessToken({
        sub: user.id,
        email: user.email,
      }),
    };
  }

  async login(dto: LoginDto) {
    const normalizedEmail = dto.email.toLowerCase().trim();
    const user = await this.usersService.findByEmail(normalizedEmail);

    if (!user) {
      throw new UnauthorizedException("Invalid email or password");
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!passwordMatches) {
      throw new UnauthorizedException("Invalid email or password");
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
      },
      accessToken: await this.signAccessToken({
        sub: user.id,
        email: user.email,
      }),
    };
  }

  private signAccessToken(payload: JwtPayload) {
    const expiresIn = this.configService.get<string>(
      "JWT_ACCESS_EXPIRES_IN",
      "15m",
    );

    return this.jwtService.signAsync(payload, {
      secret: this.configService.getOrThrow<string>("JWT_ACCESS_SECRET"),
      expiresIn: expiresIn as JwtSignOptions["expiresIn"],
    });
  }
}
