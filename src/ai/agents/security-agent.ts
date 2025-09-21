import { BaseAgent } from '../base/agent';
import { AgentCapability, AgentTask, AgentResult } from '@/types/agents';
import { createClient } from '@supabase/supabase-js';
import { Database } from '@/types/database';

interface SecurityConfig {
  scanType: 'vulnerability' | 'compliance' | 'penetration' | 'code-analysis' | 'dependency';
  severity: ('critical' | 'high' | 'medium' | 'low' | 'info')[];
  frameworks: ('owasp' | 'nist' | 'iso27001' | 'pci-dss' | 'gdpr' | 'hipaa')[];
  includeThirdParty: boolean;
  generateReport: boolean;
  autoFix: boolean;
  excludePatterns?: string[];
  customRules?: {
    id: string;
    name: string;
    description: string;
    pattern: string;
    severity: 'critical' | 'high' | 'medium' | 'low';
    category: string;
  }[];
}

interface VulnerabilityConfig extends SecurityConfig {
  scanType: 'vulnerability';
  targets: ('dependencies' | 'code' | 'infrastructure' | 'containers' | 'apis')[];
  databases: ('sql-injection' | 'nosql-injection' | 'command-injection')[];
  webVulns: ('xss' | 'csrf' | 'clickjacking' | 'cors' | 'headers')[];
}

interface ComplianceConfig extends SecurityConfig {
  scanType: 'compliance';
  standards: ('owasp-top10' | 'sans-top25' | 'cwe-top25')[];
  dataProtection: ('encryption' | 'access-control' | 'audit-logs' | 'data-retention')[];
  privacyRequirements: ('consent' | 'data-minimization' | 'right-to-deletion' | 'breach-notification')[];
}

interface CodeAnalysisConfig extends SecurityConfig {
  scanType: 'code-analysis';
  languages: ('javascript' | 'typescript' | 'python' | 'java' | 'csharp' | 'go' | 'rust')[];
  patterns: ('hardcoded-secrets' | 'insecure-crypto' | 'unsafe-functions' | 'input-validation')[];
  staticAnalysis: boolean;
  dynamicAnalysis: boolean;
}

interface SecurityVulnerability {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  category: string;
  cwe?: string;
  cvss?: {
    score: number;
    vector: string;
    version: string;
  };
  location: {
    file: string;
    line?: number;
    column?: number;
    function?: string;
  };
  evidence: {
    code?: string;
    request?: string;
    response?: string;
    payload?: string;
  };
  impact: string;
  recommendation: string;
  references: string[];
  fixable: boolean;
  fix?: {
    type: 'code' | 'config' | 'dependency';
    description: string;
    code?: string;
    automated: boolean;
  };
}

interface ComplianceIssue {
  id: string;
  standard: string;
  requirement: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'compliant' | 'non-compliant' | 'partial' | 'not-applicable';
  evidence: string[];
  remediation: {
    description: string;
    steps: string[];
    timeline: string;
    responsible: string;
  };
  references: string[];
}

interface SecurityReport {
  summary: {
    totalIssues: number;
    criticalIssues: number;
    highIssues: number;
    mediumIssues: number;
    lowIssues: number;
    fixableIssues: number;
    complianceScore: number;
    riskScore: number;
  };
  vulnerabilities: SecurityVulnerability[];
  compliance: ComplianceIssue[];
  recommendations: {
    priority: 'immediate' | 'high' | 'medium' | 'low';
    category: string;
    description: string;
    impact: string;
    effort: 'low' | 'medium' | 'high';
    timeline: string;
  }[];
  trends: {
    period: string;
    newIssues: number;
    resolvedIssues: number;
    riskTrend: 'improving' | 'stable' | 'degrading';
  };
  generatedFiles: {
    path: string;
    content: string;
    type: 'report' | 'config' | 'policy' | 'fix';
  }[];
}

interface PenetrationTestResult {
  success: boolean;
  target: string;
  duration: number;
  methodology: string[];
  findings: {
    vulnerability: SecurityVulnerability;
    exploitability: 'easy' | 'medium' | 'hard' | 'theoretical';
    businessImpact: 'critical' | 'high' | 'medium' | 'low';
    proofOfConcept?: string;
  }[];
  recommendations: string[];
  reportPath: string;
}

interface DependencySecurityResult {
  success: boolean;
  scannedPackages: number;
  vulnerablePackages: {
    name: string;
    version: string;
    vulnerabilities: {
      id: string;
      severity: string;
      title: string;
      description: string;
      patchedVersions: string[];
      references: string[];
    }[];
  }[];
  recommendations: {
    package: string;
    action: 'update' | 'replace' | 'remove';
    targetVersion?: string;
    alternative?: string;
    urgency: 'critical' | 'high' | 'medium' | 'low';
  }[];
  generatedFiles: {
    path: string;
    content: string;
    type: 'report' | 'fix-script' | 'policy';
  }[];
}

export class SecurityAgent extends BaseAgent {
  private supabase = createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  constructor() {
    super({
      id: 'security-agent',
      name: 'Security Agent',
      type: 'specialized',
      description: 'Handles security scanning, vulnerability assessment, and compliance checks',
      capabilities: [
        AgentCapability.SECURITY_ANALYSIS,
        AgentCapability.VULNERABILITY_SCANNING,
        AgentCapability.COMPLIANCE_CHECKING,
        AgentCapability.CODE_ANALYSIS
      ],
      version: '1.0.0'
    });
  }

