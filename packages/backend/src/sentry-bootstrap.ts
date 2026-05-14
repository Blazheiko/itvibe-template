import "dotenv/config";

import { sentryService } from "#app/services/sentry-service.js";

sentryService.init();
