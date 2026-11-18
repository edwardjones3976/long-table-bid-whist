package com.example.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.CardScale
import com.example.data.Handedness
import com.example.data.TablePreferences
import com.example.engine.Card
import com.example.engine.Rank
import com.example.engine.Suit
import com.example.ui.components.PlayingCardView
import com.example.ui.viewmodel.MainViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CalibrationScreen(
    prefs: TablePreferences,
    viewModel: MainViewModel,
    onBack: () -> Unit,
    contentPadding: PaddingValues
) {
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Comfort & Accessibility") },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("calibration_back_button")) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(id = R.string.cd_back_navigation)
                        )
                    }
                }
            )
        }
    ) { innerPadding ->
        Box(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            contentAlignment = Alignment.TopCenter
        ) {
            Column(
                modifier = Modifier
                    .widthIn(max = 680.dp)
                    .fillMaxSize()
                    .verticalScroll(rememberScrollState())
                    .padding(horizontal = 20.dp, vertical = 12.dp),
                verticalArrangement = Arrangement.spacedBy(16.dp)
            ) {
                // Live Card Preview
                Card(
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(
                        modifier = Modifier
                            .fillMaxWidth()
                            .padding(16.dp),
                        horizontalAlignment = Alignment.CenterHorizontally,
                        verticalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Text("Live Card Readability Preview", style = MaterialTheme.typography.titleMedium)
                        Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                            PlayingCardView(
                                card = Card("prev_bj", null, Rank.BIG_JOKER),
                                cardScale = prefs.cardScale,
                                highContrastSuits = prefs.highContrastSuits,
                                isTrump = true
                            )
                            PlayingCardView(
                                card = Card("prev_da", Suit.DIAMONDS, Rank.ACE),
                                cardScale = prefs.cardScale,
                                highContrastSuits = prefs.highContrastSuits,
                                isSelected = true
                            )
                            PlayingCardView(
                                card = Card("prev_ck", Suit.CLUBS, Rank.KING),
                                cardScale = prefs.cardScale,
                                highContrastSuits = prefs.highContrastSuits
                            )
                        }
                        Text(
                            text = "${prefs.cardScale.label} size · ${if (prefs.highContrastSuits) "4-color high-contrast suits" else "Classic 2-color suits"}",
                            style = MaterialTheme.typography.labelMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                }

                // Scale & Handedness
                Card(
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        Text("Layout & Grip", style = MaterialTheme.typography.titleMedium)
                        Text("Card Size", style = MaterialTheme.typography.labelLarge)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            CardScale.entries.forEach { scale ->
                                FilterChip(
                                    selected = prefs.cardScale == scale,
                                    onClick = { viewModel.updateCardScale(scale) },
                                    label = { Text(scale.label) },
                                    modifier = Modifier.testTag("scale_${scale.name.lowercase()}")
                                )
                            }
                        }

                        Text("Primary Commit Button Side (One-Handed Reach)", style = MaterialTheme.typography.labelLarge)
                        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                            Handedness.entries.forEach { side ->
                                FilterChip(
                                    selected = prefs.handedness == side,
                                    onClick = { viewModel.updateHandedness(side) },
                                    label = { Text(side.label) },
                                    modifier = Modifier.testTag("handedness_${side.name.lowercase()}")
                                )
                            }
                        }
                    }
                }

                // Interaction & Audio-Free Guarantees
                Card(
                    shape = RoundedCornerShape(18.dp),
                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                ) {
                    Column(
                        modifier = Modifier.padding(16.dp),
                        verticalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        Text("Playability & Comfort", style = MaterialTheme.typography.titleMedium)
                        CalibrationToggle(
                            title = "Two-Step Card Commit",
                            subtitle = "Select -> Preview -> Confirm prevents accidental plays.",
                            checked = prefs.twoStepConfirm,
                            onCheckedChange = viewModel::updateTwoStepConfirm,
                            tag = "toggle_two_step"
                        )
                        HorizontalDivider()
                        CalibrationToggle(
                            title = "4-Color Suit Redundancy",
                            subtitle = "Distinct Crimson ♥, Royal Blue ♦, Emerald ♣, Charcoal ♠.",
                            checked = prefs.highContrastSuits,
                            onCheckedChange = viewModel::updateHighContrastSuits,
                            tag = "toggle_high_contrast"
                        )
                        HorizontalDivider()
                        CalibrationToggle(
                            title = "Live Table Captions",
                            subtitle = "Full playability without audio — shows every bid, cut, and table remark.",
                            checked = prefs.captionsEnabled,
                            onCheckedChange = viewModel::updateCaptionsEnabled,
                            tag = "toggle_captions"
                        )
                        HorizontalDivider()
                        CalibrationToggle(
                            title = "Reduced Motion & Faster Pacing",
                            subtitle = "Minimizes card lift springs and speeds AI turn pauses.",
                            checked = prefs.reducedMotion,
                            onCheckedChange = viewModel::updateReducedMotion,
                            tag = "toggle_reduced_motion"
                        )
                        HorizontalDivider()
                        CalibrationToggle(
                            title = "AI Dealer Guided Hints",
                            subtitle = "Shows legal-play explanations and bidding pointers.",
                            checked = prefs.guidedHintEnabled,
                            onCheckedChange = viewModel::updateGuidedHintEnabled,
                            tag = "toggle_guided_hints"
                        )
                        HorizontalDivider()
                        CalibrationToggle(
                            title = "Procedural Card Snap Tones",
                            subtitle = "Soft synthesized wooden taps (zero external audio files).",
                            checked = prefs.soundEffectsEnabled,
                            onCheckedChange = viewModel::updateSoundEffects,
                            tag = "toggle_sound"
                        )
                    }
                }

                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun CalibrationToggle(
    title: String,
    subtitle: String,
    checked: Boolean,
    onCheckedChange: (Boolean) -> Unit,
    tag: String
) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(vertical = 4.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
            Text(title, style = MaterialTheme.typography.titleMedium)
            Text(
                subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
        Switch(
            checked = checked,
            onCheckedChange = onCheckedChange,
            modifier = Modifier.testTag(tag)
        )
    }
}
