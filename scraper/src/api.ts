import axios, { AxiosInstance } from 'axios';
import { TenantCloudAuth } from './auth';
import { config } from './config';

export interface PaginationMeta {
  total: number;
  count: number;
  per_page: number;
  current_page: number;
  total_pages: number;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  meta?: { pagination?: PaginationMeta; [key: string]: any };
  included?: any[];
}

export class TenantCloudAPI {
  private auth: TenantCloudAuth;
  private client: AxiosInstance;
  private requestTimestamps: number[] = [];

  constructor(auth: TenantCloudAuth) {
    this.auth = auth;
    this.client = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      },
    });

    this.client.interceptors.request.use(async (cfg) => {
      await this.rateLimit();
      const token = await this.auth.getAccessToken();
      cfg.headers['Authorization'] = `Bearer ${token}`;
      return cfg;
    });

    // Retry on 429
    this.client.interceptors.response.use(undefined, async (error) => {
      if (error.response?.status === 429) {
        const retryAfter = parseInt(error.response.headers['retry-after'] || '60', 10);
        console.log(`  Rate limited. Waiting ${retryAfter}s...`);
        await this.sleep(retryAfter * 1000);
        return this.client.request(error.config);
      }
      throw error;
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(r => setTimeout(r, ms));
  }

  // Keep requests under 55/minute (API limit is 60)
  private async rateLimit(): Promise<void> {
    const now = Date.now();
    this.requestTimestamps = this.requestTimestamps.filter(t => now - t < 60000);
    if (this.requestTimestamps.length >= 55) {
      const oldest = this.requestTimestamps[0]!;
      const waitMs = 60000 - (now - oldest) + 500;
      console.log(`  Throttling: waiting ${(waitMs / 1000).toFixed(1)}s...`);
      await this.sleep(waitMs);
    }
    this.requestTimestamps.push(Date.now());
  }

  // ── Pagination helper ──

  /**
   * Fetch all pages for an endpoint. Only use for small collections.
   */
  async getAllPages(path: string, params?: Record<string, any>): Promise<any[]> {
    const all: any[] = [];
    let page = 1;

    while (true) {
      const res = await this.client.get(path, { params: { ...params, page } });
      const data = res.data;
      if (!data.data?.length) break;

      all.push(...data.data);

      const pagination = data.meta?.pagination;
      if (!pagination || page >= pagination.total_pages) break;
      page++;
    }

    return all;
  }

  // ── Properties ──

  async getProperties(params?: { page?: number; include?: string }): Promise<PaginatedResponse> {
    const res = await this.client.get('/properties', { params });
    return res.data;
  }

  async getAllProperties(): Promise<any[]> {
    return this.getAllPages('/properties');
  }

  async getProperty(id: string, include?: string): Promise<any> {
    const res = await this.client.get(`/properties/${id}`, { params: include ? { include } : undefined });
    return res.data;
  }

  async getPropertyWithUnits(id: string): Promise<any> {
    return this.getProperty(id, 'units');
  }

  // ── Units ──

  async getUnits(params?: { page?: number }): Promise<PaginatedResponse> {
    const res = await this.client.get('/units', { params });
    return res.data;
  }

  async getAllUnits(): Promise<any[]> {
    return this.getAllPages('/units');
  }

  async getUnit(id: string): Promise<any> {
    const res = await this.client.get(`/units/${id}`);
    return res.data;
  }

  // ── Leases ──

  async getLeases(params?: { page?: number; include?: string }): Promise<PaginatedResponse> {
    const res = await this.client.get('/leases', { params });
    return res.data;
  }

  async getAllLeases(): Promise<any[]> {
    return this.getAllPages('/leases');
  }

  async getLease(id: string, include?: string): Promise<any> {
    const res = await this.client.get(`/leases/${id}`, { params: include ? { include } : undefined });
    return res.data;
  }

  async getLeaseWithDetails(id: string): Promise<any> {
    return this.getLease(id, 'unit,property');
  }

  // ── Contacts (Tenants, Professionals) ──

  async getContacts(params?: { page?: number }): Promise<PaginatedResponse> {
    const res = await this.client.get('/contacts', { params });
    return res.data;
  }

  async getAllContacts(): Promise<any[]> {
    return this.getAllPages('/contacts');
  }

  async getTenants(): Promise<any[]> {
    const all = await this.getAllContacts();
    return all.filter(c => c.attributes.role === 'tenant');
  }

  // ── Transactions (paginated - do NOT fetch all 3500+) ──

  async getTransactions(params?: { page?: number }): Promise<PaginatedResponse> {
    const res = await this.client.get('/transactions', { params });
    return res.data;
  }

  async getTransaction(id: string): Promise<any> {
    const res = await this.client.get(`/transactions/${id}`);
    return res.data;
  }

  // ── Applications ──

  async getApplications(params?: { page?: number }): Promise<PaginatedResponse> {
    const res = await this.client.get('/applications', { params });
    return res.data;
  }

  // ── Screenings ──

  async getScreenings(params?: { page?: number }): Promise<PaginatedResponse> {
    const res = await this.client.get('/screenings', { params });
    return res.data;
  }

  // ── Listings ──

  async getListings(params?: { page?: number }): Promise<PaginatedResponse> {
    const res = await this.client.get('/listings', { params });
    return res.data;
  }

  // ── Files ──

  async getFiles(params?: { page?: number }): Promise<PaginatedResponse> {
    const res = await this.client.get('/files', { params });
    return res.data;
  }

  // ── Tasks ──

  async getTasks(params?: { page?: number }): Promise<PaginatedResponse> {
    const res = await this.client.get('/tasks', { params });
    return res.data;
  }

  // ── Generic ──

  async get(path: string, params?: Record<string, any>): Promise<any> {
    const res = await this.client.get(path, { params });
    return res.data;
  }
}
