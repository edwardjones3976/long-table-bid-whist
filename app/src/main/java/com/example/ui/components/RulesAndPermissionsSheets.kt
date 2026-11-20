package com.example.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.engine.TableRulesManifest

@Composable
fun RulesManifestCard(
    manifest: TableRulesManifest,
    acknowledged: Boolean,
    onAcknowledgeChanged: ((Boolean) -> Unit)? = null,
    onStartPlay: (() -> Unit)? = null,
    modifier: Modifier = Modifier
) {
    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.VerifiedUser,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Column {
                    Text(
                        text = manifest.presetName,
                        style = MaterialTheme.typography.titleLarge
                    )
                    Text(
                        text = "Manifest ${manifest.version}",
                        style = MaterialTheme.typography.labelSmall,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )
                }
            }

            HorizontalDivider()

            ManifestBullet("Deck & Deal", "${manifest.deckSize} cards (52 + Big & Little Joker). 12 cards per seat, 6 cards in the Kitty.")
            ManifestBullet("Auction", "Bids ${manifest.minBid}–${manifest.maxBid} (10–13 total books). No-Trump outranks a suit bid at the same level. Dealer is forced to bid 4 if all pass.")
            ManifestBullet("Uptown vs. Downtown", "Uptown: A–K–Q…2. Downtown: ${manifest.downtownRankingNote}")
            ManifestBullet("Jokers", manifest.jokerRuleNote)
            ManifestBullet("Kitty & Scoring", "Declarer takes the 6-card Kitty, discards 6, and receives 1 Kitty book (12 tricks + 1 Kitty = 13 books). Game to ${manifest.targetGameScore} points (No-Trump doubles; Boston = ${manifest.bostonPoints}).")

            if (onAcknowledgeChanged != null) {
                HorizontalDivider()
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    verticalAlignment = Alignment.CenterVertically,
                    horizontalArrangement = Arrangement.SpaceBetween
                ) {
                    Text(
                        text = "Acknowledge Strict Table rules",
                        style = MaterialTheme.typography.titleMedium,
                        modifier = Modifier.weight(1f)
                    )
                    Switch(
                        checked = acknowledged,
                        onCheckedChange = onAcknowledgeChanged,
                        modifier = Modifier.testTag("acknowledge_manifest_switch")
                    )
                }
            }

            if (onStartPlay != null) {
                Button(
                    onClick = onStartPlay,
                    enabled = acknowledged,
                    modifier = Modifier
                        .fillMaxWidth()
                        .testTag("enter_table_button")
                ) {
                    Text(if (acknowledged) "Enter 4-Seat Table" else "Acknowledge Rules Above to Play")
                }
            }
        }
    }
}

@Composable
private fun ManifestBullet(title: String, body: String) {
    Column(verticalArrangement = Arrangement.spacedBy(2.dp)) {
        Text(
            text = title,
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.primary
        )
        Text(
            text = body,
            style = MaterialTheme.typography.bodyMedium,
            color = MaterialTheme.colorScheme.onSurface
        )
    }
}

data class RolePermissionRow(
    val capability: String,
    val rulesService: String,
    val aiDealer: String,
    val humanHost: String
)

@Composable
fun RolePermissionMatrixCard(modifier: Modifier = Modifier) {
    val rows = listOf(
        RolePermissionRow("Commit shuffle, deal & legal play", "Authoritative", "No", "No"),
        RolePermissionRow("Inspect concealed cards", "Per-seat only", "No", "No"),
        RolePermissionRow("Announce turns & Bid School hints", "Supplies state", "Yes", "Optional"),
        RolePermissionRow("Lock pre-match Rules Manifest", "Enforces", "No", "Before hand"),
        RolePermissionRow("Reseat AI & set table-talk tone", "Enforces", "No", "Yes"),
        RolePermissionRow("Pause between hands or audited void", "Records log", "May suggest", "Yes (logged)")
    )

    Card(
        modifier = modifier.fillMaxWidth(),
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier
                .padding(18.dp)
                .verticalScroll(rememberScrollState()),
            verticalArrangement = Arrangement.spacedBy(10.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.Lock,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "Concealed-State & Host Authority Matrix",
                    style = MaterialTheme.typography.titleLarge
                )
            }
            Text(
                text = "Fairness boundary: Neither the AI Dealer nor a Human Host can ever view opponents' concealed hands or override a committed deal.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            HorizontalDivider()

            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(MaterialTheme.colorScheme.surfaceVariant, RoundedCornerShape(8.dp))
                    .padding(8.dp)
            ) {
                Text("Capability", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1.7f))
                Text("Rules", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(0.9f))
                Text("AI", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(0.6f))
                Text("Host", style = MaterialTheme.typography.labelMedium, fontWeight = FontWeight.Bold, modifier = Modifier.weight(0.8f))
            }

            rows.forEach { row ->
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(horizontal = 6.dp, vertical = 4.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text(row.capability, style = MaterialTheme.typography.bodyMedium, modifier = Modifier.weight(1.7f))
                    Text(row.rulesService, style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary, modifier = Modifier.weight(0.9f))
                    Text(row.aiDealer, style = MaterialTheme.typography.labelMedium, modifier = Modifier.weight(0.6f))
                    Text(row.humanHost, style = MaterialTheme.typography.labelMedium, modifier = Modifier.weight(0.8f))
                }
                HorizontalDivider(alpha = 0.35f)
            }

            Spacer(Modifier.height(4.dp))
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text(
                    text = "All AI seats read strictly from AiSeatObservation (own hand + public table log).",
                    style = MaterialTheme.typography.labelMedium
                )
            }
        }
    }
}

@Composable
private fun HorizontalDivider(alpha: Float) {
    HorizontalDivider(color = MaterialTheme.colorScheme.outline.copy(alpha = alpha))
}
