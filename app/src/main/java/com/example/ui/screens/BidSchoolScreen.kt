package com.example.ui.screens

import androidx.compose.foundation.Image
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
import androidx.compose.material.icons.filled.CheckCircle
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.Button
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.ExperimentalMaterial3Api
import androidx.compose.material3.FilterChip
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.material3.TopAppBar
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import com.example.R
import com.example.data.CardScale
import com.example.data.TablePreferences
import com.example.engine.BidDirection
import com.example.engine.Card
import com.example.engine.Rank
import com.example.engine.Suit
import com.example.ui.components.PlayingCardView

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun BidSchoolScreen(
    prefs: TablePreferences,
    onBack: () -> Unit,
    onCompleteAndPlayGuidedHand: () -> Unit,
    contentPadding: PaddingValues
) {
    var lessonIndex by remember { mutableIntStateOf(0) }
    var bookStep by remember { mutableIntStateOf(1) }
    var rankDirection by remember { mutableStateOf(BidDirection.DOWNTOWN) }
    var bidPracticeAnswer by remember { mutableStateOf<String?>(null) }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Bid School") },
                navigationIcon = {
                    IconButton(onClick = onBack, modifier = Modifier.testTag("bid_school_back_button")) {
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
                Image(
                    painter = painterResource(id = R.drawable.img_bid_school_banner),
                    contentDescription = stringResource(id = R.string.cd_bid_school_banner),
                    contentScale = ContentScale.Crop,
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(150.dp)
                        .clip(RoundedCornerShape(18.dp))
                )

                // Lesson selector pills
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.spacedBy(8.dp)
                ) {
                    listOf("1. Book", "2. Ranks", "3. Bid", "4. Table").forEachIndexed { idx, label ->
                        FilterChip(
                            selected = lessonIndex == idx,
                            onClick = { lessonIndex = idx },
                            label = { Text(label) },
                            modifier = Modifier
                                .weight(1f)
                                .testTag("bid_school_tab_$idx")
                        )
                    }
                }

                when (lessonIndex) {
                    0 -> LessonWatchBook(
                        bookStep = bookStep,
                        prefs = prefs,
                        onNextStep = { bookStep = if (bookStep < 4) bookStep + 1 else 1 },
                        onContinue = { lessonIndex = 1 }
                    )
                    1 -> LessonUptownDowntown(
                        direction = rankDirection,
                        prefs = prefs,
                        onDirectionChange = { rankDirection = it },
                        onContinue = { lessonIndex = 2 }
                    )
                    2 -> LessonPracticeBid(
                        selectedAnswer = bidPracticeAnswer,
                        prefs = prefs,
                        onSelectAnswer = { bidPracticeAnswer = it },
                        onContinue = { lessonIndex = 3 }
                    )
                    else -> LessonGuidedPlay(
                        onLaunchGuidedHand = onCompleteAndPlayGuidedHand
                    )
                }

                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun LessonWatchBook(
    bookStep: Int,
    prefs: TablePreferences,
    onNextStep: () -> Unit,
    onContinue: () -> Unit
) {
    val demoPlays = listOf(
        "West leads King of Hearts (♥K)" to Card("w_hk", Suit.HEARTS, Rank.KING),
        "North follows with 4 of Hearts (♥4)" to Card("n_h4", Suit.HEARTS, Rank.FOUR),
        "East is void in Hearts and cuts with 2 of Spades (♠2 Trump!)" to Card("e_s2", Suit.SPADES, Rank.TWO),
        "South must follow ♥ if held — plays Ace of Hearts (♥A), but East's trump wins the book!" to Card("s_ha", Suit.HEARTS, Rank.ACE)
    )

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Lesson 1: Watch a Book (Trick)", style = MaterialTheme.typography.titleLarge)
            Text(
                "Trump is ♠ Spades (Uptown). Each player plays one card clockwise. You must follow the led suit if you hold it.",
                style = MaterialTheme.typography.bodyMedium
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp, Alignment.CenterHorizontally)
            ) {
                demoPlays.take(bookStep).forEach { (_, card) ->
                    PlayingCardView(
                        card = card,
                        cardScale = CardScale.STANDARD,
                        highContrastSuits = prefs.highContrastSuits,
                        isTrump = card.suit == Suit.SPADES
                    )
                }
            }

            Text(
                text = demoPlays[bookStep - 1].first,
                style = MaterialTheme.typography.bodyLarge,
                color = MaterialTheme.colorScheme.primary,
                fontWeight = FontWeight.Medium
            )

            Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedButton(
                    onClick = onNextStep,
                    modifier = Modifier.testTag("lesson_step_button")
                ) {
                    Text(if (bookStep < 4) "Play Next Card ($bookStep/4)" else "Replay Trick")
                }
                Button(onClick = onContinue, modifier = Modifier.testTag("lesson_next_1")) {
                    Text("Next Lesson")
                }
            }
        }
    }
}

