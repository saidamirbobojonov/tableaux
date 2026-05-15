package com.example.waiter.ui.screen

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.GridView
import androidx.compose.material.icons.outlined.Map
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.example.waiter.network.TableResponse
import com.example.waiter.ui.theme.*
import com.example.waiter.viewmodel.UiState
import com.example.waiter.viewmodel.WaiterViewModel

@Composable
fun TablesScreen(viewModel: WaiterViewModel) {
    val tablesState by viewModel.tables.collectAsState()
    val selectedTable by viewModel.selectedTable.collectAsState()
    var showFloorPlan by remember { mutableStateOf(true) }

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
                Text("FLOOR PLAN", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = OliveSecondary, letterSpacing = 1.sp)
                Text(
                    if (selectedTable != null) "Active: Table ${selectedTable!!.number}" else "Tap to select your table",
                    fontSize = 10.sp,
                    color = if (selectedTable != null) OlivePrimary else OliveOnSurfaceVariant
                )
            }
            Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                // Toggle floor plan / grid
                IconButton(onClick = { showFloorPlan = !showFloorPlan }) {
                    Icon(
                        imageVector = if (showFloorPlan) Icons.Outlined.GridView else Icons.Outlined.Map,
                        contentDescription = null,
                        tint = OlivePrimary
                    )
                }
                IconButton(onClick = viewModel::loadTables) {
                    Icon(Icons.Outlined.Refresh, contentDescription = "Refresh", tint = OliveOnSurfaceVariant)
                }
            }
        }

        // Legend
        Row(
            modifier = Modifier.padding(horizontal = 16.dp, vertical = 4.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            LegendChip(color = OlivePrimary, label = "Available")
            LegendChip(color = OliveTertiary, label = "Occupied")
            LegendChip(color = OliveOutlineVariant, label = "Reserved")
        }

        HorizontalDivider(color = OliveOutline, modifier = Modifier.padding(top = 8.dp))

        when (val state = tablesState) {
            is UiState.Loading -> FullScreenLoading()
            is UiState.Error -> FullScreenError(state.message, onRetry = viewModel::loadTables)
            is UiState.Empty -> FullScreenEmpty("No tables configured")
            is UiState.Success -> {
                val tables = state.data
                // Decide: floor plan or grid
                val hasPositions = tables.any { it.posX != 10f || it.posY != 10f }
                if (showFloorPlan && hasPositions) {
                    FloorPlanView(
                        tables = tables,
                        selectedTable = selectedTable,
                        onSelect = viewModel::selectTable
                    )
                } else {
                    TableGrid(
                        tables = tables,
                        selectedTable = selectedTable,
                        onSelect = viewModel::selectTable
                    )
                }
            }
        }
    }
}

// ── Floor plan ────────────────────────────────────────────────────────────────

@Composable
private fun FloorPlanView(
    tables: List<TableResponse>,
    selectedTable: TableResponse?,
    onSelect: (TableResponse) -> Unit
) {
    // Determine canvas bounds (could be wider than tall, or square)
    val maxX = tables.maxOfOrNull { it.posX + it.width } ?: 100f
    val maxY = tables.maxOfOrNull { it.posY + it.height } ?: 100f
    val aspectRatio = (maxX / maxY).coerceIn(0.6f, 2.5f)

    Box(
        modifier = Modifier
            .fillMaxWidth()
            .padding(12.dp)
            .clip(RoundedCornerShape(16.dp))
            .background(OliveSurfaceContainer)
            .border(1.dp, OliveOutline, RoundedCornerShape(16.dp))
            .aspectRatio(aspectRatio)
    ) {
        // Floor grid lines (decorative)
        FloorGrid()

        // Tables overlay using BoxWithConstraints for px conversion
        BoxWithConstraints(modifier = Modifier.fillMaxSize()) {
            val canvasW = maxWidth
            val canvasH = maxHeight

            tables.filter { it.isActive }.forEach { table ->
                val isSelected = table.id == selectedTable?.id
                val xFrac = table.posX / maxX
                val yFrac = table.posY / maxY
                val wFrac = table.width / maxX
                val hFrac = table.height / maxY

                val x = canvasW * xFrac
                val y = canvasH * yFrac
                val w = (canvasW * wFrac).coerceAtLeast(40.dp)
                val h = (canvasH * hFrac).coerceAtLeast(36.dp)

                val tableColor = when {
                    isSelected -> OlivePrimary
                    table.status == "OCCUPIED" -> OliveSurfaceContainerHigh
                    table.status == "RESERVED" -> OliveTertiaryContainer
                    else -> OliveSurfaceContainerLowest
                }
                val borderColor = when {
                    isSelected -> OlivePrimary
                    table.status == "OCCUPIED" -> OliveTertiary.copy(alpha = 0.4f)
                    else -> OliveOutlineVariant
                }
                val statusDotColor = when (table.status) {
                    "AVAILABLE" -> OlivePrimary
                    "OCCUPIED" -> OliveTertiary
                    else -> OliveOnSurfaceVariant
                }

                val tableShape = when (table.shape) {
                    "round" -> CircleShape
                    else -> RoundedCornerShape(8.dp)
                }

                Box(
                    modifier = Modifier
                        .offset(x = x, y = y)
                        .size(width = w, height = h)
                        .background(tableColor, tableShape)
                        .border(
                            width = if (isSelected) 2.dp else 1.dp,
                            color = borderColor,
                            shape = tableShape
                        )
                        .clickable { onSelect(table) },
                    contentAlignment = Alignment.Center
                ) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text(
                            text = table.number,
                            fontWeight = FontWeight.Black,
                            fontSize = 14.sp,
                            color = if (isSelected) Color.White else OliveSecondary
                        )
                        Text(
                            text = "${table.capacity}p",
                            fontSize = 8.sp,
                            color = if (isSelected) Color.White.copy(alpha = 0.8f) else OliveOnSurfaceVariant,
                            letterSpacing = 0.5.sp
                        )
                        Spacer(Modifier.height(2.dp))
                        Box(
                            modifier = Modifier
                                .size(5.dp)
                                .background(
                                    if (isSelected) Color.White else statusDotColor,
                                    CircleShape
                                )
                        )
                    }
                }
            }
        }
    }

    // Stats row
    val occupied = tables.count { it.status == "OCCUPIED" }
    val available = tables.count { it.status == "AVAILABLE" }
    val reserved = tables.count { it.status == "RESERVED" }
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(horizontal = 16.dp, vertical = 8.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp)
    ) {
        StatChip("$available Available", OlivePrimary, Modifier.weight(1f))
        StatChip("$occupied Occupied", OliveTertiary, Modifier.weight(1f))
        StatChip("$reserved Reserved", OliveOnSurfaceVariant, Modifier.weight(1f))
    }
}

