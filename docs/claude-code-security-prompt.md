# Comprehensive Digital Vulnerability Assessment Prompt for Claude Code

## Overview and Objectives

You are tasked with conducting a thorough digital vulnerability assessment and security posture evaluation of our marketplace platform. The objective is to identify security weaknesses across all critical systems and layers, then provide prioritized, actionable recommendations for enhancement. This assessment should follow industry best practices and current security frameworks.

---

## PART 1: SCOPE AND ASSESSMENT FRAMEWORK

### Assessment Scope

Evaluate the marketplace across the following critical dimensions:

1. **Infrastructure & Network Security**
   - Server configuration and hardening
   - Network segmentation and isolation
   - DDoS protection mechanisms
   - Firewall rules and ingress/egress controls
   - Cloud infrastructure security posture (if applicable)

2. **Authentication & Access Control**
   - User authentication mechanisms (password strength, MFA implementation)
   - Role-Based Access Control (RBAC) and privilege escalation risks
   - API authentication and token management
   - Session management and timeout policies
   - Account enumeration vulnerabilities
   - Default credentials and service accounts

3. **Payment Processing Security**
   - PCI DSS compliance status (v4.0 standards)
   - Payment gateway integration security
   - Credit card data handling and storage
   - Tokenization implementation
   - Encryption protocols (TLS/SSL versions, cipher suites)
   - Payment tampering vulnerabilities
   - Secure hash verification for transactions

4. **Data Protection & Privacy**
   - Data encryption at rest and in transit
   - Database security and access controls
   - Personally identifiable information (PII) handling
   - GDPR and local data protection compliance
   - Data retention and deletion policies
   - Backup and disaster recovery security

5. **Web Application Security (OWASP Top 10)**
   - SQL Injection vulnerabilities
   - Cross-Site Scripting (XSS) - Reflected, Stored, DOM-based
   - Cross-Site Request Forgery (CSRF)
   - Broken Authentication and Session Management
   - Sensitive Data Exposure
   - XML External Entities (XXE)
   - Broken Access Control and IDOR (Insecure Direct Object References)
   - Using Components with Known Vulnerabilities
   - Insufficient Logging and Monitoring
   - Broken Business Logic

6. **API Security (OWASP API Top 10)**
   - Broken Object Level Authorization (BOLA)
   - Broken Authentication in APIs
   - Excessive Data Exposure via APIs
   - Lack of Resources & Rate Limiting
   - Broken Function Level Authorization
   - Mass Assignment vulnerabilities
   - API versioning and deprecation issues
   - Improper Assets Management
   - Insufficient Logging & Monitoring
   - Unsafe Consumption of APIs

7. **Third-Party & Vendor Risk**
   - Third-party payment processors security posture
   - Plugin and dependency vulnerabilities
   - Supply chain security assessments
   - API integrations with external services
   - SLA and incident response commitments

8. **Monitoring, Detection & Response**
   - Security event logging and log retention
   - Real-time anomaly detection capabilities
   - Intrusion detection/prevention systems
   - Security Information and Event Management (SIEM)
   - Incident response procedures and playbooks
   - Alerting and notification systems
   - Audit trail completeness

9. **Business Logic & Fraud Prevention**
   - Price tampering mechanisms
   - Inventory manipulation vulnerabilities
   - Coupon/discount code validation
   - Refund fraud prevention
   - Transaction verification mechanisms
   - User behavior anomaly detection
   - Suspicious activity patterns detection

10. **Compliance & Regulatory**
    - PCI DSS compliance status and certification
    - GDPR, CCPA, or regional data protection laws
    - Industry-specific compliance requirements
    - Security audit schedules
    - Penetration testing frequency
    - Compliance documentation and evidence

---

## PART 2: DETAILED ASSESSMENT INSTRUCTIONS

### Step 1: Infrastructure Assessment

1. Identify and document all server endpoints, including:
   - Web servers (Apache, Nginx, IIS versions and configurations)
   - Application servers
   - Database servers
   - API gateways
   - Load balancers
   - CDN services
   - SSL/TLS certificate validity and cipher suites

2. Analyze network architecture:
   - Diagram the network topology
   - Identify network segmentation gaps
   - Check for exposed internal services
   - Evaluate firewall rule coverage
   - Document all open ports and services
   - Identify potential lateral movement paths

