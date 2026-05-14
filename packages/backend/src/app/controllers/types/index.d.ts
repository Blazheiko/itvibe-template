export interface BaseResponse {
    status: string;
}

export interface ErrorResponse extends BaseResponse {
    status: 'error';
    code: string;
    message: string;
    reason?: string;
    details?: unknown;
}

export type {
    RegisterResponse,
    LoginResponse,
    LogoutResponse,
} from './AuthController.js';
