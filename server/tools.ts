import {
  ContractError,
  parseGameSnapshot,
  parseGetCurrentGameSnapshotArguments,
  type GameSnapshot,
} from './contracts.js';

export interface ReadOnlyToolDeclaration {
  name: 'get_current_game_snapshot';
  description: string;
  inputSchema: {
    type: 'object';
    properties: Record<string, never>;
    required: readonly [];
    additionalProperties: false;
  };
}

type ReadOnlyTool = (args: unknown, context: unknown) => GameSnapshot;

const READ_ONLY_TOOLS = new Map<string, ReadOnlyTool>([
  ['get_current_game_snapshot', getCurrentGameSnapshot],
]);

const READ_ONLY_TOOL_DECLARATIONS: readonly ReadOnlyToolDeclaration[] = Object.freeze([
  Object.freeze({
    name: 'get_current_game_snapshot',
    description: 'Return the current game snapshot provided with this request.',
    inputSchema: Object.freeze({
      type: 'object',
      properties: Object.freeze({}) as Record<string, never>,
      required: Object.freeze([]) as readonly [],
      additionalProperties: false,
    }),
  }),
]);

function getCurrentGameSnapshot(args: unknown, context: unknown): GameSnapshot {
  parseGetCurrentGameSnapshotArguments(args);
  if (context === null || typeof context !== 'object' || !Object.hasOwn(context, 'snapshot')) {
    throw new ContractError('INVALID_INPUT', 'Tool context must include a snapshot.');
  }
  const contextRecord = context as Record<string, unknown>;
  return parseGameSnapshot(contextRecord.snapshot);
}

export function invokeReadOnlyTool(name: string, args: unknown, context: unknown): GameSnapshot {
  const tool = READ_ONLY_TOOLS.get(name);
  if (!tool) throw new ContractError('INVALID_INPUT', 'Unsupported tool.');
  return tool(args, context);
}

export function getReadOnlyToolDeclarations(): ReadOnlyToolDeclaration[] {
  return structuredClone([...READ_ONLY_TOOL_DECLARATIONS]);
}
