/**
 * Agent Skill: Type Definitions
 *
 * This skill defines patterns and procedures for creating and modifying
 * TypeScript type definitions in the @reaatech/context-window-planner project.
 */

export const skill = {
  name: 'types',
  description: 'Creating and modifying type definitions',
  version: '1.0.0',
};

/**
 * Create a new enum type
 */
export function createEnum(name, values, options = {}) {
  const {
    description = '',
    deprecated = false,
    exportType = 'named', // 'named' | 'default' | 'const'
  } = options;

  const exportKeyword = exportType === 'default' ? 'export default' : 'export';
  const modifier = exportType === 'const' ? 'const ' : '';

  return {
    type: 'enum',
    name,
    content: `${description ? `/**\n * ${description}\n */\n` : ''}${deprecated ? '@deprecated\n' : ''}${exportKeyword} ${modifier}enum ${name} {
${Object.entries(values)
  .map(([key, value]) => `  ${key} = ${value},`)
  .join('\n')}
}
`,
  };
}

/**
 * Create a new interface
 */
export function createInterface(name, properties, options = {}) {
  const {
    description = '',
    extends: extendsFrom = [],
    deprecated = false,
    exportType = 'named',
  } = options;

  const exportKeyword = exportType === 'default' ? 'export default' : 'export';
  const extendsClause = extendsFrom.length > 0 ? ` extends ${extendsFrom.join(', ')}` : '';

  return {
    type: 'interface',
    name,
    content: `${description ? `/**\n * ${description}\n */\n` : ''}${deprecated ? '@deprecated\n' : ''}${exportKeyword} interface ${name}${extendsClause} {
${Object.entries(properties)
  .map(([key, value]) => {
    const {
      type,
      description: propDesc,
      readonly = false,
      optional = false,
    } = typeof value === 'string' ? { type: value } : value;
    const readonlyStr = readonly ? 'readonly ' : '';
    const optionalStr = optional ? '?' : '';
    return `${propDesc ? `  /** ${propDesc} */\n` : ''}  ${readonlyStr}${key}${optionalStr}: ${type};`;
  })
  .join('\n\n')}
}
`,
  };
}

/**
 * Create a new type alias
 */
export function createTypeAlias(name, definition, options = {}) {
  const { description = '', deprecated = false, exportType = 'named' } = options;

  const exportKeyword = exportType === 'default' ? 'export default' : 'export';

  return {
    type: 'type',
    name,
    content: `${description ? `/**\n * ${description}\n */\n` : ''}${deprecated ? '@deprecated\n' : ''}${exportKeyword} type ${name} = ${definition};
`,
  };
}

/**
 * Create a discriminated union type
 */
export function createDiscriminatedUnion(typeField, variants, options = {}) {
  const { description = '', exportType = 'named' } = options;

  const exportKeyword = exportType === 'default' ? 'export default' : 'export';

  const unionTypes = variants.map((variant) => {
    const { name, properties } = variant;
    const props = Object.entries(properties)
      .map(([key, value]) => {
        const {
          type,
          readonly = false,
          optional = false,
        } = typeof value === 'string' ? { type: value } : value;
        const readonlyStr = readonly ? 'readonly ' : '';
        const optionalStr = optional ? '?' : '';
        return `${readonlyStr}${key}${optionalStr}: ${type};`;
      })
      .join('\n    ');

    return `{
    ${typeField}: '${name}';
    ${props}
  }`;
  });

  return {
    type: 'union',
    name: `${typeField.charAt(0).toUpperCase() + typeField.slice(1)}Union`,
    content: `${description ? `/**\n * ${description}\n */\n` : ''}${exportKeyword} type ${typeField.charAt(0).toUpperCase() + typeField.slice(1)}Union = 
${unionTypes.join(' |\n  ')};
`,
  };
}

/**
 * Core types for @reaatech/context-window-planner
 */
