interface AutoplayEnvironment {
  userAgent: string;
  platform: string;
  maxTouchPoints: number;
  hasBeenActive: boolean;
}

function isIosDevice({ userAgent, platform, maxTouchPoints }: AutoplayEnvironment): boolean {
  if (/iPad|iPhone|iPod/.test(userAgent)) {
    return true;
  }

  // iPadOS reports a desktop Mac user agent.
  return platform === "MacIntel" && maxTouchPoints > 1;
}

/**
 * Ads may start without a tap only when the visitor already interacted with the page and the
 * device is not iOS, where the first ad play must come from a gesture.
 */
export function canAutoStartAds(environment: AutoplayEnvironment): boolean {
  return environment.hasBeenActive && !isIosDevice(environment);
}

export function readAutoplayEnvironment(): AutoplayEnvironment {
  return {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    maxTouchPoints: navigator.maxTouchPoints,
    hasBeenActive: navigator.userActivation?.hasBeenActive ?? false,
  };
}