3. Cloud security (if applicable):
   - Check cloud provider identity and access management (IAM)
   - Review security group configurations
   - Assess storage bucket permissions and public exposure
   - Evaluate cloud-native security services

4. DDoS and availability:
   - Check for DDoS mitigation strategies
   - Verify rate limiting implementations
   - Assess load balancing for resilience

### Step 2: Authentication & Authorization Assessment

1. Authentication mechanisms:
   - Review password policies (minimum 12 characters, complexity requirements per PCI DSS v4.0)
   - Check Multi-Factor Authentication (MFA) implementation and enforcement
   - Evaluate password reset functionality for vulnerabilities
   - Test for account enumeration attacks
   - Review session token generation and strength
   - Check JWT token implementation (signature validation, expiration)

2. Access control:
   - Map all user roles and permissions
   - Test for privilege escalation vulnerabilities
   - Verify RBAC implementation across all modules
   - Check for IDOR vulnerabilities by testing direct object references
   - Evaluate API authentication requirements
   - Test anonymous access endpoints

3. API authentication:
   - Review API key management practices
   - Check OAuth 2.0 implementation (if used)
   - Evaluate API rate limiting per user/API key
   - Test for API key exposure in logs, repositories, or responses
   - Verify API token expiration and refresh mechanisms

### Step 3: Payment & Financial Data Security

1. PCI DSS compliance assessment:
   - Verify PCI DSS v4.0 compliance status
   - Review cardholder data storage practices
   - Validate encryption of payment data (TLS 1.2 minimum)
   - Check tokenization of card data
   - Verify no raw card data in logs, error messages, or backups
   - Review access controls for payment data handling
   - Verify regular security testing and penetration tests

2. Payment gateway integration:
   - Audit payment gateway API integration security
   - Check secure hash verification (MD5/SHA implementations)
   - Test for price tampering in payment requests
   - Verify proper redirect/iframe usage (not form-based card submission)
   - Check for certificate validation in gateway communication
   - Review error handling for sensitive payment data leakage

3. Payment data handling:
   - Verify end-to-end encryption (E2EE) implementation
   - Check for secure payment page (HTTPS, no mixed content)
   - Review Address Verification System (AVS) and CVV requirement
   - Verify tokenization for recurring payments
   - Check fraud detection and continuous monitoring capabilities

### Step 4: Web Application Security Testing

1. Input validation and injection attacks:
   - Test for SQL Injection in all input fields, parameters, and headers
   - Test for LDAP Injection vulnerabilities
   - Check for Command Injection in any system command executions
   - Evaluate XML External Entities (XXE) vulnerabilities in XML uploads
   - Test for XPATH Injection in XML-based queries
   - Review input sanitization practices

2. Cross-Site Scripting (XSS):
   - Test for Reflected XSS in search, filters, and URL parameters
   - Test for Stored XSS in user profiles, reviews, comments, messages
   - Test for DOM-based XSS in client-side code
   - Verify Content Security Policy (CSP) headers
   - Check for XSS filters and encoding practices

3. Session management:
   - Review session token generation randomness and strength
   - Test for session fixation vulnerabilities
   - Check session timeout policies
   - Verify secure cookie flags (HttpOnly, Secure, SameSite)
   - Test for session hijacking possibilities
   - Evaluate concurrent session handling

4. Cross-Site Request Forgery (CSRF):
   - Test for CSRF token presence on state-changing operations
   - Verify CSRF token validation
   - Check SameSite cookie attributes
   - Test cross-origin requests

5. Access Control:
   - Test for Broken Access Control (BAC)
   - Verify user can only access own data/resources
   - Test for privilege escalation from user to admin
   - Evaluate function-level access controls
   - Test for unauthorized API endpoint access

6. Data exposure:
   - Check for sensitive data in HTTP responses
   - Review client-side JavaScript for hardcoded secrets
   - Test for information disclosure in error messages
   - Check for sensitive data in URLs
   - Verify API responses don't expose unnecessary fields
   - Review backup and cache handling

### Step 5: API Security Assessment

1. API inventory and documentation:
   - Discover and catalog all APIs (REST, GraphQL, SOAP)
   - Review API versioning and deprecation practices
   - Document all API endpoints and their purposes
   - Identify sensitive data endpoints

