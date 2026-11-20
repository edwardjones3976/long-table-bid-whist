package com.example

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.PaddingValues
import androidx.compose.foundation.layout.WindowInsets
import androidx.compose.foundation.layout.safeDrawing
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.AccessibilityNew
import androidx.compose.material.icons.filled.Home
import androidx.compose.material.icons.filled.School
import androidx.compose.material.icons.filled.VerifiedUser
import androidx.compose.material3.Icon
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.example.ui.screens.BidSchoolScreen
import com.example.ui.screens.CalibrationScreen
import com.example.ui.screens.HomeScreen
import com.example.ui.screens.LedgerAndManifestScreen
import com.example.ui.screens.TableScreen
import com.example.ui.theme.LongTableTheme
import com.example.ui.viewmodel.MainViewModel
import kotlinx.serialization.Serializable

@Serializable
sealed interface AppRoute {
    @Serializable data object Home : AppRoute
    @Serializable data object Table : AppRoute
    @Serializable data object BidSchool : AppRoute
    @Serializable data object Calibration : AppRoute
    @Serializable data object Ledger : AppRoute
}

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            LongTableTheme {
                LongTableApp()
            }
        }
    }
}

@Composable
fun LongTableApp(
    viewModel: MainViewModel = viewModel()
) {
    val navController = rememberNavController()
    val prefs by viewModel.preferences.collectAsStateWithLifecycle()
    val tableUiState by viewModel.tableState.collectAsStateWithLifecycle()
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route

    val showBottomBar = currentRoute?.contains("Table") != true

    Scaffold(
        contentWindowInsets = WindowInsets.safeDrawing,
        bottomBar = {
            if (showBottomBar) {
                NavigationBar {
                    NavigationBarItem(
                        selected = currentRoute?.contains("Home") == true,
                        onClick = {
                            navController.navigate(AppRoute.Home) {
                                popUpTo(AppRoute.Home) { inclusive = false }
                                launchSingleTop = true
                            }
                        },
                        icon = { Icon(Icons.Filled.Home, contentDescription = null) },
                        label = { Text("Parlor") },
                        modifier = Modifier.testTag("nav_home")
                    )
                    NavigationBarItem(
                        selected = currentRoute?.contains("BidSchool") == true,
                        onClick = {
                            navController.navigate(AppRoute.BidSchool) { launchSingleTop = true }
                        },
                        icon = { Icon(Icons.Filled.School, contentDescription = null) },
                        label = { Text("Bid School") },
                        modifier = Modifier.testTag("nav_bid_school")
                    )
                    NavigationBarItem(
                        selected = currentRoute?.contains("Calibration") == true,
                        onClick = {
                            navController.navigate(AppRoute.Calibration) { launchSingleTop = true }
                        },
                        icon = { Icon(Icons.Filled.AccessibilityNew, contentDescription = null) },
                        label = { Text("Access") },
                        modifier = Modifier.testTag("nav_calibration")
                    )
                    NavigationBarItem(
                        selected = currentRoute?.contains("Ledger") == true,
                        onClick = {
                            navController.navigate(AppRoute.Ledger) { launchSingleTop = true }
                        },
                        icon = { Icon(Icons.Filled.VerifiedUser, contentDescription = null) },
                        label = { Text("Rules") },
                        modifier = Modifier.testTag("nav_ledger")
                    )
                }
            }
        }
    ) { innerPadding ->
        NavHost(
            navController = navController,
            startDestination = AppRoute.Home
        ) {
            composable<AppRoute.Home> {
                HomeScreen(
                    prefs = prefs,
                    hasActiveMatch = tableUiState.seatView != null,
                    onResumeOrStartTable = { startFresh ->
                        if (startFresh || tableUiState.seatView == null) {
                            viewModel.startNewMatch()
                        }
                        navController.navigate(AppRoute.Table)
                    },
                    onOpenBidSchool = { navController.navigate(AppRoute.BidSchool) },
                    onOpenCalibration = { navController.navigate(AppRoute.Calibration) },
                    onOpenLedger = { navController.navigate(AppRoute.Ledger) },
                    onRoleModeChange = viewModel::updateRoleMode,
                    onToneChange = viewModel::updateTableTalkTone,
                    onAcknowledgeManifest = viewModel::acknowledgeManifest,
                    contentPadding = innerPadding
                )
            }
            composable<AppRoute.Table> {
                TableScreen(
                    uiState = tableUiState,
                    prefs = prefs,
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() },
                    onOpenCalibration = { navController.navigate(AppRoute.Calibration) }
                )
            }
            composable<AppRoute.BidSchool> {
                BidSchoolScreen(
                    prefs = prefs,
                    onBack = { navController.popBackStack() },
                    onCompleteAndPlayGuidedHand = {
                        viewModel.markBidSchoolCompleted()
                        viewModel.acknowledgeManifest(true)
                        viewModel.startNewMatch(guidedMode = true)
                        navController.navigate(AppRoute.Table)
                    },
                    contentPadding = PaddingValues()
                )
            }
            composable<AppRoute.Calibration> {
                CalibrationScreen(
                    prefs = prefs,
                    viewModel = viewModel,
                    onBack = { navController.popBackStack() },
                    contentPadding = PaddingValues()
                )
            }
            composable<AppRoute.Ledger> {
                LedgerAndManifestScreen(
                    prefs = prefs,
                    auditEvents = tableUiState.seatView?.auditLog.orEmpty(),
                    onAcknowledgeManifest = viewModel::acknowledgeManifest,
                    onBack = { navController.popBackStack() },
                    contentPadding = PaddingValues()
                )
            }
        }
    }
}
