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

/** Monotonic intent ids: `<session nonce>:<counter>`, at most 64 characters. */
struct LONGTABLETABLE_API FLongTableIntentIdentity
{
	FLongTableIntentIdentity();
	explicit FLongTableIntentIdentity(const FString& InNonce);

	FString Next();
	const FString& GetNonce() const { return Nonce; }
	int32 GetCounter() const { return Counter; }

private:
	FString Nonce;
	int32 Counter = 0;
};

UENUM(BlueprintType)
enum class ELongTableCommitStage : uint8
{
	Idle,
	AwaitingReceipt
};

struct LONGTABLETABLE_API FLongTableCommitMachine
{
	/** Starts tracking an intent. Returns false when one is already in flight; nothing must be sent then. */
	bool Begin(const FString& IntentId, const FLongTableIntent& Intent, int32 ExpectedVersion);
	/** Applies a receipt. Returns true when it answered the in-flight intent. */
	bool OnReceipt(const FLongTableIntentReceipt& Receipt);
	void Reset();

	bool CanSubmit() const { return Stage == ELongTableCommitStage::Idle; }
	bool HasInFlight() const { return Stage == ELongTableCommitStage::AwaitingReceipt; }
	bool HasLocalPreview() const { return bHasLocalPreview; }
	bool NeedsResync() const { return bNeedsResync; }
	void ClearResync() { bNeedsResync = false; }

	const FString& InFlightId() const { return InFlightIntentId; }
	const FLongTableIntent& InFlight() const { return InFlightIntent; }
	int32 InFlightVersion() const { return InFlightExpectedVersion; }

private:
	ELongTableCommitStage Stage = ELongTableCommitStage::Idle;
	FString InFlightIntentId;
	FLongTableIntent InFlightIntent;
	int32 InFlightExpectedVersion = 0;
	bool bHasLocalPreview = false;
	bool bNeedsResync = false;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