2. API authentication and authorization:
   - Test Broken Authentication in API endpoints
   - Verify Broken Object Level Authorization (BOLA)
   - Test function-level authorization
   - Check API key and token management
   - Verify rate limiting per user and globally
   - Test anonymous endpoint restrictions

3. API business logic:
   - Test for manipulation of request parameters
   - Check for mass assignment vulnerabilities
   - Verify business logic constraints are enforced
   - Test for race conditions in critical operations
   - Evaluate order/workflow enforcement

4. API data handling:
   - Verify API doesn't expose excessive data fields
   - Test for data filtering based on user permissions
   - Check for proper response codes and error messages
   - Verify no sensitive data in error responses

5. API infrastructure:
   - Evaluate API gateway security
   - Check for proper logging and monitoring
   - Verify API versioning security
   - Test for timeout and resource limits

### Step 6: Third-Party & Dependency Assessment

1. Third-party service security:
   - Document all third-party integrations
   - Review security posture of payment processors
   - Check for SOC 2, ISO 27001, or other certifications
   - Evaluate SLAs and incident response procedures
   - Assess data sharing agreements and privacy policies

2. Dependency and component security:
   - Identify all software dependencies and versions
   - Check for known vulnerabilities (CVEs) in dependencies
   - Review update frequency and patch management
   - Evaluate plugin security and maintenance status
   - Check for deprecated or unsupported components

### Step 7: Monitoring, Logging & Incident Response

1. Security event logging:
   - Verify comprehensive logging of security events
   - Check authentication attempt logging (failed/successful)
   - Verify access to sensitive data is logged
   - Evaluate payment transaction logging
   - Check log retention policies (minimum 1 year)
   - Verify log integrity and tamper protection
   - Evaluate log centralization and SIEM integration

2. Real-time monitoring:
   - Check for real-time anomaly detection
   - Evaluate behavioral analysis capabilities
   - Verify suspicious activity alerting
   - Check for automated response mechanisms
   - Evaluate monitoring of failed authentication attempts
   - Verify transaction monitoring for fraud detection

3. Incident response:
   - Review incident response procedures
   - Check for documented playbooks
   - Evaluate communication procedures
   - Verify backup restoration capabilities
   - Check for security event investigation procedures

### Step 8: Business Logic & Fraud Prevention

1. Transaction security:
   - Test for price manipulation during checkout
   - Verify quantity validation for orders
   - Check for negative price/quantity handling
   - Test coupon code validation and reuse prevention
   - Verify refund fraud prevention mechanisms
   - Check for duplicate transaction detection

2. User behavior analysis:
   - Evaluate velocity checks (multiple transactions in short timeframe)
   - Check for geographic anomaly detection
   - Verify unusual purchase pattern detection
   - Evaluate multi-account abuse prevention
   - Check for credential stuffing prevention

3. Inventory management:
   - Verify inventory quantity is properly decremented
   - Test for overselling vulnerabilities
   - Check for concurrent request handling in stock reservations
   - Verify inventory reconciliation procedures

---

## PART 3: VULNERABILITY PRIORITIZATION

For each vulnerability identified, classify according to:

### Severity Levels
- **Critical**: Allows unauthorized access to sensitive data, payment processing manipulation, or system compromise. Requires immediate remediation.
- **High**: Could lead to data breach, financial loss, or significant service disruption. Remediate within 1-2 weeks.
- **Medium**: Potential security impact but requires additional conditions or complexity to exploit. Remediate within 30 days.
- **Low**: Minimal security impact or requires unlikely exploitation scenarios. Schedule for next maintenance cycle.

### Impact Factors
- Data sensitivity involved
- Number of users affected
- Potential financial impact
- Compliance violation severity
- Ease of exploitation

---

## PART 4: RECOMMENDED ENHANCEMENTS

### For each category, provide:

1. **Immediate Actions (Week 1)**
   - Critical vulnerabilities requiring immediate patching
   - Emergency security configurations
   - Temporary mitigations for high-risk items

2. **Short-term Improvements (1-4 weeks)**
   - High-priority fixes and implementations
   - Quick security wins
   - Configuration updates

