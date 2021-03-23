/* TODO: Node/Deno support */

export interface ExoConfiguration {
  url: string;
  params?: Record<string, string>[];
  token?: string;
}

let exoGlobalConfig: ExoConfiguration;

export function exoGetConfiguration(): ExoConfiguration {
  return exoGlobalConfig;
}

export function exoSetConfiguration(url: string, token?: string, params?: Record<string, string>[]): ExoConfiguration {
  exoGlobalConfig = { url, token, params };
  return exoGlobalConfig;
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

export async function exoRequest<T>(
  path: string,
  data: ExoRequestData<T>,
  configuration: ExoConfiguration = exoGlobalConfig
): Promise<ExoResponse<T>> {
  if (!configuration) return Promise.reject('Missing configuration');
  let headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  if (configuration.token) headers.Authorization = 'Bearer ' + configuration.token;
  try {
    const response = await fetch(
      configuration.url +
        path +
        (!!configuration.params && configuration.params.length > 0
          ? '?' + configuration.params.map((item) => `${item.name}=${item.value}`).join('&')
          : ''),
      {
        method: 'POST',
        headers,
        body: JSON.stringify(data),
      }
    );
    const content = await response.text();
    const json = JSON.parse(content);
    if (!response.ok) {
      return Promise.reject(json);
    }
    return json;
  } catch (error) {
    return Promise.reject({ message: error.message } as ExoError);
  }
}

export function exoRequestQuery<T>(
  root: string,
  resource: string,
  columns?: string[],
  options?: ExoQueryOptions,
  configuration: ExoConfiguration = exoGlobalConfig
): Promise<ExoResponse<T>> {
  return exoRequest<T>(
    '/_queries',
    {
      root,
      queries: [{ resource, columns, ...options }],
    },
    configuration
  );
}

export async function exoRequestQueryData<T>(
  root: string,
  resource: string,
  columns?: string[],
  options?: ExoQueryOptions,
  configuration: ExoConfiguration = exoGlobalConfig
): Promise<T[]> {
  return await exoRequestQuery<T>(root, resource, columns, options, configuration).then(
    (response) => response.rows[0].data
  );
}

export function exoRequestCommand<T>(
  root: string,
  resource: string,
  operation: ExoOperation,
  data: T[],
  keys?: string[],
  returns?: string[],
  configuration: ExoConfiguration = exoGlobalConfig
): Promise<ExoResponse<T>> {
  return exoRequest<T>(
    '/_commands',
    {
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
    },
    configuration
  );
}

export async function exoRequestCommandData<T>(
  root: string,
  resource: string,
  operation: ExoOperation,
  data: T[],
  keys?: string[],
  returns?: string[],
  configuration: ExoConfiguration = exoGlobalConfig
): Promise<T[]> {
  return await exoRequestCommand(root, resource, operation, data, keys, returns, configuration).then(
    (response) => response.rows[0].data
  );
}
