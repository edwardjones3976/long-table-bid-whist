// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Authority connection.
 *
 * Owns the transport, the hello/welcome handshake, the last applied version,
 * the intent identity, the commit state machine and the role projections the
 * authority sent. It never adjudicates a rule: a projection is applied as
 * received, a receipt is applied as received, and a frame that does not decode
 * through the closed schema is dropped in full.
 */
#pragma once

#include "CoreMinimal.h"
#include "UObject/Object.h"
#include "LongTableCommitMachine.h"
#include "LongTableProjections.h"
#include "LongTableTransport.h"
#include "LongTableWire.h"
#include "LongTableAuthorityClient.generated.h"

UENUM(BlueprintType)
enum class ELongTableConnectionState : uint8
{
	Disconnected,
	Connecting,
	AwaitingWelcome,
	Ready,
	Resyncing
};

USTRUCT(BlueprintType)
struct LONGTABLETABLE_API FLongTableClientConfig
{
	GENERATED_BODY()

	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString AuthorityUrl;
	/** Opaque bearer credential. Held here only; never logged or projected. */
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString Token;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") ELongTableRole Role = ELongTableRole::Player;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString TableId;
	UPROPERTY(BlueprintReadWrite, Category = "Long Table") FString DisplayName;
};

DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLongTablePlayerProjectionEvent, const FLongTablePlayerProjection&, Projection);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLongTableHostProjectionEvent, const FLongTableHostProjection&, Projection);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLongTablePublicProjectionEvent, const FLongTablePublicProjection&, Projection);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLongTableReceiptEvent, const FLongTableIntentReceipt&, Receipt);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLongTableDealerCueEvent, const FLongTableDealerCueFrame&, Frame);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_OneParam(FLongTableConnectionStateEvent, ELongTableConnectionState, State);
DECLARE_DYNAMIC_MULTICAST_DELEGATE_TwoParams(FLongTableWireErrorEvent, ELongTableWireError, Code, const FString&, Detail);

UCLASS(BlueprintType)
class LONGTABLETABLE_API ULongTableAuthorityClient : public UObject
{
	GENERATED_BODY()

public:
	void Configure(const FLongTableClientConfig& InConfig, TSharedPtr<ILongTableTransport> InTransport);

	/** Opens the transport and sends hello (resuming from the last applied version after a reconnect). */
	UFUNCTION(BlueprintCallable, Category = "Long Table")
	void Connect();

	UFUNCTION(BlueprintCallable, Category = "Long Table")
	void Disconnect();

	/** Returns the intent id, or an empty string when not ready or when an intent is already in flight. */
	UFUNCTION(BlueprintCallable, Category = "Long Table")
	FString SubmitIntent(const FLongTableIntent& Intent);

	UFUNCTION(BlueprintCallable, Category = "Long Table")
	void RequestResync();

	UFUNCTION(BlueprintPure, Category = "Long Table") ELongTableConnectionState GetState() const { return State; }
	UFUNCTION(BlueprintPure, Category = "Long Table") int32 GetLastAppliedVersion() const { return LastAppliedVersion; }
	UFUNCTION(BlueprintPure, Category = "Long Table") bool HasIntentInFlight() const { return Commit.HasInFlight(); }
	UFUNCTION(BlueprintPure, Category = "Long Table") bool HasLocalPreview() const { return Commit.HasLocalPreview(); }
	UFUNCTION(BlueprintPure, Category = "Long Table") ELongTableRole GetRole() const { return Config.Role; }
	UFUNCTION(BlueprintPure, Category = "Long Table") bool HasSeat() const { return bHasSeat; }
	UFUNCTION(BlueprintPure, Category = "Long Table") ELongTableSeat GetSeat() const { return Seat; }
	UFUNCTION(BlueprintPure, Category = "Long Table") FString GetSessionId() const { return SessionId; }
	UFUNCTION(BlueprintPure, Category = "Long Table") FLongTablePlayerProjection GetPlayerProjection() const { return Player; }
	UFUNCTION(BlueprintPure, Category = "Long Table") FLongTableHostProjection GetHostProjection() const { return Host; }
	UFUNCTION(BlueprintPure, Category = "Long Table") FLongTablePublicProjection GetPublicProjection() const { return Public; }
	UFUNCTION(BlueprintPure, Category = "Long Table") FLongTableIntentReceipt GetLastReceipt() const { return LastReceipt; }

	const FLongTablePlayerProjection& PlayerProjection() const { return Player; }
	int32 AppliedFrameCount() const { return AppliedFrames; }
	const FString& InFlightIntentId() const { return Commit.InFlightId(); }
	void SetIdentityNonceForTests(const FString& Nonce) { Identity = FLongTableIntentIdentity(Nonce); }

	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTablePlayerProjectionEvent OnPlayerProjection;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableHostProjectionEvent OnHostProjection;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTablePublicProjectionEvent OnPublicProjection;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableReceiptEvent OnReceipt;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableDealerCueEvent OnDealerCue;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableConnectionStateEvent OnConnectionState;
	UPROPERTY(BlueprintAssignable, Category = "Long Table") FLongTableWireErrorEvent OnWireError;

private:
	void SetState(ELongTableConnectionState NewState);
	void SendHello();
	void SendClientMessage(const FLongTableClientMessage& Message);
	void ResendInFlight();
	void ApplyRoleProjection(const FLongTableRoleProjection& Projection);

	void HandleConnected();
	void HandleMessage(const FString& Text);
	void HandleClosed(int32 Code, const FString& Reason, bool bClean);
	void HandleError(const FString& Error);

	FLongTableClientConfig Config;
	TSharedPtr<ILongTableTransport> Transport;
	ELongTableConnectionState State = ELongTableConnectionState::Disconnected;
	int32 LastAppliedVersion = -1;
	bool bEverWelcomed = false;
	bool bHasSeat = false;
	ELongTableSeat Seat = ELongTableSeat::South;
	FString SessionId;
	FLongTableIntentIdentity Identity;
	FLongTableCommitMachine Commit;
	FLongTablePlayerProjection Player;
	FLongTableHostProjection Host;
	FLongTablePublicProjection Public;
	FLongTableIntentReceipt LastReceipt;
	int32 AppliedFrames = 0;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
