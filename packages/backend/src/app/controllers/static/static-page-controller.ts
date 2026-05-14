import type { HttpData, ResponseData } from '#vendor/types/types.js';

type StaticHttpData = Readonly<
  Omit<HttpData, 'payload' | 'params' | 'contentType' | 'isJson' | 'query'> & {
    path: string;
    referer: string | undefined;
    /** Static-page server uses raw URLSearchParams (no query validator). */
    query: URLSearchParams;
  }
>;

interface StaticPageContext {
  httpData: StaticHttpData;
  responseData: ResponseData;
}

const staticPageController = async (_context: StaticPageContext): Promise<void> => {
  // No-op: static pages are served as-is
};

export default staticPageController;
