/**
 * Stream Proxy SSRF Protection and Private Host Validator
 *
 * Validates upstream target URLs and blocks private/internal network addresses
 * (localhost, private IPv4/IPv6, link-local, cloud metadata).
 */

function isPrivateIpv4(ip: string): boolean {
  const parts = ip.split(".").map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true;
  }
  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;
  // 10.0.0.0/8 (Private network)
  if (a === 10) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link-local, AWS/GCP/Azure instance metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (Private network: 172.16.0.0 – 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 (Private network)
  if (a === 192 && b === 168) return true;
  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 192.0.0.0/24 (IETF Protocol Assignments)
  if (a === 192 && b === 0 && parts[2] === 0) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (a >= 224) return true;

  return false;
}

export function isPrivateHost(hostname: string): boolean {
  let host = hostname.toLowerCase().trim();

  // Strip wrapping brackets (for IPv6 literals like [::1])
  if (host.startsWith("[") && host.includes("]")) {
    const closeBracket = host.indexOf("]");
    host = host.slice(1, closeBracket);
  } else if (host.includes(":") && !host.includes("::")) {
    // If standard host:port format with a single colon, strip port
    const colonIdx = host.indexOf(":");
    if (host.indexOf(":", colonIdx + 1) === -1) {
      host = host.slice(0, colonIdx);
    }
  }

  // Strip trailing DNS root dot
  host = host.replace(/\.+$/, "");

  if (!host) return true;

  // Localhost and internal network hostnames
  if (
    host === "localhost" ||
    host.endsWith(".local") ||
    host.endsWith(".internal") ||
    host.endsWith(".lan") ||
    host.endsWith(".home") ||
    host.endsWith(".corp") ||
    host === "metadata.google.internal"
  ) {
    return true;
  }

  // IPv6 loopback and unique local / link-local addresses
  if (
    host === "::1" ||
    host === "::" ||
    host.startsWith("fe80:") ||
    host.startsWith("fe8") ||
    host.startsWith("fe9") ||
    host.startsWith("fea") ||
    host.startsWith("feb") ||
    host.startsWith("fc") ||
    host.startsWith("fd")
  ) {
    return true;
  }

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1)
  if (host.startsWith("::ffff:")) {
    const ipv4Part = host.slice(7);
    return isPrivateIpv4(ipv4Part);
  }

  // Standard or shorthand IPv4 check
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host)) {
    return isPrivateIpv4(host);
  }

  // Block numeric single-value or non-quad IPs (e.g. 2130706433 or 127.1)
  if (/^\d+$/.test(host) || /^(\d+\.){1,2}\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host)) {
    return true;
  }

  return false;
}

export function isPublicStreamingHost(urlOrHostname: string | URL): boolean {
  let hostname = "";
  if (typeof urlOrHostname === "string") {
    try {
      hostname = new URL(urlOrHostname).hostname;
    } catch {
      hostname = urlOrHostname;
    }
  } else {
    hostname = urlOrHostname.hostname;
  }

  hostname = hostname.toLowerCase().trim();
  if (hostname.startsWith("[") && hostname.includes("]")) {
    hostname = hostname.slice(1, hostname.indexOf("]"));
  }
  hostname = hostname.replace(/\.+$/, "");

  if (!hostname) return false;
  return !isPrivateHost(hostname);
}
