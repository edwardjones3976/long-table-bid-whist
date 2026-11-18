package com.example.ui.theme

import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Shapes
import androidx.compose.material3.darkColorScheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.unit.dp

private val LightColors = lightColorScheme(
    primary = FeltGreenDeep,
    onPrimary = Color.White,
    primaryContainer = BrassTint,
    onPrimaryContainer = EspressoInk,
    secondary = WalnutWarm,
    onSecondary = Color.White,
    secondaryContainer = WarmSand,
    onSecondaryContainer = EspressoInk,
    tertiary = AntiqueBrass,
    onTertiary = Color.White,
    background = IvoryParchment,
    onBackground = EspressoInk,
    surface = IvoryCardSurface,
    onSurface = EspressoInk,
    surfaceVariant = WarmSand,
    onSurfaceVariant = MutedUmber,
    outline = Color(0xFFB5A795),
    error = SuitCrimson,
    onError = Color.White
)

private val DarkColors = darkColorScheme(
    primary = SoftGold,
    onPrimary = WalnutDark,
    primaryContainer = FeltGreenMid,
    onPrimaryContainer = DarkCreamText,
    secondary = FeltGreenBright,
    onSecondary = Color.White,
    secondaryContainer = DarkSurfaceHigh,
    onSecondaryContainer = DarkCreamText,
    tertiary = SoftGold,
    onTertiary = WalnutDark,
    background = DarkBg,
    onBackground = DarkCreamText,
    surface = DarkSurface,
    onSurface = DarkCreamText,
    surfaceVariant = DarkSurfaceHigh,
    onSurfaceVariant = DarkMutedText,
    outline = Color(0xFF5A4E45),
    error = Color(0xFFEF7B7B),
    onError = WalnutDark
)

val LongTableShapes = Shapes(
    small = RoundedCornerShape(10.dp),
    medium = RoundedCornerShape(16.dp),
    large = RoundedCornerShape(24.dp)
)

@Composable
fun LongTableTheme(
    darkTheme: Boolean = isSystemInDarkTheme(),
    content: @Composable () -> Unit
) {
    MaterialTheme(
        colorScheme = if (darkTheme) DarkColors else LightColors,
        typography = LongTableTypography,
        shapes = LongTableShapes,
        content = content
    )
}
