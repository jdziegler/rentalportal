export interface Config {
  apiUrl: string;
  appUrl: string;
  cookiesPath: string;
  tokenPath: string;
}

export const config: Config = {
  apiUrl: 'https://api.tenantcloud.com',
  appUrl: 'https://app.tenantcloud.com',
  cookiesPath: './cookies.json',
  tokenPath: './token.json',
};