export const coreTypes = {
  /**
   * Priority levels for context items
   */
  priority: createEnum(
    'Priority',
    {
      Critical: 100,
      High: 75,
      Medium: 50,
      Low: 25,
      Disposable: 0,
    },
    {
      description:
        'Priority levels for context window packing decisions. Higher values indicate higher priority.',
    },
  ),

  /**
   * Context item types
   */
  contextItemType: createTypeAlias(
    'ContextItemType',
    [
      "'system_prompt'",
      "'conversation_turn'",
      "'rag_chunk'",
      "'tool_schema'",
      "'tool_result'",
      "'generation_buffer'",
      "'custom'",
    ].join(' | '),
    {
      description: 'Types of context items that can be included in the context window.',
    },
  ),

  /**
   * Packing warning interface
   */
  packWarning: createInterface(
    'PackWarning',
    {
      code: { type: 'string', description: 'Warning code', readonly: true },
      message: { type: 'string', description: 'Human-readable warning message' },
      item: { type: 'ContextItem', description: 'Related context item', optional: true },
      suggestion: { type: 'string', description: 'Suggested resolution', optional: true },
    },
    {
      description: 'A warning generated during the packing process.',
    },
  ),

  /**
   * Base context item interface
   */
  contextItem: createInterface(
    'ContextItem',
    {
      id: { type: 'string', description: 'Unique identifier for this item', readonly: true },
      type: { type: 'ContextItemType', description: 'The type of context item', readonly: true },
      priority: {
        type: 'Priority',
        description: 'Priority level for inclusion decisions',
        readonly: true,
      },
      tokenCount: {
        type: 'number',
        description: 'Number of tokens this item consumes',
        readonly: true,
      },
      metadata: {
        type: 'Record<string, unknown>',
        description: 'Optional metadata for debugging',
        optional: true,
        readonly: true,
      },
    },
    {
      description:
        'Base interface for all content types that can be included in the context window.',
      extends: [],
    },
  ),

  /**
   * Summarizable sub-interface for items that support summarization.
   */
  summarizable: createInterface(
    'Summarizable',
    {
      estimatedSummarizedTokenCount: {
        type: 'number',
        description: 'Estimated token count after summarization',
        readonly: true,
      },
    },
    {
      description:
        'Extended interface for items that support summarization. Strategies query this to decide whether summarizing is worthwhile.',
      extends: ['ContextItem'],
    },
  ),

  /**
   * Token budget interface
   */
  tokenBudget: createInterface(
    'TokenBudget',
    {
      total: { type: 'number', description: 'Total available tokens', readonly: true },
      reserved: {
        type: 'number',
        description: 'Reserved tokens for generation buffer',
        readonly: true,
      },
    },
    {
      description: 'Manages the total token allocation and tracks usage.',
    },
  ),

  /**
   * Packing result interface
   */
  packingResult: createInterface(
    'PackingResult',
    {
      included: {
        type: 'ReadonlyArray<ContextItem>',
        description: 'Items included as-is',
        readonly: true,
      },
      summarize: {
        type: 'ReadonlyArray<ContextItem>',
        description: 'Items to be summarized before inclusion',
        readonly: true,
      },
      dropped: {
        type: 'ReadonlyArray<ContextItem>',
        description: 'Items dropped due to space constraints',
        readonly: true,
      },
      usedTokens: {
        type: 'number',
        description: 'Total tokens used by included items',
        readonly: true,
      },
      remainingTokens: {
        type: 'number',
        description: 'Remaining available tokens',
        readonly: true,
      },
      warnings: {
        type: 'ReadonlyArray<PackWarning>',
        description: 'Warnings or optimization suggestions',
        readonly: true,
      },
    },
    {
      description:
        'Result of a packing operation, containing decisions about what to include, summarize, or drop.',
    },
  ),
};

/**
 * Generate all core types
 */
export function generateCoreTypes() {
  const files = {};

  for (const [name, typeDef] of Object.entries(coreTypes)) {
    const fileName = `packages/core/src/types/${name}.ts`;
    files[fileName] = `/**
 * ${typeDef.type} definition: ${name}
 * 
 * Auto-generated by skills/types.mjs
 */

${typeDef.content}
`;
  }

  // Generate index file
  files['packages/core/src/types/index.ts'] = `/**
 * Type definitions for @reaatech/context-window-planner
 * 
 * @module
 */

export * from './priority.js';
export * from './context-item-type.js';
export * from './context-item.js';
export * from './summarizable.js';
export * from './token-budget.js';
export * from './pack-warning.js';
export * from './packing-result.js';
`;

  return files;
}

/**
 * Add a new property to an existing interface
 */
export function addInterfaceProperty(filePath, interfaceName, propertyName, propertyDef) {
  return {
    type: 'modification',
    action: 'add_property',
    target: { file: filePath, interface: interfaceName },
    property: { name: propertyName, ...propertyDef },
  };
}

/**
 * Remove a property from an existing interface
 */
export function removeInterfaceProperty(filePath, interfaceName, propertyName) {
  return {
    type: 'modification',
    action: 'remove_property',
    target: { file: filePath, interface: interfaceName },
    property: { name: propertyName },
  };
}

/**
 * Modify a property type in an existing interface
 */
export function modifyInterfaceProperty(filePath, interfaceName, propertyName, newType) {
  return {
    type: 'modification',
    action: 'modify_property',
    target: { file: filePath, interface: interfaceName },
    property: { name: propertyName, type: newType },
  };
}

export default skill;
