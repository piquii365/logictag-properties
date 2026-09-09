import { Matches } from 'class-validator';

/** Money is stored as an integer count of minor currency units (cents) in a
 * `bigint` column, which the pg driver returns/accepts as a numeric string. */
export const IsMinorAmount = () =>
  Matches(/^\d+$/, {
    message: 'must be a non-negative whole number of minor currency units',
  });
