/**
 * Security Monitoring and Intrusion Detection System
 * Implements comprehensive security monitoring, anomaly detection, and alerting
 */

import { NextRequest } from 'next/server';
import { logger } from '@/lib/utils/logger';
import { emitAudit, AuditEventName } from '@/lib/utils/audit-logger';
import { createId } from '@paralleldrive/cuid2';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: Date;
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  endpoint: string;
  method: string;
  payload?: any;
  metadata: Record<string, any>;
  riskScore: number;
  blocked: boolean;
}

export enum SecurityEventType {
  SUSPICIOUS_LOGIN = 'suspicious_login',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  INVALID_INPUT = 'invalid_input',
  XSS_ATTEMPT = 'xss_attempt',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  UNAUTHORIZED_ACCESS = 'unauthorized_access',
  SUSPICIOUS_PATTERN = 'suspicious_pattern',
  BRUTE_FORCE_ATTEMPT = 'brute_force_attempt',
  ANOMALOUS_BEHAVIOR = 'anomalous_behavior',
  MALICIOUS_FILE_UPLOAD = 'malicious_file_upload',
  SUSPICIOUS_USER_AGENT = 'suspicious_user_agent',
  GEO_ANOMALY = 'geo_anomaly',
  TIME_ANOMALY = 'time_anomaly',
  QUIZ_CHEATING_ATTEMPT = 'quiz_cheating_attempt',
  DATA_EXFILTRATION_ATTEMPT = 'data_exfiltration_attempt'
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface SecurityRule {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  eventType: SecurityEventType;
  conditions: SecurityCondition[];
  actions: SecurityAction[];
  riskScore: number;
  cooldownPeriod: number; // minutes
}

export interface SecurityCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'gt' | 'lt' | 'in';
  value: any;
  caseSensitive?: boolean;
}

export interface SecurityAction {
  type: 'log' | 'alert' | 'block' | 'throttle' | 'notify';
  parameters: Record<string, any>;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  blockedRequests: number;
  averageRiskScore: number;
  topRiskyIPs: Array<{ ip: string; count: number; riskScore: number }>;
  topRiskyEndpoints: Array<{ endpoint: string; count: number; riskScore: number }>;
  recentEvents: SecurityEvent[];
}

export interface AnomalyDetectionConfig {
  enableBehavioralAnalysis: boolean;
  enableGeolocationAnalysis: boolean;
  enableTimePatternAnalysis: boolean;
  enableVolumeAnalysis: boolean;
  learningPeriodDays: number;
  anomalyThreshold: number;
  maxEventsPerWindow: number;
  windowSizeMinutes: number;
}

export const DEFAULT_ANOMALY_CONFIG: AnomalyDetectionConfig = {
  enableBehavioralAnalysis: true,
  enableGeolocationAnalysis: true,
  enableTimePatternAnalysis: true,
  enableVolumeAnalysis: true,
  learningPeriodDays: 7,
  anomalyThreshold: 0.8,
  maxEventsPerWindow: 100,
  windowSizeMinutes: 5
};

/**
 * Security Event Store (In-memory with persistence simulation)
 */
class SecurityEventStore {
  private events: Map<string, SecurityEvent> = new Map();
  private eventsByIP: Map<string, SecurityEvent[]> = new Map();
  private eventsByUser: Map<string, SecurityEvent[]> = new Map();
  private eventsByEndpoint: Map<string, SecurityEvent[]> = new Map();
  private maxEvents = 10000; // Keep last 10k events in memory

  addEvent(event: SecurityEvent): void {
    // Add to main store
    this.events.set(event.id, event);

    // Add to IP index
    if (!this.eventsByIP.has(event.ipAddress)) {
      this.eventsByIP.set(event.ipAddress, []);
    }
    this.eventsByIP.get(event.ipAddress)!.push(event);

    // Add to user index
    if (event.userId) {
      if (!this.eventsByUser.has(event.userId)) {
        this.eventsByUser.set(event.userId, []);
      }
      this.eventsByUser.get(event.userId)!.push(event);
    }

    // Add to endpoint index
    if (!this.eventsByEndpoint.has(event.endpoint)) {
      this.eventsByEndpoint.set(event.endpoint, []);
    }
    this.eventsByEndpoint.get(event.endpoint)!.push(event);

    // Cleanup old events if needed
    if (this.events.size > this.maxEvents) {
      this.cleanup();
    }
  }

