// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleInterface.h"
#include "Logging/LogMacros.h"

LONGTABLEPROTOCOL_API DECLARE_LOG_CATEGORY_EXTERN(LogLongTableProtocol, Log, All);

class FLongTableProtocolModule : public IModuleInterface
{
public:
	virtual void StartupModule() override;
	virtual void ShutdownModule() override;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
