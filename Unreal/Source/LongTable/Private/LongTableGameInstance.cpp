// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#include "LongTableGameInstance.h"
#include "LongTable.h"
#include "LongTableBuildIdentity.h"
#include "LongTableSettings.h"
#include "LongTableTableSubsystem.h"

void ULongTableGameInstance::Init()
{
	Super::Init();
	UE_LOG(LogLongTable, Log, TEXT("composition root ready: %s, authority %s"), *ULongTableBuildIdentity::GetBuildLabel(), *GetAuthorityUrl());
}

ULongTableTableSubsystem* ULongTableGameInstance::GetTable() const
{
	return GetSubsystem<ULongTableTableSubsystem>();
}

FString ULongTableGameInstance::GetAuthorityUrl() const
{
	return GetDefault<ULongTableSettings>()->AuthorityUrl;
}

void ULongTableGameInstance::JoinTable(const FString& Token, ELongTableRole Role, const FString& TableId, const FString& DisplayName)
{
	ULongTableTableSubsystem* Table = GetTable();
	if (!Table)
	{
		UE_LOG(LogLongTable, Error, TEXT("table subsystem unavailable"));
		return;
	}
	FLongTableClientConfig Config;
	Config.AuthorityUrl = GetAuthorityUrl();
	Config.Token = Token;
	Config.Role = Role;
	Config.TableId = TableId.IsEmpty() ? GetDefault<ULongTableSettings>()->DefaultTableId : TableId;
	Config.DisplayName = DisplayName;
	Table->ConnectToTable(Config);
}
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
