"""
Domain registration lookup via RDAP.

-----------------------------
The correlation engine makes NO network calls at prediction time. That is a
deliberate property: predictions are fast, offline, deterministic and testable.

Domain age is genuinely useful evidence, but obtaining it requires a network
lookup. So enrichment happens HERE, offline and cached, and the result is
passed into the message as `domain_registered`. The rule engine then reads a
plain field and stays offline.

    fetch → enrich → cache          (this module, occasional)
                ↓
    evaluate(message_with_domain_registered, hazard)   (offline, per request)

WHY DOMAIN AGE MATTERS
----------------------
Research on maliciously registered phishing domains found an average lifespan
of roughly 8.6 days: scammers register cheap domains to match a live event,
harvest, then abandon them before takedown.

    registered AFTER the hazard started  -> strong evidence FOR correlation
    registered shortly BEFORE            -> plausible, scammers act on forecasts
    registered YEARS before              -> evidence AGAINST, generic infrastructure

RDAP is the modern replacement for WHOIS. Free, no API key for most TLDs.
rdap.org provides bootstrap redirection to the correct registry.

KNOWN LIMITS
------------
- Some TLDs do not publish registration dates
- URL shorteners hide the real destination; resolve before looking up
- Rate limits vary by registry; this module caches aggressively
- A compromised legitimate domain will look old. Domain age is evidence, not
  proof, which is why E7 is scored rather than treated as a veto.
"""

from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Optional
from urllib.parse import urlparse

try:
    import requests
except ImportError:                                        # pragma: no cover
    requests = None

RDAP_BOOTSTRAP = "https://rdap.org/domain/"
DEFAULT_CACHE = Path(__file__).resolve().parent.parent / "data" / "domains.json"


# ---------------------------------------------------------------------------
# URL handling
# ---------------------------------------------------------------------------

# Hosts that redirect elsewhere. Their own registration date is meaningless,
# so E7 must not be misled into treating bit.ly's age as the scam's age.
SHORTENER_HOSTS = {
    "bit.ly", "tinyurl.com", "t.co", "goo.gl", "ow.ly", "is.gd",
    "buff.ly", "rebrand.ly", "cutt.ly", "shorturl.at", "rb.gy",
}


def extract_domain(url: Optional[str]) -> Optional[str]:
    """
    Registrable domain from a URL, or None.

    Returns None for shorteners, so callers can tell "unknown" apart from
    "known and old". Reporting a shortener's own age would be actively
    misleading.
    """
    if not url:
        return None
    try:
        parsed = urlparse(url if "://" in url else f"http://{url}")
        host = (parsed.hostname or "").lower().strip(".")
    except Exception:                                       # noqa: BLE001
        return None
    if not host:
        return None
    if host in SHORTENER_HOSTS:
        return None

    parts = host.split(".")
    if len(parts) < 2:
        return None

    # Handle two-part public suffixes (com.au, co.uk, org.au...). Not a full
    # public-suffix-list implementation; adequate for AU and common TLDs.
    two_part = {"com.au", "net.au", "org.au", "gov.au", "edu.au", "id.au",
                "co.uk", "org.uk", "ac.uk", "gov.uk", "co.nz", "govt.nz"}
    if len(parts) >= 3 and ".".join(parts[-2:]) in two_part:
        return ".".join(parts[-3:])
    return ".".join(parts[-2:])


def is_shortener(url: Optional[str]) -> bool:
    if not url:
        return False
    try:
        host = (urlparse(url if "://" in url else f"http://{url}").hostname or "").lower()
    except Exception:                                       # noqa: BLE001
        return False
    return host in SHORTENER_HOSTS


# ---------------------------------------------------------------------------
# Cache
# ---------------------------------------------------------------------------

class DomainCache:
    """
    Persistent domain -> registration date cache.

    Negative results are cached too. A TLD that does not publish dates will
    never start doing so mid-session, and re-querying wastes rate limit.
    """

    def __init__(self, path: Path | str = DEFAULT_CACHE):
        self.path = Path(path)
        self._data: dict = {}
        if self.path.exists():
            try:
                self._data = json.loads(self.path.read_text())
            except (json.JSONDecodeError, OSError):
                self._data = {}

    def get(self, domain: str) -> Optional[dict]:
        return self._data.get(domain)

    def put(self, domain: str, record: dict) -> None:
        self._data[domain] = record

    def save(self) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(self._data, indent=2))

    def __len__(self) -> int:
        return len(self._data)


# ---------------------------------------------------------------------------
# Lookup
# ---------------------------------------------------------------------------

def lookup_domain(domain: str, timeout: int = 8) -> dict:
    """
    Query RDAP for one domain.

    Returns a record dict; never raises. A failed lookup produces
    {"registered": None, "error": "..."} so callers can distinguish
    "not found" from "not attempted".
    """
    if requests is None:
        return {"registered": None, "error": "requests not installed"}

    try:
        resp = requests.get(f"{RDAP_BOOTSTRAP}{domain}", timeout=timeout,
                            headers={"Accept": "application/rdap+json"})
    except Exception as exc:                                # noqa: BLE001
        return {"registered": None, "error": f"{type(exc).__name__}"}

    if resp.status_code == 404:
        return {"registered": None, "error": "domain not found in RDAP"}
    if not resp.ok:
        return {"registered": None, "error": f"HTTP {resp.status_code}"}

    try:
        data = resp.json()
    except ValueError:
        return {"registered": None, "error": "invalid RDAP JSON"}

    registered = None
    expires = None
    for event in data.get("events", []) or []:
        action = event.get("eventAction")
        if action == "registration":
            registered = event.get("eventDate")
        elif action == "expiration":
            expires = event.get("eventDate")

    return {
        "registered": registered,
        "expires": expires,
        "looked_up_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "error": None if registered else "no registration event published",
    }


def enrich_message(message: dict, cache: Optional[DomainCache] = None,
                   polite_delay: float = 1.0) -> dict:
    """
    Add `domain` and `domain_registered` to a message dict.

    Returns a NEW dict, does not mutate the input. Safe to call on messages
    with no URL: the fields are simply absent, and E7 reports not_evaluated.
    """
    out = dict(message)
    domain = extract_domain(message.get("url"))

    if not domain:
        out["domain"] = None
        out["domain_registered"] = None
        if is_shortener(message.get("url")):
            out["domain_note"] = "URL shortener; real destination not resolved"
        return out

    out["domain"] = domain
    cache = cache or DomainCache()

    record = cache.get(domain)
    if record is None:
        record = lookup_domain(domain)
        cache.put(domain, record)
        cache.save()
        if polite_delay:
            time.sleep(polite_delay)      # be a good citizen with registries

    out["domain_registered"] = record.get("registered")
    if record.get("error"):
        out["domain_note"] = record["error"]
    return out


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def main() -> int:
    import argparse
    ap = argparse.ArgumentParser(description="RDAP domain lookup")
    ap.add_argument("url_or_domain")
    args = ap.parse_args()

    domain = extract_domain(args.url_or_domain) or args.url_or_domain
    if is_shortener(args.url_or_domain):
        print("URL shortener detected. Resolve the real destination first.")
        return 1

    print(f"domain: {domain}")
    rec = lookup_domain(domain)
    for k, v in rec.items():
        print(f"  {k}: {v}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
