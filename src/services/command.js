/**
 * Command Engine State Machine for BHIV Master
 * Pure deterministic state reducer and transition definitions.
 */

export const CMD = {
  IDLE: "idle",
  CONFIRM: "confirm",
  EXECUTING: "executing",
  SUCCESS: "success",
  FAILURE: "failure",
  ROLLING_BACK: "rolling_back",
  ROLLED_BACK: "rolled_back",
};

export const INITIAL_CMD_STATE = {
  phase: CMD.IDLE,
  target: null,
  error: null,
  result: null,
  auditId: null,
};

/**
 * Pure deterministic state reducer for command lifecycle
 * Transitions:
 * IDLE -> (OPEN) -> CONFIRM
 * CONFIRM -> (START) -> EXECUTING
 * CONFIRM -> (RESET) -> IDLE
 * EXECUTING -> (SUCCESS) -> SUCCESS
 * EXECUTING -> (FAILURE) -> FAILURE
 * SUCCESS -> (ROLLBACK_START) -> ROLLING_BACK
 * ROLLING_BACK -> (ROLLBACK_END) -> ROLLED_BACK
 * ANY -> (RESET) -> IDLE
 */
export function cmdReducer(state, action) {
  if (!state) state = INITIAL_CMD_STATE;
  if (!action || !action.type) return state;

  switch (action.type) {
    case "OPEN":
      return Object.assign({}, state, { phase: CMD.CONFIRM, target: action.target });
    case "START":
      return Object.assign({}, state, { phase: CMD.EXECUTING, error: null });
    case "SUCCESS":
      return Object.assign({}, state, { phase: CMD.SUCCESS, result: action.result, auditId: action.auditId });
    case "FAILURE":
      return Object.assign({}, state, { phase: CMD.FAILURE, error: action.error });
    case "ROLLBACK_START":
      return Object.assign({}, state, { phase: CMD.ROLLING_BACK });
    case "ROLLBACK_END":
      return Object.assign({}, state, { phase: CMD.ROLLED_BACK });
    case "RESET":
      return { phase: CMD.IDLE, target: null, error: null, result: null, auditId: null };
    default:
      return state;
  }
}
