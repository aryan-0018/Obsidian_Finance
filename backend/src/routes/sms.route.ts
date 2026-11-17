import { Router } from "express";
import { ingestSmsController } from "../controllers/sms.controller";

const smsRoutes = Router();

/**
 * @route   POST /api/sms/ingest
 * @desc    Secure webhook for iOS Shortcuts and automated SMS forwarders
 * @access  Protected by X-API-KEY header (SHA-256 validated)
 */
smsRoutes.post("/ingest", ingestSmsController);

export default smsRoutes;
