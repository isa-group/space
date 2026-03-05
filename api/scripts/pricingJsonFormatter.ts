import fs from 'fs';
import path from 'path';

// Interfaces for typing
interface Feature {
  name?: string;
  valueType?: string;
  defaultValue?: any;
  value?: any;
  description?: string;
  type?: string;
  tag?: string;
  render?: string;
  [key: string]: any;
}

interface UsageLimit {
  name?: string;
  value?: any;
  defaultValue?: any;
  trackable?: boolean;
  render?: string;
  [key: string]: any;
}

interface Plan {
  private: boolean;
  features?: Record<string, Feature>;
  usageLimits?: Record<string, UsageLimit>;
  [key: string]: any;
}

interface AddOn {
  name?: string;
  description?: string;
  private?: boolean;
  price?: any;
  availableFor?: string[];
  dependsOn?: string[];
  excludes?: string[];
  features?: Record<string, Feature>;
  usageLimits?: Record<string, any>;
  usageLimitsExtensions?: Record<string, any>;
  subscriptionConstraints?: {
    minQuantity?: number;
    maxQuantity?: number;
    quantityStep?: number;
  };
  [key: string]: any;
}

interface Pricing {
  _id: { $oid: string };
  _serviceName: string;
  _organizationId: string;
  version: string;
  currency: string;
  createdAt: string;
  features: Record<string, Feature>;
  usageLimits: Record<string, UsageLimit>;
  plans: Record<string, Plan>;
  addOns: Record<string, AddOn>;
  [key: string]: any;
}

// Path for source and destination files
const inputFilePath = path.resolve(__dirname, '../src/main/database/seeders/mongo/pricings/pricings.json');
const outputDir = path.resolve(__dirname, 'output');
const outputFilePath = path.resolve(outputDir, 'transformed_pricings.json');

// Ensure the output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Main function to transform the JSON
function transformPricingJson() {
  try {
    // Read the JSON file
    const data = fs.readFileSync(inputFilePath, 'utf8');
    const pricings: Pricing[] = JSON.parse(data);
    
    // Process each pricing
    const transformedPricings = pricings.map(pricing => transformPricing(pricing));
    
    // Write the transformed data to a new file
    fs.writeFileSync(outputFilePath, JSON.stringify(transformedPricings, null, 2));
    
    console.log(`File succesfully generated in: ${outputFilePath}`);
    
    // Generate specific files for each service
    transformedPricings.forEach(pricing => {
      const serviceFileName = `${pricing._serviceName}.json`;
      const serviceFilePath = path.resolve(outputDir, serviceFileName);
      fs.writeFileSync(serviceFilePath, JSON.stringify(pricing, null, 2));
      console.log(`Specific file for ${pricing._serviceName} generated at: ${serviceFilePath}`);
    });
  } catch (error) {
    console.error('Error processing the JSON file:', error);
  }
}

function transformPricing(pricing: Pricing): Pricing {
  const result = { ...pricing };
  
  // Gobal features transformation
  if (result.features) {
    for (const planName in result.plans){
      const plan = result.plans[planName];
      plan.features = transformFeatures(plan.features!);
    }
  }
  
  // Gobal usageLimtis transformation
  if (result.usageLimits) {
    for (const planName in result.plans){
      const plan = result.plans[planName];
      plan.usageLimits = transformUsageLimits(plan.usageLimits!);
    }
  }
  
  // AddOns transformation
  if (result.addOns) {
    result.addOns = transformAddOns(result.addOns);
  }
  
  return result;
}

// Transform features
function transformFeatures(features: Record<string, Feature>): Record<string, any> {
  const transformedFeatures: Record<string, any> = {};
  
  for (const [key, feature] of Object.entries(features)) {
    // Use the value or the default value, and ensure the result is not undefined
    transformedFeatures[key] = feature.value !== undefined ? feature.value : (feature.defaultValue !== undefined ? feature.defaultValue : null);
  }
  
  return transformedFeatures;
}

// Transform usageLimits
function transformUsageLimits(usageLimits: Record<string, UsageLimit>): Record<string, any> {
  const transformedUsageLimits: Record<string, any> = {};
  
  for (const [key, limit] of Object.entries(usageLimits)) {
    // Use the value or the default value
    transformedUsageLimits[key] = limit.value !== undefined ? limit.value : (limit.defaultValue !== undefined ? limit.defaultValue : null);
  }
  
  return transformedUsageLimits;
}

// Transform addOns
function transformAddOns(addOns: Record<string, AddOn>): Record<string, AddOn> {
  const transformedAddOns: Record<string, AddOn> = {};
  
  for (const [key, addOn] of Object.entries(addOns)) {
    const transformedAddOn = { ...addOn };
    
    // Transform features of addOns if they exist
    if (transformedAddOn.features) {
      const features: Record<string, any> = {};
      for (const [featureKey, feature] of Object.entries(transformedAddOn.features)) {
        features[featureKey] = feature.value;
      }
      transformedAddOn.features = features;
    }
    
    // Transform usageLimits of addOns if they exist
    if (transformedAddOn.usageLimits) {
      const limits: Record<string, any> = {};
      for (const [limitKey, limit] of Object.entries(transformedAddOn.usageLimits)) {
        limits[limitKey] = limit.value;
      }
      transformedAddOn.usageLimits = limits;
    }
    
    // Transform usageLimitsExtensions of addOns if they exist
    if (transformedAddOn.usageLimitsExtensions) {
      const extensions: Record<string, any> = {};
      for (const [extKey, ext] of Object.entries(transformedAddOn.usageLimitsExtensions)) {
        extensions[extKey] = ext.value;
      }
      transformedAddOn.usageLimitsExtensions = extensions;
    }
    
    transformedAddOns[key] = transformedAddOn;
  }
  
  return transformedAddOns;
}

// Execute the main function
transformPricingJson();