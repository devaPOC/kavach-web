import { serviceTypeToNameMap, getServiceNameByType } from './service-mapping';
import { dummyServices } from '@/app/(frontend)/dashboard/data';

/**
 * Validation utilities to ensure service mapping is working correctly
 */

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: {
    totalMappings: number;
    validMappings: number;
    missingMappings: string[];
    unmappedServices: string[];
  };
}

/**
 * Validate that all service types have proper mappings
 */
export function validateServiceMappings(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // Get all service names from dummyServices
  const availableServices = dummyServices.map(service => service.service);
  const mappedServiceNames = Object.values(serviceTypeToNameMap);
  
  // Check for missing mappings (services in dummyServices but not in mapping)
  const missingMappings: string[] = [];
  availableServices.forEach(serviceName => {
    if (!mappedServiceNames.includes(serviceName)) {
      missingMappings.push(serviceName);
      warnings.push(`Service "${serviceName}" from dummyServices is not mapped to any service type`);
    }
  });
  
  // Check for invalid mappings (mapped names that don't exist in dummyServices)
  const unmappedServices: string[] = [];
  Object.entries(serviceTypeToNameMap).forEach(([serviceType, serviceName]) => {
    if (!availableServices.includes(serviceName)) {
      unmappedServices.push(`${serviceType} -> ${serviceName}`);
      errors.push(`Service type "${serviceType}" maps to "${serviceName}" which doesn't exist in dummyServices`);
    }
  });
  
  // Check for duplicate mappings
  const serviceNameCounts = new Map<string, string[]>();
  Object.entries(serviceTypeToNameMap).forEach(([serviceType, serviceName]) => {
    if (!serviceNameCounts.has(serviceName)) {
      serviceNameCounts.set(serviceName, []);
    }
    serviceNameCounts.get(serviceName)!.push(serviceType);
  });
  
  serviceNameCounts.forEach((serviceTypes, serviceName) => {
    if (serviceTypes.length > 1) {
      warnings.push(`Service name "${serviceName}" is mapped to multiple service types: ${serviceTypes.join(', ')}`);
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary: {
      totalMappings: Object.keys(serviceTypeToNameMap).length,
      validMappings: Object.keys(serviceTypeToNameMap).length - unmappedServices.length,
      missingMappings,
      unmappedServices
    }
  };
}

/**
 * Test service mapping with sample data
 */
export function testServiceMapping(): void {
  console.log('=== Service Mapping Validation ===');
  
  const validation = validateServiceMappings();
  
  console.log(`Total mappings: ${validation.summary.totalMappings}`);
  console.log(`Valid mappings: ${validation.summary.validMappings}`);
  console.log(`Validation status: ${validation.isValid ? '✅ PASSED' : '❌ FAILED'}`);
  
  if (validation.errors.length > 0) {
    console.log('\n❌ Errors:');
    validation.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  if (validation.warnings.length > 0) {
    console.log('\n⚠️ Warnings:');
    validation.warnings.forEach(warning => console.log(`  - ${warning}`));
  }
  
  if (validation.summary.missingMappings.length > 0) {
    console.log('\n📝 Services without mappings:');
    validation.summary.missingMappings.forEach(service => console.log(`  - ${service}`));
  }
  
  // Test some common service types
  console.log('\n🧪 Testing common service types:');
  const testTypes = [
    'general-consultation',
    'social-media-privacy-scan',
    'malware-removal',
    'emergency-cybersecurity',
    'cybersecurity-bodyguard'
  ];
  
  testTypes.forEach(serviceType => {
    const serviceName = getServiceNameByType(serviceType);
    console.log(`  ${serviceType} -> ${serviceName}`);
  });
  
  console.log('\n=== End Validation ===');
}

/**
 * Get service mapping coverage statistics
 */
export function getServiceMappingCoverage(): {
  totalServices: number;
  mappedServices: number;
  coveragePercentage: number;
  unmappedServices: string[];
} {
  const totalServices = dummyServices.length;
  const mappedServiceNames = Object.values(serviceTypeToNameMap);
  const availableServices = dummyServices.map(service => service.service);
  
  const mappedServices = availableServices.filter(service => 
    mappedServiceNames.includes(service)
  ).length;
  
  const unmappedServices = availableServices.filter(service => 
    !mappedServiceNames.includes(service)
  );
  
  return {
    totalServices,
    mappedServices,
    coveragePercentage: Math.round((mappedServices / totalServices) * 100),
    unmappedServices
  };
}

/**
 * Generate service mapping report
 */
export function generateServiceMappingReport(): string {
  const validation = validateServiceMappings();
  const coverage = getServiceMappingCoverage();
  
  let report = '# Service Mapping Report\n\n';
  
  report += `## Coverage Statistics\n`;
  report += `- Total services in dummyServices: ${coverage.totalServices}\n`;
  report += `- Mapped services: ${coverage.mappedServices}\n`;
  report += `- Coverage: ${coverage.coveragePercentage}%\n\n`;
  
  report += `## Validation Results\n`;
  report += `- Status: ${validation.isValid ? '✅ PASSED' : '❌ FAILED'}\n`;
  report += `- Errors: ${validation.errors.length}\n`;
  report += `- Warnings: ${validation.warnings.length}\n\n`;
  
  if (validation.errors.length > 0) {
    report += `### Errors\n`;
    validation.errors.forEach(error => {
      report += `- ${error}\n`;
    });
    report += '\n';
  }
  
  if (validation.warnings.length > 0) {
    report += `### Warnings\n`;
    validation.warnings.forEach(warning => {
      report += `- ${warning}\n`;
    });
    report += '\n';
  }
  
  if (coverage.unmappedServices.length > 0) {
    report += `### Unmapped Services\n`;
    coverage.unmappedServices.forEach(service => {
      report += `- ${service}\n`;
    });
    report += '\n';
  }
  
  report += `## Current Mappings\n`;
  Object.entries(serviceTypeToNameMap).forEach(([serviceType, serviceName]) => {
    report += `- \`${serviceType}\` → "${serviceName}"\n`;
  });
  
  return report;
}