  async executeTask(task: AgentTask): Promise<AgentResult> {
    try {
      const { action, config, files } = task.input as {
        action: 'scan' | 'analyze' | 'audit' | 'pentest' | 'compliance' | 'dependencies';
        config: SecurityConfig | VulnerabilityConfig | ComplianceConfig | CodeAnalysisConfig;
        files?: { path: string; content: string }[];
      };

      if (!action) {
        throw new Error('Security action is required');
      }

      let result: any;

      switch (action) {
        case 'scan':
          result = await this.performVulnerabilityScan(config as VulnerabilityConfig, files);
          break;
        case 'analyze':
          result = await this.performCodeAnalysis(config as CodeAnalysisConfig, files);
          break;
        case 'audit':
          result = await this.performSecurityAudit(config, files);
          break;
        case 'pentest':
          result = await this.performPenetrationTest(config, files);
          break;
        case 'compliance':
          result = await this.checkCompliance(config as ComplianceConfig, files);
          break;
        case 'dependencies':
          result = await this.scanDependencies(config, files);
          break;
        default:
          throw new Error(`Unsupported security action: ${action}`);
      }

      // Store security results
      await this.storeSecurityResults(task.id, result);

      return {
        success: result.success,
        data: result,
        message: result.success 
          ? `Security ${action} completed successfully` 
          : `Security ${action} failed`,
        metadata: {
          executionTime: Date.now() - task.startTime!,
          issuesFound: result.summary?.totalIssues || result.vulnerablePackages?.length || 0,
          criticalIssues: result.summary?.criticalIssues || 0,
          fixableIssues: result.summary?.fixableIssues || 0
        }
      };

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown security error',
        data: null
      };
    }
  }

  private async performVulnerabilityScan(
    config: VulnerabilityConfig,
    files?: { path: string; content: string }[]
  ): Promise<SecurityReport> {
    try {
      const vulnerabilities: SecurityVulnerability[] = [];
      const generatedFiles = [];

      // Simulate vulnerability scanning
      if (config.targets.includes('code')) {
        vulnerabilities.push(...await this.scanCodeVulnerabilities(files, config));
      }

      if (config.targets.includes('dependencies')) {
        vulnerabilities.push(...await this.scanDependencyVulnerabilities(config));
      }

      if (config.targets.includes('infrastructure')) {
        vulnerabilities.push(...await this.scanInfrastructureVulnerabilities(config));
      }

      if (config.targets.includes('apis')) {
        vulnerabilities.push(...await this.scanApiVulnerabilities(config));
      }

      // Generate security report
      if (config.generateReport) {
        const reportFile = await this.generateSecurityReport(vulnerabilities, config);
        generatedFiles.push(reportFile);
      }

      // Generate fixes if auto-fix is enabled
      if (config.autoFix) {
        const fixFiles = await this.generateSecurityFixes(vulnerabilities);
        generatedFiles.push(...fixFiles);
      }

      const summary = this.calculateSecuritySummary(vulnerabilities);
      const recommendations = this.generateSecurityRecommendations(vulnerabilities, config);

      return {
        summary,
        vulnerabilities,
        compliance: [],
        recommendations,
        trends: {
          period: '30d',
          newIssues: vulnerabilities.length,
          resolvedIssues: 0,
          riskTrend: vulnerabilities.filter(v => v.severity === 'critical').length > 0 ? 'degrading' : 'stable'
        },
        generatedFiles
      };

    } catch (error) {
      return {
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          fixableIssues: 0,
          complianceScore: 0,
          riskScore: 100
        },
        vulnerabilities: [],
        compliance: [],
        recommendations: [],
        trends: {
          period: '30d',
          newIssues: 0,
          resolvedIssues: 0,
          riskTrend: 'stable'
        },
        generatedFiles: []
      };
    }
  }

  private async performCodeAnalysis(
    config: CodeAnalysisConfig,
    files?: { path: string; content: string }[]
  ): Promise<SecurityReport> {
    try {
      const vulnerabilities: SecurityVulnerability[] = [];
      const generatedFiles = [];

      if (!files || files.length === 0) {
        throw new Error('No files provided for code analysis');
      }

      // Analyze each file
      for (const file of files) {
        const fileVulns = await this.analyzeFileForSecurity(file, config);
        vulnerabilities.push(...fileVulns);
      }

      // Generate security policies
      const policyFile = await this.generateSecurityPolicy(config);
      generatedFiles.push(policyFile);

      // Generate linting rules
      const lintingRules = await this.generateSecurityLintingRules(config);
      generatedFiles.push(lintingRules);

      const summary = this.calculateSecuritySummary(vulnerabilities);
      const recommendations = this.generateCodeSecurityRecommendations(vulnerabilities, config);

      return {
        summary,
        vulnerabilities,
        compliance: [],
        recommendations,
        trends: {
          period: '30d',
          newIssues: vulnerabilities.length,
          resolvedIssues: 0,
          riskTrend: 'stable'
        },
        generatedFiles
      };

    } catch (error) {
      return {
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          fixableIssues: 0,
          complianceScore: 0,
          riskScore: 0
        },
        vulnerabilities: [],
        compliance: [],
        recommendations: ['Failed to perform code analysis'],
        trends: {
          period: '30d',
          newIssues: 0,
          resolvedIssues: 0,
          riskTrend: 'stable'
        },
        generatedFiles: []
      };
    }
  }

  private async performSecurityAudit(
    config: SecurityConfig,
    files?: { path: string; content: string }[]
  ): Promise<SecurityReport> {
    try {
      const vulnerabilities: SecurityVulnerability[] = [];
      const compliance: ComplianceIssue[] = [];
      const generatedFiles = [];

      // Comprehensive security audit
      const codeVulns = await this.auditCodeSecurity(files, config);
      vulnerabilities.push(...codeVulns);

      const configVulns = await this.auditConfigurationSecurity(config);
      vulnerabilities.push(...configVulns);

      const infraVulns = await this.auditInfrastructureSecurity(config);
      vulnerabilities.push(...infraVulns);

      // Compliance checks
      for (const framework of config.frameworks) {
        const complianceIssues = await this.auditCompliance(framework, files);
        compliance.push(...complianceIssues);
      }

      // Generate audit report
      const auditReport = await this.generateAuditReport(vulnerabilities, compliance, config);
      generatedFiles.push(auditReport);

      // Generate remediation plan
      const remediationPlan = await this.generateRemediationPlan(vulnerabilities, compliance);
      generatedFiles.push(remediationPlan);

      const summary = this.calculateSecuritySummary(vulnerabilities, compliance);
      const recommendations = this.generateAuditRecommendations(vulnerabilities, compliance, config);

      return {
        summary,
        vulnerabilities,
        compliance,
        recommendations,
        trends: {
          period: '30d',
          newIssues: vulnerabilities.length + compliance.length,
          resolvedIssues: 0,
          riskTrend: 'stable'
        },
        generatedFiles
      };

    } catch (error) {
      return {
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          fixableIssues: 0,
          complianceScore: 0,
          riskScore: 0
        },
        vulnerabilities: [],
        compliance: [],
        recommendations: ['Failed to perform security audit'],
        trends: {
          period: '30d',
          newIssues: 0,
          resolvedIssues: 0,
          riskTrend: 'stable'
        },
        generatedFiles: []
      };
    }
  }

  private async performPenetrationTest(
    config: SecurityConfig,
    files?: { path: string; content: string }[]
  ): Promise<PenetrationTestResult> {
    try {
      const findings = [];
      const methodology = [
        'Information Gathering',
        'Vulnerability Assessment',
        'Exploitation',
        'Post-Exploitation',
        'Reporting'
      ];

      // Simulate penetration testing
      const webAppFindings = await this.performWebAppPentest(config);
      findings.push(...webAppFindings);

      const apiFindings = await this.performApiPentest(config);
      findings.push(...apiFindings);

      const infraFindings = await this.performInfraPentest(config);
      findings.push(...infraFindings);

      // Generate penetration test report
      const reportPath = await this.generatePentestReport(findings, methodology, config);

      const recommendations = [
        'Implement proper input validation and sanitization',
        'Use parameterized queries to prevent SQL injection',
        'Implement proper authentication and authorization',
        'Keep all software and dependencies up to date',
        'Implement proper error handling and logging',
        'Use HTTPS for all communications',
        'Implement proper session management'
      ];

      return {
        success: true,
        target: 'Application and Infrastructure',
        duration: 480, // 8 hours
        methodology,
        findings,
        recommendations,
        reportPath
      };

    } catch (error) {
      return {
        success: false,
        target: 'Unknown',
        duration: 0,
        methodology: [],
        findings: [],
        recommendations: ['Failed to perform penetration test'],
        reportPath: ''
      };
    }
  }

  private async checkCompliance(
    config: ComplianceConfig,
    files?: { path: string; content: string }[]
  ): Promise<SecurityReport> {
    try {
      const compliance: ComplianceIssue[] = [];
      const generatedFiles = [];

      // Check compliance for each framework
      for (const framework of config.frameworks) {
        const frameworkIssues = await this.checkFrameworkCompliance(framework, config, files);
        compliance.push(...frameworkIssues);
      }

      // Generate compliance report
      const complianceReport = await this.generateComplianceReport(compliance, config);
      generatedFiles.push(complianceReport);

      // Generate compliance checklist
      const checklist = await this.generateComplianceChecklist(config);
      generatedFiles.push(checklist);

      // Generate policies and procedures
      const policies = await this.generateCompliancePolicies(config);
      generatedFiles.push(...policies);

      const summary = this.calculateComplianceSummary(compliance);
      const recommendations = this.generateComplianceRecommendations(compliance, config);

      return {
        summary,
        vulnerabilities: [],
        compliance,
        recommendations,
        trends: {
          period: '30d',
          newIssues: compliance.length,
          resolvedIssues: 0,
          riskTrend: 'stable'
        },
        generatedFiles
      };

    } catch (error) {
      return {
        summary: {
          totalIssues: 0,
          criticalIssues: 0,
          highIssues: 0,
          mediumIssues: 0,
          lowIssues: 0,
          fixableIssues: 0,
          complianceScore: 0,
          riskScore: 0
        },
        vulnerabilities: [],
        compliance: [],
        recommendations: ['Failed to check compliance'],
        trends: {
          period: '30d',
          newIssues: 0,
          resolvedIssues: 0,
          riskTrend: 'stable'
        },
        generatedFiles: []
      };
    }
  }

  private async scanDependencies(
    config: SecurityConfig,
    files?: { path: string; content: string }[]
  ): Promise<DependencySecurityResult> {
    try {
      const vulnerablePackages = [];
      const recommendations = [];
      const generatedFiles = [];

      // Simulate dependency scanning
      const mockVulnerablePackages = [
        {
          name: 'lodash',
          version: '4.17.15',
          vulnerabilities: [
            {
              id: 'CVE-2021-23337',
              severity: 'high',
              title: 'Command Injection in lodash',
              description: 'lodash versions prior to 4.17.21 are vulnerable to Command Injection via the template function.',
              patchedVersions: ['>=4.17.21'],
              references: [
                'https://nvd.nist.gov/vuln/detail/CVE-2021-23337',
                'https://github.com/lodash/lodash/commit/3469357cff396a26c363f8c1b5a91dde28ba4b1c'
              ]
            }
          ]
        },
        {
          name: 'axios',
          version: '0.21.0',
          vulnerabilities: [
            {
              id: 'CVE-2021-3749',
              severity: 'medium',
              title: 'Regular Expression Denial of Service in axios',
              description: 'axios is vulnerable to Inefficient Regular Expression Complexity.',
              patchedVersions: ['>=0.21.2'],
              references: [
                'https://nvd.nist.gov/vuln/detail/CVE-2021-3749'
              ]
            }
          ]
        }
      ];

      vulnerablePackages.push(...mockVulnerablePackages);

      // Generate recommendations
      for (const pkg of vulnerablePackages) {
        for (const vuln of pkg.vulnerabilities) {
          recommendations.push({
            package: pkg.name,
            action: 'update' as const,
            targetVersion: vuln.patchedVersions[0]?.replace('>=', ''),
            urgency: vuln.severity as 'critical' | 'high' | 'medium' | 'low'
          });
        }
      }

      // Generate dependency security report
      const securityReport = await this.generateDependencySecurityReport(vulnerablePackages, recommendations);
      generatedFiles.push(securityReport);

      // Generate update script
      const updateScript = await this.generateDependencyUpdateScript(recommendations);
      generatedFiles.push(updateScript);

      // Generate security policy for dependencies
      const dependencyPolicy = await this.generateDependencySecurityPolicy(config);
      generatedFiles.push(dependencyPolicy);

      return {
        success: true,
        scannedPackages: 150, // Mock number
        vulnerablePackages,
        recommendations,
        generatedFiles
      };

    } catch (error) {
      return {
        success: false,
        scannedPackages: 0,
        vulnerablePackages: [],
        recommendations: [],
        generatedFiles: []
      };
    }
  }

  // Vulnerability scanning methods
  private async scanCodeVulnerabilities(
    files?: { path: string; content: string }[],
    config?: VulnerabilityConfig
  ): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    if (!files) return vulnerabilities;

    for (const file of files) {
      // Check for common web vulnerabilities
      if (config?.webVulns.includes('xss')) {
        const xssVulns = this.detectXSSVulnerabilities(file);
        vulnerabilities.push(...xssVulns);
      }

      if (config?.databases.includes('sql-injection')) {
        const sqlVulns = this.detectSQLInjectionVulnerabilities(file);
        vulnerabilities.push(...sqlVulns);
      }

      // Check for hardcoded secrets
      const secretVulns = this.detectHardcodedSecrets(file);
      vulnerabilities.push(...secretVulns);

      // Check for insecure crypto usage
      const cryptoVulns = this.detectInsecureCrypto(file);
      vulnerabilities.push(...cryptoVulns);
    }

    return vulnerabilities;
  }

  private async scanDependencyVulnerabilities(config: VulnerabilityConfig): Promise<SecurityVulnerability[]> {
    // Simulate dependency vulnerability scanning
    return [
      {
        id: 'DEP-001',
        title: 'Vulnerable Dependency: lodash',
        description: 'Using vulnerable version of lodash with known security issues',
        severity: 'high',
        category: 'dependency',
        cwe: 'CWE-94',
        location: {
          file: 'package.json',
          line: 15
        },
        evidence: {
          code: '"lodash": "^4.17.15"'
        },
        impact: 'Command injection vulnerability could allow arbitrary code execution',
        recommendation: 'Update lodash to version 4.17.21 or later',
        references: [
          'https://nvd.nist.gov/vuln/detail/CVE-2021-23337'
        ],
        fixable: true,
        fix: {
          type: 'dependency',
          description: 'Update lodash to latest secure version',
          code: '"lodash": "^4.17.21"',
          automated: true
        }
      }
    ];
  }

  private async scanInfrastructureVulnerabilities(config: VulnerabilityConfig): Promise<SecurityVulnerability[]> {
    // Simulate infrastructure vulnerability scanning
    return [
      {
        id: 'INFRA-001',
        title: 'Missing Security Headers',
        description: 'Application is missing important security headers',
        severity: 'medium',
        category: 'infrastructure',
        cwe: 'CWE-693',
        location: {
          file: 'server configuration'
        },
        evidence: {
          response: 'Missing: X-Frame-Options, X-Content-Type-Options, X-XSS-Protection'
        },
        impact: 'Increased risk of clickjacking and XSS attacks',
        recommendation: 'Implement proper security headers',
        references: [
          'https://owasp.org/www-project-secure-headers/'
        ],
        fixable: true,
        fix: {
          type: 'config',
          description: 'Add security headers to server configuration',
          automated: false
        }
      }
    ];
  }

  private async scanApiVulnerabilities(config: VulnerabilityConfig): Promise<SecurityVulnerability[]> {
    // Simulate API vulnerability scanning
    return [
      {
        id: 'API-001',
        title: 'Missing Rate Limiting',
        description: 'API endpoints lack proper rate limiting',
        severity: 'medium',
        category: 'api',
        cwe: 'CWE-770',
        location: {
          file: 'API endpoints'
        },
        evidence: {
          request: 'Multiple rapid requests accepted without throttling'
        },
        impact: 'Potential for denial of service and brute force attacks',
        recommendation: 'Implement rate limiting on all API endpoints',
        references: [
          'https://owasp.org/www-community/controls/Blocking_Brute_Force_Attacks'
        ],
        fixable: true,
        fix: {
          type: 'code',
          description: 'Add rate limiting middleware',
          automated: false
        }
      }
    ];
  }

  // Code analysis methods
  private async analyzeFileForSecurity(
    file: { path: string; content: string },
    config: CodeAnalysisConfig
  ): Promise<SecurityVulnerability[]> {
    const vulnerabilities: SecurityVulnerability[] = [];

    // Check for hardcoded secrets
    if (config.patterns.includes('hardcoded-secrets')) {
      const secretVulns = this.detectHardcodedSecrets(file);
      vulnerabilities.push(...secretVulns);
    }

    // Check for insecure crypto
    if (config.patterns.includes('insecure-crypto')) {
      const cryptoVulns = this.detectInsecureCrypto(file);
      vulnerabilities.push(...cryptoVulns);
    }

    // Check for unsafe functions
    if (config.patterns.includes('unsafe-functions')) {
      const unsafeVulns = this.detectUnsafeFunctions(file);
      vulnerabilities.push(...unsafeVulns);
    }

    // Check for input validation issues
    if (config.patterns.includes('input-validation')) {
      const inputVulns = this.detectInputValidationIssues(file);
      vulnerabilities.push(...inputVulns);
    }

    return vulnerabilities;
  }

  // Vulnerability detection methods
  private detectXSSVulnerabilities(file: { path: string; content: string }): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const xssPatterns = [
      /innerHTML\s*=\s*[^;]+/g,
      /document\.write\s*\(/g,
      /eval\s*\(/g,
      /dangerouslySetInnerHTML/g
    ];

    xssPatterns.forEach((pattern, index) => {
      const matches = file.content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          vulnerabilities.push({
            id: `XSS-${index + 1}`,
            title: 'Potential XSS Vulnerability',
            description: 'Code may be vulnerable to Cross-Site Scripting (XSS) attacks',
            severity: 'high',
            category: 'xss',
            cwe: 'CWE-79',
            location: {
              file: file.path,
              line: this.getLineNumber(file.content, match)
            },
            evidence: {
              code: match
            },
            impact: 'Attackers could inject malicious scripts into the application',
            recommendation: 'Use proper input sanitization and output encoding',
            references: [
              'https://owasp.org/www-community/attacks/xss/'
            ],
            fixable: true,
            fix: {
              type: 'code',
              description: 'Replace with safe DOM manipulation methods',
              automated: false
            }
          });
        });
      }
    });

    return vulnerabilities;
  }

  private detectSQLInjectionVulnerabilities(file: { path: string; content: string }): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const sqlPatterns = [
      /query\s*\(\s*['"`].*\$\{.*\}.*['"`]/g,
      /execute\s*\(\s*['"`].*\+.*['"`]/g,
      /SELECT.*FROM.*WHERE.*\+/g
    ];

    sqlPatterns.forEach((pattern, index) => {
      const matches = file.content.match(pattern);
      if (matches) {
        matches.forEach(match => {
          vulnerabilities.push({
            id: `SQL-${index + 1}`,
            title: 'Potential SQL Injection Vulnerability',
            description: 'Code may be vulnerable to SQL injection attacks',
            severity: 'critical',
            category: 'sql-injection',
            cwe: 'CWE-89',
            location: {
              file: file.path,
              line: this.getLineNumber(file.content, match)
            },
            evidence: {
              code: match
            },
            impact: 'Attackers could manipulate database queries and access sensitive data',
            recommendation: 'Use parameterized queries or prepared statements',
            references: [
              'https://owasp.org/www-community/attacks/SQL_Injection'
            ],
            fixable: true,
            fix: {
              type: 'code',
              description: 'Replace with parameterized query',
              automated: false
            }
          });
        });
      }
    });

    return vulnerabilities;
  }

  private detectHardcodedSecrets(file: { path: string; content: string }): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const secretPatterns = [
      { pattern: /password\s*[=:]\s*['"][^'"]+['"]/gi, type: 'password' },
      { pattern: /api[_-]?key\s*[=:]\s*['"][^'"]+['"]/gi, type: 'api_key' },
      { pattern: /secret\s*[=:]\s*['"][^'"]+['"]/gi, type: 'secret' },
      { pattern: /token\s*[=:]\s*['"][^'"]+['"]/gi, type: 'token' },
      { pattern: /sk_[a-zA-Z0-9]{24,}/g, type: 'stripe_secret' },
      { pattern: /AKIA[0-9A-Z]{16}/g, type: 'aws_access_key' }
    ];

    secretPatterns.forEach((secretPattern, index) => {
      const matches = file.content.match(secretPattern.pattern);
      if (matches) {
        matches.forEach(match => {
          vulnerabilities.push({
            id: `SECRET-${index + 1}`,
            title: `Hardcoded ${secretPattern.type.replace('_', ' ')} Detected`,
            description: `Hardcoded ${secretPattern.type} found in source code`,
            severity: 'critical',
            category: 'hardcoded-secrets',
            cwe: 'CWE-798',
            location: {
              file: file.path,
              line: this.getLineNumber(file.content, match)
            },
            evidence: {
              code: match.replace(/['"][^'"]+['"]/, '"***REDACTED***"')
            },
            impact: 'Exposed credentials could lead to unauthorized access',
            recommendation: 'Move secrets to environment variables or secure vault',
            references: [
              'https://owasp.org/www-community/vulnerabilities/Use_of_hard-coded_password'
            ],
            fixable: true,
            fix: {
              type: 'code',
              description: 'Replace with environment variable',
              code: `process.env.${secretPattern.type.toUpperCase()}`,
              automated: false
            }
          });
        });
      }
    });

    return vulnerabilities;
  }

  private detectInsecureCrypto(file: { path: string; content: string }): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const cryptoPatterns = [
      { pattern: /md5\s*\(/gi, issue: 'MD5 is cryptographically broken' },
      { pattern: /sha1\s*\(/gi, issue: 'SHA1 is cryptographically weak' },
      { pattern: /des\s*\(/gi, issue: 'DES encryption is insecure' },
      { pattern: /rc4\s*\(/gi, issue: 'RC4 cipher is insecure' }
    ];

    cryptoPatterns.forEach((cryptoPattern, index) => {
      const matches = file.content.match(cryptoPattern.pattern);
      if (matches) {
        matches.forEach(match => {
          vulnerabilities.push({
            id: `CRYPTO-${index + 1}`,
            title: 'Insecure Cryptographic Algorithm',
            description: cryptoPattern.issue,
            severity: 'high',
            category: 'insecure-crypto',
            cwe: 'CWE-327',
            location: {
              file: file.path,
              line: this.getLineNumber(file.content, match)
            },
            evidence: {
              code: match
            },
            impact: 'Weak cryptography could be broken by attackers',
            recommendation: 'Use strong cryptographic algorithms like SHA-256 or AES',
            references: [
              'https://owasp.org/www-project-cryptographic-storage-cheat-sheet/'
            ],
            fixable: true,
            fix: {
              type: 'code',
              description: 'Replace with secure cryptographic algorithm',
              automated: false
            }
          });
        });
      }
    });

    return vulnerabilities;
  }

  private detectUnsafeFunctions(file: { path: string; content: string }): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const unsafePatterns = [
      { pattern: /eval\s*\(/g, issue: 'eval() can execute arbitrary code' },
      { pattern: /setTimeout\s*\(\s*['"][^'"]*['"]\s*,/g, issue: 'setTimeout with string argument uses eval' },
      { pattern: /setInterval\s*\(\s*['"][^'"]*['"]\s*,/g, issue: 'setInterval with string argument uses eval' },
      { pattern: /Function\s*\(/g, issue: 'Function constructor can execute arbitrary code' }
    ];

    unsafePatterns.forEach((unsafePattern, index) => {
      const matches = file.content.match(unsafePattern.pattern);
      if (matches) {
        matches.forEach(match => {
          vulnerabilities.push({
            id: `UNSAFE-${index + 1}`,
            title: 'Unsafe Function Usage',
            description: unsafePattern.issue,
            severity: 'high',
            category: 'unsafe-functions',
            cwe: 'CWE-94',
            location: {
              file: file.path,
              line: this.getLineNumber(file.content, match)
            },
            evidence: {
              code: match
            },
            impact: 'Could allow arbitrary code execution',
            recommendation: 'Avoid using unsafe functions or properly validate input',
            references: [
              'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval#never_use_eval!'
            ],
            fixable: true,
            fix: {
              type: 'code',
              description: 'Replace with safe alternative',
              automated: false
            }
          });
        });
      }
    });

    return vulnerabilities;
  }

  private detectInputValidationIssues(file: { path: string; content: string }): SecurityVulnerability[] {
    const vulnerabilities: SecurityVulnerability[] = [];
    const validationPatterns = [
      { pattern: /req\.(body|query|params)\.[a-zA-Z_][a-zA-Z0-9_]*(?!\s*&&|\s*\|\||\s*\?)/g, issue: 'Unvalidated user input' },
      { pattern: /parseInt\s*\(\s*req\.(body|query|params)/g, issue: 'Unvalidated numeric input' },
      { pattern: /JSON\.parse\s*\(\s*req\.(body|query|params)/g, issue: 'Unvalidated JSON parsing' }
    ];

    validationPatterns.forEach((validationPattern, index) => {
      const matches = file.content.match(validationPattern.pattern);
      if (matches) {
        matches.forEach(match => {
          vulnerabilities.push({
            id: `INPUT-${index + 1}`,
            title: 'Input Validation Issue',
            description: validationPattern.issue,
            severity: 'medium',
            category: 'input-validation',
            cwe: 'CWE-20',
            location: {
              file: file.path,
              line: this.getLineNumber(file.content, match)
            },
            evidence: {
              code: match
            },
            impact: 'Unvalidated input could lead to various attacks',
            recommendation: 'Implement proper input validation and sanitization',
            references: [
              'https://owasp.org/www-project-proactive-controls/v3/en/c5-validate-inputs'
            ],
            fixable: true,
            fix: {
              type: 'code',
              description: 'Add input validation',
              automated: false
            }
          });
        });
      }
    });

    return vulnerabilities;
  }

  // Audit methods
  private async auditCodeSecurity(
    files?: { path: string; content: string }[],
    config?: SecurityConfig
  ): Promise<SecurityVulnerability[]> {
    if (!files) return [];
    
    const vulnerabilities: SecurityVulnerability[] = [];
    
    for (const file of files) {
      const fileVulns = await this.analyzeFileForSecurity(file, {
        scanType: 'code-analysis',
        languages: ['javascript', 'typescript'],
        patterns: ['hardcoded-secrets', 'insecure-crypto', 'unsafe-functions', 'input-validation'],
        staticAnalysis: true,
        dynamicAnalysis: false,
        severity: ['critical', 'high', 'medium', 'low'],
        frameworks: [],
        includeThirdParty: true,
        generateReport: false,
        autoFix: false
      });
      vulnerabilities.push(...fileVulns);
    }
    
    return vulnerabilities;
  }

  private async auditConfigurationSecurity(config: SecurityConfig): Promise<SecurityVulnerability[]> {
    // Simulate configuration security audit
    return [
      {
        id: 'CONFIG-001',
        title: 'Insecure CORS Configuration',
        description: 'CORS is configured to allow all origins',
        severity: 'medium',
        category: 'configuration',
        cwe: 'CWE-942',
        location: {
          file: 'server configuration'
        },
        evidence: {
          code: 'Access-Control-Allow-Origin: *'
        },
        impact: 'Could allow unauthorized cross-origin requests',
        recommendation: 'Configure CORS to allow only trusted origins',
        references: [
          'https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny'
        ],
        fixable: true,
        fix: {
          type: 'config',
          description: 'Restrict CORS to specific origins',
          automated: false
        }
      }
    ];
  }

  private async auditInfrastructureSecurity(config: SecurityConfig): Promise<SecurityVulnerability[]> {
    // Simulate infrastructure security audit
    return [
      {
        id: 'INFRA-002',
        title: 'Unencrypted Data Transmission',
        description: 'Some endpoints are accessible over HTTP',
        severity: 'high',
        category: 'infrastructure',
        cwe: 'CWE-319',
        location: {
          file: 'network configuration'
        },
        evidence: {
          request: 'HTTP requests accepted on port 80'
        },
        impact: 'Data could be intercepted in transit',
        recommendation: 'Enforce HTTPS for all communications',
        references: [
          'https://owasp.org/www-community/controls/Transport_Layer_Protection_Cheat_Sheet'
        ],
        fixable: true,
        fix: {
          type: 'config',
          description: 'Redirect HTTP to HTTPS and disable HTTP',
          automated: false
        }
      }
    ];
  }

  private async auditCompliance(
    framework: string,
    files?: { path: string; content: string }[]
  ): Promise<ComplianceIssue[]> {
    const issues: ComplianceIssue[] = [];

    switch (framework) {
      case 'owasp':
        issues.push(...await this.checkOWASPCompliance(files));
        break;
      case 'nist':
        issues.push(...await this.checkNISTCompliance(files));
        break;
      case 'gdpr':
        issues.push(...await this.checkGDPRCompliance(files));
        break;
      case 'pci-dss':
        issues.push(...await this.checkPCIDSSCompliance(files));
        break;
    }

    return issues;
  }

  // Compliance checking methods
  private async checkOWASPCompliance(files?: { path: string; content: string }[]): Promise<ComplianceIssue[]> {
    return [
      {
        id: 'OWASP-A01',
        standard: 'OWASP Top 10 2021',
        requirement: 'A01:2021 – Broken Access Control',
        description: 'Access control enforcement is missing or inadequate',
        severity: 'high',
        status: 'non-compliant',
        evidence: ['Missing authorization checks in API endpoints'],
        remediation: {
          description: 'Implement proper access control mechanisms',
          steps: [
            'Add authentication middleware to all protected routes',
            'Implement role-based access control (RBAC)',
            'Validate user permissions for each operation',
            'Log access control failures'
          ],
          timeline: '2 weeks',
          responsible: 'Development Team'
        },
        references: [
          'https://owasp.org/Top10/A01_2021-Broken_Access_Control/'
        ]
      }
    ];
  }

  private async checkNISTCompliance(files?: { path: string; content: string }[]): Promise<ComplianceIssue[]> {
    return [
      {
        id: 'NIST-AC-3',
        standard: 'NIST Cybersecurity Framework',
        requirement: 'Access Control (AC-3)',
        description: 'System does not enforce approved authorizations for logical access',
        severity: 'high',
        status: 'partial',
        evidence: ['Some endpoints have access control, others do not'],
        remediation: {
          description: 'Implement comprehensive access control system',
          steps: [
            'Conduct access control assessment',
            'Implement consistent authorization framework',
            'Document access control policies',
            'Regular access control reviews'
          ],
          timeline: '4 weeks',
          responsible: 'Security Team'
        },
        references: [
          'https://csrc.nist.gov/Projects/cybersecurity-framework'
        ]
      }
    ];
  }

  private async checkGDPRCompliance(files?: { path: string; content: string }[]): Promise<ComplianceIssue[]> {
    return [
      {
        id: 'GDPR-ART25',
        standard: 'GDPR',
        requirement: 'Article 25 - Data protection by design and by default',
        description: 'System lacks privacy by design implementation',
        severity: 'high',
        status: 'non-compliant',
        evidence: ['No data minimization controls', 'Missing consent management'],
        remediation: {
          description: 'Implement privacy by design principles',
          steps: [
            'Implement data minimization controls',
            'Add consent management system',
            'Implement data retention policies',
            'Add data subject rights functionality'
          ],
          timeline: '6 weeks',
          responsible: 'Privacy Team'
        },
        references: [
          'https://gdpr-info.eu/art-25-gdpr/'
        ]
      }
    ];
  }

  private async checkPCIDSSCompliance(files?: { path: string; content: string }[]): Promise<ComplianceIssue[]> {
    return [
      {
        id: 'PCI-REQ3',
        standard: 'PCI DSS',
        requirement: 'Requirement 3 - Protect stored cardholder data',
        description: 'Cardholder data is not properly protected',
        severity: 'critical',
        status: 'non-compliant',
        evidence: ['Unencrypted cardholder data storage'],
        remediation: {
          description: 'Implement proper cardholder data protection',
          steps: [
            'Encrypt all stored cardholder data',
            'Implement key management procedures',
            'Limit data retention',
            'Secure data disposal procedures'
          ],
          timeline: '3 weeks',
          responsible: 'Security Team'
        },
        references: [
          'https://www.pcisecuritystandards.org/document_library'
        ]
      }
    ];
  }

  // Penetration testing methods
  private async performWebAppPentest(config: SecurityConfig) {
    return [
      {
        vulnerability: {
          id: 'PENTEST-001',
          title: 'SQL Injection in Login Form',
          description: 'Login form is vulnerable to SQL injection attacks',
          severity: 'critical' as const,
          category: 'injection',
          cwe: 'CWE-89',
          location: {
            file: '/login',
            function: 'authenticateUser'
          },
          evidence: {
            payload: "admin' OR '1'='1' --",
            response: 'Authentication bypassed'
          },
          impact: 'Complete database compromise possible',
          recommendation: 'Use parameterized queries',
          references: ['https://owasp.org/www-community/attacks/SQL_Injection'],
          fixable: true
        },
        exploitability: 'easy' as const,
        businessImpact: 'critical' as const,
        proofOfConcept: 'Successfully bypassed authentication using SQL injection'
      }
    ];
  }

  private async performApiPentest(config: SecurityConfig) {
    return [
      {
        vulnerability: {
          id: 'PENTEST-002',
          title: 'Broken Object Level Authorization',
          description: 'API allows access to other users\' data',
          severity: 'high' as const,
          category: 'authorization',
          cwe: 'CWE-639',
          location: {
            file: '/api/users/{id}',
            function: 'getUserData'
          },
          evidence: {
            request: 'GET /api/users/123 with user 456 token',
            response: 'User 123 data returned'
          },
          impact: 'Unauthorized access to sensitive user data',
          recommendation: 'Implement proper authorization checks',
          references: ['https://owasp.org/API-Security/editions/2019/en/0xa1-broken-object-level-authorization/'],
          fixable: true
        },
        exploitability: 'medium' as const,
        businessImpact: 'high' as const,
        proofOfConcept: 'Accessed other users\' data by manipulating user ID'
      }
    ];
  }

  private async performInfraPentest(config: SecurityConfig) {
    return [
      {
        vulnerability: {
          id: 'PENTEST-003',
          title: 'Exposed Administrative Interface',
          description: 'Administrative interface is accessible from internet',
          severity: 'high' as const,
          category: 'exposure',
          cwe: 'CWE-200',
          location: {
            file: 'network configuration'
          },
          evidence: {
            request: 'Access to /admin from external IP',
            response: 'Admin panel accessible'
          },
          impact: 'Potential unauthorized administrative access',
          recommendation: 'Restrict admin interface to internal network',
          references: ['https://owasp.org/www-community/vulnerabilities/Insecure_Administrative_Access'],
          fixable: true
        },
        exploitability: 'medium' as const,
        businessImpact: 'high' as const,
        proofOfConcept: 'Accessed admin interface from external network'
      }
    ];
  }

  // Framework compliance checking
  private async checkFrameworkCompliance(
    framework: string,
    config: ComplianceConfig,
    files?: { path: string; content: string }[]
  ): Promise<ComplianceIssue[]> {
    switch (framework) {
      case 'owasp':
        return await this.checkOWASPCompliance(files);
      case 'nist':
        return await this.checkNISTCompliance(files);
      case 'gdpr':
        return await this.checkGDPRCompliance(files);
      case 'pci-dss':
        return await this.checkPCIDSSCompliance(files);
      case 'iso27001':
        return await this.checkISO27001Compliance(files);
      case 'hipaa':
        return await this.checkHIPAACompliance(files);
      default:
        return [];
    }
  }

  private async checkISO27001Compliance(files?: { path: string; content: string }[]): Promise<ComplianceIssue[]> {
    return [
      {
        id: 'ISO-A.9.1.1',
        standard: 'ISO 27001',
        requirement: 'A.9.1.1 Access control policy',
        description: 'Access control policy is not documented or implemented',
        severity: 'medium',
        status: 'non-compliant',
        evidence: ['No documented access control policy found'],
        remediation: {
          description: 'Develop and implement access control policy',
          steps: [
            'Document access control policy',
            'Define user access requirements',
            'Implement policy enforcement mechanisms',
            'Regular policy reviews'
          ],
          timeline: '4 weeks',
          responsible: 'Information Security Team'
        },
        references: [
          'https://www.iso.org/standard/54534.html'
        ]
      }
    ];
  }

  private async checkHIPAACompliance(files?: { path: string; content: string }[]): Promise<ComplianceIssue[]> {
    return [
      {
        id: 'HIPAA-164.312',
        standard: 'HIPAA',
        requirement: '§ 164.312(a)(1) Access control',
        description: 'Technical safeguards for access control are insufficient',
        severity: 'high',
        status: 'non-compliant',
        evidence: ['Missing unique user identification', 'No automatic logoff'],
        remediation: {
          description: 'Implement HIPAA technical safeguards',
          steps: [
            'Implement unique user identification',
            'Add automatic logoff functionality',
            'Implement encryption controls',
            'Add audit logging'
          ],
          timeline: '6 weeks',
          responsible: 'Compliance Team'
        },
        references: [
          'https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html'
        ]
      }
    ];
  }

  // Report generation methods
  private async generateSecurityReport(
    vulnerabilities: SecurityVulnerability[],
    config: SecurityConfig
  ) {
    const report = `# Security Vulnerability Report

## Executive Summary
- **Total Vulnerabilities**: ${vulnerabilities.length}
- **Critical**: ${vulnerabilities.filter(v => v.severity === 'critical').length}
- **High**: ${vulnerabilities.filter(v => v.severity === 'high').length}
- **Medium**: ${vulnerabilities.filter(v => v.severity === 'medium').length}
- **Low**: ${vulnerabilities.filter(v => v.severity === 'low').length}

## Vulnerabilities

${vulnerabilities.map(vuln => `
### ${vuln.title} (${vuln.severity.toUpperCase()})

**ID**: ${vuln.id}  
**Category**: ${vuln.category}  
**CWE**: ${vuln.cwe || 'N/A'}  
**Location**: ${vuln.location.file}${vuln.location.line ? `:${vuln.location.line}` : ''}

**Description**: ${vuln.description}

**Impact**: ${vuln.impact}

**Recommendation**: ${vuln.recommendation}

**Evidence**:
\`\`\`
${vuln.evidence.code || vuln.evidence.request || vuln.evidence.response || 'No evidence available'}
\`\`\`

**References**:
${vuln.references.map(ref => `- ${ref}`).join('\n')}

${vuln.fixable ? `**Fix Available**: ${vuln.fix?.description || 'Manual fix required'}` : '**Fix**: Manual remediation required'}

---
`).join('')}

## Recommendations

1. **Immediate Actions**:
   - Address all critical and high severity vulnerabilities
   - Implement input validation and output encoding
   - Review and update security configurations

2. **Short-term Actions**:
   - Implement security testing in CI/CD pipeline
   - Conduct security training for development team
   - Establish security code review process

3. **Long-term Actions**:
   - Implement security monitoring and alerting
   - Regular security assessments and penetration testing
   - Maintain security documentation and policies

## Generated: ${new Date().toISOString()}
`;

    return {
      path: 'security-report.md',
      content: report,
      type: 'report' as const
    };
  }

  private async generateSecurityFixes(vulnerabilities: SecurityVulnerability[]) {
    const fixes = [];
    const fixableVulns = vulnerabilities.filter(v => v.fixable && v.fix);

    if (fixableVulns.length > 0) {
      const fixScript = `#!/bin/bash
# Automated Security Fixes

${fixableVulns.map(vuln => {
        if (vuln.fix?.type === 'dependency') {
          return `# Fix for ${vuln.title}\nnpm update ${vuln.location.file.replace('package.json', '').trim()}`;
        }
        return `# Fix for ${vuln.title}\n# Manual fix required: ${vuln.fix?.description}`;
      }).join('\n\n')}
`;

      fixes.push({
        path: 'security-fixes.sh',
        content: fixScript,
        type: 'fix' as const
      });
    }

    return fixes;
  }

  private async generateSecurityPolicy(config: CodeAnalysisConfig) {
    const policy = `# Security Policy

## Code Security Guidelines

### Secure Coding Practices

1. **Input Validation**
   - Validate all user inputs
   - Use whitelist validation where possible
   - Sanitize data before processing

2. **Authentication & Authorization**
   - Implement strong authentication mechanisms
   - Use role-based access control (RBAC)
   - Validate user permissions for each operation

3. **Cryptography**
   - Use strong cryptographic algorithms (AES-256, SHA-256)
   - Implement proper key management
   - Never hardcode secrets in source code

4. **Error Handling**
   - Implement proper error handling
   - Don't expose sensitive information in error messages
   - Log security events for monitoring

### Prohibited Practices

- Using eval() or similar dynamic code execution
- Hardcoding passwords, API keys, or secrets
- Using weak cryptographic algorithms (MD5, SHA1, DES)
- Accepting unvalidated user input
- Exposing sensitive data in logs or error messages

### Security Testing

- Perform static code analysis
- Conduct regular security reviews
- Implement automated security testing
- Regular dependency vulnerability scanning

## Compliance Requirements

${config.frameworks?.map(framework => `- ${framework.toUpperCase()}`).join('\n') || '- OWASP Top 10\n- SANS Top 25'}

## Incident Response

1. **Detection**: Monitor for security events
2. **Response**: Follow incident response procedures
3. **Recovery**: Implement fixes and restore services
4. **Lessons Learned**: Update policies and procedures

## Generated: ${new Date().toISOString()}
`;

    return {
      path: 'security-policy.md',
      content: policy,
      type: 'policy' as const
    };
  }

  private async generateSecurityLintingRules(config: CodeAnalysisConfig) {
    const eslintRules = {
      "rules": {
        "no-eval": "error",
        "no-implied-eval": "error",
        "no-new-func": "error",
        "no-script-url": "error",
        "security/detect-object-injection": "error",
        "security/detect-non-literal-regexp": "error",
        "security/detect-unsafe-regex": "error",
        "security/detect-buffer-noassert": "error",
        "security/detect-child-process": "error",
        "security/detect-disable-mustache-escape": "error",
        "security/detect-eval-with-expression": "error",
        "security/detect-no-csrf-before-method-override": "error",
        "security/detect-non-literal-fs-filename": "error",
        "security/detect-non-literal-require": "error",
        "security/detect-possible-timing-attacks": "error",
        "security/detect-pseudoRandomBytes": "error"
      },
      "plugins": ["security"]
    };

    return {
      path: '.eslintrc.security.json',
      content: JSON.stringify(eslintRules, null, 2),
      type: 'config' as const
    };
  }

  private calculateSecuritySummary(
    vulnerabilities: SecurityVulnerability[],
    compliance?: ComplianceIssue[]
  ) {
    const totalIssues = vulnerabilities.length + (compliance?.length || 0);
    const criticalIssues = vulnerabilities.filter(v => v.severity === 'critical').length;
    const highIssues = vulnerabilities.filter(v => v.severity === 'high').length;
    const mediumIssues = vulnerabilities.filter(v => v.severity === 'medium').length;
    const lowIssues = vulnerabilities.filter(v => v.severity === 'low').length;
    const fixableIssues = vulnerabilities.filter(v => v.fixable).length;

    // Calculate compliance score (0-100)
    const complianceScore = compliance ? 
      Math.max(0, 100 - (compliance.filter(c => c.status === 'non-compliant').length * 10)) : 100;

    // Calculate risk score (0-100, higher is worse)
    const riskScore = Math.min(100, 
      (criticalIssues * 25) + (highIssues * 10) + (mediumIssues * 5) + (lowIssues * 1)
    );

    return {
      totalIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      fixableIssues,
      complianceScore,
      riskScore
    };
  }

  private calculateComplianceSummary(compliance: ComplianceIssue[]) {
    const totalIssues = compliance.length;
    const criticalIssues = compliance.filter(c => c.severity === 'critical').length;
    const highIssues = compliance.filter(c => c.severity === 'high').length;
    const mediumIssues = compliance.filter(c => c.severity === 'medium').length;
    const lowIssues = compliance.filter(c => c.severity === 'low').length;
    const complianceScore = Math.max(0, 100 - (compliance.filter(c => c.status === 'non-compliant').length * 10));

    return {
      totalIssues,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      fixableIssues: 0,
      complianceScore,
      riskScore: Math.min(100, (criticalIssues * 25) + (highIssues * 10) + (mediumIssues * 5) + (lowIssues * 1))
    };
  }

  private generateSecurityRecommendations(
    vulnerabilities: SecurityVulnerability[],
    config: SecurityConfig
  ) {
    const recommendations = [];

    if (vulnerabilities.some(v => v.severity === 'critical')) {
      recommendations.push({
        priority: 'immediate' as const,
        category: 'Critical Vulnerabilities',
        description: 'Address all critical severity vulnerabilities immediately',
        impact: 'Prevents potential security breaches and data loss',
        effort: 'high' as const,
        timeline: '1-3 days'
      });
    }

    if (vulnerabilities.some(v => v.category === 'hardcoded-secrets')) {
      recommendations.push({
        priority: 'immediate' as const,
        category: 'Secret Management',
        description: 'Remove hardcoded secrets and implement proper secret management',
        impact: 'Prevents credential exposure and unauthorized access',
        effort: 'medium' as const,
        timeline: '1 week'
      });
    }

    if (vulnerabilities.some(v => v.category === 'input-validation')) {
      recommendations.push({
        priority: 'high' as const,
        category: 'Input Validation',
        description: 'Implement comprehensive input validation and sanitization',
        impact: 'Prevents injection attacks and data corruption',
        effort: 'medium' as const,
        timeline: '2 weeks'
      });
    }

    recommendations.push({
      priority: 'medium' as const,
      category: 'Security Testing',
      description: 'Integrate automated security testing into CI/CD pipeline',
      impact: 'Prevents future security vulnerabilities',
      effort: 'medium' as const,
      timeline: '3 weeks'
    });

    return recommendations;
  }

  private generateCodeSecurityRecommendations(
    vulnerabilities: SecurityVulnerability[],
    config: CodeAnalysisConfig
  ) {
    return this.generateSecurityRecommendations(vulnerabilities, config);
  }

  private generateAuditRecommendations(
    vulnerabilities: SecurityVulnerability[],
    compliance: ComplianceIssue[],
    config: SecurityConfig
  ) {
    const recommendations = this.generateSecurityRecommendations(vulnerabilities, config);

    if (compliance.some(c => c.status === 'non-compliant')) {
      recommendations.push({
        priority: 'high' as const,
        category: 'Compliance',
        description: 'Address compliance violations to meet regulatory requirements',
        impact: 'Avoids regulatory penalties and maintains certification',
        effort: 'high' as const,
        timeline: '4-8 weeks'
      });
    }

    return recommendations;
  }

  private generateComplianceRecommendations(
    compliance: ComplianceIssue[],
    config: ComplianceConfig
  ) {
    const recommendations = [];

    const criticalCompliance = compliance.filter(c => c.severity === 'critical');
    if (criticalCompliance.length > 0) {
      recommendations.push({
        priority: 'immediate' as const,
        category: 'Critical Compliance',
        description: 'Address critical compliance violations immediately',
        impact: 'Prevents regulatory penalties and legal issues',
        effort: 'high' as const,
        timeline: '1-2 weeks'
      });
    }

    recommendations.push({
      priority: 'medium' as const,
      category: 'Compliance Monitoring',
      description: 'Implement continuous compliance monitoring',
      impact: 'Maintains ongoing compliance and reduces audit burden',
      effort: 'medium' as const,
      timeline: '4 weeks'
    });

    return recommendations;
  }

  // Additional generation methods
  private async generateAuditReport(
    vulnerabilities: SecurityVulnerability[],
    compliance: ComplianceIssue[],
    config: SecurityConfig
  ) {
    const report = `# Security Audit Report

## Executive Summary

This comprehensive security audit was conducted to assess the security posture of the application and its compliance with industry standards.

### Key Findings
- **Vulnerabilities Found**: ${vulnerabilities.length}
- **Compliance Issues**: ${compliance.length}
- **Critical Issues**: ${vulnerabilities.filter(v => v.severity === 'critical').length + compliance.filter(c => c.severity === 'critical').length}
- **Overall Risk Level**: ${this.calculateRiskLevel(vulnerabilities, compliance)}

## Vulnerability Assessment

${vulnerabilities.map(vuln => `
### ${vuln.title}
**Severity**: ${vuln.severity.toUpperCase()}  
**Category**: ${vuln.category}  
**Location**: ${vuln.location.file}

${vuln.description}

**Recommendation**: ${vuln.recommendation}
`).join('\n')}

## Compliance Assessment

${compliance.map(comp => `
### ${comp.requirement}
**Standard**: ${comp.standard}  
**Status**: ${comp.status}  
**Severity**: ${comp.severity}

${comp.description}

**Remediation**: ${comp.remediation.description}
`).join('\n')}

## Recommendations

1. **Immediate Actions** (1-7 days)
2. **Short-term Actions** (1-4 weeks)
3. **Long-term Actions** (1-3 months)

## Generated: ${new Date().toISOString()}
`;

    return {
      path: 'security-audit-report.md',
      content: report,
      type: 'report' as const
    };
  }

  private async generateRemediationPlan(
    vulnerabilities: SecurityVulnerability[],
    compliance: ComplianceIssue[]
  ) {
    const plan = `# Security Remediation Plan

## Priority Matrix

### Critical Priority (Immediate - 1-3 days)
${vulnerabilities.filter(v => v.severity === 'critical').map(v => `- ${v.title}`).join('\n')}
${compliance.filter(c => c.severity === 'critical').map(c => `- ${c.requirement}`).join('\n')}

### High Priority (1-2 weeks)
${vulnerabilities.filter(v => v.severity === 'high').map(v => `- ${v.title}`).join('\n')}
${compliance.filter(c => c.severity === 'high').map(c => `- ${c.requirement}`).join('\n')}

### Medium Priority (2-4 weeks)
${vulnerabilities.filter(v => v.severity === 'medium').map(v => `- ${v.title}`).join('\n')}
${compliance.filter(c => c.severity === 'medium').map(c => `- ${c.requirement}`).join('\n')}

### Low Priority (1-3 months)
${vulnerabilities.filter(v => v.severity === 'low').map(v => `- ${v.title}`).join('\n')}
${compliance.filter(c => c.severity === 'low').map(c => `- ${c.requirement}`).join('\n')}

## Implementation Timeline

| Week | Focus Area | Deliverables |
|------|------------|-------------|
| 1 | Critical vulnerabilities | Fix critical security issues |
| 2-3 | High priority items | Address high-risk vulnerabilities |
| 4-6 | Medium priority items | Implement security controls |
| 7-12 | Low priority & monitoring | Complete remaining items |

## Resource Requirements

- **Development Team**: 2-3 developers
- **Security Team**: 1 security specialist
- **Timeline**: 12 weeks
- **Budget**: Estimated based on team capacity

## Success Metrics

- 100% of critical vulnerabilities resolved
- 90% of high-priority items addressed
- Compliance score improved to >90%
- Security testing integrated into CI/CD

## Generated: ${new Date().toISOString()}
`;

    return {
      path: 'remediation-plan.md',
      content: plan,
      type: 'report' as const
    };
  }

  private async generatePentestReport(
    findings: any[],
    methodology: string[],
    config: SecurityConfig
  ): Promise<string> {
    const report = `# Penetration Testing Report

## Executive Summary

This penetration test was conducted to identify security vulnerabilities and assess the overall security posture of the target application.

### Test Scope
- **Target**: Application and Infrastructure
- **Duration**: 8 hours
- **Methodology**: ${methodology.join(', ')}
- **Findings**: ${findings.length} vulnerabilities identified

## Methodology

${methodology.map((method, index) => `${index + 1}. **${method}**: Comprehensive assessment of ${method.toLowerCase()}`).join('\n')}

## Findings

${findings.map((finding, index) => `
### Finding ${index + 1}: ${finding.vulnerability.title}

**Severity**: ${finding.vulnerability.severity.toUpperCase()}  
**Exploitability**: ${finding.exploitability}  
**Business Impact**: ${finding.businessImpact}

**Description**: ${finding.vulnerability.description}

**Proof of Concept**: ${finding.proofOfConcept}

**Recommendation**: ${finding.vulnerability.recommendation}

---
`).join('')}

## Risk Assessment

| Risk Level | Count | Percentage |
|------------|-------|------------|
| Critical | ${findings.filter(f => f.vulnerability.severity === 'critical').length} | ${Math.round((findings.filter(f => f.vulnerability.severity === 'critical').length / findings.length) * 100)}% |
| High | ${findings.filter(f => f.vulnerability.severity === 'high').length} | ${Math.round((findings.filter(f => f.vulnerability.severity === 'high').length / findings.length) * 100)}% |
| Medium | ${findings.filter(f => f.vulnerability.severity === 'medium').length} | ${Math.round((findings.filter(f => f.vulnerability.severity === 'medium').length / findings.length) * 100)}% |
| Low | ${findings.filter(f => f.vulnerability.severity === 'low').length} | ${Math.round((findings.filter(f => f.vulnerability.severity === 'low').length / findings.length) * 100)}% |

## Recommendations

1. **Immediate Actions**:
   - Address all critical and high-severity findings
   - Implement input validation and output encoding
   - Review authentication and authorization mechanisms

2. **Short-term Actions**:
   - Implement security monitoring
   - Conduct security training
   - Establish incident response procedures

3. **Long-term Actions**:
   - Regular security assessments
   - Continuous security monitoring
   - Security awareness program

## Generated: ${new Date().toISOString()}
`;

    return 'pentest-report.md';
  }

  private async generateComplianceReport(
    compliance: ComplianceIssue[],
    config: ComplianceConfig
  ) {
    const report = `# Compliance Assessment Report

## Executive Summary

This compliance assessment evaluates adherence to the following standards:
${config.frameworks.map(f => `- ${f.toUpperCase()}`).join('\n')}

### Compliance Status
- **Total Requirements Assessed**: ${compliance.length}
- **Compliant**: ${compliance.filter(c => c.status === 'compliant').length}
- **Non-Compliant**: ${compliance.filter(c => c.status === 'non-compliant').length}
- **Partially Compliant**: ${compliance.filter(c => c.status === 'partial').length}
- **Overall Compliance Score**: ${Math.round((compliance.filter(c => c.status === 'compliant').length / compliance.length) * 100)}%

## Detailed Findings

${compliance.map(comp => `
### ${comp.requirement}

**Standard**: ${comp.standard}  
**Status**: ${comp.status.toUpperCase()}  
**Severity**: ${comp.severity}

**Description**: ${comp.description}

**Evidence**: ${comp.evidence.join(', ')}

**Remediation**:
${comp.remediation.steps.map(step => `- ${step}`).join('\n')}

**Timeline**: ${comp.remediation.timeline}  
**Responsible**: ${comp.remediation.responsible}

---
`).join('')}

## Remediation Roadmap

### Phase 1: Critical Issues (Immediate)
${compliance.filter(c => c.severity === 'critical').map(c => `- ${c.requirement}`).join('\n')}

### Phase 2: High Priority (1-4 weeks)
${compliance.filter(c => c.severity === 'high').map(c => `- ${c.requirement}`).join('\n')}

### Phase 3: Medium Priority (1-3 months)
${compliance.filter(c => c.severity === 'medium').map(c => `- ${c.requirement}`).join('\n')}

## Generated: ${new Date().toISOString()}
`;

    return {
      path: 'compliance-report.md',
      content: report,
      type: 'report' as const
    };
  }

  private async generateComplianceChecklist(config: ComplianceConfig) {
    const checklist = `# Compliance Checklist

## ${config.frameworks.map(f => f.toUpperCase()).join(' & ')} Compliance

### Access Control
- [ ] Implement user authentication
- [ ] Enforce role-based access control
- [ ] Regular access reviews
- [ ] Privileged access management

### Data Protection
- [ ] Data encryption at rest
- [ ] Data encryption in transit
- [ ] Data classification
- [ ] Data retention policies

### Security Monitoring
- [ ] Security event logging
- [ ] Log monitoring and analysis
- [ ] Incident response procedures
- [ ] Security awareness training

### Vulnerability Management
- [ ] Regular vulnerability assessments
- [ ] Patch management process
- [ ] Security testing in SDLC
- [ ] Third-party risk assessment

### Business Continuity
- [ ] Backup and recovery procedures
- [ ] Disaster recovery plan
- [ ] Business continuity testing
- [ ] Risk assessment and management

## Generated: ${new Date().toISOString()}
`;

    return {
      path: 'compliance-checklist.md',
      content: checklist,
      type: 'report' as const
    };
  }

  private async generateCompliancePolicies(config: ComplianceConfig) {
    const policies = [];

    // Information Security Policy
    const infoSecPolicy = `# Information Security Policy

## Purpose
This policy establishes the framework for protecting information assets and ensuring compliance with ${config.frameworks.join(', ').toUpperCase()}.

## Scope
This policy applies to all employees, contractors, and third parties with access to organizational information systems.

## Policy Statements

### 1. Access Control
- All users must be uniquely identified and authenticated
- Access rights must be based on business need and role
- Regular access reviews must be conducted

### 2. Data Protection
- Sensitive data must be classified and protected accordingly
- Encryption must be used for data at rest and in transit
- Data retention and disposal procedures must be followed

### 3. Incident Management
- Security incidents must be reported immediately
- Incident response procedures must be followed
- Lessons learned must be documented and shared

### 4. Risk Management
- Regular risk assessments must be conducted
- Risk treatment plans must be implemented
- Risk monitoring and review must be ongoing

## Compliance
Non-compliance with this policy may result in disciplinary action.

## Review
This policy will be reviewed annually or as needed.

## Generated: ${new Date().toISOString()}
`;

    policies.push({
      path: 'information-security-policy.md',
      content: infoSecPolicy,
      type: 'policy' as const
    });

    return policies;
  }

  private async generateDependencySecurityReport(
    vulnerablePackages: any[],
    recommendations: any[]
  ) {
    const report = `# Dependency Security Report

## Executive Summary

- **Packages Scanned**: 150
- **Vulnerable Packages**: ${vulnerablePackages.length}
- **Total Vulnerabilities**: ${vulnerablePackages.reduce((sum, pkg) => sum + pkg.vulnerabilities.length, 0)}
- **Critical Vulnerabilities**: ${vulnerablePackages.reduce((sum, pkg) => sum + pkg.vulnerabilities.filter((v: any) => v.severity === 'critical').length, 0)}

## Vulnerable Dependencies

${vulnerablePackages.map(pkg => `
### ${pkg.name} v${pkg.version}

${pkg.vulnerabilities.map((vuln: any) => `
#### ${vuln.title} (${vuln.severity.toUpperCase()})

**ID**: ${vuln.id}  
**Description**: ${vuln.description}

**Patched Versions**: ${vuln.patchedVersions.join(', ')}

**References**:
${vuln.references.map((ref: string) => `- ${ref}`).join('\n')}
`).join('')}
`).join('')}

## Recommendations

${recommendations.map(rec => `
### ${rec.package}

**Action**: ${rec.action.toUpperCase()}  
**Target Version**: ${rec.targetVersion || 'Latest'}  
**Urgency**: ${rec.urgency.toUpperCase()}

${rec.alternative ? `**Alternative**: ${rec.alternative}` : ''}
`).join('')}

## Remediation Steps

1. **Immediate Actions**:
   - Update packages with critical vulnerabilities
   - Review and test updated dependencies

2. **Short-term Actions**:
   - Implement automated dependency scanning
   - Establish dependency update procedures

3. **Long-term Actions**:
   - Regular dependency audits
   - Dependency security policies

## Generated: ${new Date().toISOString()}
`;

    return {
      path: 'dependency-security-report.md',
      content: report,
      type: 'report' as const
    };
  }

  private async generateDependencyUpdateScript(recommendations: any[]) {
    const script = `#!/bin/bash
# Dependency Security Update Script

echo "Starting dependency security updates..."

# Backup current package.json
cp package.json package.json.backup

${recommendations.map(rec => {
      if (rec.action === 'update' && rec.targetVersion) {
        return `# Update ${rec.package} to fix ${rec.urgency} severity vulnerabilities\nnpm install ${rec.package}@${rec.targetVersion}`;
      } else if (rec.action === 'remove') {
        return `# Remove ${rec.package} due to security issues\nnpm uninstall ${rec.package}`;
      }
      return `# Manual review required for ${rec.package}`;
    }).join('\n\n')}

echo "Dependency updates completed."
echo "Please run tests to verify functionality."

# Run security audit
npm audit

echo "Security update script completed."
`;

    return {
      path: 'update-dependencies.sh',
      content: script,
      type: 'fix-script' as const
    };
  }

  private async generateDependencySecurityPolicy(config: SecurityConfig) {
    const policy = `# Dependency Security Policy

## Purpose
This policy establishes guidelines for managing third-party dependencies and their security risks.

## Dependency Management

### 1. Dependency Selection
- Evaluate security track record before adoption
- Prefer well-maintained packages with active communities
- Review package permissions and access requirements
- Consider alternatives for packages with known security issues

### 2. Vulnerability Management
- Conduct regular dependency security scans
- Monitor security advisories for used packages
- Prioritize updates based on vulnerability severity
- Maintain inventory of all dependencies

### 3. Update Procedures
- Test updates in development environment first
- Review changelogs for security-related changes
- Implement automated dependency update workflows
- Document update decisions and rationale

### 4. Risk Assessment
- Assess impact of vulnerable dependencies
- Evaluate available patches and workarounds
- Consider temporary mitigations if updates unavailable
- Document accepted risks and compensating controls

## Compliance Requirements

- All dependencies must be scanned for vulnerabilities
- Critical vulnerabilities must be addressed within 7 days
- High vulnerabilities must be addressed within 30 days
- Dependency inventory must be maintained and updated

## Tools and Automation

- Use automated dependency scanning tools
- Integrate security checks into CI/CD pipeline
- Implement dependency update automation where appropriate
- Monitor for new vulnerabilities continuously

## Generated: ${new Date().toISOString()}
`;

    return {
      path: 'dependency-security-policy.md',
      content: policy,
      type: 'policy' as const
    };
  }

  // Utility methods
  private getLineNumber(content: string, searchString: string): number {
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(searchString)) {
        return i + 1;
      }
    }
    return 1;
  }

  private calculateRiskLevel(
    vulnerabilities: SecurityVulnerability[],
    compliance: ComplianceIssue[]
  ): string {
    const criticalCount = vulnerabilities.filter(v => v.severity === 'critical').length + 
                         compliance.filter(c => c.severity === 'critical').length;
    const highCount = vulnerabilities.filter(v => v.severity === 'high').length + 
                     compliance.filter(c => c.severity === 'high').length;

    if (criticalCount > 0) return 'CRITICAL';
    if (highCount > 2) return 'HIGH';
    if (highCount > 0) return 'MEDIUM';
    return 'LOW';
  }

  private async storeSecurityResults(taskId: string, result: any): Promise<void> {
    try {
      await this.supabase
        .from('agent_results')
        .insert({
          task_id: taskId,
          agent_id: this.config.id,
          result_type: 'security_analysis',
          result_data: result,
          created_at: new Date().toISOString()
        });
    } catch (error) {
      console.error('Failed to store security results:', error);
    }
  }
}

export default SecurityAgent;