// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#include "LongTable.h"
#include "LongTableBuildIdentity.h"

DEFINE_LOG_CATEGORY(LogLongTable);

void FLongTableGameModule::StartupModule()
{
	FDefaultGameModuleImpl::StartupModule();
	UE_LOG(LogLongTable, Log, TEXT("The Long Table %s | manifest %s | protocol %s"),
		*ULongTableBuildIdentity::GetBuildLabel(), *ULongTableBuildIdentity::GetManifestId(), *ULongTableBuildIdentity::GetProtocolVersion());
}

IMPLEMENT_PRIMARY_GAME_MODULE(FLongTableGameModule, LongTable, "LongTable");
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
