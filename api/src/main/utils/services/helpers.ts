import { LeanPricing } from '../../types/models/Pricing';
import { LeanService } from '../../types/models/Service';
import { resetEscapeVersion } from '../helpers';

function resetEscapeVersionInService(service: LeanService): void {
  for (const [version, pricing] of service.activePricings.entries()) {
    const formattedVersion = resetEscapeVersion(version);

    if (formattedVersion !== version) {
      service.activePricings.set(formattedVersion, pricing);
      service.activePricings.delete(version);
    }
  }

  for (const [version, pricing] of (service.archivedPricings?.entries() ?? [])) {
    const formattedVersion = resetEscapeVersion(version);

    if (formattedVersion !== version) {
      service.archivedPricings!.set(formattedVersion, pricing);
      service.archivedPricings!.delete(version);
    }
  }
}

function resetEscapePricingVersion(pricing: LeanPricing){
  pricing.version = resetEscapeVersion(pricing.version);
}

export { resetEscapeVersionInService, resetEscapePricingVersion };
