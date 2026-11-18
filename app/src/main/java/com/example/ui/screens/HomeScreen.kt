package com.example.ui.screens

import androidx.compose.foundation.Image
import androidx.compose.foundation.background
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
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.MenuBook
import androidx.compose.material.icons.filled.AccessibilityNew
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.TablePreferences
import com.example.engine.RoleMode
import com.example.engine.TableRulesManifest
import com.example.engine.TableTalkTone
import com.example.ui.components.RulesManifestCard
import com.example.ui.theme.FeltGreenDeep
import com.example.ui.theme.SoftGold

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun HomeScreen(
    prefs: TablePreferences,
    hasActiveMatch: Boolean,
    onResumeOrStartTable: (Boolean) -> Unit,
    onOpenBidSchool: () -> Unit,
    onOpenCalibration: () -> Unit,
    onOpenLedger: () -> Unit,
    onRoleModeChange: (RoleMode) -> Unit,
    onToneChange: (TableTalkTone) -> Unit,
    onAcknowledgeManifest: (Boolean) -> Unit,
    contentPadding: PaddingValues
) {
    var showManifestSheet by remember { mutableStateOf(false) }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .padding(contentPadding),
        contentAlignment = Alignment.TopCenter
    ) {
        Column(
            modifier = Modifier
                .widthIn(max = 680.dp)
                .fillMaxSize()
                .verticalScroll(rememberScrollState())
                .padding(horizontal = 20.dp, vertical = 16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Hero Parlor Card
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(210.dp)
                    .clip(RoundedCornerShape(24.dp))
            ) {
                Image(
                    painter = painterResource(id = R.drawable.img_parlor_hero),
                    contentDescription = stringResource(id = R.string.cd_parlor_hero),
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize()
                )
                Box(
                    modifier = Modifier
                        .fillMaxSize()
                        .background(
                            Brush.verticalGradient(
                                colors = listOf(
                                    Color.Black.copy(alpha = 0.12f),
                                    Color.Black.copy(alpha = 0.78f)
                                )
                            )
                        )
                )
                Column(
                    modifier = Modifier
                        .align(Alignment.BottomStart)
                        .padding(20.dp),
                    verticalArrangement = Arrangement.spacedBy(4.dp)
                ) {
                    Text(
                        text = "STRICT TABLE · V1.0.0",
                        style = MaterialTheme.typography.labelSmall,
                        color = SoftGold
                    )
                    Text(
                        text = "The Long Table",
                        style = MaterialTheme.typography.displaySmall,
                        color = Color.White
                    )
                    Text(
                        text = "Authentic four-seat Bid Whist with fair AI, clear rules, and dignified table presence.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White.copy(alpha = 0.9f)
                    )
                }
            }

            // Primary Launch Card
            Card(
                shape = RoundedCornerShape(20.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text(
                                text = "Four-Seat Parlor Table",
                                style = MaterialTheme.typography.titleLarge
                            )
                            Text(
                                text = "You (South) & Ms. Evelyn (North) vs. Deacon Ray & Uncle Marcus",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        if (prefs.manifestAcknowledged) {
                            Icon(
                                imageVector = Icons.Filled.CheckCircle,
                                contentDescription = "Rules acknowledged",
                                tint = MaterialTheme.colorScheme.primary
                            )
                        }
                    }

                    // Role Mode selector
                    Text(
                        text = "Your Seat Role",
                        style = MaterialTheme.typography.labelLarge
                    )
                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        RoleMode.entries.forEach { mode ->
                            FilterChip(
                                selected = prefs.roleMode == mode,
                                onClick = { onRoleModeChange(mode) },
                                label = { Text(mode.label) },
                                modifier = Modifier
                                    .weight(1f)
                                    .testTag("role_chip_${mode.name.lowercase()}")
                            )
                        }
                    }
                    Text(
                        text = prefs.roleMode.summary,
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    // Table-talk tone selector
                    Text(
                        text = "Table-Talk Tone",
                        style = MaterialTheme.typography.labelLarge
                    )
                    Row(
                        horizontalArrangement = Arrangement.spacedBy(8.dp)
                    ) {
                        TableTalkTone.entries.forEach { tone ->
                            FilterChip(
                                selected = prefs.tableTalkTone == tone,
                                onClick = { onToneChange(tone) },
                                label = { Text(tone.label) },
                                modifier = Modifier.testTag("tone_chip_${tone.name.lowercase()}")
                            )
                        }
                    }

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.spacedBy(10.dp)
                    ) {
                        Button(
                            onClick = {
                                if (prefs.manifestAcknowledged) {
                                    onResumeOrStartTable(false)
                                } else {
                                    showManifestSheet = true
                                }
                            },
                            colors = ButtonDefaults.buttonColors(containerColor = FeltGreenDeep),
                            modifier = Modifier
                                .weight(1f)
                                .height(52.dp)
                                .testTag("play_strict_table_button")
                        ) {
                            Icon(
                                imageVector = Icons.Filled.PlayArrow,
                                contentDescription = null,
                                tint = Color.White
                            )
                            Spacer(Modifier.size(6.dp))
                            Text(
                                text = if (hasActiveMatch) "Resume Table" else "Deal New Match",
                                color = Color.White,
                                fontWeight = FontWeight.SemiBold
                            )
                        }

                        if (hasActiveMatch) {
                            OutlinedButton(
                                onClick = {
                                    if (prefs.manifestAcknowledged) {
                                        onResumeOrStartTable(true)
                                    } else {
                                        showManifestSheet = true
                                    }
                                },
                                modifier = Modifier
                                    .height(52.dp)
                                    .testTag("new_match_button")
                            ) {
                                Text("Fresh Match")
                            }
                        }
                    }
                }
            }

            // Secondary Hub Grid: Bid School & Calibration
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                HubTile(
                    title = "Bid School",
                    subtitle = if (prefs.bidSchoolCompleted) "Completed · Review anytime" else "4 short guided lessons",
                    icon = Icons.Filled.School,
                    onClick = onOpenBidSchool,
                    testTag = "open_bid_school_card",
                    modifier = Modifier.weight(1f)
                )
                HubTile(
                    title = "Comfort & Access",
                    subtitle = "${prefs.cardScale.label} cards · ${prefs.handedness.label}",
                    icon = Icons.Filled.AccessibilityNew,
                    onClick = onOpenCalibration,
                    testTag = "open_calibration_card",
                    modifier = Modifier.weight(1f)
                )
            }

            // Ledger & Manifest Tile
            Card(
                onClick = onOpenLedger,
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant),
                modifier = Modifier
                    .fillMaxWidth()
                    .testTag("open_ledger_card")
            ) {
                Row(
                    modifier = Modifier.padding(16.dp),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.spacedBy(14.dp)
                ) {
                    Icon(
                        imageVector = Icons.Filled.VerifiedUser,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.primary
                    )
                    Column(modifier = Modifier.weight(1f)) {
                        Text(
                            text = "Rules Manifest, Role Matrix & Rights Ledger",
                            style = MaterialTheme.typography.titleMedium
                        )
                        Text(
                            text = "Inspect strict-table-v1.0.0, concealed-state boundaries, and asset provenance.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    }
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.MenuBook,
                        contentDescription = null,
                        tint = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            // Parlor Record Card
            Card(
                shape = RoundedCornerShape(18.dp),
                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    Text(
                        text = "Your Parlor Record",
                        style = MaterialTheme.typography.titleMedium
                    )
                    if (prefs.handsCompleted == 0) {
                        Text(
                            text = "No hands logged yet. Try Bid School for a 2-minute refresher on Uptown/Downtown & the Kitty, or deal your first hand above.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                    } else {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween
                        ) {
                            StatBlock("Hands", prefs.handsCompleted.toString())
                            StatBlock("Hands Won", prefs.handsWonUs.toString())
                            StatBlock("Bostons", prefs.bostonsScored.toString())
                        }
                    }
                }
            }
        }
    }

    if (showManifestSheet) {
        ModalBottomSheet(onDismissRequest = { showManifestSheet = false }) {
            Column(
                modifier = Modifier
                    .padding(horizontal = 20.dp)
                    .padding(bottom = 28.dp)
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(12.dp)
            ) {
                Text(
                    text = "Confirm House Rules Before Dealing",
                    style = MaterialTheme.typography.headlineSmall
                )
                RulesManifestCard(
                    manifest = TableRulesManifest(),
                    acknowledged = prefs.manifestAcknowledged,
                    onAcknowledgeChanged = onAcknowledgeManifest,
                    onStartPlay = {
                        showManifestSheet = false
                        onResumeOrStartTable(true)
                    }
                )
            }
        }
    }
}

@Composable
private fun HubTile(
    title: String,
    subtitle: String,
    icon: androidx.compose.ui.graphics.vector.ImageVector,
    onClick: () -> Unit,
    testTag: String,
    modifier: Modifier = Modifier
) {
    Card(
        onClick = onClick,
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface),
        modifier = modifier.testTag(testTag)
    ) {
        Column(
            modifier = Modifier.padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = icon,
                contentDescription = null,
                tint = MaterialTheme.colorScheme.primary
            )
            Text(text = title, style = MaterialTheme.typography.titleMedium)
            Text(
                text = subtitle,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )
        }
    }
}

@Composable
private fun StatBlock(label: String, value: String) {
    Column(horizontalAlignment = Alignment.CenterHorizontally) {
        Text(
            text = value,
            style = MaterialTheme.typography.headlineSmall,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = label,
            style = MaterialTheme.typography.labelMedium,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }
}
