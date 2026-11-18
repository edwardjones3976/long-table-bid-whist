package com.example.ui.screens

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.horizontalScroll
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.layout.widthIn
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.AccessibilityNew
import androidx.compose.material.icons.filled.AdminPanelSettings
import androidx.compose.material.icons.filled.PauseCircle
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.material3.TopAppBarDefaults
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.CardScale
import com.example.data.Handedness
import com.example.data.TablePreferences
import com.example.engine.BidAction
import com.example.engine.BidDirection
import com.example.engine.Partnership
import com.example.engine.Seat
import com.example.engine.SeatView
import com.example.engine.Suit
import com.example.engine.TablePhase
import com.example.ui.components.PlayingCardView
import com.example.ui.theme.AntiqueBrass
import com.example.ui.theme.FeltGreenDeep
import com.example.ui.theme.FeltGreenMid
import com.example.ui.theme.SoftGold
import com.example.ui.theme.WalnutDark
import com.example.ui.theme.WalnutRich
import com.example.ui.viewmodel.MainViewModel
import com.example.ui.viewmodel.TableUiState

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun TableScreen(
    uiState: TableUiState,
    prefs: TablePreferences,
    viewModel: MainViewModel,
    onBack: () -> Unit,
    onOpenCalibration: () -> Unit
) {
    val view = uiState.seatView
    var showHostSheet by remember { mutableStateOf(false) }

    Scaffold(
        contentWindowInsets = WindowInsets(0, 0, 0, 0),
        topBar = {
            TopAppBar(
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = WalnutDark,
                    titleContentColor = Color.White,
                    navigationIconContentColor = Color.White,
                    actionIconContentColor = SoftGold
                ),
                title = {
                    if (view != null) {
                        Column {
                            Text(
                                text = "Us ${view.scoreUs}  –  Them ${view.scoreThem}  (to ${view.manifest.targetGameScore})",
                                style = MaterialTheme.typography.titleMedium,
                                color = Color.White
                            )
                            val contractStr = view.contract?.formatBanner() ?: "Bidding · Hand #${view.handNumber}"
                            Text(
                                text = "$contractStr · Books ${view.booksWonUs}–${view.booksWonThem}",
                                style = MaterialTheme.typography.labelMedium,
                                color = SoftGold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                    } else {
                        Text("The Long Table")
                    }
                },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("table_back_button")) {
                        Icon(
                            imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                            contentDescription = stringResource(id = R.string.cd_back_navigation)
                        )
                    }
                },
                actions = {
                    IconButton(onClick = onOpenCalibration, modifier = Modifier.testTag("table_calibration_button")) {
                        Icon(Icons.Filled.AccessibilityNew, contentDescription = "Comfort and Accessibility")
                    }
                    IconButton(onClick = { showHostSheet = true }, modifier = Modifier.testTag("table_host_audit_button")) {
                        Icon(Icons.Filled.AdminPanelSettings, contentDescription = "Host Controls and Audit Log")
                    }
                }
            )
        }
    ) { innerPadding ->
        if (view == null) {
            Box(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
                contentAlignment = Alignment.Center
            ) {
                Button(onClick = { viewModel.startNewMatch() }) {
                    Text("Deal Hand #1")
                }
            }
            return@Scaffold
        }

        Column(
            modifier = Modifier
                .fillMaxSize()
                .background(WalnutDark)
                .padding(innerPadding)
                .navigationBarsPadding(),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            // Live Caption Banner (Playable without audio)
            if (prefs.captionsEnabled) {
                Surface(
                    color = WalnutRich,
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = uiState.statusNotice ?: view.latestCaption,
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color(0xFFF6EFE2),
                        modifier = Modifier
                            .padding(horizontal = 16.dp, vertical = 7.dp)
                            .testTag("table_live_caption"),
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
            }

            // Optional Guided Coach Hint
            if (view.guidedHint != null) {
                Surface(
                    color = SoftGold.copy(alpha = 0.16f),
                    modifier = Modifier.fillMaxWidth()
                ) {
                    Text(
                        text = "Bid School Hint: ${view.guidedHint}",
                        style = MaterialTheme.typography.labelMedium,
                        color = SoftGold,
                        modifier = Modifier.padding(horizontal = 16.dp, vertical = 5.dp)
                    )
                }
            }

            // Felt Card Table Arena
            Box(
                modifier = Modifier
                    .weight(1f)
                    .widthIn(max = 760.dp)
                    .fillMaxWidth()
                    .padding(horizontal = 10.dp, vertical = 8.dp)
                    .clip(RoundedCornerShape(28.dp))
                    .background(
                        Brush.radialGradient(
                            colors = listOf(FeltGreenMid, FeltGreenDeep)
                        )
                    )
                    .border(3.dp, WalnutRich, RoundedCornerShape(28.dp))
                    .padding(12.dp)
            ) {
                // North Seat (Partner)
                SeatBadge(
                    name = uiState.seatNames[Seat.NORTH] ?: Seat.NORTH.defaultPlayerName,
                    roleTag = "Partner",
                    cardCount = view.seatCardCounts[Seat.NORTH] ?: 0,
                    isDealer = view.dealer == Seat.NORTH,
                    isTurn = view.currentTurn == Seat.NORTH &&
                        view.phase in setOf(TablePhase.BIDDING, TablePhase.SELECT_TRUMP, TablePhase.KITTY_DISCARD, TablePhase.PLAYING_TRICK),
                    caption = view.seatCaptions[Seat.NORTH],
                    modifier = Modifier.align(Alignment.TopCenter)
                )

                // West Seat
                SeatBadge(
                    name = uiState.seatNames[Seat.WEST] ?: Seat.WEST.defaultPlayerName,
                    roleTag = "West",
                    cardCount = view.seatCardCounts[Seat.WEST] ?: 0,
                    isDealer = view.dealer == Seat.WEST,
                    isTurn = view.currentTurn == Seat.WEST &&
                        view.phase in setOf(TablePhase.BIDDING, TablePhase.SELECT_TRUMP, TablePhase.KITTY_DISCARD, TablePhase.PLAYING_TRICK),
                    caption = null,
                    modifier = Modifier.align(Alignment.CenterStart)
                )

                // East Seat
                SeatBadge(
                    name = uiState.seatNames[Seat.EAST] ?: Seat.EAST.defaultPlayerName,
                    roleTag = "East",
                    cardCount = view.seatCardCounts[Seat.EAST] ?: 0,
                    isDealer = view.dealer == Seat.EAST,
                    isTurn = view.currentTurn == Seat.EAST &&
                        view.phase in setOf(TablePhase.BIDDING, TablePhase.SELECT_TRUMP, TablePhase.KITTY_DISCARD, TablePhase.PLAYING_TRICK),
                    caption = null,
                    modifier = Modifier.align(Alignment.CenterEnd)
                )

                // Center Magnetic Play Zone
                CenterPlayZone(
                    view = view,
                    prefs = prefs,
                    seatNames = uiState.seatNames,
                    onCollectTrick = { viewModel.collectTrickNow() },
                    onDealNextHand = { viewModel.dealNextHand() },
                    onStartNewMatch = { viewModel.startNewMatch() },
                    onTogglePause = { viewModel.toggleBetweenHandPause() },
                    modifier = Modifier.align(Alignment.Center)
                )
            }

            // Bottom Player Interaction Dock (South)
            Surface(
                color = MaterialTheme.colorScheme.surface,
                tonalElevation = 4.dp,
                shape = RoundedCornerShape(topStart = 22.dp, topEnd = 22.dp),
                modifier = Modifier
                    .widthIn(max = 760.dp)
                    .fillMaxWidth()
            ) {
                Column(
                    modifier = Modifier.padding(horizontal = 14.dp, vertical = 10.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    when {
                        view.phase == TablePhase.BIDDING && view.currentTurn == Seat.SOUTH -> {
                            SouthBiddingControls(
                                view = view,
                                onSubmitBid = viewModel::submitHumanBid
                            )
                        }
                        view.phase == TablePhase.SELECT_TRUMP && view.currentTurn == Seat.SOUTH -> {
                            SouthTrumpSelectionControls(
                                initialDirection = (view.highestBid?.action as? BidAction.Bid)?.direction ?: BidDirection.UPTOWN,
                                onConfirmTrump = viewModel::selectTrumpAndTakeKitty
                            )
                        }
                        else -> {
                            SouthHandAndCommitBar(
                                view = view,
                                uiState = uiState,
                                prefs = prefs,
                                onCardTap = viewModel::onCardTapped,
                                onCommitCard = { viewModel.commitSelectedCard() },
                                onConfirmDiscards = viewModel::confirmKittyDiscards
                            )
                        }
                    }
                }
            }
        }
    }

    if (showHostSheet && view != null) {
        TableHostAndAuditSheet(
            view = view,
            prefs = prefs,
            viewModel = viewModel,
            onDismiss = { showHostSheet = false }
        )
    }
}

@Composable
private fun SeatBadge(
    name: String,
    roleTag: String,
    cardCount: Int,
    isDealer: Boolean,
    isTurn: Boolean,
    caption: String?,
    modifier: Modifier = Modifier
) {
    Column(
        modifier = modifier,
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(4.dp)
    ) {
        Surface(
            shape = RoundedCornerShape(14.dp),
            color = if (isTurn) AntiqueBrass else WalnutDark.copy(alpha = 0.85f),
            border = BorderStroke(1.5.dp, if (isTurn) Color.White else SoftGold.copy(alpha = 0.4f))
        ) {
            Row(
                modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                if (isDealer) {
                    Box(
                        modifier = Modifier
                            .size(18.dp)
                            .background(SoftGold, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text("D", style = MaterialTheme.typography.labelSmall, color = WalnutDark, fontWeight = FontWeight.Bold)
                    }
                }
                Column {
                    Text(
                        text = name,
                        style = MaterialTheme.typography.labelLarge,
                        color = if (isTurn) WalnutDark else Color.White
                    )
                    Text(
                        text = "$roleTag · $cardCount cards",
                        style = MaterialTheme.typography.labelSmall,
                        color = if (isTurn) WalnutDark else SoftGold
                    )
                }
            }
        }
        if (!caption.isNullOrBlank()) {
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = Color.Black.copy(alpha = 0.55f)
            ) {
                Text(
                    text = caption,
                    style = MaterialTheme.typography.labelSmall,
                    color = Color.White,
                    modifier = Modifier.padding(horizontal = 8.dp, vertical = 3.dp),
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis
                )
            }
        }
    }
}

@Composable
private fun CenterPlayZone(
    view: SeatView,
    prefs: TablePreferences,
    seatNames: Map<Seat, String>,
    onCollectTrick: () -> Unit,
    onDealNextHand: () -> Unit,
    onStartNewMatch: () -> Unit,
    onTogglePause: () -> Unit,
    modifier: Modifier = Modifier
) {
    when (view.phase) {
        TablePhase.BIDDING -> {
            Surface(
                shape = RoundedCornerShape(18.dp),
                color = Color.Black.copy(alpha = 0.35f),
                border = BorderStroke(1.dp, SoftGold.copy(alpha = 0.3f)),
                modifier = modifier.widthIn(max = 260.dp)
            ) {
                Column(
                    modifier = Modifier.padding(14.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text("Table Auction", style = MaterialTheme.typography.titleMedium, color = SoftGold)
                    if (view.bidHistory.isEmpty()) {
                        Text("Awaiting opening bid...", style = MaterialTheme.typography.bodyMedium, color = Color.White)
                    } else {
                        view.bidHistory.forEach { rec ->
                            val txt = when (val act = rec.action) {
                                BidAction.Pass -> "Pass"
                                is BidAction.Bid -> act.formatShort()
                            }
                            Text(
                                text = "${seatNames[rec.seat] ?: rec.seat.displayName}: $txt",
                                style = MaterialTheme.typography.bodyMedium,
                                color = Color.White
                            )
                        }
                    }
                }
            }
        }
        TablePhase.SELECT_TRUMP, TablePhase.KITTY_DISCARD -> {
            Surface(
                shape = RoundedCornerShape(18.dp),
                color = Color.Black.copy(alpha = 0.4f),
                modifier = modifier.padding(16.dp)
            ) {
                Column(
                    modifier = Modifier.padding(16.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(6.dp)
                ) {
                    Text(
                        text = if (view.phase == TablePhase.SELECT_TRUMP) "Naming Trump" else "Kitty & 6 Discards",
                        style = MaterialTheme.typography.titleMedium,
                        color = SoftGold
                    )
                    Text(
                        text = "${seatNames[view.currentTurn]} won the auction.",
                        style = MaterialTheme.typography.bodyMedium,
                        color = Color.White
                    )
                }
            }
        }
        TablePhase.HAND_COMPLETE, TablePhase.MATCH_COMPLETE, TablePhase.VOIDED_HAND -> {
            val outcome = view.lastOutcome
            Surface(
                shape = RoundedCornerShape(20.dp),
                color = MaterialTheme.colorScheme.surface,
                shadowElevation = 8.dp,
                modifier = modifier
                    .widthIn(max = 310.dp)
                    .padding(8.dp)
            ) {
                Column(
                    modifier = Modifier.padding(18.dp),
                    horizontalAlignment = Alignment.CenterHorizontally,
                    verticalArrangement = Arrangement.spacedBy(10.dp)
                ) {
                    if (outcome != null) {
                        val headline = when {
                            outcome.wasVoided -> "Hand #${outcome.handNumber} Voided"
                            outcome.isBoston -> "BOSTON! (13 / 13 Books)"
                            outcome.contractMade -> "Contract Made!"
                            else -> "Contract Set!"
                        }
                        Text(headline, style = MaterialTheme.typography.headlineSmall, color = MaterialTheme.colorScheme.primary)
                        if (!outcome.wasVoided) {
                            Text(
                                text = "${outcome.contract.formatBanner()} · Us ${outcome.booksWonUs} – Them ${outcome.booksWonThem} books",
                                style = MaterialTheme.typography.bodyMedium
                            )
                            Text(
                                text = "${outcome.pointsAwardedTo.displayName} +${outcome.pointsDelta} pts",
                                style = MaterialTheme.typography.titleMedium,
                                color = MaterialTheme.colorScheme.tertiary
                            )
                        } else {
                            Text(outcome.voidReason ?: "Voided by Host", style = MaterialTheme.typography.bodyMedium)
                        }
                    }

                    if (view.phase == TablePhase.MATCH_COMPLETE) {
                        val usWonMatch = view.scoreUs >= view.manifest.targetGameScore
                        Text(
                            text = if (usWonMatch) "Match Victory — Us ${view.scoreUs} to ${view.scoreThem}!" else "Match Complete — Them ${view.scoreThem} to ${view.scoreUs}",
                            style = MaterialTheme.typography.titleMedium,
                            fontWeight = FontWeight.Bold
                        )
                        Button(
                            onClick = onStartNewMatch,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("start_new_match_button")
                        ) {
                            Text("Start New Match")
                        }
                    } else if (view.isBetweenHandPaused) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(6.dp)
                        ) {
                            Icon(Icons.Filled.PauseCircle, contentDescription = null, tint = MaterialTheme.colorScheme.tertiary)
                            Text("Paused by Host", style = MaterialTheme.typography.titleMedium)
                        }
                        OutlinedButton(onClick = onTogglePause, modifier = Modifier.fillMaxWidth()) {
                            Text("Resume & Unlock Deal")
                        }
                    } else {
                        Button(
                            onClick = onDealNextHand,
                            modifier = Modifier
                                .fillMaxWidth()
                                .testTag("deal_next_hand_button")
                        ) {
                            Text("Deal Hand #${view.handNumber + 1}")
                        }
                    }
                }
            }
        }
        else -> {
            // PLAYING_TRICK / TRICK_COMPLETE
            val bySeat = view.currentTrick.associateBy { it.seat }
            Column(
                modifier = modifier,
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.spacedBy(6.dp)
            ) {
                TrickSlotCard(bySeat[Seat.NORTH], prefs)
                Row(
                    horizontalArrangement = Arrangement.spacedBy(26.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    TrickSlotCard(bySeat[Seat.WEST], prefs)
                    TrickSlotCard(bySeat[Seat.EAST], prefs)
                }
                TrickSlotCard(bySeat[Seat.SOUTH], prefs)

                if (view.phase == TablePhase.TRICK_COMPLETE) {
                    Button(
                        onClick = onCollectTrick,
                        colors = ButtonDefaults.buttonColors(containerColor = AntiqueBrass),
                        modifier = Modifier.testTag("collect_trick_button")
                    ) {
                        Text("Collect Book", color = WalnutDark, fontWeight = FontWeight.Bold)
                    }
                }
            }
        }
    }
}

@Composable
private fun TrickSlotCard(
    played: com.example.engine.PlayedCard?,
    prefs: TablePreferences
) {
    if (played != null) {
        PlayingCardView(
            card = played.card,
            cardScale = CardScale.STANDARD,
            highContrastSuits = prefs.highContrastSuits,
            reducedMotion = prefs.reducedMotion
        )
    } else {
        Box(
            modifier = Modifier
                .size(width = 56.dp, height = 78.dp)
                .border(1.dp, Color.White.copy(alpha = 0.22f), RoundedCornerShape(10.dp))
        )
    }
}

@Composable
private fun SouthBiddingControls(
    view: SeatView,
    onSubmitBid: (BidAction) -> Unit
) {
    val isForcedDealer = view.dealer == Seat.SOUTH && view.bidHistory.size == 3 && view.highestBid == null
    val currentHigh = view.highestBid?.action as? BidAction.Bid

    var chosenBooks by remember(view.handNumber) {
        mutableIntStateOf(currentHigh?.booksOverSix ?: 4)
    }
    var chosenDirection by remember(view.handNumber) { mutableStateOf(BidDirection.UPTOWN) }
    var chosenNoTrump by remember(view.handNumber) { mutableStateOf(false) }

    val candidate = BidAction.Bid(chosenBooks, chosenNoTrump, chosenDirection)
    val bidIsLegal = currentHigh == null ||
        chosenBooks > currentHigh.booksOverSix ||
        (chosenBooks == currentHigh.booksOverSix && chosenNoTrump && !currentHigh.isNoTrump)

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text(
            text = if (isForcedDealer) "Your Bid (Dealer Forced Minimum: 4)" else "Your Turn to Bid",
            style = MaterialTheme.typography.titleMedium
        )
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            (4..7).forEach { level ->
                FilterChip(
                    selected = chosenBooks == level,
                    onClick = { chosenBooks = level },
                    label = { Text("$level") },
                    modifier = Modifier.testTag("bid_level_$level")
                )
            }
            FilterChip(
                selected = chosenNoTrump,
                onClick = { chosenNoTrump = !chosenNoTrump },
                label = { Text("No-Trump") },
                modifier = Modifier.testTag("bid_notrump_chip")
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            BidDirection.entries.forEach { dir ->
                FilterChip(
                    selected = chosenDirection == dir,
                    onClick = { chosenDirection = dir },
                    label = { Text(dir.label) },
                    modifier = Modifier.testTag("bid_dir_${dir.name.lowercase()}")
                )
            }
            Spacer(Modifier.weight(1f))
            if (!isForcedDealer) {
                OutlinedButton(
                    onClick = { onSubmitBid(BidAction.Pass) },
                    modifier = Modifier.testTag("bid_pass_button")
                ) {
                    Text("Pass")
                }
            }
            Button(
                onClick = { onSubmitBid(candidate) },
                enabled = bidIsLegal,
                modifier = Modifier.testTag("bid_confirm_button")
            ) {
                Text("Bid ${candidate.formatShort()}")
            }
        }
    }
}

@Composable
private fun SouthTrumpSelectionControls(
    initialDirection: BidDirection,
    onConfirmTrump: (Suit?, BidDirection) -> Unit
) {
    var selectedSuit by remember { mutableStateOf<Suit?>(Suit.SPADES) }
    var selectedDir by remember { mutableStateOf(initialDirection) }

    Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
        Text("You Won the Auction — Name Trump & Direction", style = MaterialTheme.typography.titleMedium)
        Row(
            modifier = Modifier.horizontalScroll(rememberScrollState()),
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Suit.entries.forEach { suit ->
                FilterChip(
                    selected = selectedSuit == suit,
                    onClick = { selectedSuit = suit },
                    label = { Text("${suit.symbol} ${suit.label}") },
                    modifier = Modifier.testTag("trump_suit_${suit.name.lowercase()}")
                )
            }
            FilterChip(
                selected = selectedSuit == null,
                onClick = { selectedSuit = null },
                label = { Text("No-Trump") },
                modifier = Modifier.testTag("trump_suit_notrump")
            )
        }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                BidDirection.entries.forEach { dir ->
                    FilterChip(
                        selected = selectedDir == dir,
                        onClick = { selectedDir = dir },
                        label = { Text(dir.label) }
                    )
                }
            }
            Button(
                onClick = { onConfirmTrump(selectedSuit, selectedDir) },
                modifier = Modifier.testTag("confirm_trump_button")
            ) {
                Text("Take Kitty")
            }
        }
    }
}

