import { XtlsApi } from '@remnawave/xtls-sdk';

let xtlsApiInstance: XtlsApi | null = null;

export const getXtlsClient = (): XtlsApi => {
  if (!xtlsApiInstance) {
    const host = process.env.XRAY_API_HOST || '127.0.0.1';
    const port = process.env.XRAY_API_PORT || '10085';

    // Конструктор принимает два строковых аргумента: ip и port
    xtlsApiInstance = new XtlsApi(host, port);

    console.log(`[XtlsClient] Connected to Xray API at ${host}:${port}`);
  }

  return xtlsApiInstance;
};
