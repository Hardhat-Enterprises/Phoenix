interface Config {
    SERVICE_NAME: string;
    PORT: number;
    DEFAULT_TIMEOUT: number;
    AUTH_JWT_SECRET: string;
    GATEWAY_JWT_SECRET: string;
    GATEWAY_JWT_EXPIRES_IN: string;
    LOG_LEVEL: string;
    USER_SERVICE_PORT: number;
}
export declare const config: Config;
export {};
