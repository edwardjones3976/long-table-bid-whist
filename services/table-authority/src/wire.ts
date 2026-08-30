// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Text-frame dispatch: decode through the closed client schema, hand the typed
 * message to the session layer, encode every outbound message canonically. A
 * frame that does not decode is answered with `schema-rejected` and nothing
 * else happens.
 */
import { decodeClientMessage, encodeAuthorityMessage } from "../../../packages/protocol/src";
import type { AuthoritySessions, Outbound } from "./session";

export interface OutboundText {
  readonly connectionId: string;
  readonly text: string;
}

export function encodeOutbound(items: readonly Outbound[]): OutboundText[] {
  return items.map((item) => ({ connectionId: item.connectionId, text: encodeAuthorityMessage(item.message) }));
}

export function handleText(sessions: AuthoritySessions, connectionId: string, text: string): OutboundText[] {
  const decoded = decodeClientMessage(text);
  if (!decoded.ok) {
    return encodeOutbound([
      {
        connectionId,
        message: {
          type: "error",
          code: "schema-rejected",
          detail: `${decoded.rejection.code} at ${decoded.rejection.path}`.slice(0, 120),
        },
      },
    ]);
  }
  return encodeOutbound(sessions.handle(connectionId, decoded.value));
}

export function handleClose(sessions: AuthoritySessions, connectionId: string): OutboundText[] {
  return encodeOutbound(sessions.disconnect(connectionId));
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
