import "dotenv/config";

import { sentryService } from "#app/services/observability/sentry-service.js";

sentryService.init();
