import { describe, it, expect, beforeEach } from 'vitest';
import { resetEscapeVersionInService, resetEscapePricingVersion } from '../../main/utils/services/helpers';
import { LeanService, PricingEntry } from '../../main/types/models/Service';
import { LeanPricing } from '../../main/types/models/Pricing';

describe('resetEscapeVersionInService', () => {
  describe('activePricings - basic cases', () => {
    it('should replace underscores with dots in activePricings keys', () => {
      const service: LeanService = {
        name: 'Test Service',
        disabled: false,
        organizationId: 'org123',
        activePricings: new Map([
          ['1_0_0', { id: 'price1', url: 'http://example.com/1.0.0' }],
          ['2_5_3', { id: 'price2', url: 'http://example.com/2.5.3' }]
        ])
      };

      resetEscapeVersionInService(service);

      expect(service.activePricings.has('1.0.0')).toBe(true);
      expect(service.activePricings.has('2.5.3')).toBe(true);
      expect(service.activePricings.has('1_0_0')).toBe(false);
      expect(service.activePricings.has('2_5_3')).toBe(false);
      expect(service.activePricings.get('1.0.0')?.id).toBe('price1');
      expect(service.activePricings.get('2.5.3')?.id).toBe('price2');
    });

    it('should not modify keys that do not contain underscores', () => {
      const service: LeanService = {
        name: 'Test Service',
        disabled: false,
        organizationId: 'org123',
        activePricings: new Map([
          ['1.0.0', { id: 'price1', url: 'http://example.com/1.0.0' }],
          ['2.5.3', { id: 'price2', url: 'http://example.com/2.5.3' }]
        ])
      };

      resetEscapeVersionInService(service);

      expect(service.activePricings.has('1.0.0')).toBe(true);
      expect(service.activePricings.has('2.5.3')).toBe(true);
      expect(service.activePricings.size).toBe(2);
    });

    it('should handle empty activePricings Map', () => {
      const service: LeanService = {
        name: 'Test Service',
        disabled: false,
        organizationId: 'org123',
        activePricings: new Map()
      };

      resetEscapeVersionInService(service);

      expect(service.activePricings.size).toBe(0);
    });

    it('should handle mixed keys (some with underscores, some without)', () => {
      const service: LeanService = {
        name: 'Test Service',
        disabled: false,
        organizationId: 'org123',
        activePricings: new Map([
          ['1_0_0', { id: 'price1', url: 'http://example.com/1.0.0' }],
          ['2.5.3', { id: 'price2', url: 'http://example.com/2.5.3' }],
          ['3_1_2', { id: 'price3', url: 'http://example.com/3.1.2' }]
        ])
      };

      resetEscapeVersionInService(service);

      expect(service.activePricings.has('1.0.0')).toBe(true);
      expect(service.activePricings.has('2.5.3')).toBe(true);
      expect(service.activePricings.has('3.1.2')).toBe(true);
      expect(service.activePricings.has('1_0_0')).toBe(false);
      expect(service.activePricings.has('3_1_2')).toBe(false);
      expect(service.activePricings.size).toBe(3);
    });
  });

  describe('activePricings - edge cases', () => {
    it('should handle versions with multiple underscores', () => {
      const service: LeanService = {
        name: 'Test Service',
        disabled: false,
        organizationId: 'org123',
        activePricings: new Map([
          ['1_0_0_beta_1', { id: 'price1', url: 'http://example.com' }]
        ])
      };

      resetEscapeVersionInService(service);

      expect(service.activePricings.has('1.0.0.beta.1')).toBe(true);
      expect(service.activePricings.has('1_0_0_beta_1')).toBe(false);
    });

    it('should handle versions with only underscores', () => {
      const service: LeanService = {
        name: 'Test Service',
        disabled: false,
        organizationId: 'org123',
        activePricings: new Map([
          ['___', { id: 'price1', url: 'http://example.com' }]
        ])
      };

      resetEscapeVersionInService(service);

      expect(service.activePricings.has('...')).toBe(true);
      expect(service.activePricings.has('___')).toBe(false);
    });

    it('should handle version keys with special characters', () => {
      const service: LeanService = {
        name: 'Test Service',
        disabled: false,
        organizationId: 'org123',
        activePricings: new Map([
          ['v1_0_0-alpha', { id: 'price1', url: 'http://example.com' }],
          ['2_5_3+build123', { id: 'price2', url: 'http://example.com' }]
        ])
      };

      resetEscapeVersionInService(service);

      expect(service.activePricings.has('v1.0.0-alpha')).toBe(true);
      expect(service.activePricings.has('2.5.3+build123')).toBe(true);
    });
  });

  describe('archivedPricings - basic cases', () => {
    it('should replace underscores with dots in archivedPricings keys', () => {
      const service: LeanService = {
        name: 'Test Service',
        disabled: false,
        organizationId: 'org123',
        activePricings: new Map(),
        archivedPricings: new Map([
          ['0_9_0', { id: 'price1', url: 'http://example.com/0.9.0' }],
          ['1_0_0', { id: 'price2', url: 'http://example.com/1.0.0' }]
        ])
      };

      resetEscapeVersionInService(service);

      expect(service.archivedPricings!.has('0.9.0')).toBe(true);
      expect(service.archivedPricings!.has('1.0.0')).toBe(true);
      expect(service.archivedPricings!.has('0_9_0')).toBe(false);
      expect(service.archivedPricings!.has('1_0_0')).toBe(false);
    });

    it('should handle undefined archivedPricings', () => {
      const service: LeanService = {
        name: 'Test Service',
        disabled: false,
        organizationId: 'org123',
        activePricings: new Map([
          ['1_0_0', { id: 'price1', url: 'http://example.com' }]
        ])
      };

      expect(() => resetEscapeVersionInService(service)).not.toThrow();
    });

    it('should handle empty archivedPricings Map', () => {
      const service: LeanService = {
        name: 'Test Service',
        disabled: false,
        organizationId: 'org123',
        activePricings: new Map(),
        archivedPricings: new Map()
      };

      resetEscapeVersionInService(service);

      expect(service.archivedPricings!.size).toBe(0);
    });
  });

  describe('activePricings and archivedPricings together', () => {
    it('should process both activePricings and archivedPricings correctly', () => {
      const service: LeanService = {
        name: 'Test Service',
        disabled: false,
        organizationId: 'org123',
        activePricings: new Map([
          ['2_0_0', { id: 'active1', url: 'http://example.com/2.0.0' }],
          ['3_0_0', { id: 'active2', url: 'http://example.com/3.0.0' }]
        ]),
        archivedPricings: new Map([
          ['1_0_0', { id: 'archived1', url: 'http://example.com/1.0.0' }],
          ['1_5_0', { id: 'archived2', url: 'http://example.com/1.5.0' }]
        ])
      };

      resetEscapeVersionInService(service);

      expect(service.activePricings.has('2.0.0')).toBe(true);
      expect(service.activePricings.has('3.0.0')).toBe(true);
      expect(service.archivedPricings!.has('1.0.0')).toBe(true);
      expect(service.archivedPricings!.has('1.5.0')).toBe(true);
      
      expect(service.activePricings.has('2_0_0')).toBe(false);
      expect(service.archivedPricings!.has('1_0_0')).toBe(false);
      
      expect(service.activePricings.size).toBe(2);
      expect(service.archivedPricings!.size).toBe(2);
    });
  });

  describe('potential bugs - collision scenarios', () => {
    it('BUG: should handle collision when both "1_0_0" and "1.0.0" exist', () => {
      const service: LeanService = {
        name: 'Test Service',
        disabled: false,
        organizationId: 'org123',
        activePricings: new Map([
          ['1_0_0', { id: 'underscore', url: 'http://example.com/underscore' }],
          ['1.0.0', { id: 'dot', url: 'http://example.com/dot' }]
        ])
      };

      resetEscapeVersionInService(service);

      // This is a potential bug: which entry should remain?
      // The current implementation will overwrite one with the other
      expect(service.activePricings.has('1.0.0')).toBe(true);
      
      // After transformation, we should only have one entry for "1.0.0"
      // But which one? The function processes in iteration order
      const entry = service.activePricings.get('1.0.0');
      
      // The last processed entry will win
      // Since Maps iterate in insertion order, "1.0.0" (dot) is second
      // First "1_0_0" gets converted to "1.0.0" (overwrites nothing, creates new)
      // Then "1.0.0" stays as "1.0.0" (no change needed, already exists)
      // But the delete happens AFTER set, so order matters
      console.log('Entry after collision:', entry);
    });

    it('BUG: modifying Map while iterating - order dependency', () => {
      const service: LeanService = {
        name: 'Test Service',
        disabled: false,
        organizationId: 'org123',
        activePricings: new Map([
          ['1_0_0', { id: 'first', url: 'url1' }],
          ['2_0_0', { id: 'second', url: 'url2' }],
          ['3_0_0', { id: 'third', url: 'url3' }]
        ])
      };

      const originalSize = service.activePricings.size;
      resetEscapeVersionInService(service);

      // Should maintain the same number of entries
      expect(service.activePricings.size).toBe(originalSize);
      
      // All entries should be transformed
      expect(service.activePricings.has('1.0.0')).toBe(true);
      expect(service.activePricings.has('2.0.0')).toBe(true);
      expect(service.activePricings.has('3.0.0')).toBe(true);
    });
  });
});

