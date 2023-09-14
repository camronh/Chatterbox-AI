import { OpenAPIV3_1 as OpenAPI } from "openapi-types";

export interface Endpoint {
  [path: string]: OpenAPI.PathItemObject;
}

export interface Contract {
  payload: any;
  path: string;
  method: string;
  endpoint: Endpoint;
}

export interface AxiosRequestObject {
  url: string;
  method: string;
  params?: Record<string, any>;
  data?: Record<string, any>;
}
