import { SetMetadata } from '@nestjs/common';

export const DATA_ACCESS_KEY = 'data_access_log';

export type DataAccessAction = 'list' | 'view' | 'export' | 'search';

export interface DataAccessMetadata {
  /** What was read: 'customers', 'orders', ... */
  resource: string;
  action: DataAccessAction;
  /** Route param holding the record id, for single-record reads. */
  idParam?: string;
}

/**
 * Marks a read worth recording. DataAccessInterceptor writes one row per
 * request that carries this, including how many records came back — reads are
 * invisible to the audit interceptor, which only covers mutations.
 *
 * Put it on anything that returns personal data in bulk.
 */
export const LogDataAccess = (metadata: DataAccessMetadata) =>
  SetMetadata(DATA_ACCESS_KEY, metadata);
