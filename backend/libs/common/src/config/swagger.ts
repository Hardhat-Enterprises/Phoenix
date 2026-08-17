import swaggerJSDoc from "swagger-jsdoc";
import * as dotenv from "dotenv";
dotenv.config();
const routesPathDev = "/api-gateway/src/routes/*.ts";
const routesPathProd = "/app/dist/api-gateway/src/routes/*.js";
const routesPath =
  process.env.NODE_ENV === "production" ? routesPathProd : routesPathDev;
const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Phoenix API",
      version: "1.0.0",
      description: "API documentation for Phoenix backend",
    },
    servers: [
      {
        url: process.env.SWAGGER_SERVER_URL,
      },
    ],
  },
  apis: [routesPath],
};

export const swaggerSpec = swaggerJSDoc(options);
