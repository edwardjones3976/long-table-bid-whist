// [[Claude | 2026-08-30 | LT-NATIVE-CLAUDE-FOUNDATION-SAFETY-002 | BEGIN]]
#include "LongTableCommitMachine.h"
#include "LongTableVocabulary.h"

int64 FLongTableIntentIdentity::MaxCounter()
{
	return LongTableProtocol::IntentCounterMax;
}

void FLongTableIntentIdentity::Adopt(const FString& InGrant, bool bInHasNext, int64 InNext)
{
	if (!Grant.Equals(InGrant, ESearchCase::CaseSensitive))
	{
		// A different grant is a new counter domain: nothing from the old grant
		// survives, and the exhausted mark belongs to the incarnation the
		// caller validates before adopting.
		Grant = InGrant;
		NextCounter = bInHasNext ? InNext : 1;
		LastConsumed = bInHasNext ? InNext - 1 : 0;
		bExhausted = !bInHasNext;
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
}

FString FLongTableIntentIdentity::Issue()
{
	const int64 Counter = NextCounter;
	++NextCounter;
	return FString::Printf(TEXT("%s:%lld"), *Grant, Counter);
}

void FLongTableIntentIdentity::Reset()
{
	Grant.Reset();
	NextCounter = 1;
	LastConsumed = 0;
	bExhausted = false;
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
