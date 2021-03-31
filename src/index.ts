/* TODO: Node/Deno support */

export interface Configuration {
  url: string;
  params?: object;
  token?: string;
}

export enum Operation {
  Insert = 'insert',
  Update = 'update',
  Upsert = 'upsert',
  Delete = 'delete',
}

export interface Command<T> {
  resource: string;
  operation: Operation;
  data: T[];
  keys?: string[];
  returns?: string[];
}

export interface CommandRequest<T> {
  root: string;
  commands: Command<T>[];
  tag?: string;
}

export interface RangePagination {
  page: number;
  pageSize: number;
}

export interface RangePortion {
  limit: number;
  offset: number;
}

export type Range = RangePagination | RangePortion;

export interface Filter {
  criteria: string;
  params: any[];
}

export interface Group {
  columns: string[];
  filter: Filter;
}

export interface QueryOptions {
  filter?: Filter;
  sort?: string[];
  group?: Group;
  keys?: string[];
  nested?: boolean;
  range?: Range;
}

export interface Query {
  resource: string;
  columns?: string[];
  options?: QueryOptions;
}

export interface QueryRequest {
  root: string;
  queries: Query[];
  tag?: string;
}

export interface RangePaginationResult {
  page: number;
  pageSize: number;
  pageCount: number;
}

export interface RangePortionResult {
  limit: number;
  offset: number;
}

export type RangeResult = RangePaginationResult | RangePortionResult;

export interface Row<T> {
  resource: string;
  data: T[];
  range?: RangeResult;
}

export interface Response<T> {
  version: string;
  root: string;
  rows: Row<T>[];
  tag?: string;
}

export interface ResponseError {
  origin: string;
  message: string;
  note?: string;
}

export type RequestData<T> = QueryRequest | CommandRequest<T>;

function extractParams(params?: object): string[] {
  if (!params) return [];
  return Object.keys(params).map(key => `${key}=${params[key as keyof object]}`);
}

function formatURL(configuration: Configuration, path: string): string {
  const params = extractParams(configuration.params);
  return configuration.url + path + (params.length > 0 ? '?' + params.join('&') : '');
}

export async function request<T>(
  configuration: Configuration,
  path: string,
  data: RequestData<T>
): Promise<Response<T>> {
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
    return Promise.reject({ message: error.message } as ResponseError);
  }
}

export function requestQueries<T>(configuration: Configuration, root: string, queries: Query[]): Promise<Response<T>> {
  return request<T>(configuration, '/_queries', { root, queries });
}

export function requestQuery<T>(
  configuration: Configuration,
  root: string,
  resource: string,
  columns?: string[],
  options?: QueryOptions
): Promise<Response<T>> {
  return requestQueries<T>(configuration, root, [{ resource, columns, ...options }]);
}

export async function requestQueryData<T>(
  configuration: Configuration,
  root: string,
  resource: string,
  columns?: string[],
  options?: QueryOptions
): Promise<T[]> {
  return await requestQuery<T>(configuration, root, resource, columns, options).then(response => response.rows[0].data);
}

export function requestCommands<T>(
  configuration: Configuration,
  root: string,
  commands: Command<T>[]
): Promise<Response<T>> {
  return request<T>(configuration, '/_commands', { root, commands });
}

export function requestCommand<T>(
  configuration: Configuration,
  root: string,
  resource: string,
  operation: Operation,
  data: T[],
  keys?: string[],
  returns?: string[]
): Promise<Response<T>> {
  return requestCommands<T>(configuration, root, [
    {
      resource,
      operation,
      data,
      keys: keys && keys?.length > 0 ? keys : undefined,
      returns: returns && returns?.length > 0 ? returns : undefined,
    },
  ]);
}

export async function requestCommandData<T>(
  configuration: Configuration,
  root: string,
  resource: string,
  operation: Operation,
  data: T[],
  keys?: string[],
  returns?: string[]
): Promise<T[]> {
  return await requestCommand(configuration, root, resource, operation, data, keys, returns).then(
    response => response.rows[0].data
  );
}
