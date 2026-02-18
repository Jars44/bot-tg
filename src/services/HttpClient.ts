import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { CONFIG } from "../config/index.js";

export class HttpClient {
  private client: AxiosInstance;

  constructor(config?: AxiosRequestConfig) {
    this.client = axios.create({
      timeout: CONFIG.HTTP_TIMEOUT_MS,
      headers: {
        "User-Agent": CONFIG.USER_AGENT,
      },
      ...config,
    });
  }

  get instance(): AxiosInstance {
    return this.client;
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response = await this.client.get<T>(url, config);
    return response.data;
  }

  async getStream(url: string, config?: AxiosRequestConfig) {
    return this.client.get(url, {
      ...config,
      responseType: "stream",
    });
  }
}

export const httpClient = new HttpClient();
