// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-PROVENANCE-004 | BEGIN]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | BEGIN]]
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
#include "LongTableCommitMachine.h"
#include "LongTableVocabulary.h"

int64 FLongTableIntentIdentity::MaxCounter()
{
	return LongTableProtocol::IntentCounterMax;
}

void FLongTableIntentIdentity::Adopt(const FString& InGrant, bool bInHasNext, int64 InNext)
{
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
	// A welcome is the authority's own statement of the lane's grant and exact
	// next counter: it supersedes any earlier refusal of this identity.
	bInvalidated = false;
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
	if (!Grant.Equals(InGrant, ESearchCase::CaseSensitive))
	{
		// A different grant is a new counter domain: nothing from the old grant
		// survives, and the exhausted mark belongs to the incarnation the
		// caller validates before adopting.
		Grant = InGrant;
		NextCounter = bInHasNext ? InNext : 1;
		LastConsumed = bInHasNext ? InNext - 1 : 0;
		bExhausted = !bInHasNext;
		// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
		// A changed grant or incarnation discards the old reservation with the
		// old in-flight work; the same grant keeps it for the identical retry.
		bReserved = false;
		Reserved = 0;
		// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
		return;
	}
	if (!bInHasNext)
	{
		bExhausted = true;
		return;
	}
	// Same grant: the counter only ever moves forward. The caller rejects a
	// welcome that would roll below the highest consumed counter before
	// adopting, so the clamp here can only advance.
	if (InNext > NextCounter) { NextCounter = InNext; }
	if (InNext - 1 > LastConsumed) { LastConsumed = InNext - 1; }
}

void FLongTableIntentIdentity::MarkConsumed(int64 Counter)
{
	if (Counter > LastConsumed) { LastConsumed = Counter; }
	if (Counter >= NextCounter) { NextCounter = Counter + 1; }
	if (Counter >= MaxCounter()) { bExhausted = true; }
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
	// The matching receipt proved consumption (or prior consumption) of the
	// reserved counter: only now does the reservation end and the counter advance.
	if (bReserved && Counter >= Reserved)
	{
		bReserved = false;
		Reserved = 0;
	}
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
}

// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
FString FLongTableIntentIdentity::Reserve()
{
	// Reserve, never advance: NextCounter moves only in MarkConsumed, so an
	// identity the authority refuses or that is abandoned in flight leaves
	// the counter exactly where the next welcome will advertise it.
	Reserved = NextCounter;
	bReserved = true;
	return FString::Printf(TEXT("%s:%lld"), *Grant, Reserved);
}

void FLongTableIntentIdentity::Release()
{
	bReserved = false;
	Reserved = 0;
}

void FLongTableIntentIdentity::Invalidate()
{
	Release();
	bInvalidated = true;
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]

void FLongTableIntentIdentity::Reset()
{
	Grant.Reset();
	NextCounter = 1;
	LastConsumed = 0;
	bExhausted = false;
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | BEGIN]]
	bReserved = false;
	Reserved = 0;
	bInvalidated = false;
	// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-REPLACEMENT-003 | END]]
}

bool FLongTableCommitMachine::Begin(const FString& IntentId, const FLongTableIntent& Intent, int32 ExpectedVersion, int64 IntentCounter)
{
	if (Stage != ELongTableCommitStage::Idle)
	{
		return false;
	}
	Stage = ELongTableCommitStage::AwaitingReceipt;
	InFlightIntentId = IntentId;
	InFlightIntent = Intent;
	InFlightExpectedVersion = ExpectedVersion;
	InFlightIntentCounter = IntentCounter;
	return true;
}

bool FLongTableCommitMachine::OnReceipt(const FLongTableIntentReceipt& Receipt)
{
	if (Stage != ELongTableCommitStage::AwaitingReceipt || !Receipt.IntentId.Equals(InFlightIntentId, ESearchCase::CaseSensitive))
	{
		return false;
	}
	Stage = ELongTableCommitStage::Idle;
	if (Receipt.Outcome == ELongTableOutcome::Accepted)
	{
		switch (Receipt.IntentKind)
		{
		case ELongTableIntentKind::Preview:
			bHasLocalPreview = true;
			break;
		case ELongTableIntentKind::Cancel:
		case ELongTableIntentKind::Confirm:
		case ELongTableIntentKind::NextHand:
			bHasLocalPreview = false;
			break;
		default:
			break;
		}
	}
	else if (Receipt.bHasCode && Receipt.Code == ELongTableRejectionCode::StaleVersion)
	{
		bNeedsResync = true;
	}
	InFlightIntentId.Reset();
	return true;
}

void FLongTableCommitMachine::AbandonInFlight()
{
	Stage = ELongTableCommitStage::Idle;
	InFlightIntentId.Reset();
	InFlightIntent = FLongTableIntent();
	InFlightExpectedVersion = 0;
	InFlightIntentCounter = 0;
}

void FLongTableCommitMachine::Reset()
{
	AbandonInFlight();
	bHasLocalPreview = false;
	bNeedsResync = false;
}
// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001-R1 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-PROVENANCE-004 | END]]
