import {
  ContractError,
  parseGameSnapshot,
  parseGetCurrentGameSnapshotArguments,
} from './contracts.js';

const READ_ONLY_TOOLS = new Map([
  ['get_current_game_snapshot', getCurrentGameSnapshot],
]);

const READ_ONLY_TOOL_DECLARATIONS = Object.freeze([
  Object.freeze({
    name: 'get_current_game_snapshot',
    description: 'Return the current game snapshot provided with this request.',
    inputSchema: Object.freeze({
      type: 'object',
      properties: Object.freeze({}),
      required: Object.freeze([]),
      additionalProperties: false,
    }),
  }),
]);

function getCurrentGameSnapshot(args, context) {
  parseGetCurrentGameSnapshotArguments(args);
  if (context === null || typeof context !== 'object' || !Object.hasOwn(context, 'snapshot')) {
    throw new ContractError('INVALID_INPUT', 'Tool context must include a snapshot.');
  }
  return parseGameSnapshot(context.snapshot);
}

export function invokeReadOnlyTool(name, args, context) {
  const tool = READ_ONLY_TOOLS.get(name);
  if (!tool) throw new ContractError('INVALID_INPUT', 'Unsupported tool.');
  return tool(args, context);
}

export function getReadOnlyToolDeclarations() {
  return structuredClone(READ_ONLY_TOOL_DECLARATIONS);
}