@Composable
private fun SouthHandAndCommitBar(
    view: SeatView,
    uiState: TableUiState,
    prefs: TablePreferences,
    onCardTap: (String) -> Unit,
    onCommitCard: () -> Unit,
    onConfirmDiscards: () -> Unit
) {
    val isKittyPhase = view.phase == TablePhase.KITTY_DISCARD && view.currentTurn == Seat.SOUTH
    val isPlayPhase = view.phase == TablePhase.PLAYING_TRICK && view.currentTurn == Seat.SOUTH

    // Action preview / commit strip
    if (isKittyPhase) {
        val count = uiState.selectedDiscardIds.size
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            if (prefs.handedness == Handedness.LEFT) {
                Button(
                    onClick = onConfirmDiscards,
                    enabled = count == 6,
                    modifier = Modifier.testTag("confirm_kitty_discards_button")
                ) {
                    Text("Lay Down 6 ($count/6)")
                }
                Text("Tap 6 cards to discard", style = MaterialTheme.typography.titleMedium)
            } else {
                Text("Tap 6 cards to discard", style = MaterialTheme.typography.titleMedium)
                Button(
                    onClick = onConfirmDiscards,
                    enabled = count == 6,
                    modifier = Modifier.testTag("confirm_kitty_discards_button")
                ) {
                    Text("Lay Down 6 ($count/6)")
                }
            }
        }
    } else if (isPlayPhase) {
        val selectedCard = view.localHand.firstOrNull { it.id == uiState.selectedCardId }
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            val statusText = if (selectedCard != null) {
                "Preview: ${selectedCard.accessibleDescription}"
            } else if (prefs.twoStepConfirm) {
                "Your lead/play — tap a legal card to preview"
            } else {
                "Your turn — tap a legal card to play"
            }

            if (prefs.handedness == Handedness.LEFT && prefs.twoStepConfirm) {
                Button(
                    onClick = onCommitCard,
                    enabled = selectedCard != null,
                    modifier = Modifier.testTag("commit_play_card_button")
                ) {
                    Text("Play Card")
                }
                Spacer(Modifier.width(8.dp))
                Text(statusText, style = MaterialTheme.typography.labelLarge, modifier = Modifier.weight(1f))
            } else {
                Text(statusText, style = MaterialTheme.typography.labelLarge, modifier = Modifier.weight(1f))
                if (prefs.twoStepConfirm) {
                    Spacer(Modifier.width(8.dp))
                    Button(
                        onClick = onCommitCard,
                        enabled = selectedCard != null,
                        modifier = Modifier.testTag("commit_play_card_button")
                    ) {
                        Text("Play Card")
                    }
                }
            }
        }
    } else {
        Text(
            text = when (view.phase) {
                TablePhase.PLAYING_TRICK -> "Waiting for ${uiState.seatNames[view.currentTurn]} to play..."
                TablePhase.TRICK_COMPLETE -> "Book complete..."
                else -> "Your Hand (${view.localHand.size} cards)"
            },
            style = MaterialTheme.typography.labelLarge,
            color = MaterialTheme.colorScheme.onSurfaceVariant
        )
    }

    // Scrollable Card Hand Row (accommodates up to 18 cards + extra card scale cleanly)
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .horizontalScroll(rememberScrollState())
            .padding(top = 14.dp, bottom = 4.dp),
        horizontalArrangement = Arrangement.spacedBy(6.dp)
    ) {
        view.localHand.forEach { card ->
            val isSelected = if (isKittyPhase) {
                card.id in uiState.selectedDiscardIds
            } else {
                card.id == uiState.selectedCardId
            }
            val isLegal = when {
                isKittyPhase -> true
                isPlayPhase -> card.id in view.legalPlayCardIds
                else -> true
            }
            val isTrump = view.contract?.trumpSuit != null &&
                (card.isJoker || card.suit == view.contract.trumpSuit)

            PlayingCardView(
                card = card,
                cardScale = prefs.cardScale,
                highContrastSuits = prefs.highContrastSuits,
                isSelected = isSelected,
                isLegal = isLegal,
                isFromKitty = card.id in view.kittyCardIdsInHand,
                isTrump = isTrump,
                reducedMotion = prefs.reducedMotion,
                onClick = if (isKittyPhase || isPlayPhase) {
                    { onCardTap(card.id) }
                } else null
            )
        }
    }
}