  getEventsByIP(ipAddress: string, since?: Date): SecurityEvent[] {
    const events = this.eventsByIP.get(ipAddress) || [];
    if (since) {
      return events.filter(e => e.timestamp >= since);
    }
    return events;
  }

  getEventsByUser(userId: string, since?: Date): SecurityEvent[] {
    const events = this.eventsByUser.get(userId) || [];
    if (since) {
      return events.filter(e => e.timestamp >= since);
    }
    return events;
  }

  getEventsByEndpoint(endpoint: string, since?: Date): SecurityEvent[] {
    const events = this.eventsByEndpoint.get(endpoint) || [];
    if (since) {
      return events.filter(e => e.timestamp >= since);
    }
    return events;
  }

  getEventsByType(type: SecurityEventType, since?: Date): SecurityEvent[] {
    const events = Array.from(this.events.values()).filter(e => e.type === type);
    if (since) {
      return events.filter(e => e.timestamp >= since);
    }
    return events;
  }

  getAllEvents(since?: Date): SecurityEvent[] {
    const events = Array.from(this.events.values());
    if (since) {
      return events.filter(e => e.timestamp >= since);
    }
    return events;
  }

  private cleanup(): void {
    // Remove oldest 20% of events
    const events = Array.from(this.events.values()).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
    const toRemove = Math.floor(events.length * 0.2);
    
    for (let i = 0; i < toRemove; i++) {
      const event = events[i];
      this.events.delete(event.id);
      
      // Clean up indexes
      this.cleanupIndex(this.eventsByIP, event.ipAddress, event.id);
      if (event.userId) {
        this.cleanupIndex(this.eventsByUser, event.userId, event.id);
      }
      this.cleanupIndex(this.eventsByEndpoint, event.endpoint, event.id);
    }
  }

  private cleanupIndex(index: Map<string, SecurityEvent[]>, key: string, eventId: string): void {
    const events = index.get(key);
    if (events) {
      const filtered = events.filter(e => e.id !== eventId);
      if (filtered.length === 0) {
        index.delete(key);
      } else {
        index.set(key, filtered);
      }
    }
  }
}

/**
 * Anomaly Detection Engine
 */
class AnomalyDetector {
  private config: AnomalyDetectionConfig;
  private userBehaviorProfiles: Map<string, UserBehaviorProfile> = new Map();
  private ipBehaviorProfiles: Map<string, IPBehaviorProfile> = new Map();

  constructor(config: AnomalyDetectionConfig = DEFAULT_ANOMALY_CONFIG) {
    this.config = config;
  }

  detectAnomalies(event: SecurityEvent, historicalEvents: SecurityEvent[]): AnomalyResult {
    const anomalies: Anomaly[] = [];

    if (this.config.enableBehavioralAnalysis && event.userId) {
      const behavioralAnomalies = this.detectBehavioralAnomalies(event, historicalEvents);
      anomalies.push(...behavioralAnomalies);
    }

    if (this.config.enableGeolocationAnalysis) {
      const geoAnomalies = this.detectGeolocationAnomalies(event, historicalEvents);
      anomalies.push(...geoAnomalies);
    }

    if (this.config.enableTimePatternAnalysis) {
      const timeAnomalies = this.detectTimePatternAnomalies(event, historicalEvents);
      anomalies.push(...timeAnomalies);
    }

    if (this.config.enableVolumeAnalysis) {
      const volumeAnomalies = this.detectVolumeAnomalies(event, historicalEvents);
      anomalies.push(...volumeAnomalies);
    }

    const overallScore = this.calculateAnomalyScore(anomalies);
    const isAnomalous = overallScore > this.config.anomalyThreshold;

    return {
      isAnomalous,
      score: overallScore,
      anomalies,
      confidence: this.calculateConfidence(anomalies, historicalEvents.length)
    };
  }

