package com.example.waiter.ui.screen

import androidx.compose.animation.animateColorAsState
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.waiter.network.OrderResponse
import com.example.waiter.ui.theme.*
import com.example.waiter.viewmodel.UiState
import com.example.waiter.viewmodel.WaiterViewModel

private val ALL_STATUSES = listOf("ALL", "PENDING", "PREPARING", "READY")

@Composable
fun OrdersScreen(viewModel: WaiterViewModel) {
    val ordersState by viewModel.orders.collectAsState()
    var statusFilter by remember { mutableStateOf("ALL") }

    Column(modifier = Modifier.fillMaxSize()) {

        // Header
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 16.dp, vertical = 12.dp),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Column {
                Text("ACTIVE ORDERS", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = OliveSecondary, letterSpacing = 1.sp)
                val count = (ordersState as? UiState.Success)?.data?.size ?: 0
                Text("$count order${if (count != 1) "s" else ""} in progress", fontSize = 10.sp, color = OliveOnSurfaceVariant)
            }
            IconButton(onClick = viewModel::loadOrders) {
                Icon(Icons.Outlined.Refresh, contentDescription = "Refresh", tint = OlivePrimary)
            }
        }

        // Status filter pills
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 16.dp, vertical = 4.dp)
        ) {
            items(ALL_STATUSES) { status ->
                val selected = status == statusFilter
                FilterChip(
                    selected = selected,
                    onClick = { statusFilter = status },
                    label = {
                        Text(status, fontWeight = FontWeight.Bold, fontSize = 10.sp, letterSpacing = 0.5.sp)
                    },
                    colors = FilterChipDefaults.filterChipColors(
                        selectedContainerColor = statusChipColor(status),
                        selectedLabelColor = Color.White,
                        containerColor = OliveSurfaceContainerLow,
                        labelColor = OliveOnSurfaceVariant
                    ),
                    border = FilterChipDefaults.filterChipBorder(
                        enabled = true,
                        selected = selected,
                        borderColor = OliveOutline,
                        selectedBorderColor = statusChipColor(status)
                    ),
                    shape = RoundedCornerShape(8.dp)
                )
            }
        }

        HorizontalDivider(color = OliveOutline, modifier = Modifier.padding(top = 8.dp))

        when (val state = ordersState) {
            is UiState.Loading -> FullScreenLoading()
            is UiState.Error -> FullScreenError(state.message, onRetry = viewModel::loadOrders)
            is UiState.Empty -> FullScreenEmpty("No active orders")
            is UiState.Success -> {
                val filtered = if (statusFilter == "ALL") state.data
                else state.data.filter { it.status == statusFilter }

                if (filtered.isEmpty()) {
                    FullScreenEmpty("No $statusFilter orders")
                } else {
                    LazyColumn(
                        modifier = Modifier.fillMaxSize(),
                        contentPadding = PaddingValues(16.dp),
                        verticalArrangement = Arrangement.spacedBy(12.dp)
                    ) {
                        items(filtered, key = { it.id }) { order ->
                            OrderCard(order = order, onMarkServed = { viewModel.markAsServed(order.id) })
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun OrderCard(order: OrderResponse, onMarkServed: () -> Unit) {
    val statusColor = statusChipColor(order.status)
    val tableLabel = when {
        !order.tableNumber.isNullOrBlank() -> "Table ${order.tableNumber}"
        order.orderType == "TAKEAWAY" -> "Takeaway"
        order.orderType == "DELIVERY" -> "Delivery"
        else -> "Walk-in"
    }

    Card(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = OliveSurfaceContainerLowest),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column {
            // Status indicator bar
            val barColor by animateColorAsState(statusColor, label = "bar")
            Box(modifier = Modifier.fillMaxWidth().height(3.dp).background(barColor))

            // Header
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(tableLabel.uppercase(), fontWeight = FontWeight.Bold, fontSize = 14.sp, color = OliveSecondary, letterSpacing = 1.sp)
                    Text(formatTime(order.createdAt), fontSize = 10.sp, color = OliveOnSurfaceVariant)
                }
                Row(
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Surface(color = statusColor.copy(alpha = 0.12f), shape = RoundedCornerShape(6.dp)) {
                        Text(
                            text = order.status,
                            modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                            fontWeight = FontWeight.Bold,
                            fontSize = 10.sp,
                            color = statusColor,
                            letterSpacing = 1.sp
                        )
                    }
                }
            }

            HorizontalDivider(color = OliveOutline)

            // Order notes
            if (!order.notes.isNullOrBlank()) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .background(OlivePrimaryFixed.copy(alpha = 0.3f))
                        .padding(horizontal = 16.dp, vertical = 8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Icon(Icons.Outlined.StickyNote2, null, tint = OlivePrimary, modifier = Modifier.size(16.dp))
                    Text(order.notes, fontSize = 12.sp, color = OliveSecondary, fontStyle = FontStyle.Italic)
                }
                HorizontalDivider(color = OliveOutline)
            }

            // Items
            Column(modifier = Modifier.padding(16.dp)) {
                order.itemsDetails.forEachIndexed { idx, item ->
                    Column(modifier = Modifier.fillMaxWidth()) {
                        Row(
                            modifier = Modifier.fillMaxWidth(),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.Top
                        ) {
                            Column(modifier = Modifier.weight(1f)) {
                                Text(
                                    text = "${item.quantity}×  ${item.name}${if (item.variant != null) " (${item.variant})" else ""}",
                                    fontSize = 13.sp,
                                    fontWeight = FontWeight.Medium,
                                    color = OliveOnSurface
                                )
                                // Modifiers
                                if (item.modifiers.isNotEmpty()) {
                                    Text(
                                        text = item.modifiers.mapNotNull { it["name"] }.joinToString(", "),
                                        fontSize = 11.sp,
                                        color = OlivePrimary,
                                        modifier = Modifier.padding(start = 20.dp)
                                    )
                                }
                                // Per-item notes
                                if (item.notes.isNotBlank()) {
                                    Text(
                                        text = "\"${item.notes}\"",
                                        fontSize = 11.sp,
                                        color = OliveOnSurfaceVariant,
                                        fontStyle = FontStyle.Italic,
                                        modifier = Modifier.padding(start = 20.dp)
                                    )
                                }
                            }
                            Text(item.total, fontSize = 13.sp, fontWeight = FontWeight.Bold, color = OliveOnSurface)
                        }
                        if (idx < order.itemsDetails.lastIndex) {
                            HorizontalDivider(color = OliveOutline.copy(alpha = 0.5f), modifier = Modifier.padding(vertical = 6.dp))
                        }
                    }
                }

                HorizontalDivider(color = OliveOutline, modifier = Modifier.padding(vertical = 10.dp))

                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("TOTAL", fontWeight = FontWeight.Bold, fontSize = 11.sp, color = OliveOnSurfaceVariant, letterSpacing = 1.sp)
                    Text(order.totalAmount, fontWeight = FontWeight.Black, fontSize = 16.sp, color = OliveSecondary)
                }
            }

            // Action buttons
            if (order.status == "READY") {
                HorizontalDivider(color = OliveOutline)
                Row(modifier = Modifier.fillMaxWidth().padding(12.dp)) {
                    Button(
                        onClick = onMarkServed,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = OlivePrimary),
                        shape = RoundedCornerShape(10.dp)
                    ) {
                        Icon(Icons.Outlined.CheckCircle, null, modifier = Modifier.size(18.dp))
                        Spacer(Modifier.width(8.dp))
                        Text("MARK AS SERVED", fontWeight = FontWeight.Bold, fontSize = 12.sp, letterSpacing = 1.sp)
                    }
                }
            }
        }
    }
}

private fun statusChipColor(status: String) = when (status) {
    "PREPARING" -> OliveTertiary
    "READY" -> OlivePrimary
    "PENDING" -> Color(0xFF6B7280)
    else -> OliveOnSurfaceVariant
}

private fun formatTime(isoString: String): String = try {
    isoString.substringAfter("T").take(5)
} catch (e: Exception) { isoString }