@Composable
private fun FloorGrid() {
    // Subtle dot grid background
    androidx.compose.foundation.Canvas(modifier = Modifier.fillMaxSize()) {
        val spacing = 28.dp.toPx()
        val dotRadius = 1.5.dp.toPx()
        val color = androidx.compose.ui.graphics.Color(0xFFcac7b7).copy(alpha = 0.4f)
        var x = spacing
        while (x < size.width) {
            var y = spacing
            while (y < size.height) {
                drawCircle(color, dotRadius, androidx.compose.ui.geometry.Offset(x, y))
                y += spacing
            }
            x += spacing
        }
    }
}

@Composable
private fun StatChip(label: String, color: Color, modifier: Modifier = Modifier) {
    Surface(
        color = color.copy(alpha = 0.1f),
        shape = RoundedCornerShape(8.dp),
        modifier = modifier
    ) {
        Text(
            text = label,
            modifier = Modifier.padding(horizontal = 10.dp, vertical = 6.dp),
            fontWeight = FontWeight.Bold,
            fontSize = 10.sp,
            color = color,
            letterSpacing = 0.5.sp
        )
    }
}

// ── Grid fallback ─────────────────────────────────────────────────────────────

@Composable
private fun TableGrid(
    tables: List<TableResponse>,
    selectedTable: TableResponse?,
    onSelect: (TableResponse) -> Unit
) {
    LazyVerticalGrid(
        columns = GridCells.Fixed(4),
        modifier = Modifier.fillMaxSize().padding(horizontal = 16.dp),
        horizontalArrangement = Arrangement.spacedBy(10.dp),
        verticalArrangement = Arrangement.spacedBy(10.dp),
        contentPadding = PaddingValues(vertical = 12.dp)
    ) {
        items(tables.filter { it.isActive }, key = { it.id }) { table ->
            val isSelected = table.id == selectedTable?.id
            val bgColor = when {
                isSelected -> OlivePrimary
                table.status == "AVAILABLE" -> OliveSurfaceContainerLowest
                table.status == "RESERVED" -> OliveTertiaryContainer
                else -> OliveSurfaceContainerHigh
            }
            val textColor = if (isSelected) Color.White else OliveOnSurface
            val shape = when (table.shape) {
                "round" -> CircleShape
                else -> RoundedCornerShape(10.dp)
            }
            Box(
                modifier = Modifier
                    .aspectRatio(1f)
                    .background(bgColor, shape)
                    .border(if (isSelected) 2.dp else 1.dp, if (isSelected) OlivePrimary else OliveOutline, shape)
                    .clickable { onSelect(table) },
                contentAlignment = Alignment.Center
            ) {
                Column(horizontalAlignment = Alignment.CenterHorizontally) {
                    Text(table.number, fontWeight = FontWeight.Black, fontSize = 16.sp, color = textColor)
                    Text("${table.capacity}p", fontSize = 9.sp, color = textColor.copy(alpha = 0.7f))
                }
            }
        }
    }
}

// ── Shared ────────────────────────────────────────────────────────────────────

@Composable
private fun LegendChip(color: Color, label: String) {
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(5.dp)) {
        Box(
            modifier = Modifier
                .size(10.dp)
                .background(color, CircleShape)
        )
        Text(label, fontSize = 10.sp, color = OliveOnSurfaceVariant)
    }
}
