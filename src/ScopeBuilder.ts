import type { Model } from './Model.js';
import type { Request } from './Request.js';

/**
 * Normalized scope options after parsing
 */
export interface ScopeOptions {
  where?: any;
  include?: IncludeOption[];
  cache?: boolean | number;
  order?: Array<[string, 'ASC' | 'DESC']>;
  limit?: number;
  offset?: number;
  attributes?: string[];
}

/**
 * Include option for eager loading relations
 */
export interface IncludeOption {
  relation: string;
  as?: string;
  required?: boolean;
  attributes?: string[];
  through?: any;
  include?: IncludeOption[];
  limit?: number;
  offset?: number;
  order?: Array<[string, 'ASC' | 'DESC']>;
}

/**
 * Scope definition: either options object or function returning options
 */
export type ScopeDefinition =
  | ScopeOptions
  | ((queryBuilder: Request, ...args: any[]) => ScopeOptions | Request);

/**
 * Map of scope names to definitions
 */
export type ScopesMap = Record<string, ScopeDefinition>;

/**
 * Scope application request (name with optional arguments)
 */
export type ScopeRequest = string | { [name: string]: any[] };

/**
 * ScopeBuilder: normalizes and merges scope definitions
 */
export class ScopeBuilder {
  private model: Model;
  private scopes: ScopesMap;
  private defaultScope: ScopeDefinition | null;

  constructor(model: Model, scopes: ScopesMap = {}, defaultScope: ScopeDefinition | null = null) {
    this.model = model;
    this.scopes = scopes;
    this.defaultScope = defaultScope;
  }

  /**
   * Normalize a scope definition to a ScopeOptions object
   */
  private normalizeScopeDefinition(
    definition: ScopeDefinition,
    queryBuilder: Request,
    args: any[] = []
  ): ScopeOptions {
    if (typeof definition === 'function') {
      const result = definition(queryBuilder, ...args);
      // If function returns a Request, extract options from it
      if (result && typeof result === 'object' && 'queryBuilder' in result) {
        return this.extractOptionsFromRequest(result as Request);
      }
      return result as ScopeOptions;
    }
    return definition;
  }

  /**
   * Extract options from a Request object (for function-based scopes)
   */
  private extractOptionsFromRequest(_request: Request): ScopeOptions {
    // For now, return empty options - function-based scopes modify the QB directly
    return {};
  }

  /**
   * Normalize include option: string or object to IncludeOption
   */
  private normalizeInclude(include: string | IncludeOption): IncludeOption {
    if (typeof include === 'string') {
      return { relation: include };
    }
    return include;
  }

  /**
   * Merge two where clauses (AND logic)
   */
  private mergeWhere(base: any, incoming: any): any {
    if (!base) return incoming;
    if (!incoming) return base;

    // If base already has an 'and' array, append to it
    if (base.and && Array.isArray(base.and)) {
      return { and: [...base.and, incoming] };
    }

    // Otherwise, create a new 'and' array
    return { and: [base, incoming] };
  }

  /**
   * Merge include arrays, deduplicating by relation+alias
   */
  private mergeIncludes(base: IncludeOption[], incoming: IncludeOption[]): IncludeOption[] {
    const result = [...base];
    const keys = new Set(base.map((i) => `${i.relation}:${i.as || ''}`));

    for (const inc of incoming) {
      const key = `${inc.relation}:${inc.as || ''}`;
      if (!keys.has(key)) {
        result.push(inc);
        keys.add(key);
      } else {
        // If duplicate, merge nested includes
        const existing = result.find((r) => `${r.relation}:${r.as || ''}` === key);
        if (existing && inc.include && inc.include.length > 0) {
          existing.include = this.mergeIncludes(existing.include || [], inc.include);
        }
      }
    }

    return result;
  }

  /**
   * Merge two scope options
   */
  private mergeOptions(base: ScopeOptions, incoming: ScopeOptions): ScopeOptions {
    const merged: ScopeOptions = { ...base };

    // Merge where clauses (AND)
    if (incoming.where) {
      merged.where = this.mergeWhere(base.where, incoming.where);
    }

    // Merge includes (concatenate and dedupe)
    if (incoming.include) {
      const normalizedIncoming = incoming.include.map((i) => this.normalizeInclude(i));
      merged.include = this.mergeIncludes(base.include || [], normalizedIncoming);
    }

    // Last-wins for cache, order, limit, offset, attributes
    if (incoming.cache !== undefined) merged.cache = incoming.cache;
    if (incoming.order !== undefined) merged.order = incoming.order;
    if (incoming.limit !== undefined) merged.limit = incoming.limit;
    if (incoming.offset !== undefined) merged.offset = incoming.offset;
    if (incoming.attributes !== undefined) merged.attributes = incoming.attributes;

    return merged;
  }

  /**
   * Apply scopes to a query request
   * @param request The query request to apply scopes to
   * @param scopeRequests Array of scope names or objects with scope names and args
   * @param includeDefault Whether to include defaultScope (true by default)
   */
  applyScopes(
    request: Request,
    scopeRequests: ScopeRequest[],
    includeDefault: boolean = true
  ): ScopeOptions {
    let merged: ScopeOptions = {};

    // Apply default scope first
    if (includeDefault && this.defaultScope) {
      const defaultOptions = this.normalizeScopeDefinition(this.defaultScope, request);
      merged = this.mergeOptions(merged, defaultOptions);
    }

    // Apply named scopes in order
    for (const scopeReq of scopeRequests) {
      let scopeName: string;
      let args: any[] = [];

      if (typeof scopeReq === 'string') {
        scopeName = scopeReq;
      } else {
        // Object format: { scopeName: [args] }
        scopeName = Object.keys(scopeReq)[0];
        args = scopeReq[scopeName] || [];
      }

      const scopeDef = this.scopes[scopeName];
      if (!scopeDef) {
        throw new Error(`Scope '${scopeName}' not defined on model '${this.model.name}'`);
      }

      const scopeOptions = this.normalizeScopeDefinition(scopeDef, request, args);
      merged = this.mergeOptions(merged, scopeOptions);
    }

    return merged;
  }

  /**
   * Check if a scope exists
   */
  hasScope(name: string): boolean {
    return name in this.scopes;
  }

  /**
   * Get all scope names
   */
  getScopeNames(): string[] {
    return Object.keys(this.scopes);
  }
}
