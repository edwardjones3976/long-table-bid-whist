package com.example.ui.screens

import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.heightIn
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.HorizontalDivider
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.SuggestionChip
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardCapitalization
import androidx.compose.ui.unit.dp
import com.example.data.TablePreferences
import com.example.engine.DealCommitmentHasher
import com.example.engine.RoleMode
import com.example.engine.SeatView
import com.example.engine.TableTalkTone
import com.example.ui.viewmodel.MainViewModel

/** Longest reason the host can type for an audited void; it is written verbatim into the record. */
private const val VOID_REASON_MAX_CHARS = 60

/** Recorded when the host requests a void without typing a reason (Codex §2.7 / R26). */
private const val DEFAULT_VOID_REASON = "Table agreed to throw the hand in"

/** Common table reasons offered as tap-to-fill chips above the reason field. */
private val VOID_REASON_SUGGESTIONS = listOf(
    "Misdeal",
    "Card exposed",
    "Table agreed to redeal"
)

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TableHostAndAuditSheet(
    view: SeatView,
    prefs: TablePreferences,
    viewModel: MainViewModel,
    onDismiss: () -> Unit
) {
    var showAuditOnly by remember { mutableStateOf(prefs.roleMode != RoleMode.SEATED_PLAYER_HOST) }
    val pendingVoid = view.pendingVoidRequest
    var voidReason by rememberSaveable { mutableStateOf("") }

    ModalBottomSheet(onDismissRequest = onDismiss) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp)
                .padding(bottom = 28.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                if (prefs.roleMode == RoleMode.SEATED_PLAYER_HOST) {
                    FilterChip(
                        selected = !showAuditOnly,
                        onClick = { showAuditOnly = false },
                        label = { Text("Host Controls") }
                    )
                }
                FilterChip(
                    selected = showAuditOnly,
                    onClick = { showAuditOnly = true },
                    label = { Text("Audit Log (${view.auditLog.size})") }
                )
            }

            if (!showAuditOnly && prefs.roleMode == RoleMode.SEATED_PLAYER_HOST) {
                Column(
                    modifier = Modifier.verticalScroll(rememberScrollState()),
                    verticalArrangement = Arrangement.spacedBy(12.dp)
                ) {
                    Text("Table Host Controls", style = MaterialTheme.typography.titleLarge)
                    Text(
                        "Boundary enforced: Host controls pace, seating labels, and audited voids — never concealed hands or committed deals.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = MaterialTheme.colorScheme.onSurfaceVariant
                    )

                    Row(
                        modifier = Modifier.fillMaxWidth(),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Column(modifier = Modifier.weight(1f)) {
                            Text("Pause Between Hands", style = MaterialTheme.typography.titleMedium)
                            Text(
                                "Hold next deal so players can review books or take a break.",
                                style = MaterialTheme.typography.bodyMedium,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                        Switch(
                            checked = view.isBetweenHandPaused,
                            onCheckedChange = { viewModel.toggleBetweenHandPause() },
                            modifier = Modifier.testTag("host_pause_switch")
                        )
                    }

                    HorizontalDivider()

                    Text("Table-Talk Tone", style = MaterialTheme.typography.labelLarge)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        TableTalkTone.entries.forEach { tone ->
                            FilterChip(
                                selected = prefs.tableTalkTone == tone,
                                onClick = { viewModel.updateTableTalkTone(tone) },
                                label = { Text(tone.label) }
                            )
                        }
                    }

                    Text("AI Tablemate Presets", style = MaterialTheme.typography.labelLarge)
                    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                        listOf("Community Parlor", "Family Reunion", "Bid School").forEach { preset ->
                            OutlinedButton(
                                onClick = { viewModel.applySeatPreset(preset) }
                            ) {
                                Text(preset)
                            }
                        }
                    }

                    HorizontalDivider()

                    if (pendingVoid == null) {
                        Text("Audited Unanimous Void", style = MaterialTheme.typography.titleMedium)
                        Text(
                            "Say why the table is throwing the hand in. The reason is written into the audit record and shown on the voided hand.",
                            style = MaterialTheme.typography.bodyMedium,
                            color = MaterialTheme.colorScheme.onSurfaceVariant
                        )
                        OutlinedTextField(
                            value = voidReason,
                            onValueChange = { typed -> voidReason = typed.take(VOID_REASON_MAX_CHARS) },
                            label = { Text("Reason for void") },
                            placeholder = { Text(DEFAULT_VOID_REASON) },
                            supportingText = { Text("${voidReason.length}/$VOID_REASON_MAX_CHARS") },
                            singleLine = true,
                            enabled = view.canRequestVoid,
                            keyboardOptions = KeyboardOptions(
                                capitalization = KeyboardCapitalization.Sentences,
                                imeAction = ImeAction.Done
                            ),
                            modifier = Modifier
                                .fillMaxWidth()
                                .heightIn(min = 64.dp)
                                .testTag("host_void_reason_field")
                        )
                        Row(
                            modifier = Modifier.horizontalScroll(rememberScrollState()),
                            horizontalArrangement = Arrangement.spacedBy(8.dp)
                        ) {
                            VOID_REASON_SUGGESTIONS.forEach { suggestion ->
                                SuggestionChip(
                                    onClick = { voidReason = suggestion },
                                    enabled = view.canRequestVoid,
                                    label = { Text(suggestion) },
                                    modifier = Modifier.heightIn(min = 48.dp)
                                )
                            }
                        }
                        OutlinedButton(
                            onClick = {
                                viewModel.requestVoidAsHost(voidReason.trim().ifEmpty { DEFAULT_VOID_REASON })
                            },
                            enabled = view.canRequestVoid,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("host_void_request_button")
                        ) {
                            Text("Request Audited Unanimous Void")
                        }
                        if (!view.canRequestVoid) {
                            Text(
                                "Hand #${view.handNumber} is settled; a void can only be requested while a hand is in progress.",
                                style = MaterialTheme.typography.bodySmall,
                                color = MaterialTheme.colorScheme.onSurfaceVariant
                            )
                        }
                    } else {
                        Card(
                            shape = RoundedCornerShape(14.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Column(
                                modifier = Modifier.padding(12.dp),
                                verticalArrangement = Arrangement.spacedBy(8.dp)
                            ) {
                                Text(
                                    "Confirm Audited Void? Concealed cards stay unrevealed and Hand #${view.handNumber} closes with 0 points.",
                                    style = MaterialTheme.typography.bodyMedium
                                )
                                Text(
                                    "Requested by ${pendingVoid.requestedBy.displayName} · Reason: ${pendingVoid.reason}",
                                    style = MaterialTheme.typography.bodyMedium,
                                    modifier = Modifier.testTag("host_void_pending_reason")
                                )
                                Text(
                                    "Awaiting consent: ${pendingVoid.outstandingSeats.joinToString { it.displayName }}",
                                    style = MaterialTheme.typography.bodySmall,
                                    color = MaterialTheme.colorScheme.onSurfaceVariant
                                )
                                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                                    Button(
                                        onClick = {
                                            viewModel.consentToVoidAsHost()
                                            onDismiss()
                                        },
                                        colors = ButtonDefaults.buttonColors(containerColor = MaterialTheme.colorScheme.error),
                                        modifier = Modifier.testTag("host_void_confirm_button")
                                    ) {
                                        Text("Confirm Void")
                                    }
                                    OutlinedButton(onClick = { viewModel.withdrawVoidRequestAsHost() }) {
                                        Text("Cancel")
                                    }
                                }
                            }
                        }
                    }
                }
            } else {
                Text(
                    "Deterministic Audit Stream · Hand #${view.handNumber} · Deal commitment ${DealCommitmentHasher.shortForm(view.dealCommitment.commitmentHex)}",
                    style = MaterialTheme.typography.labelSmall,
                    color = MaterialTheme.colorScheme.primary
                )
                LazyColumn(
                    modifier = Modifier.fillMaxWidth(),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    items(view.auditLog.reversed(), key = { it.sequence }) { ev ->
                        Card(
                            shape = RoundedCornerShape(12.dp),
                            colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surfaceVariant)
                        ) {
                            Column(modifier = Modifier.padding(10.dp)) {
                                Text(
                                    "#${ev.sequence} · ${ev.actor}: ${ev.summary}",
                                    style = MaterialTheme.typography.labelLarge
                                )
                                Text(ev.detail, style = MaterialTheme.typography.bodyMedium)
                            }
                        }
                    }
                }
            }
        }
    }
}
