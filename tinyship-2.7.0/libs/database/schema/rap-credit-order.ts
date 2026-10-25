import { isSqliteDialect } from '../shared/dialect';
import * as pg from './pg/rap-credit-order';
import * as sqlite from './sqlite/rap-credit-order';
export const rapCreditOrder = ((isSqliteDialect() ? sqlite : pg) as typeof pg).rapCreditOrder;
