// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | BEGIN]]
#pragma once

#include "CoreMinimal.h"
#include "Modules/ModuleManager.h"
#include "Logging/LogMacros.h"

LONGTABLE_API DECLARE_LOG_CATEGORY_EXTERN(LogLongTable, Log, All);

/** Primary game module: logs the deterministic build identity on startup. */
class FLongTableGameModule : public FDefaultGameModuleImpl
{
public:
	virtual void StartupModule() override;
};
// [[Claude | Fable 5 | 2026-08-30 | LT-NATIVE-CLAUDE-001 | END]]
