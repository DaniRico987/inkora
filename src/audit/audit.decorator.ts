import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit:action';

export const audit = (action: string) => SetMetadata(AUDIT_ACTION_KEY, action);
