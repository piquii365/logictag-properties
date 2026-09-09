import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { AuthJwtPayload } from '../types/jwt-payload.auth';

/**
 * The authenticated principal that the passport strategy put on the request.
 * Only ever populated behind a guard, so handlers can treat it as present.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthJwtPayload =>
    ctx.switchToHttp().getRequest<{ user: AuthJwtPayload }>().user,
);