  private detectBehavioralAnomalies(event: SecurityEvent, historicalEvents: SecurityEvent[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    if (!event.userId) return anomalies;

    const userEvents = historicalEvents.filter(e => e.userId === event.userId);
    if (userEvents.length < 10) return anomalies; // Need sufficient history

    // Analyze typical endpoints
    const endpointFrequency = this.calculateEndpointFrequency(userEvents);
    const currentEndpointFreq = endpointFrequency[event.endpoint] || 0;
    
    if (currentEndpointFreq < 0.1) { // Less than 10% of typical usage
      anomalies.push({
        type: 'unusual_endpoint',
        score: 0.7,
        description: `User rarely accesses endpoint: ${event.endpoint}`,
        metadata: { frequency: currentEndpointFreq }
      });
    }

    // Analyze request patterns
    const avgRequestsPerHour = this.calculateAverageRequestsPerHour(userEvents);
    const recentRequestsPerHour = this.calculateRecentRequestsPerHour(userEvents, 1);
    
    if (recentRequestsPerHour > avgRequestsPerHour * 3) {
      anomalies.push({
        type: 'unusual_volume',
        score: 0.8,
        description: 'Unusually high request volume',
        metadata: { 
          average: avgRequestsPerHour, 
          recent: recentRequestsPerHour 
        }
      });
    }

    return anomalies;
  }

  private detectGeolocationAnomalies(event: SecurityEvent, historicalEvents: SecurityEvent[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    // This would require IP geolocation service
    // For now, we'll simulate based on IP patterns
    const ipEvents = historicalEvents.filter(e => e.ipAddress === event.ipAddress);
    const uniqueIPs = new Set(historicalEvents.map(e => e.ipAddress));
    
    if (uniqueIPs.size > 1 && ipEvents.length === 0) {
      anomalies.push({
        type: 'new_location',
        score: 0.6,
        description: 'Request from new IP address',
        metadata: { 
          newIP: event.ipAddress,
          knownIPs: uniqueIPs.size 
        }
      });
    }

    return anomalies;
  }

  private detectTimePatternAnomalies(event: SecurityEvent, historicalEvents: SecurityEvent[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    const currentHour = event.timestamp.getHours();
    const hourlyDistribution = this.calculateHourlyDistribution(historicalEvents);
    const currentHourFreq = hourlyDistribution[currentHour] || 0;
    
    if (currentHourFreq < 0.05) { // Less than 5% of activity in this hour
      anomalies.push({
        type: 'unusual_time',
        score: 0.5,
        description: `Unusual activity time: ${currentHour}:00`,
        metadata: { 
          hour: currentHour,
          frequency: currentHourFreq 
        }
      });
    }

    return anomalies;
  }

  private detectVolumeAnomalies(event: SecurityEvent, historicalEvents: SecurityEvent[]): Anomaly[] {
    const anomalies: Anomaly[] = [];
    
    const windowStart = new Date(event.timestamp.getTime() - this.config.windowSizeMinutes * 60 * 1000);
    const recentEvents = historicalEvents.filter(e => e.timestamp >= windowStart);
    
    if (recentEvents.length > this.config.maxEventsPerWindow) {
      anomalies.push({
        type: 'volume_spike',
        score: 0.9,
        description: 'Unusual volume spike detected',
        metadata: { 
          windowEvents: recentEvents.length,
          threshold: this.config.maxEventsPerWindow,
          windowMinutes: this.config.windowSizeMinutes
        }
      });
    }

    return anomalies;
  }

  private calculateEndpointFrequency(events: SecurityEvent[]): Record<string, number> {
    const total = events.length;
    const counts: Record<string, number> = {};
    
    events.forEach(event => {
      counts[event.endpoint] = (counts[event.endpoint] || 0) + 1;
    });

    const frequencies: Record<string, number> = {};
    Object.entries(counts).forEach(([endpoint, count]) => {
      frequencies[endpoint] = count / total;
    });

    return frequencies;
  }

  private calculateAverageRequestsPerHour(events: SecurityEvent[]): number {
    if (events.length === 0) return 0;
    
    const timeSpanHours = (Date.now() - events[0].timestamp.getTime()) / (1000 * 60 * 60);
    return events.length / Math.max(timeSpanHours, 1);
  }

  private calculateRecentRequestsPerHour(events: SecurityEvent[], hours: number): number {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    const recentEvents = events.filter(e => e.timestamp >= cutoff);
    return recentEvents.length / hours;
  }

  private calculateHourlyDistribution(events: SecurityEvent[]): Record<number, number> {
    const total = events.length;
    const counts: Record<number, number> = {};
    
    for (let hour = 0; hour < 24; hour++) {
      counts[hour] = 0;
    }

    events.forEach(event => {
      const hour = event.timestamp.getHours();
      counts[hour]++;
    });

    const distribution: Record<number, number> = {};
    Object.entries(counts).forEach(([hour, count]) => {
      distribution[parseInt(hour)] = count / total;
    });

    return distribution;
  }

  private calculateAnomalyScore(anomalies: Anomaly[]): number {
    if (anomalies.length === 0) return 0;
    
    const maxScore = Math.max(...anomalies.map(a => a.score));
    const avgScore = anomalies.reduce((sum, a) => sum + a.score, 0) / anomalies.length;
    
    // Weighted combination of max and average
    return maxScore * 0.7 + avgScore * 0.3;
  }

  private calculateConfidence(anomalies: Anomaly[], historicalEventCount: number): number {
    // Confidence increases with more historical data
    const dataConfidence = Math.min(historicalEventCount / 100, 1);
    
    // Confidence increases with more consistent anomaly indicators
    const anomalyConsistency = anomalies.length > 1 ? 0.8 : 0.5;
    
    return dataConfidence * anomalyConsistency;
  }
}

/**
 * Main Security Monitor
 */
export class SecurityMonitor {
  private static instance: SecurityMonitor;
  private eventStore: SecurityEventStore;
  private anomalyDetector: AnomalyDetector;
  private securityRules: Map<string, SecurityRule> = new Map();
  private alertHandlers: Map<string, AlertHandler> = new Map();

  constructor() {
    this.eventStore = new SecurityEventStore();
    this.anomalyDetector = new AnomalyDetector();
    this.initializeDefaultRules();
    this.initializeAlertHandlers();
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * Monitor and analyze a request for security threats
   */
  async monitorRequest(request: NextRequest, context: SecurityContext): Promise<SecurityAnalysisResult> {
    const event = this.createSecurityEvent(request, context);
    
    // Get historical events for analysis
    const historicalEvents = this.getHistoricalEvents(event);
    
    // Run anomaly detection
    const anomalyResult = this.anomalyDetector.detectAnomalies(event, historicalEvents);
    
    // Apply security rules
    const ruleResults = this.applySecurityRules(event, historicalEvents);
    
    // Calculate overall risk score
    const riskScore = this.calculateRiskScore(event, anomalyResult, ruleResults);
    event.riskScore = riskScore;
    
    // Determine if request should be blocked
    const shouldBlock = this.shouldBlockRequest(riskScore, anomalyResult, ruleResults);
    event.blocked = shouldBlock;
    
    // Store the event
    this.eventStore.addEvent(event);
    
    // Handle alerts if necessary
    if (riskScore > 70 || shouldBlock) {
      await this.handleSecurityAlert(event, anomalyResult, ruleResults);
    }
    
    // Log the security event
    this.logSecurityEvent(event, anomalyResult);
    
    return {
      event,
      anomalyResult,
      ruleResults,
      riskScore,
      blocked: shouldBlock,
      recommendations: this.generateRecommendations(event, anomalyResult, ruleResults)
    };
  }

  /**
   * Get security metrics and statistics
   */
  getSecurityMetrics(timeRange?: { start: Date; end: Date }): SecurityMetrics {
    const events = timeRange 
      ? this.eventStore.getAllEvents(timeRange.start).filter(e => e.timestamp <= timeRange.end)
      : this.eventStore.getAllEvents();

    const eventsByType = this.groupEventsByType(events);
    const eventsBySeverity = this.groupEventsBySeverity(events);
    const blockedRequests = events.filter(e => e.blocked).length;
    const averageRiskScore = events.reduce((sum, e) => sum + e.riskScore, 0) / events.length || 0;
    
    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      blockedRequests,
      averageRiskScore,
      topRiskyIPs: this.getTopRiskyIPs(events),
      topRiskyEndpoints: this.getTopRiskyEndpoints(events),
      recentEvents: events.slice(-10).reverse()
    };
  }

  /**
   * Add custom security rule
   */
  addSecurityRule(rule: SecurityRule): void {
    this.securityRules.set(rule.id, rule);
    logger.info('Security rule added', { ruleId: rule.id, ruleName: rule.name });
  }

  /**
   * Remove security rule
   */
  removeSecurityRule(ruleId: string): void {
    this.securityRules.delete(ruleId);
    logger.info('Security rule removed', { ruleId });
  }

  /**
   * Add alert handler
   */
  addAlertHandler(name: string, handler: AlertHandler): void {
    this.alertHandlers.set(name, handler);
  }

  /**
   * Record a security event
   */
  recordEvent(eventData: {
    type: SecurityEventType;
    severity: SecuritySeverity;
    ip: string;
    userId?: string;
    requestId: string;
    details?: Record<string, any>;
  }): void {
    const event: SecurityEvent = {
      id: createId(),
      type: eventData.type,
      severity: eventData.severity,
      timestamp: new Date(),
      userId: eventData.userId,
      sessionId: undefined,
      ipAddress: eventData.ip,
      userAgent: 'unknown',
      endpoint: 'unknown',
      method: 'unknown',
      payload: undefined,
      metadata: eventData.details || {},
      riskScore: this.calculateBasicRiskScore(eventData.type, eventData.severity),
      blocked: false
    };

    this.eventStore.addEvent(event);
    this.logSecurityEvent(event, { isAnomalous: false, score: 0, anomalies: [], confidence: 0 });
  }

  private calculateBasicRiskScore(type: SecurityEventType, severity: SecuritySeverity): number {
    const baseScores = {
      [SecuritySeverity.LOW]: 10,
      [SecuritySeverity.MEDIUM]: 30,
      [SecuritySeverity.HIGH]: 60,
      [SecuritySeverity.CRITICAL]: 90
    };

    const typeMultipliers = {
      [SecurityEventType.SUSPICIOUS_LOGIN]: 1.2,
      [SecurityEventType.RATE_LIMIT_EXCEEDED]: 1.1,
      [SecurityEventType.INVALID_INPUT]: 1.0,
      [SecurityEventType.XSS_ATTEMPT]: 2.0,
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: 2.5,
      [SecurityEventType.UNAUTHORIZED_ACCESS]: 1.5,
      [SecurityEventType.SUSPICIOUS_PATTERN]: 1.0,
      [SecurityEventType.BRUTE_FORCE_ATTEMPT]: 1.8,
      [SecurityEventType.ANOMALOUS_BEHAVIOR]: 1.3,
      [SecurityEventType.MALICIOUS_FILE_UPLOAD]: 2.2,
      [SecurityEventType.SUSPICIOUS_USER_AGENT]: 1.1,
      [SecurityEventType.GEO_ANOMALY]: 1.4,
      [SecurityEventType.TIME_ANOMALY]: 1.2,
      [SecurityEventType.QUIZ_CHEATING_ATTEMPT]: 1.6,
      [SecurityEventType.DATA_EXFILTRATION_ATTEMPT]: 2.8
    };

    const baseScore = baseScores[severity];
    const multiplier = typeMultipliers[type] || 1.0;
    
    return Math.min(Math.round(baseScore * multiplier), 100);
  }

  private createSecurityEvent(request: NextRequest, context: SecurityContext): SecurityEvent {
    return {
      id: createId(),
      type: this.determineEventType(request, context),
      severity: SecuritySeverity.LOW, // Will be updated based on analysis
      timestamp: new Date(),
      userId: context.userId,
      sessionId: context.sessionId,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      endpoint: request.nextUrl.pathname,
      method: request.method,
      payload: context.payload,
      metadata: context.metadata || {},
      riskScore: 0, // Will be calculated
      blocked: false // Will be determined
    };
  }

  private determineEventType(request: NextRequest, context: SecurityContext): SecurityEventType {
    const pathname = request.nextUrl.pathname.toLowerCase();
    const method = request.method;

    // Check for specific patterns
    if (pathname.includes('login') || pathname.includes('auth')) {
      return SecurityEventType.SUSPICIOUS_LOGIN;
    }

    if (pathname.includes('quiz') && method === 'POST') {
      return SecurityEventType.QUIZ_CHEATING_ATTEMPT;
    }

    if (context.payload && this.containsSuspiciousPatterns(JSON.stringify(context.payload))) {
      return SecurityEventType.INVALID_INPUT;
    }

    return SecurityEventType.SUSPICIOUS_PATTERN;
  }

  private containsSuspiciousPatterns(content: string): boolean {
    const suspiciousPatterns = [
      /<script[^>]*>/i,
      /javascript:/i,
      /vbscript:/i,
      /onload=/i,
      /onerror=/i,
      /eval\(/i,
      /document\./i,
      /window\./i,
      /union.*select/i,
      /drop.*table/i,
      /insert.*into/i,
      /delete.*from/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(content));
  }

  private getHistoricalEvents(event: SecurityEvent): SecurityEvent[] {
    const lookbackHours = 24;
    const since = new Date(event.timestamp.getTime() - lookbackHours * 60 * 60 * 1000);
    
    // Get events by IP and user
    const ipEvents = this.eventStore.getEventsByIP(event.ipAddress, since);
    const userEvents = event.userId ? this.eventStore.getEventsByUser(event.userId, since) : [];
    
    // Combine and deduplicate
    const allEvents = [...ipEvents, ...userEvents];
    const uniqueEvents = Array.from(new Map(allEvents.map(e => [e.id, e])).values());
    
    return uniqueEvents.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private applySecurityRules(event: SecurityEvent, historicalEvents: SecurityEvent[]): RuleResult[] {
    const results: RuleResult[] = [];

    for (const rule of this.securityRules.values()) {
      if (!rule.enabled) continue;

      const matches = this.evaluateRule(rule, event, historicalEvents);
      if (matches) {
        results.push({
          ruleId: rule.id,
          ruleName: rule.name,
          matched: true,
          riskScore: rule.riskScore,
          actions: rule.actions
        });
      }
    }

    return results;
  }

  private evaluateRule(rule: SecurityRule, event: SecurityEvent, historicalEvents: SecurityEvent[]): boolean {
    return rule.conditions.every(condition => {
      const fieldValue = this.getFieldValue(event, condition.field);
      return this.evaluateCondition(fieldValue, condition);
    });
  }

  private getFieldValue(event: SecurityEvent, field: string): any {
    const fieldParts = field.split('.');
    let value: any = event;
    
    for (const part of fieldParts) {
      value = value?.[part];
    }
    
    return value;
  }

  private evaluateCondition(fieldValue: any, condition: SecurityCondition): boolean {
    const { operator, value, caseSensitive = false } = condition;
    
    let compareValue = fieldValue;
    let targetValue = value;
    
    if (typeof compareValue === 'string' && !caseSensitive) {
      compareValue = compareValue.toLowerCase();
    }
    if (typeof targetValue === 'string' && !caseSensitive) {
      targetValue = targetValue.toLowerCase();
    }

    switch (operator) {
      case 'equals':
        return compareValue === targetValue;
      case 'contains':
        return typeof compareValue === 'string' && compareValue.includes(targetValue);
      case 'matches':
        return new RegExp(targetValue).test(compareValue);
      case 'gt':
        return compareValue > targetValue;
      case 'lt':
        return compareValue < targetValue;
      case 'in':
        return Array.isArray(targetValue) && targetValue.includes(compareValue);
      default:
        return false;
    }
  }

  private calculateRiskScore(
    event: SecurityEvent,
    anomalyResult: AnomalyResult,
    ruleResults: RuleResult[]
  ): number {
    let score = 0;

    // Base score from anomaly detection
    if (anomalyResult.isAnomalous) {
      score += anomalyResult.score * 50; // Scale to 0-50
    }

    // Add score from matched rules
    const ruleScore = ruleResults.reduce((sum, result) => sum + result.riskScore, 0);
    score += Math.min(ruleScore, 50); // Cap rule score at 50

    return Math.min(Math.round(score), 100);
  }

  private shouldBlockRequest(
    riskScore: number,
    anomalyResult: AnomalyResult,
    ruleResults: RuleResult[]
  ): boolean {
    // Block if risk score is very high
    if (riskScore >= 90) return true;

    // Block if high-confidence anomaly
    if (anomalyResult.isAnomalous && anomalyResult.confidence > 0.8) return true;

    // Block if critical security rule matched
    const hasBlockingRule = ruleResults.some(result => 
      result.actions.some(action => action.type === 'block')
    );

    return hasBlockingRule;
  }

  private async handleSecurityAlert(
    event: SecurityEvent,
    anomalyResult: AnomalyResult,
    ruleResults: RuleResult[]
  ): Promise<void> {
    const alertData = {
      event,
      anomalyResult,
      ruleResults,
      timestamp: new Date()
    };

    // Execute all alert handlers
    for (const [name, handler] of this.alertHandlers.entries()) {
      try {
        await handler(alertData);
      } catch (error) {
        logger.error('Alert handler failed', { handlerName: name, error });
      }
    }

    // Emit audit event
    emitAudit({
      event: 'security.alert.triggered' as AuditEventName,
      userId: event.userId || 'anonymous',
      requestId: event.id,
      severity: event.riskScore >= 90 ? 'critical' : 'high',
      success: false,
      metadata: {
        eventType: event.type,
        riskScore: event.riskScore,
        blocked: event.blocked,
        anomalies: anomalyResult.anomalies?.length || 0,
        rulesMatched: ruleResults.length
      }
    });
  }

  private logSecurityEvent(event: SecurityEvent, anomalyResult: AnomalyResult): void {
    const logLevel = event.riskScore >= 70 ? 'warn' : 'info';
    
    logger[logLevel]('Security event', {
      eventId: event.id,
      type: event.type,
      riskScore: event.riskScore,
      blocked: event.blocked,
      userId: event.userId,
      ipAddress: event.ipAddress,
      endpoint: event.endpoint,
      anomalous: anomalyResult.isAnomalous,
      anomalyScore: anomalyResult.score
    });
  }

  private generateRecommendations(
    event: SecurityEvent,
    anomalyResult: AnomalyResult,
    ruleResults: RuleResult[]
  ): string[] {
    const recommendations: string[] = [];

    if (event.riskScore >= 70) {
      recommendations.push('Consider implementing additional authentication factors');
    }

    if (anomalyResult.isAnomalous) {
      recommendations.push('Monitor user behavior patterns for continued anomalies');
    }

    if (ruleResults.length > 0) {
      recommendations.push('Review and update security rules based on current threats');
    }

    if (event.blocked) {
      recommendations.push('Investigate blocked request for potential security improvements');
    }

    return recommendations;
  }

  private initializeDefaultRules(): void {
    const defaultRules: SecurityRule[] = [
      {
        id: 'high-frequency-requests',
        name: 'High Frequency Requests',
        description: 'Detect unusually high request frequency from single IP',
        enabled: true,
        eventType: SecurityEventType.RATE_LIMIT_EXCEEDED,
        conditions: [
          { field: 'metadata.requestCount', operator: 'gt', value: 100 }
        ],
        actions: [
          { type: 'throttle', parameters: { duration: 300 } }
        ],
        riskScore: 30,
        cooldownPeriod: 5
      },
      {
        id: 'suspicious-user-agent',
        name: 'Suspicious User Agent',
        description: 'Detect potentially malicious user agents',
        enabled: true,
        eventType: SecurityEventType.SUSPICIOUS_USER_AGENT,
        conditions: [
          { field: 'userAgent', operator: 'matches', value: '(bot|crawler|scanner|hack)' }
        ],
        actions: [
          { type: 'log', parameters: {} },
          { type: 'alert', parameters: { severity: 'medium' } }
        ],
        riskScore: 40,
        cooldownPeriod: 10
      }
    ];

    defaultRules.forEach(rule => this.addSecurityRule(rule));
  }

  private initializeAlertHandlers(): void {
    // Email alert handler (simulated)
    this.addAlertHandler('email', async (alertData) => {
      logger.info('Email alert sent', {
        eventId: alertData.event.id,
        riskScore: alertData.event.riskScore
      });
    });

    // Slack alert handler (simulated)
    this.addAlertHandler('slack', async (alertData) => {
      logger.info('Slack alert sent', {
        eventId: alertData.event.id,
        riskScore: alertData.event.riskScore
      });
    });
  }

  private groupEventsByType(events: SecurityEvent[]): Record<SecurityEventType, number> {
    const grouped = {} as Record<SecurityEventType, number>;
    
    Object.values(SecurityEventType).forEach(type => {
      grouped[type] = 0;
    });

    events.forEach(event => {
      grouped[event.type]++;
    });

    return grouped;
  }

  private groupEventsBySeverity(events: SecurityEvent[]): Record<SecuritySeverity, number> {
    const grouped = {} as Record<SecuritySeverity, number>;
    
    Object.values(SecuritySeverity).forEach(severity => {
      grouped[severity] = 0;
    });

    events.forEach(event => {
      grouped[event.severity]++;
    });

    return grouped;
  }

  private getTopRiskyIPs(events: SecurityEvent[]): Array<{ ip: string; count: number; riskScore: number }> {
    const ipStats = new Map<string, { count: number; totalRisk: number }>();

    events.forEach(event => {
      const current = ipStats.get(event.ipAddress) || { count: 0, totalRisk: 0 };
      ipStats.set(event.ipAddress, {
        count: current.count + 1,
        totalRisk: current.totalRisk + event.riskScore
      });
    });

    return Array.from(ipStats.entries())
      .map(([ip, stats]) => ({
        ip,
        count: stats.count,
        riskScore: Math.round(stats.totalRisk / stats.count)
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);
  }

  private getTopRiskyEndpoints(events: SecurityEvent[]): Array<{ endpoint: string; count: number; riskScore: number }> {
    const endpointStats = new Map<string, { count: number; totalRisk: number }>();

    events.forEach(event => {
      const current = endpointStats.get(event.endpoint) || { count: 0, totalRisk: 0 };
      endpointStats.set(event.endpoint, {
        count: current.count + 1,
        totalRisk: current.totalRisk + event.riskScore
      });
    });

    return Array.from(endpointStats.entries())
      .map(([endpoint, stats]) => ({
        endpoint,
        count: stats.count,
        riskScore: Math.round(stats.totalRisk / stats.count)
      }))
      .sort((a, b) => b.riskScore - a.riskScore)
      .slice(0, 10);
  }
}

// Supporting interfaces
export interface SecurityContext {
  userId?: string;
  sessionId?: string;
  ipAddress: string;
  userAgent: string;
  payload?: any;
  metadata?: Record<string, any>;
}

export interface AnomalyResult {
  isAnomalous: boolean;
  score: number;
  anomalies: Anomaly[];
  confidence: number;
}

export interface Anomaly {
  type: string;
  score: number;
  description: string;
  metadata: Record<string, any>;
}

export interface RuleResult {
  ruleId: string;
  ruleName: string;
  matched: boolean;
  riskScore: number;
  actions: SecurityAction[];
}

export interface SecurityAnalysisResult {
  event: SecurityEvent;
  anomalyResult: AnomalyResult;
  ruleResults: RuleResult[];
  riskScore: number;
  blocked: boolean;
  recommendations: string[];
}

export interface UserBehaviorProfile {
  userId: string;
  typicalEndpoints: string[];
  typicalHours: number[];
  averageRequestsPerHour: number;
  lastUpdated: Date;
}

export interface IPBehaviorProfile {
  ipAddress: string;
  firstSeen: Date;
  lastSeen: Date;
  requestCount: number;
  uniqueEndpoints: string[];
  riskScore: number;
}

export type AlertHandler = (alertData: {
  event: SecurityEvent;
  anomalyResult: AnomalyResult;
  ruleResults: RuleResult[];
  timestamp: Date;
}) => Promise<void>;

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();

// Export convenience functions for common security events
export function recordFailedLoginAttempt(data: {
  userId?: string;
  email: string;
  ip: string;
  requestId: string;
  details?: Record<string, any>;
}): void {
  securityMonitor.recordEvent({
    type: SecurityEventType.SUSPICIOUS_LOGIN,
    severity: SecuritySeverity.MEDIUM,
    ip: data.ip,
    userId: data.userId,
    requestId: data.requestId,
    details: {
      email: data.email,
      reason: 'failed_login_attempt',
      ...data.details
    }
  });
}

export function recordUnauthorizedAccess(data: {
  userId?: string;
  email?: string;
  ip: string;
  requestId: string;
  details?: Record<string, any>;
}): void {
  securityMonitor.recordEvent({
    type: SecurityEventType.UNAUTHORIZED_ACCESS,
    severity: SecuritySeverity.HIGH,
    ip: data.ip,
    userId: data.userId,
    requestId: data.requestId,
    details: {
      email: data.email,
      reason: 'unauthorized_access',
      ...data.details
    }
  });
}

export function recordTokenManipulation(data: {
  userId?: string;
  ip: string;
  requestId: string;
  details?: Record<string, any>;
}): void {
  securityMonitor.recordEvent({
    type: SecurityEventType.SUSPICIOUS_PATTERN,
    severity: SecuritySeverity.HIGH,
    ip: data.ip,
    userId: data.userId,
    requestId: data.requestId,
    details: {
      reason: 'token_manipulation',
      ...data.details
    }
  });
}