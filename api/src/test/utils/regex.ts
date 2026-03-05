export function getFirstPlanFromPricing(pricing: string){
  const regex = /plans:\s*(?:\r\n|\n|\r)\s+([^\s:]+)/;
  const match = pricing.match(regex);
  if (match && match[1]){
    return match[1];
  }
  throw new Error('No plan name found in pricing');
}

export function getServiceNameFromPricing(pricing: string){
  const regex = /saasName:\s*([^\s]+)/;
  const match = pricing.match(regex);
  if (match && match[1]){
    return match[1];
  }
  throw new Error('No service name found in pricing');
}

export function getVersionFromPricing(pricing: string){
  const regex = /version:\s*([^\s]+)/;
  const match = pricing.match(regex);
  if (match && match[1]){
    return match[1];
  }
  throw new Error('No version found in pricing');
}