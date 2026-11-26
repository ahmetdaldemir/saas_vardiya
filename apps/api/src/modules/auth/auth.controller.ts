import { Body, Controller, Get, Headers, Post, UnauthorizedException } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly jwt: JwtService,
  ) {}

  @Post('login')
  login(@Body() body: { tenantSlug: string; email: string; password: string }, @Headers('x-client-type') clientType = 'web') {
    return this.auth.login(body, clientType);
  }

  @Get('me')
  async me(@Headers('authorization') authorization?: string) {
    const token = authorization?.replace('Bearer ', '');
    if (!token) {
      throw new UnauthorizedException('Bearer token is required.');
    }

    return this.auth.getMe(await this.jwt.verifyAsync(token));
  }
}
