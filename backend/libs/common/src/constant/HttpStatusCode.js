"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpStatusCode = void 0;
var HttpStatusCode;
(function (HttpStatusCode) {
    HttpStatusCode[HttpStatusCode["HTTP_STATUS_OK"] = 200] = "HTTP_STATUS_OK";
    HttpStatusCode[HttpStatusCode["HTTP_STATUS_CREATED"] = 201] = "HTTP_STATUS_CREATED";
    HttpStatusCode[HttpStatusCode["HTTP_STATUS_ACCEPTED"] = 202] = "HTTP_STATUS_ACCEPTED";
    HttpStatusCode[HttpStatusCode["HTTP_STATUS_NO_CONTENT"] = 204] = "HTTP_STATUS_NO_CONTENT";
    HttpStatusCode[HttpStatusCode["HTTP_STATUS_BAD_REQUEST"] = 400] = "HTTP_STATUS_BAD_REQUEST";
    HttpStatusCode[HttpStatusCode["HTTP_STATUS_UNAUTHORIZED"] = 401] = "HTTP_STATUS_UNAUTHORIZED";
    HttpStatusCode[HttpStatusCode["HTTP_STATUS_FORBIDDEN"] = 403] = "HTTP_STATUS_FORBIDDEN";
    HttpStatusCode[HttpStatusCode["HTTP_STATUS_NOT_FOUND"] = 404] = "HTTP_STATUS_NOT_FOUND";
    HttpStatusCode[HttpStatusCode["HTTP_STATUS_INTERNAL_SERVER_ERROR"] = 500] = "HTTP_STATUS_INTERNAL_SERVER_ERROR";
    HttpStatusCode[HttpStatusCode["HTTP_STATUS_NOT_IMPLEMENTED"] = 501] = "HTTP_STATUS_NOT_IMPLEMENTED";
    HttpStatusCode[HttpStatusCode["HTTP_STATUS_BAD_GATEWAY"] = 502] = "HTTP_STATUS_BAD_GATEWAY";
    HttpStatusCode[HttpStatusCode["HTTP_STATUS_SERVICE_UNAVAILABLE"] = 503] = "HTTP_STATUS_SERVICE_UNAVAILABLE";
})(HttpStatusCode || (exports.HttpStatusCode = HttpStatusCode = {}));
