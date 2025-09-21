-- Populate agents table with default multi-agent system agents

INSERT INTO agents (name, type, version, configuration, is_active) VALUES
('Security Analyzer', 'security', '1.0.0', '{
  "capabilities": ["vulnerability_detection", "dependency_scanning", "code_security_analysis"],
  "severity_levels": ["critical", "high", "medium", "low"],
  "scan_patterns": ["*.js", "*.ts", "*.jsx", "*.tsx", "*.py", "*.java", "*.go", "*.rs"]
}', true),

('Performance Optimizer', 'performance', '1.0.0', '{
  "metrics": ["bundle_size", "load_time", "memory_usage", "cpu_utilization"],
  "thresholds": {
    "bundle_size_mb": 5,
    "load_time_ms": 3000,
    "memory_usage_mb": 100
  },
  "optimization_suggestions": true
}', true),

('Architecture Reviewer', 'architecture', '1.0.0', '{
  "analysis_types": ["design_patterns", "code_structure", "dependency_graph", "modularity"],
  "frameworks": ["react", "vue", "angular", "express", "fastapi", "spring"],
  "best_practices": true
}', true),

('Code Quality Auditor', 'quality', '1.0.0', '{
  "metrics": ["complexity", "maintainability", "readability", "test_coverage"],
  "rules": ["eslint", "prettier", "sonarjs", "typescript"],
  "quality_gates": {
    "min_test_coverage": 80,
    "max_complexity": 10
  }
}', true),

('Dependency Manager', 'dependencies', '1.0.0', '{
  "package_managers": ["npm", "yarn", "pnpm", "pip", "maven", "gradle"],
  "vulnerability_databases": ["npm_audit", "snyk", "github_advisory"],
  "update_strategies": ["patch", "minor", "major"],
  "license_compliance": true
}', true),

('Documentation Generator', 'documentation', '1.0.0', '{
  "formats": ["markdown", "jsdoc", "sphinx", "gitbook"],
  "auto_generation": true,
  "api_documentation": true,
  "code_examples": true
}', true);

-- Insert some sample workflow templates
INSERT INTO workflows (name, description, definition, is_active) VALUES
('Full Repository Analysis', 'Comprehensive analysis using all available agents', '{
  "steps": [
    {
      "agent": "security",
      "parallel": true,
      "timeout": 300
    },
    {
      "agent": "performance",
      "parallel": true,
      "timeout": 300
    },
    {
      "agent": "architecture",
      "parallel": true,
      "timeout": 300
    },
    {
      "agent": "quality",
      "parallel": true,
      "timeout": 300
    },
    {
      "agent": "dependencies",
      "parallel": true,
      "timeout": 300
    }
  ],
  "aggregation": {
    "generate_summary": true,
    "priority_insights": true
  }
}', true),

('Security Focus Scan', 'Security-focused analysis with dependency checking', '{
  "steps": [
    {
      "agent": "security",
      "parallel": false,
      "timeout": 600
    },
    {
      "agent": "dependencies",
      "parallel": false,
      "timeout": 300
    }
  ],
  "aggregation": {
    "security_report": true,
    "risk_assessment": true
  }
}', true),

('Performance Optimization', 'Performance analysis and optimization recommendations', '{
  "steps": [
    {
      "agent": "performance",
      "parallel": false,
      "timeout": 400
    },
    {
      "agent": "architecture",
      "parallel": false,
      "timeout": 300
    }
  ],
  "aggregation": {
    "optimization_plan": true,
    "performance_metrics": true
  }
}', true);