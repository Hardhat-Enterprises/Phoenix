export interface RateLimitKeyParts {
  environment: string;
  policy: string;
  clientIdentifier: string;
}

const encodePart = (value: string, fieldName: string): string => {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    throw new Error(`${fieldName} must not be empty`);
  }

  return encodeURIComponent(trimmedValue);
};

export const buildRateLimitKey = ({
  environment,
  policy,
  clientIdentifier,
}: RateLimitKeyParts): string =>
  [
    "phoenix",
    "ratelimit",
    encodePart(environment, "environment"),
    encodePart(policy, "policy"),
    encodePart(clientIdentifier, "clientIdentifier"),
  ].join(":");