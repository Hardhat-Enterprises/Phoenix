import swaggerJSDoc from "swagger-jsdoc";
import * as dotenv from "dotenv";
dotenv.config();
const routesPath = process.cwd() + "/" + process.env.SWAGGER_ROUTES_PATH;
const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Phoenix API",
      version: "1.0.0",
      description: "API documentation for Phoenix backend",
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
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