describe('resetEscapePricingVersion', () => {
  it('should replace underscores with dots in pricing version', () => {
    const pricing: LeanPricing = {
      version: '1_0_0',
      currency: 'USD',
      createdAt: new Date(),
      features: {}
    };

    resetEscapePricingVersion(pricing);

    expect(pricing.version).toBe('1.0.0');
  });

  it('should handle version without underscores', () => {
    const pricing: LeanPricing = {
      version: '1.0.0',
      currency: 'USD',
      createdAt: new Date(),
      features: {}
    };

    resetEscapePricingVersion(pricing);

    expect(pricing.version).toBe('1.0.0');
  });

  it('should handle complex version strings', () => {
    const pricing: LeanPricing = {
      version: '2_5_3_beta_1',
      currency: 'EUR',
      createdAt: new Date(),
      features: {}
    };

    resetEscapePricingVersion(pricing);

    expect(pricing.version).toBe('2.5.3.beta.1');
  });

  it('should mutate the original pricing object', () => {
    const pricing: LeanPricing = {
      version: '3_2_1',
      currency: 'USD',
      createdAt: new Date(),
      features: {}
    };

    const originalRef = pricing;
    resetEscapePricingVersion(pricing);

    expect(originalRef.version).toBe('3.2.1');
    expect(pricing).toBe(originalRef);
  });

  it('should handle empty version string', () => {
    const pricing: LeanPricing = {
      version: '',
      currency: 'USD',
      createdAt: new Date(),
      features: {}
    };

    resetEscapePricingVersion(pricing);

    expect(pricing.version).toBe('');
  });

  it('should handle version with only underscores', () => {
    const pricing: LeanPricing = {
      version: '___',
      currency: 'USD',
      createdAt: new Date(),
      features: {}
    };

    resetEscapePricingVersion(pricing);

    expect(pricing.version).toBe('...');
  });
});
