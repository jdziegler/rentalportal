import axios from 'axios';
import fs from 'fs';
import { config } from './config';

interface TokenData {
  access_token: string;
  refresh_token: string;
  expires_at: number; // unix timestamp ms
  fingerprint: string;
  cookies: string;
}

export class TenantCloudAuth {
  private tokenData: TokenData | null = null;
  private refreshPromise: Promise<string> | null = null;

  async loadToken(): Promise<boolean> {
    try {
      if (fs.existsSync(config.tokenPath)) {
        this.tokenData = JSON.parse(fs.readFileSync(config.tokenPath, 'utf-8'));
        return true;
      }
    } catch {
      // ignore
    }
    return false;
  }

  saveToken(): void {
    if (this.tokenData) {
      fs.writeFileSync(config.tokenPath, JSON.stringify(this.tokenData, null, 2));
    }
  }

  private async doRefresh(): Promise<string> {
    if (!this.tokenData) throw new Error('No token data. Run setup first.');

    console.log('Refreshing access token...');

    // Retry up to 3 times with backoff for rate limiting
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await axios.post(`${config.apiUrl}/auth/token`, {
          grant_type: 'refresh_token',
          fingerprint: this.tokenData.fingerprint,
        }, {
          headers: {
            'Cookie': this.tokenData.cookies,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'Origin': config.appUrl,
            'Referer': `${config.appUrl}/`,
          },
          validateStatus: () => true,
        });

        if (res.status === 429) {
          const retryAfter = parseInt(res.headers['retry-after'] || '60', 10);
          console.log(`  Auth rate limited. Waiting ${retryAfter}s...`);
          await new Promise(r => setTimeout(r, retryAfter * 1000));
          continue;
        }

        if (res.status !== 200) {
          throw new Error(`Token refresh failed: ${res.status} ${JSON.stringify(res.data)}`);
        }

        const data = res.data.data || res.data;
        this.tokenData.access_token = data.access_token;
        this.tokenData.expires_at = Date.now() + (data.expires_in || 600) * 1000 - 60000; // 60s buffer

        // Update cookies from set-cookie headers (critical for rotating refresh tokens)
        const setCookies = res.headers['set-cookie'];
        if (setCookies) {
          const existingMap = new Map(
            this.tokenData.cookies.split('; ').map(p => {
              const [k, ...v] = p.split('=');
              return [k!, v.join('=')] as [string, string];
            })
          );
          for (const cookie of setCookies) {
            const pair = cookie.split(';')[0]!;
            const [k, ...v] = pair.split('=');
            existingMap.set(k!, v.join('='));
          }
          this.tokenData.cookies = [...existingMap.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
        }

        this.saveToken();
        console.log('  Token refreshed successfully.');
        return this.tokenData.access_token;
      } catch (err: any) {
        if (attempt === 2) throw err;
        console.log(`  Refresh attempt ${attempt + 1} failed: ${err.message}. Retrying...`);
        await new Promise(r => setTimeout(r, 5000));
      }
    }

    throw new Error('Token refresh failed after 3 attempts');
  }

  async refresh(): Promise<string> {
    // Deduplicate concurrent refresh calls
    if (!this.refreshPromise) {
      this.refreshPromise = this.doRefresh().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  async getAccessToken(): Promise<string> {
    if (!this.tokenData) {
      const loaded = await this.loadToken();
      if (!loaded) throw new Error('No token data. Run setup first.');
    }

    if (Date.now() >= this.tokenData!.expires_at) {
      return this.refresh();
    }

    return this.tokenData!.access_token;
  }

  async setup(params: {
    cookies: string;
    fingerprint: string;
    access_token: string;
    refresh_token: string;
    expires_in: number;
  }): Promise<void> {
    this.tokenData = {
      access_token: params.access_token,
      refresh_token: params.refresh_token,
      expires_at: Date.now() + params.expires_in * 1000 - 60000,
      fingerprint: params.fingerprint,
      cookies: params.cookies,
    };
    this.saveToken();
    console.log('Token data saved. Access token valid for ~10 minutes, will auto-refresh.');
  }
}
