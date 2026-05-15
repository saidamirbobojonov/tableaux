package com.example.waiter

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Logout
import androidx.compose.material.icons.outlined.MenuBook
import androidx.compose.material.icons.outlined.ReceiptLong
import androidx.compose.material.icons.outlined.TableRestaurant
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.viewmodel.compose.viewModel
import com.example.waiter.ui.screen.*
import com.example.waiter.ui.theme.*
import com.example.waiter.viewmodel.*

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            WaiterTheme {
                AppRoot()
            }
        }
    }
}

@Composable
fun AppRoot() {
    val app = LocalContext.current.applicationContext as WaiterApplication
    val authViewModel: AuthViewModel = viewModel(factory = AuthViewModelFactory(app.sessionManager))
    val authState by authViewModel.authState.collectAsState()

    when (val state = authState) {
        is AuthState.Loading -> {
            Box(modifier = Modifier.fillMaxSize().background(OliveSurface), contentAlignment = Alignment.Center) {
                CircularProgressIndicator(color = OlivePrimary)
            }
        }
        is AuthState.Unauthenticated -> {
            LoginScreen(viewModel = authViewModel)
        }
        is AuthState.BranchSelection -> {
            BranchPickerScreen(branches = state.branches, viewModel = authViewModel)
        }
        is AuthState.Authenticated -> {
            val waiterViewModel: WaiterViewModel = viewModel(
                key = state.branchId,
                factory = WaiterViewModelFactory(state.branchId, state.branchName)
            )
            WaiterApp(
                branchName = state.branchName,
                waiterViewModel = waiterViewModel,
                onLogout = authViewModel::logout
            )
        }
    }
}

enum class NavTab(val label: String, val icon: ImageVector) {
    MENU("MENU", Icons.Outlined.MenuBook),
    ORDERS("ORDERS", Icons.Outlined.ReceiptLong),
    TABLES("TABLES", Icons.Outlined.TableRestaurant)
}

