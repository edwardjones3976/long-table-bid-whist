// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
/**
 * Blueprint boundary for the table. Presentation (room, cards, hands,
 * controllers, robot) lives in Blueprint and other modules; everything here
 * builds a typed intent or reads a projection. No rule is decided on the
 * client.
 */
#pragma once

#include "CoreMinimal.h"
#include "Subsystems/GameInstanceSubsystem.h"
#include "LongTableAuthorityClient.h"
#include "LongTableTableSubsystem.generated.h"

UCLASS()
class LONGTABLETABLE_API ULongTableTableSubsystem : public UGameInstanceSubsystem
{
	GENERATED_BODY()

public:
	virtual void Initialize(FSubsystemCollectionBase& Collection) override;
	virtual void Deinitialize() override;

	/** Connects over the engine WebSocket transport. */
	UFUNCTION(BlueprintCallable, Category = "Long Table")
	void ConnectToTable(const FLongTableClientConfig& Config);

	/** Connects over a supplied transport (automation, loopback). */
	void ConnectWithTransport(const FLongTableClientConfig& Config, TSharedPtr<ILongTableTransport> Transport);

	UFUNCTION(BlueprintCallable, Category = "Long Table")
	void Disconnect();

	UFUNCTION(BlueprintPure, Category = "Long Table")
	ULongTableAuthorityClient* GetClient() const { return Client; }

	UFUNCTION(BlueprintPure, Category = "Long Table")
	bool IsReady() const;

	// Player intents. Each returns the intent id, or an empty string when nothing was sent.
	UFUNCTION(BlueprintCallable, Category = "Long Table|Player") FString PreviewPass();
	UFUNCTION(BlueprintCallable, Category = "Long Table|Player") FString PreviewBid(int32 Level, ELongTableContractMode Mode);
	UFUNCTION(BlueprintCallable, Category = "Long Table|Player") FString PreviewDeclaration(bool bNoTrump, ELongTableSuit Trump);
	UFUNCTION(BlueprintCallable, Category = "Long Table|Player") FString PreviewPlay(const FString& CardId);
	UFUNCTION(BlueprintCallable, Category = "Long Table|Player") FString ToggleDiscard(const FString& CardId);
	UFUNCTION(BlueprintCallable, Category = "Long Table|Player") FString Cancel();
	UFUNCTION(BlueprintCallable, Category = "Long Table|Player") FString Confirm();
	UFUNCTION(BlueprintCallable, Category = "Long Table|Player") FString NextHand();
	/** Submits the intent published inside a legal choice from the player's projection. */
	UFUNCTION(BlueprintCallable, Category = "Long Table|Player") FString SubmitLegalChoice(const FLongTableLegalChoice& Choice);

	// Host session powers. None can read or change a card, bid, trick or score.
	UFUNCTION(BlueprintCallable, Category = "Long Table|Host") FString HostPause();
	UFUNCTION(BlueprintCallable, Category = "Long Table|Host") FString HostResume();
	UFUNCTION(BlueprintCallable, Category = "Long Table|Host") FString HostAnnounce(ELongTableHostAnnouncement Cue);
	UFUNCTION(BlueprintCallable, Category = "Long Table|Host") FString HostSubstitute(ELongTableSeat Seat);
	UFUNCTION(BlueprintCallable, Category = "Long Table|Host") FString HostTransfer(const FString& ParticipantId);
	UFUNCTION(BlueprintCallable, Category = "Long Table|Host") FString HostEndEvent();

	/** Local gate for the Confirm control; the authority still decides. */
	UFUNCTION(BlueprintPure, Category = "Long Table|Player")
	bool CanConfirmLocally() const;

	static bool LocalConfirmGate(const FLongTablePlayerProjection& Projection, bool bIntentInFlight);

private:
	FString Submit(const FLongTableIntent& Intent);

	UPROPERTY()
	TObjectPtr<ULongTableAuthorityClient> Client;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
