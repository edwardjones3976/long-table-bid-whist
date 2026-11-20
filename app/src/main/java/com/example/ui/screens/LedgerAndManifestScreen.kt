package com.example.ui.screens

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material3.AssistChip
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.PrimaryTabRow
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Tab
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.AssetProvenanceLedger
import com.example.data.AssetStatus
import com.example.data.TablePreferences
import com.example.engine.AuditEvent
import com.example.engine.TableRulesManifest
import com.example.ui.components.RolePermissionMatrixCard
import com.example.ui.components.RulesManifestCard

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun LedgerAndManifestScreen(
    prefs: TablePreferences,
    auditEvents: List<AuditEvent>,
    onAcknowledgeManifest: (Boolean) -> Unit,
    onBack: () -> Unit,
    contentPadding: PaddingValues
) {
    var selectedTab by remember { mutableIntStateOf(0) }
    val tabs = listOf("Rules", "Roles", "Rights", "Audit")

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Rules, Roles & Ledger") },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("ledger_back_button")) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(id = R.string.cd_back_navigation)
                        )
                    }
                }
            )
        }
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            PrimaryTabRow(selectedTabIndex = selectedTab) {
                tabs.forEachIndexed { index, title ->
                    Tab(
                        selected = selectedTab == index,
                        onClick = { selectedTab = index },
                        text = { Text(title) },
                        modifier = Modifier.testTag("ledger_tab_$index")
                    )
                }
            }

            Box(
                modifier = Modifier
                    .widthIn(max = 700.dp)
                    .fillMaxSize()
                    .padding(horizontal = 20.dp, vertical = 14.dp)
            ) {
                when (selectedTab) {
                    0 -> Column(modifier = Modifier.verticalScroll(rememberScrollState())) {
                        RulesManifestCard(
                            manifest = TableRulesManifest(),
                            acknowledged = prefs.manifestAcknowledged,
                            onAcknowledgeChanged = onAcknowledgeManifest
                        )
                    }
                    1 -> RolePermissionMatrixCard()
                    2 -> LazyColumn(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                        items(AssetProvenanceLedger.entries, key = { it.id }) { entry ->
                            Card(
                                shape = RoundedCornerShape(16.dp),
                                colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                            ) {
                                Column(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(14.dp),
                                    verticalArrangement = Arrangement.spacedBy(4.dp)
                                ) {
                                    Row(
                                        modifier = Modifier.fillMaxWidth(),
                                        horizontalArrangement = Arrangement.SpaceBetween,
                                        verticalAlignment = Alignment.CenterVertically
                                    ) {
                                        Text(entry.title, style = MaterialTheme.typography.titleMedium, modifier = Modifier.weight(1f))
                                        AssistChip(
                                            onClick = {},
                                            label = {
                                                Text(
                                                    if (entry.status == AssetStatus.APPROVED) "Approved" else "External Only",
                                                    style = MaterialTheme.typography.labelSmall
                                                )
                                            }
                                        )
                                    }
                                    Text("${entry.category} · ${entry.rightsBasis}", style = MaterialTheme.typography.labelMedium, color = MaterialTheme.colorScheme.primary)
                                    Text(entry.provenanceNote, style = MaterialTheme.typography.bodyMedium, color = MaterialTheme.colorScheme.onSurfaceVariant)
                                }
                            }
                        }
                    }
                    3 -> if (auditEvents.isEmpty()) {
                        Card(
                            shape = RoundedCornerShape(16.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                        ) {
                            Column(modifier = Modifier.padding(18.dp)) {
                                Text("No Active Match Events", style = MaterialTheme.typography.titleMedium)
                                Text(
                                    "Deal a hand at the table to inspect the deterministic, concealed-safe audit stream.",
                                    style = MaterialTheme.typography.bodyMedium,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                            }
                        }
                    } else {
                        LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                            items(auditEvents.reversed(), key = { it.sequence }) { event ->
                                Card(
                                    shape = RoundedCornerShape(14.dp),
                                    colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
                                ) {
                                    Column(
                                        modifier = Modifier
                                            .fillMaxWidth()
                                            .padding(12.dp),
                                        verticalArrangement = Arrangement.spacedBy(2.dp)
                                    ) {
                                        Text(
                                            "#${event.sequence} · ${event.actor} · ${event.summary}",
                                            style = MaterialTheme.typography.labelLarge,
                                            color = MaterialTheme.colorScheme.primary
                                        )
                                        Text(event.detail, style = MaterialTheme.typography.bodyMedium)
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
