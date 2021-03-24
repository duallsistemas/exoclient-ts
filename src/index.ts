/* TODO: Node/Deno support */

export interface ExoConfiguration {
  url: string;
  params?: Record<string, string>[];
  token?: string;
}

export enum ExoOperation {
  Insert = 'insert',
  Update = 'update',
  Upsert = 'upsert',
  Delete = 'delete',
}

export interface ExoCommandItem<T> {
  resource: string;
  operation: ExoOperation;
  data: T[];
  keys?: string[];
  returns?: string[];
}

export interface ExoCommand<T> {
  root: string;
  commands: ExoCommandItem<T>[];
  tag?: string;
}

export interface ExoRangePagination {
  page: number;
  pageSize: number;
}

export interface ExoRangePortion {
  limit: number;
  offset: number;
}

export type ExoRange = ExoRangePagination | ExoRangePortion;

export interface ExoFilter {
  criteria: string;
  params: any[];
}

export interface ExoGroup {
  columns: string[];
  filter: ExoFilter;
}

export interface ExoQueryOptions {
  filter?: ExoFilter;
  sort?: string[];
  group?: ExoGroup;
  keys?: string[];
  nested?: boolean;
  range?: ExoRange;
}

export interface ExoQueryItem {
  resource: string;
  columns?: string[];
  options?: ExoQueryOptions;
}

export interface ExoQuery {
  root: string;
  queries: ExoQueryItem[];
  tag?: string;
}

export interface ExoRangePaginationResult {
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface ExoRangePortionResult {
  limit: number;
  offset: number;
}

export type ExoRangeResult = ExoRangePaginationResult | ExoRangePortionResult;

export interface ExoRow<T> {
  resource: string;
  data: T[];
  range?: ExoRangeResult;
}

export interface ExoResponse<T> {
  version: string;
  root: string;
  rows: ExoRow<T>[];
  tag?: string;
}

export interface ExoError {
  origin: string;
  message: string;
  note?: string;
}

export type ExoRequestData<T> = ExoQuery | ExoCommand<T>;

function formatURL(configuration: ExoConfiguration, path: string): string {
  return (
    configuration.url +
    path +
    (!!configuration.params && configuration.params.length > 0
      ? '?' + configuration.params.map(item => `${item.name}=${item.value}`).join('&')
      : '')
  );
}

async function exoRequest<T>(
  configuration: ExoConfiguration,
  path: string,
  data: ExoRequestData<T>
): Promise<ExoResponse<T>> {
  let headers: HeadersInit = { 'Content-Type': 'application/json' };
  if (configuration.token) headers.Authorization = 'Bearer ' + configuration.token;
  try {
    const response = await fetch(formatURL(configuration, path), {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    const content = await response.text();
    const json = JSON.parse(content);
    if (!response.ok) return Promise.reject(json);
    return json;
  } catch (error) {
    return Promise.reject({ message: error.message } as ExoError);
  }
}

export function exoRequestQuery<T>(
  configuration: ExoConfiguration,
  root: string,
  resource: string,
  columns?: string[],
  options?: ExoQueryOptions
): Promise<ExoResponse<T>> {
  return exoRequest<T>(configuration, '/_queries', { root, queries: [{ resource, columns, ...options }] });
}

export async function exoRequestQueryData<T>(
  configuration: ExoConfiguration,
  root: string,
  resource: string,
  columns?: string[],
  options?: ExoQueryOptions
): Promise<T[]> {
  return await exoRequestQuery<T>(configuration, root, resource, columns, options).then(
    response => response.rows[0].data
  );
}

export function exoRequestCommand<T>(
  configuration: ExoConfiguration,
  root: string,
  resource: string,
  operation: ExoOperation,
  data: T[],
  keys?: string[],
  returns?: string[]
): Promise<ExoResponse<T>> {
  return exoRequest<T>(configuration, '/_commands', {
    root,
    commands: [
      {
        resource,
        operation,
        data,
        keys: keys && keys?.length > 0 ? keys : undefined,
        returns: returns && returns?.length > 0 ? returns : undefined,
      },
    ],
  });
}

export async function exoRequestCommandData<T>(
  configuration: ExoConfiguration,
  root: string,
  resource: string,
  operation: ExoOperation,
  data: T[],
  keys?: string[],
  returns?: string[]
): Promise<T[]> {
  return await exoRequestCommand(configuration, root, resource, operation, data, keys, returns).then(
    response => response.rows[0].data
  );
}
