import { Request } from "express";

export type IdentifierType = "user" | "ip" | "api-key";

export interface ClientIdentifier {
  type: IdentifierType;
  value: string;
}

interface AuthenticatedRequest extends Request {
  user?: {
    user_id?: string;
  };
}

//Returns a client identifier for rate limiting.


export const getClientIdentifier = (
  req: Request,
  identifierType: IdentifierType,
): ClientIdentifier | null => {

//Authenticated user
  if (identifierType === "user") {
    const user = (req as AuthenticatedRequest).user;

    if (!user?.user_id) {
      return null;
    }

    return {
      type: "user",
      value: `user:${user.user_id}`,
    };
  }

  // IP address
  
  if (identifierType === "ip") {
    if (!req.ip) {
      return null;
    }

    return {
      type: "ip",
      value: `ip:${req.ip}`,
    };
  }

  //API key
   
  if (identifierType === "api-key") {
    const apiKey = req.headers["x-api-key"];

    if (!apiKey || Array.isArray(apiKey)) {
      return null;
    }

    return {
      type: "api-key",
      value: `api-key:${apiKey}`,
    };
  }

  return null;
};