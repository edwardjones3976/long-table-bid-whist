// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Intent identity and the client-side commit state machine.
 *
 * One intent is in flight at a time, so a double-fired confirm produces one
 * wire intent and every intent carries the version the client actually holds.
 * The authority's intent-id ledger covers the retry after a reconnect.
 */
#pragma once

#include "CoreMinimal.h"
#include "LongTableProjections.h"
#include "LongTableCommitMachine.generated.h"

// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
/**
 * long-table-intent-idempotency/v2 identity: `<server-issued-grant>:<counter>`.
 *
 * The grant and the next counter come only from an authenticated welcome. The
 * client never invents a nonce, never wraps, and never rolls the counter
 * backwards under the same grant; adopting a different grant restarts the
 * counter domain and forgets the old one.
 */
struct LONGTABLETABLE_API FLongTableIntentIdentity
{
	/**
	 * Adopts the welcomed grant and next counter. Under the same grant the
	 * counter only moves forward; a different grant replaces the domain. A
	 * welcome without a counter marks the incarnation exhausted.
	 */
	void Adopt(const FString& InGrant, bool bInHasNext, int64 InNext);
	/** Records that the authority consumed `Counter` under the current grant (any receipt outcome). */
	void MarkConsumed(int64 Counter);
	void MarkExhausted() { bExhausted = true; }
	void Reset();

	bool IsBound() const { return !Grant.IsEmpty(); }
	bool IsExhausted() const { return bExhausted; }
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
	/**
	 * Issuance reserves the exact next counter without advancing it; only a
	 * matching receipt (accepted, rejected or duplicate) advances, so a refused
	 * or abandoned identity leaves no gap for the next welcome to loop on.
	 */
	bool CanIssue() const { return IsBound() && !bInvalidated && !bExhausted && !bReserved && NextCounter <= MaxCounter(); }
	/** The next identity, reserving its counter; call only when CanIssue(). */
	FString Reserve();
	/** Drops an unanswered reservation; the counter is unchanged and may be reserved again. */
	void Release();
	/** The authority refused this identity: nothing may be issued until a fresh welcome re-adopts the lane. */
	void Invalidate();
	bool HasReservation() const { return bReserved; }
	int64 ReservedCounter() const { return Reserved; }
	bool IsInvalidated() const { return bInvalidated; }
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]

	const FString& GetGrant() const { return Grant; }
	int64 PeekNextCounter() const { return NextCounter; }
	int64 HighestConsumed() const { return LastConsumed; }

	static int64 MaxCounter();

private:
	FString Grant;
	int64 NextCounter = 1;
	int64 LastConsumed = 0;
	bool bExhausted = false;
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
	bool bReserved = false;
	int64 Reserved = 0;
	bool bInvalidated = false;
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
};
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

UENUM(BlueprintType)
enum class ELongTableCommitStage : uint8
{
	Idle,
	AwaitingReceipt
};

struct LONGTABLETABLE_API FLongTableCommitMachine
{
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
	/** Starts tracking an intent. Returns false when one is already in flight; nothing must be sent then. */
	bool Begin(const FString& IntentId, const FLongTableIntent& Intent, int32 ExpectedVersion, int64 IntentCounter);
	/** Applies a receipt. Returns true when it answered the in-flight intent. */
	bool OnReceipt(const FLongTableIntentReceipt& Receipt);
	/** Drops the in-flight intent without touching the local preview (identity refused, or grant changed). */
	void AbandonInFlight();
	void Reset();
	// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]

	bool CanSubmit() const { return Stage == ELongTableCommitStage::Idle; }
	bool HasInFlight() const { return Stage == ELongTableCommitStage::AwaitingReceipt; }
	bool HasLocalPreview() const { return bHasLocalPreview; }
	bool NeedsResync() const { return bNeedsResync; }
	void ClearResync() { bNeedsResync = false; }

	const FString& InFlightId() const { return InFlightIntentId; }
	const FLongTableIntent& InFlight() const { return InFlightIntent; }
	int32 InFlightVersion() const { return InFlightExpectedVersion; }
	int64 InFlightCounter() const { return InFlightIntentCounter; }

private:
	ELongTableCommitStage Stage = ELongTableCommitStage::Idle;
	FString InFlightIntentId;
	FLongTableIntent InFlightIntent;
	int32 InFlightExpectedVersion = 0;
	int64 InFlightIntentCounter = 0;
	bool bHasLocalPreview = false;
	bool bNeedsResync = false;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
