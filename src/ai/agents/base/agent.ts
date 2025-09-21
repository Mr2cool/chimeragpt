export interface AgentConfig {
  name: string
  description: string
  version: string
  capabilities: string[]
  dependencies?: string[]
  settings?: Record<string, any>
}

export interface AgentContext {
  userId: string
  sessionId: string
  metadata?: Record<string, any>
}

export interface AgentResult {
  success: boolean
  data?: any
  error?: string
  metadata?: Record<string, any>
}

export abstract class BaseAgent {
  protected config: AgentConfig
  protected context?: AgentContext

  constructor(config: AgentConfig) {
    this.config = config
  }

  getName(): string {
    return this.config.name
  }

  getDescription(): string {
    return this.config.description
  }

  getVersion(): string {
    return this.config.version
  }

  getCapabilities(): string[] {
    return this.config.capabilities
  }

  setContext(context: AgentContext): void {
    this.context = context
  }

  getContext(): AgentContext | undefined {
    return this.context
  }

  abstract execute(input: any): Promise<AgentResult>

  protected validateInput(input: any): boolean {
    return input !== null && input !== undefined
  }

  protected createResult(success: boolean, data?: any, error?: string): AgentResult {
    return {
      success,
      data,
      error,
      metadata: {
        agent: this.config.name,
        version: this.config.version,
        timestamp: new Date().toISOString(),
      },
    }
  }

  protected async handleError(error: Error): Promise<AgentResult> {
    console.error(`Error in ${this.config.name}:`, error)
    return this.createResult(false, null, error.message)
  }
}

export default BaseAgent