@Composable
private fun LessonUptownDowntown(
    direction: BidDirection,
    prefs: TablePreferences,
    onDirectionChange: (BidDirection) -> Unit,
    onContinue: () -> Unit
) {
    val sampleCards = if (direction == BidDirection.UPTOWN) {
        listOf(
            Card("d_bj", null, Rank.BIG_JOKER),
            Card("d_lj", null, Rank.LITTLE_JOKER),
            Card("d_sa", Suit.SPADES, Rank.ACE),
            Card("d_sk", Suit.SPADES, Rank.KING),
            Card("d_s2", Suit.SPADES, Rank.TWO)
        )
    } else {
        listOf(
            Card("d_bj", null, Rank.BIG_JOKER),
            Card("d_lj", null, Rank.LITTLE_JOKER),
            Card("d_sa", Suit.SPADES, Rank.ACE),
            Card("d_s2", Suit.SPADES, Rank.TWO),
            Card("d_sk", Suit.SPADES, Rank.KING)
        )
    }

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Lesson 2: Uptown, Downtown & Jokers", style = MaterialTheme.typography.titleLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                BidDirection.entries.forEach { dir ->
                    FilterChip(
                        selected = direction == dir,
                        onClick = { onDirectionChange(dir) },
                        label = { Text(dir.label) }
                    )
                }
            }
            Text(
                text = if (direction == BidDirection.UPTOWN) {
                    "Uptown (High): Big Joker > Little Joker > Ace > King > Queen ... down to 2 (weakest)."
                } else {
                    "Downtown (Low): Jokers stay highest, Ace stays top pip, then 2 beats 3 beats 4 ... down to King (weakest)!"
                },
                style = MaterialTheme.typography.bodyMedium
            )
            Text(
                text = "Order shown strongest (left) to weakest (right) when ♠ Spades is trump:",
                style = MaterialTheme.typography.labelMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(6.dp, Alignment.CenterHorizontally)
            ) {
                sampleCards.forEach { card ->
                    PlayingCardView(
                        card = card,
                        cardScale = CardScale.STANDARD,
                        highContrastSuits = prefs.highContrastSuits,
                        isTrump = true
                    )
                }
            }

            Text(
                text = "In No-Trump: Jokers have no suit and cannot win any trick — discard them in the Kitty or slough them when void.",
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.onSurfaceVariant
            )

            Button(onClick = onContinue, modifier = Modifier.testTag("lesson_next_2")) {
                Text("Next: Practice a Bid")
            }
        }
    }
}

@Composable
private fun LessonPracticeBid(
    selectedAnswer: String?,
    prefs: TablePreferences,
    onSelectAnswer: (String) -> Unit,
    onContinue: () -> Unit
) {
    val sampleHand = listOf(
        Card("p_bj", null, Rank.BIG_JOKER),
        Card("p_sa", Suit.SPADES, Rank.ACE),
        Card("p_sk", Suit.SPADES, Rank.KING),
        Card("p_sq", Suit.SPADES, Rank.QUEEN),
        Card("p_s9", Suit.SPADES, Rank.NINE),
        Card("p_ha", Suit.HEARTS, Rank.ACE)
    )

    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Text("Lesson 3: Practice a Bid & Kitty", style = MaterialTheme.typography.titleLarge)
            Text(
                "You hold Big Joker, ♠A-K-Q-9, ♥A, plus 6 mixed low cards. Remember: winning the bid also gives your team the 6-card Kitty (1 guaranteed book + 6 swaps).",
                style = MaterialTheme.typography.bodyMedium
            )
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(4.dp, Alignment.CenterHorizontally)
            ) {
                sampleHand.forEach { card ->
                    PlayingCardView(
                        card = card,
                        cardScale = CardScale.STANDARD,
                        highContrastSuits = prefs.highContrastSuits
                    )
                }
            }
            Text("What is the sound parlor bid?", style = MaterialTheme.typography.labelLarge)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                FilterChip(
                    selected = selectedAnswer == "PASS",
                    onClick = { onSelectAnswer("PASS") },
                    label = { Text("Pass") }
                )
                FilterChip(
                    selected = selectedAnswer == "5_UP",
                    onClick = { onSelectAnswer("5_UP") },
                    label = { Text("5 Uptown (♠)") }
                )
                FilterChip(
                    selected = selectedAnswer == "7_DOWN",
                    onClick = { onSelectAnswer("7_DOWN") },
                    label = { Text("7 Downtown") }
                )
            }
            when (selectedAnswer) {
                "5_UP" -> Text(
                    "Spot on! With 5 top Spades, Big Joker, ♥A, and the Kitty book, 11 tricks (a 5 bid) is strong and disciplined.",
                    color = MaterialTheme.colorScheme.primary,
                    style = MaterialTheme.typography.bodyMedium
                )
                "PASS" -> Text(
                    "Too cautious — Big Joker + ♠A-K-Q + ♥A + the Kitty is well worth a 4 or 5 Uptown bid.",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium
                )
                "7_DOWN" -> Text(
                    "Too risky! Your cards are high cards (A-K-Q), not Downtown 2-3-4s, and a 7 Boston leaves zero margin.",
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodyMedium
                )
            }
            Button(onClick = onContinue, modifier = Modifier.testTag("lesson_next_3")) {
                Text("Final Step: Guided Hand")
            }
        }
    }
}

@Composable
private fun LessonGuidedPlay(
    onLaunchGuidedHand: () -> Unit
) {
    Card(
        shape = RoundedCornerShape(18.dp),
        colors = CardDefaults.cardColors(containerColor = MaterialTheme.colorScheme.surface)
    ) {
        Column(
            modifier = Modifier.padding(18.dp),
            verticalArrangement = Arrangement.spacedBy(12.dp)
        ) {
            Row(
                verticalAlignment = Alignment.CenterVertically,
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                Icon(
                    imageVector = Icons.Filled.CheckCircle,
                    contentDescription = null,
                    tint = MaterialTheme.colorScheme.primary
                )
                Text("Lesson 4: Ready for the Long Table", style = MaterialTheme.typography.titleLarge)
            }
            Text(
                "You'll sit South with Ms. Evelyn as your partner. The AI Dealer will display legal-play reminders and gentle hints at the top of the table — and you can turn hints off anytime in Comfort & Access.",
                style = MaterialTheme.typography.bodyMedium
            )
            Button(
                onClick = onLaunchGuidedHand,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(52.dp)
                    .testTag("launch_guided_hand_button")
            ) {
                Icon(imageVector = Icons.Filled.PlayArrow, contentDescription = null)
                Text("  Play Guided Hand Now")
            }
        }
    }
}
