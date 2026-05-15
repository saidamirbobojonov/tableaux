package com.example.waiter.ui.theme

import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.lightColorScheme
import androidx.compose.runtime.Composable

private val LightColorScheme = lightColorScheme(
    primary = OlivePrimary,
    onPrimary = OliveOnPrimary,
    primaryContainer = OlivePrimaryContainer,
    onPrimaryContainer = OliveOnPrimaryContainer,
    inversePrimary = OliveInversePrimary,
    secondary = OliveSecondary,
    onSecondary = OliveOnSecondary,
    secondaryContainer = OliveSecondaryContainer,
    onSecondaryContainer = OliveOnSecondaryContainer,
    tertiary = OliveTertiary,
    onTertiary = OliveOnTertiary,
    tertiaryContainer = OliveTertiaryContainer,
    onTertiaryContainer = OliveOnTertiaryContainer,
    background = OliveBackground,
    onBackground = OliveOnBackground,
    surface = OliveSurface,
    onSurface = OliveOnSurface,
    surfaceVariant = OliveSurfaceVariant,
    onSurfaceVariant = OliveOnSurfaceVariant,
    surfaceTint = OlivePrimary,
    inverseSurface = OliveInverseSurface,
    inverseOnSurface = OliveInverseOnSurface,
    outline = OliveOutline,
    outlineVariant = OliveOutlineVariant,
    error = OliveError,
    onError = OliveOnError,
    errorContainer = OliveErrorContainer,
    onErrorContainer = OliveOnErrorContainer,
)

@Composable
fun WaiterTheme(content: @Composable () -> Unit) {
    MaterialTheme(
        colorScheme = LightColorScheme,
        typography = Typography,
        content = content
    )
}
