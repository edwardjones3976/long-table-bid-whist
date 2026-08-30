// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#include "LongTableCommitMachine.h"
#include "Misc/Guid.h"

FLongTableIntentIdentity::FLongTableIntentIdentity()
	: Nonce(FGuid::NewGuid().ToString(EGuidFormats::Digits).ToLower())
{
}

FLongTableIntentIdentity::FLongTableIntentIdentity(const FString& InNonce)
	: Nonce(InNonce)
{
}

FString FLongTableIntentIdentity::Next()
{
	++Counter;
	return FString::Printf(TEXT("%s:%d"), *Nonce, Counter);
}

bool FLongTableCommitMachine::Begin(const FString& IntentId, const FLongTableIntent& Intent, int32 ExpectedVersion)
{
	if (Stage != ELongTableCommitStage::Idle)
	{
		return false;
	}
	Stage = ELongTableCommitStage::AwaitingReceipt;
	InFlightIntentId = IntentId;
	InFlightIntent = Intent;
	InFlightExpectedVersion = ExpectedVersion;
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

void FLongTableCommitMachine::Reset()
{
	Stage = ELongTableCommitStage::Idle;
	InFlightIntentId.Reset();
	InFlightIntent = FLongTableIntent();
	InFlightExpectedVersion = 0;
	bHasLocalPreview = false;
	bNeedsResync = false;
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