3. **Medium-term Enhancements (1-3 months)**
   - Implementation of security controls
   - Architecture improvements
   - Process and policy changes

4. **Long-term Strategic Initiatives (3+ months)**
   - Comprehensive security infrastructure upgrades
   - Advanced monitoring systems
   - Organizational security maturity improvements

### For Each Recommendation, Include:

- **Description**: What should be implemented
- **Justification**: Why this is important
- **Implementation Approach**: How to implement
- **Timeline**: Estimated duration
- **Resource Requirements**: Team, tools, budget estimates
- **Success Metrics**: How to verify implementation
- **Compliance Benefit**: Relevant standards (PCI DSS, GDPR, etc.)

---

## PART 5: COMPLIANCE MAPPING

Map all findings to:
- **PCI DSS v4.0** requirements
- **GDPR** data protection requirements
- **OWASP Top 10** and **OWASP API Top 10**
- **NIST Cybersecurity Framework** (Identify, Protect, Detect, Respond, Recover, Govern)
- Local regulatory requirements (Latvia/EU specific)

---

## PART 6: RISK SUMMARY & EXECUTIVE BRIEF

Provide an executive summary including:

1. **Overall Security Posture Score** (0-100)
2. **Critical Risk Count** - Number of critical vulnerabilities
3. **Key Risk Areas** - Top 3-5 highest impact areas
4. **Estimated Remediation Cost** - Budget projection for fixes
5. **Estimated Timeline** - Overall timeline to address all findings
6. **Business Impact Statement** - How vulnerabilities affect operations
7. **Compliance Status** - Current compliance gaps with required standards
8. **Strategic Recommendations** - Top 5 recommendations for maximum security improvement

---

## PART 7: DELIVERABLE FORMAT

Structure your analysis as follows:

```
# Digital Vulnerability Assessment Report

## Executive Summary
[Overall risk posture, critical findings, key recommendations]

## Assessment Findings by Category
### 1. Infrastructure & Network Security
- Findings
- Risk Level & Impact
- Recommendations
- Remediation Timeline

### 2. Authentication & Access Control
[Same structure]

### 3. Payment Processing Security
[Same structure]

[Continue for all 10 categories...]

## Critical Vulnerabilities (Immediate Action Required)
[List with severity, impact, remediation steps]

## Implementation Roadmap
### Phase 1: Critical (Week 1)
### Phase 2: High Priority (Weeks 1-4)
### Phase 3: Medium Priority (Months 1-3)
### Phase 4: Long-term Initiatives (3+ months)

## Compliance Matrix
[PCI DSS, GDPR, OWASP mappings]

## Success Metrics & Monitoring
[How to verify improvements and maintain security posture]

## Appendix
- Detailed technical findings
- Tool recommendations
- Reference standards and frameworks
```

---

## PART 8: ADDITIONAL CONTEXT FOR CLAUDE CODE

- **Location Context**: The marketplace operates from Rīga, Latvia (EU jurisdiction) - ensure GDPR and EU regulatory compliance is emphasized
- **Marketplace Type**: If applicable, specify if B2C, B2B, or mixed marketplace to tailor recommendations
- **Current Tech Stack**: If you can provide current infrastructure details, it will enable more specific recommendations
- **Compliance Status**: Share any current certifications (PCI DSS, SOC 2, etc.) to avoid duplicate assessments
- **Previous Assessments**: Share results from any prior penetration tests or security audits for comparison

---

## EXECUTION GUIDELINES

1. **Be Thorough**: Don't overlook any area - comprehensiveness is critical for security assessments
2. **Be Specific**: Provide exact findings with technical details, not generic security advice
3. **Be Actionable**: Every recommendation should be implementable with clear steps
4. **Be Realistic**: Account for resource constraints and suggest realistic timelines
5. **Be Prioritized**: Focus on highest-impact items first
6. **Cite Standards**: Reference OWASP, PCI DSS, GDPR, and other frameworks for credibility and compliance

---

## Notes

- This assessment assumes a full-access scenario where you can analyze code, configurations, and infrastructure
- If certain systems are inaccessible, note these gaps in the findings and recommend further investigation
- Security is an ongoing process; recommend establishing continuous monitoring and regular reassessment schedules
- Suggest budget for annual penetration testing and vulnerability scanning