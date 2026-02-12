function validateOrganizationData(data: any): void {
  if (!data.name || typeof data.name !== 'string') {
    throw new Error('Invalid or missing organization name.');
  }
  if (!data.owner || typeof data.owner !== 'string') {
    throw new Error('Invalid or missing organization owner.');
  }
}

export { validateOrganizationData };