import crypto from 'crypto';
import bcrypt from 'bcryptjs';

function generateUserApiKey() {
  const apiKey = "usr_" + crypto.randomBytes(32).toString('hex');
  return apiKey;
};

function generateOrganizationApiKey() {
  const apiKey = "org_" + crypto.randomBytes(32).toString('hex');
  return apiKey;
};

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);

  return hash;
}

export { generateUserApiKey, generateOrganizationApiKey, hashPassword };