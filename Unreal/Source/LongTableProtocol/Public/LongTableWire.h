// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Wire envelopes mirroring packages/protocol/src/wire.ts.
 */
#pragma once

#include "CoreMinimal.h"
#include "LongTableProjections.h"
#include "LongTableWire.generated.h"

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableHello
{
	GENERATED_BODY()

	/** Opaque bearer credential matched exactly by the authority directory. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString Token;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") ELongTableRole Role = ELongTableRole::Player;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString DisplayName;
	/** False on a fresh join; true when reconnecting with LastVersion. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") bool bResume = false;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") int32 LastVersion = 0;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableIntentMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString IntentId;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") int32 ExpectedVersion = 0;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FLongTableIntent Intent;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableResync
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") int32 LastVersion = 0;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableClientMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "Long Table") ELongTableClientMessageType Type = ELongTableClientMessageType::Hello;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FLongTableHello Hello;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FLongTableIntentMessage Intent;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FLongTableResync Resync;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableReplayFrame
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 Version = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableRoleProjection Projection;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableWelcome
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString SessionId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableRole Role = ELongTableRole::Public;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasSeat = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableSeat Seat = ELongTableSeat::South;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 Version = 0;
	/** False only for the dealer role, which receives cues alone. */
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bHasProjection = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableRoleProjection Projection;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableProjectionMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 Version = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableRoleProjection Projection;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableReceiptMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableIntentReceipt Receipt;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableReplayMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 FromVersion = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") int32 ToVersion = 0;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") bool bTruncated = false;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") TArray<FLongTableReplayFrame> Frames;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableDealerCueMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableDealerCueFrame Frame;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableErrorMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableWireError Code = ELongTableWireError::SchemaRejected;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FString Detail;
};

USTRUCT(BlueprintType)
struct LONGTABLEPROTOCOL_API FLongTableAuthorityMessage
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadOnly, Category = "Long Table") ELongTableAuthorityMessageType Type = ELongTableAuthorityMessageType::Error;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableWelcome Welcome;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableProjectionMessage Projection;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableReceiptMessage Receipt;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableReplayMessage Replay;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableDealerCueMessage DealerCue;
	UPROPERTY(BlueprintReadOnly, Category = "Long Table") FLongTableErrorMessage Error;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