@Composable
fun WaiterApp(
    branchName: String,
    waiterViewModel: WaiterViewModel,
    onLogout: () -> Unit
) {
    var currentTab by remember { mutableStateOf(NavTab.MENU) }
    val cart by waiterViewModel.cart.collectAsState()
    val selectedTable by waiterViewModel.selectedTable.collectAsState()

    // Handle one-shot events (order sent, error)
    var eventMessage by remember { mutableStateOf<String?>(null) }
    var showSuccessDialog by remember { mutableStateOf(false) }
    var successMessage by remember { mutableStateOf("") }

    LaunchedEffect(Unit) {
        waiterViewModel.event.collect { event ->
            when (event) {
                is WaiterEvent.OrderSent -> {
                    successMessage = "Order sent to kitchen!" +
                        (if (!event.order.tableNumber.isNullOrBlank()) " (Table ${event.order.tableNumber})" else "")
                    showSuccessDialog = true
                }
                is WaiterEvent.Error -> {
                    eventMessage = event.message
                }
            }
        }
    }

    Scaffold(
        containerColor = OliveSurface,
        topBar = {
            WaiterTopBar(
                branchName = branchName,
                tableNumber = selectedTable?.number,
                cartCount = cart.sumOf { it.quantity },
                onLogout = onLogout
            )
        },
        bottomBar = {
            WaiterBottomNav(currentTab = currentTab, onTabSelected = { currentTab = it })
        }
    ) { innerPadding ->
        Box(modifier = Modifier.padding(innerPadding).fillMaxSize()) {
            when (currentTab) {
                NavTab.MENU -> MenuScreen(viewModel = waiterViewModel)
                NavTab.ORDERS -> OrdersScreen(viewModel = waiterViewModel)
                NavTab.TABLES -> TablesScreen(viewModel = waiterViewModel)
            }
        }
    }

    // Error snackbar
    if (eventMessage != null) {
        AlertDialog(
            onDismissRequest = { eventMessage = null },
            containerColor = OliveSurfaceContainerLowest,
            title = { Text("Error", fontWeight = FontWeight.Bold, color = OliveError) },
            text = { Text(eventMessage!!, color = OliveOnSurface, fontSize = 13.sp) },
            confirmButton = {
                TextButton(onClick = { eventMessage = null }) {
                    Text("OK", color = OlivePrimary, fontWeight = FontWeight.Bold)
                }
            }
        )
    }

    // Success dialog
    if (showSuccessDialog) {
        AlertDialog(
            onDismissRequest = { showSuccessDialog = false },
            containerColor = OliveSurfaceContainerLowest,
            title = { Text("Order Sent!", fontWeight = FontWeight.Bold, color = OliveSecondary) },
            text = { Text(successMessage, color = OliveOnSurfaceVariant, fontSize = 13.sp) },
            confirmButton = {
                TextButton(onClick = {
                    showSuccessDialog = false
                    currentTab = NavTab.ORDERS
                }) {
                    Text("VIEW ORDERS", fontWeight = FontWeight.Bold, color = OlivePrimary, letterSpacing = 1.sp)
                }
            },
            dismissButton = {
                TextButton(onClick = { showSuccessDialog = false }) {
                    Text("CLOSE", color = OliveOnSurfaceVariant, letterSpacing = 1.sp)
                }
            }
        )
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun WaiterTopBar(
    branchName: String,
    tableNumber: String?,
    cartCount: Int,
    onLogout: () -> Unit
) {
    TopAppBar(
        colors = TopAppBarDefaults.topAppBarColors(containerColor = OliveSurface),
        title = {
            Column {
                Text(
                    text = if (!tableNumber.isNullOrBlank()) "TABLE $tableNumber" else branchName.uppercase(),
                    fontWeight = FontWeight.Black,
                    fontSize = 13.sp,
                    letterSpacing = 2.sp,
                    color = OliveSecondary
                )
                if (!tableNumber.isNullOrBlank()) {
                    Text(
                        text = branchName,
                        fontSize = 10.sp,
                        color = OliveOnSurfaceVariant,
                        letterSpacing = 0.5.sp
                    )
                }
            }
        },
        navigationIcon = {
            Box(modifier = Modifier.padding(start = 8.dp)) {
                IconButton(onClick = {}) {
                    Icon(imageVector = Icons.Outlined.GridView, contentDescription = null, tint = OlivePrimary)
                }
                if (cartCount > 0) {
                    Box(
                        modifier = Modifier
                            .size(16.dp)
                            .align(Alignment.TopEnd)
                            .offset(x = (-2).dp, y = 2.dp)
                            .background(OliveTertiary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(text = "$cartCount", fontSize = 8.sp, fontWeight = FontWeight.Black, color = Color.White)
                    }
                }
            }
        },
        actions = {
            IconButton(onClick = onLogout) {
                Icon(imageVector = Icons.Outlined.Logout, contentDescription = "Logout", tint = OliveOnSurfaceVariant)
            }
        }
    )
}

@Composable
fun WaiterBottomNav(currentTab: NavTab, onTabSelected: (NavTab) -> Unit) {
    val dividerColor = OliveOutline
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .drawBehind {
                drawLine(
                    color = dividerColor,
                    start = Offset(0f, 0f),
                    end = Offset(size.width, 0f),
                    strokeWidth = 1.dp.toPx()
                )
            }
    ) {
        NavigationBar(containerColor = OliveSurface, tonalElevation = 0.dp) {
            NavTab.entries.forEach { tab ->
                val selected = tab == currentTab
                NavigationBarItem(
                    selected = selected,
                    onClick = { onTabSelected(tab) },
                    icon = {
                        Icon(imageVector = tab.icon, contentDescription = tab.label, modifier = Modifier.size(22.dp))
                    },
                    label = {
                        Text(text = tab.label, fontSize = 9.sp, fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                    },
                    colors = NavigationBarItemDefaults.colors(
                        selectedIconColor = OlivePrimary,
                        selectedTextColor = OlivePrimary,
                        unselectedIconColor = OliveOnSurfaceVariant.copy(alpha = 0.5f),
                        unselectedTextColor = OliveOnSurfaceVariant.copy(alpha = 0.5f),
                        indicatorColor = Color.Transparent
                    )
                )
            }
        }
    }
}
