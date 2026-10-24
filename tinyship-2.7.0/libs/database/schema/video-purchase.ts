import { isSqliteDialect } from '../shared/dialect';
import * as pg from './pg/video-purchase';
import * as sqlite from './sqlite/video-purchase';
export const videoPurchase = ((isSqliteDialect() ? sqlite : pg) as typeof pg).videoPurchase;
