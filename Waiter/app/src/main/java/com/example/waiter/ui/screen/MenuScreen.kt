package com.example.waiter.ui.screen

import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import coil.compose.AsyncImage
import com.example.waiter.network.*
import com.example.waiter.ui.theme.*
import com.example.waiter.viewmodel.CartItem
import com.example.waiter.viewmodel.UiState
import com.example.waiter.viewmodel.WaiterViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun MenuScreen(viewModel: WaiterViewModel) {
    val categoriesState by viewModel.categories.collectAsState()
    val tablesState by viewModel.tables.collectAsState()
    val cart by viewModel.cart.collectAsState()
    val selectedTable by viewModel.selectedTable.collectAsState()
    val tables = (tablesState as? UiState.Success)?.data ?: emptyList()

    // Item detail bottom sheet state
    var sheetItem by remember { mutableStateOf<MenuItemResponse?>(null) }
    val sheetState = rememberModalBottomSheetState(skipPartiallyExpanded = true)

    // Order notes + send confirmation
    var showSendDialog by remember { mutableStateOf(false) }
    var orderNotes by remember { mutableStateOf("") }

    Box(modifier = Modifier.fillMaxSize()) {
        when (val state = categoriesState) {
            is UiState.Loading -> FullScreenLoading()
            is UiState.Error -> FullScreenError(message = state.message, onRetry = viewModel::loadMenu)
            is UiState.Empty -> FullScreenEmpty("No menu items available")
            is UiState.Success -> MenuContent(
                categories = state.data,
                tables = tables,
                selectedTable = selectedTable,
                cart = cart,
                onSelectTable = viewModel::selectTable,
                onItemTap = { sheetItem = it },
                onIncrementLine = viewModel::incrementCartLine,
                onDecrementLine = viewModel::decrementCartLine,
                onRemoveLine = viewModel::removeCartLine,
                onSendToKitchen = { showSendDialog = true }
            )
        }
    }

    // Item detail bottom sheet
    if (sheetItem != null) {
        ModalBottomSheet(
            onDismissRequest = { sheetItem = null },
            sheetState = sheetState,
            containerColor = OliveSurfaceContainerLowest
        ) {
            ItemDetailSheet(
                item = sheetItem!!,
                onAdd = { qty, note, variantId, modifiers ->
                    viewModel.addToCart(sheetItem!!, qty, note, variantId, modifiers)
                    sheetItem = null
                },
                onDismiss = { sheetItem = null }
            )
        }
    }

    // Send to kitchen confirmation dialog
    if (showSendDialog) {
        AlertDialog(
            onDismissRequest = { showSendDialog = false },
            containerColor = OliveSurfaceContainerLowest,
            title = {
                Text(
                    "Send to Kitchen",
                    fontWeight = FontWeight.Bold,
                    color = OliveSecondary
                )
            },
            text = {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    if (selectedTable != null) {
                        Text(
                            "Table ${selectedTable!!.number} · ${cart.sumOf { it.quantity }} items",
                            fontSize = 13.sp,
                            color = OliveOnSurfaceVariant
                        )
                    }
                    OutlinedTextField(
                        value = orderNotes,
                        onValueChange = { orderNotes = it },
                        label = { Text("Order notes (optional)") },
                        placeholder = { Text("e.g. Allergy info, rush, etc.") },
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(10.dp),
                        colors = OutlinedTextFieldDefaults.colors(
                            focusedBorderColor = OlivePrimary,
                            focusedLabelColor = OlivePrimary,
                            cursorColor = OlivePrimary
                        ),
                        maxLines = 3
                    )
                }
            },
            confirmButton = {
                Button(
                    onClick = {
                        showSendDialog = false
                        viewModel.sendToKitchen(orderNotes)
                        orderNotes = ""
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = OlivePrimary)
                ) {
                    Text("SEND", fontWeight = FontWeight.Bold, letterSpacing = 1.sp)
                }
            },
            dismissButton = {
                TextButton(onClick = { showSendDialog = false }) {
                    Text("Cancel", color = OliveOnSurfaceVariant)
                }
            }
        )
    }
}

// ── Main menu content ─────────────────────────────────────────────────────────

@Composable
private fun MenuContent(
    categories: List<CategoryResponse>,
    tables: List<TableResponse>,
    selectedTable: TableResponse?,
    cart: List<CartItem>,
    onSelectTable: (TableResponse) -> Unit,
    onItemTap: (MenuItemResponse) -> Unit,
    onIncrementLine: (CartItem) -> Unit,
    onDecrementLine: (CartItem) -> Unit,
    onRemoveLine: (CartItem) -> Unit,
    onSendToKitchen: () -> Unit
) {
    var selectedCategoryId by remember(categories) {
        mutableStateOf(categories.firstOrNull()?.id ?: "")
    }
    val filteredItems = remember(selectedCategoryId, categories) {
        categories.firstOrNull { it.id == selectedCategoryId }?.items ?: emptyList()
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(bottom = 24.dp)
    ) {
        // ── Table selector ────────────────────────────────────────────────────
        item {
            TableSelectorBar(
                tables = tables,
                selectedTable = selectedTable,
                onSelect = onSelectTable
            )
        }

        // ── Category tabs ─────────────────────────────────────────────────────
        item {
            LazyRow(
                horizontalArrangement = Arrangement.spacedBy(10.dp),
                contentPadding = PaddingValues(horizontal = 16.dp, vertical = 10.dp)
            ) {
                items(categories) { cat ->
                    val selected = cat.id == selectedCategoryId
                    FilterChip(
                        selected = selected,
                        onClick = { selectedCategoryId = cat.id },
                        label = {
                            Text(
                                text = cat.name.uppercase(),
                                fontWeight = FontWeight.Bold,
                                fontSize = 10.sp,
                                letterSpacing = 1.sp
                            )
                        },
                        colors = FilterChipDefaults.filterChipColors(
                            selectedContainerColor = OlivePrimary,
                            selectedLabelColor = Color.White,
                            containerColor = OliveSurfaceContainerLow,
                            labelColor = OliveOnSurfaceVariant
                        ),
                        border = FilterChipDefaults.filterChipBorder(
                            enabled = true,
                            selected = selected,
                            borderColor = OliveOutline,
                            selectedBorderColor = OlivePrimary
                        ),
                        shape = RoundedCornerShape(12.dp)
                    )
                }
            }
        }

        // ── Menu grid (2 cols) ────────────────────────────────────────────────
        if (filteredItems.isEmpty()) {
            item {
                Box(
                    Modifier.fillMaxWidth().padding(40.dp),
                    contentAlignment = Alignment.Center
                ) {
                    Text("No items in this category", color = OliveOnSurfaceVariant, fontSize = 13.sp)
                }
            }
        } else {
            items(filteredItems.chunked(2)) { row ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    row.forEach { item ->
                        val cartCount = cart.filter { it.menuItem.id == item.id }.sumOf { it.quantity }
                        MenuItemCard(
                            item = item,
                            cartCount = cartCount,
                            modifier = Modifier.weight(1f),
                            onClick = { onItemTap(item) }
                        )
                    }
                    if (row.size == 1) Spacer(Modifier.weight(1f))
                }
                Spacer(Modifier.height(16.dp))
            }
        }

        // ── Order summary ─────────────────────────────────────────────────────
        if (cart.isNotEmpty()) {
            item {
                Spacer(Modifier.height(8.dp))
                OrderSummaryCard(
                    cartItems = cart,
                    selectedTable = selectedTable,
                    onIncrement = onIncrementLine,
                    onDecrement = onDecrementLine,
                    onRemove = onRemoveLine,
                    onSendToKitchen = onSendToKitchen
                )
            }
        }
    }
}

// ── Table selector bar ────────────────────────────────────────────────────────

@Composable
private fun TableSelectorBar(
    tables: List<TableResponse>,
    selectedTable: TableResponse?,
    onSelect: (TableResponse) -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxWidth()
            .background(OliveSurfaceContainerLow)
            .padding(vertical = 10.dp)
    ) {
        Row(
            modifier = Modifier.padding(horizontal = 16.dp),
            verticalAlignment = Alignment.CenterVertically,
            horizontalArrangement = Arrangement.spacedBy(6.dp)
        ) {
            Icon(
                imageVector = Icons.Outlined.TableRestaurant,
                contentDescription = null,
                tint = OlivePrimary,
                modifier = Modifier.size(16.dp)
            )
            Text(
                text = if (selectedTable != null)
                    "TABLE ${selectedTable.number}  ·  ${selectedTable.capacity} seats"
                else
                    "SELECT A TABLE",
                fontWeight = FontWeight.Bold,
                fontSize = 11.sp,
                color = if (selectedTable != null) OliveSecondary else OliveOnSurfaceVariant,
                letterSpacing = 1.sp
            )
        }
        Spacer(Modifier.height(8.dp))
        LazyRow(
            horizontalArrangement = Arrangement.spacedBy(8.dp),
            contentPadding = PaddingValues(horizontal = 16.dp)
        ) {
            items(tables.filter { it.isActive }) { table ->
                val isSelected = table.id == selectedTable?.id
                val statusColor = when (table.status) {
                    "AVAILABLE" -> OlivePrimary
                    "OCCUPIED" -> OliveTertiary
                    else -> OliveOnSurfaceVariant
                }
                Surface(
                    onClick = { onSelect(table) },
                    shape = RoundedCornerShape(10.dp),
                    color = when {
                        isSelected -> OlivePrimary
                        table.status == "OCCUPIED" -> OliveSurfaceContainerHigh
                        table.status == "RESERVED" -> OliveTertiaryContainer.copy(alpha = 0.5f)
                        else -> OliveSurfaceContainerLowest
                    },
                    border = BorderStroke(
                        width = if (isSelected) 2.dp else 1.dp,
                        color = if (isSelected) OlivePrimary else OliveOutline
                    ),
                    tonalElevation = if (isSelected) 0.dp else 0.dp
                ) {
                    Column(
                        modifier = Modifier.padding(horizontal = 14.dp, vertical = 8.dp),
                        horizontalAlignment = Alignment.CenterHorizontally
                    ) {
                        Text(
                            text = table.number,
                            fontWeight = FontWeight.Black,
                            fontSize = 16.sp,
                            color = if (isSelected) Color.White else OliveSecondary
                        )
                        Text(
                            text = "${table.capacity}p",
                            fontSize = 9.sp,
                            color = if (isSelected) Color.White.copy(alpha = 0.8f) else OliveOnSurfaceVariant,
                            letterSpacing = 0.5.sp
                        )
                        Spacer(Modifier.height(4.dp))
                        Box(
                            modifier = Modifier
                                .size(6.dp)
                                .background(
                                    if (isSelected) Color.White else statusColor,
                                    CircleShape
                                )
                        )
                    }
                }
            }
        }
    }
}

// ── Menu item card ────────────────────────────────────────────────────────────

@Composable
private fun MenuItemCard(
    item: MenuItemResponse,
    cartCount: Int,
    modifier: Modifier = Modifier,
    onClick: () -> Unit
) {
    val displayPrice = remember(item.price) {
        val d = item.price.toDoubleOrNull()
        if (d != null && d == d.toLong().toDouble()) "$${d.toLong()}" else "$${item.price}"
    }

    Card(
        modifier = modifier.clickable(onClick = onClick),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = OliveSurfaceContainerLowest),
        elevation = CardDefaults.cardElevation(defaultElevation = 1.dp)
    ) {
        Column {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(130.dp)
                    .background(OliveSurfaceContainer)
            ) {
                if (!item.image.isNullOrBlank()) {
                    AsyncImage(
                        model = item.image,
                        contentDescription = item.name,
                        contentScale = ContentScale.Crop,
                        modifier = Modifier.fillMaxSize()
                    )
                }
                // Cart count badge
                if (cartCount > 0) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.TopEnd)
                            .padding(6.dp)
                            .size(22.dp)
                            .background(OlivePrimary, CircleShape),
                        contentAlignment = Alignment.Center
                    ) {
                        Text(
                            text = "$cartCount",
                            fontSize = 11.sp,
                            fontWeight = FontWeight.Black,
                            color = Color.White
                        )
                    }
                }
                // Modifier indicator
                if (item.modifierGroups.isNotEmpty()) {
                    Box(
                        modifier = Modifier
                            .align(Alignment.BottomStart)
                            .padding(6.dp)
                            .background(OliveSecondary.copy(alpha = 0.75f), RoundedCornerShape(4.dp))
                            .padding(horizontal = 5.dp, vertical = 2.dp)
                    ) {
                        Text(text = "+extras", fontSize = 8.sp, color = Color.White, letterSpacing = 0.5.sp)
                    }
                }
            }
            Column(modifier = Modifier.padding(10.dp)) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.Top
                ) {
                    Text(
                        text = item.name,
                        fontWeight = FontWeight.Bold,
                        fontSize = 12.sp,
                        color = OliveOnSurface,
                        modifier = Modifier.weight(1f),
                        maxLines = 2,
                        lineHeight = 15.sp
                    )
                    Spacer(Modifier.width(4.dp))
                    Text(text = displayPrice, fontWeight = FontWeight.Bold, fontSize = 12.sp, color = OlivePrimary)
                }
                if (!item.description.isNullOrBlank()) {
                    Spacer(Modifier.height(3.dp))
                    Text(
                        text = item.description,
                        fontSize = 10.sp,
                        color = OliveOnSurfaceVariant,
                        lineHeight = 13.sp,
                        maxLines = 2,
                        overflow = TextOverflow.Ellipsis
                    )
                }
                Spacer(Modifier.height(8.dp))
                Button(
                    onClick = onClick,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(
                        containerColor = if (cartCount > 0) OlivePrimary.copy(alpha = 0.12f) else OliveSurfaceContainerLow,
                        contentColor = if (cartCount > 0) OlivePrimary else OliveSecondary
                    ),
                    shape = RoundedCornerShape(8.dp),
                    contentPadding = PaddingValues(vertical = 7.dp),
                    elevation = ButtonDefaults.buttonElevation(0.dp, 0.dp, 0.dp)
                ) {
                    Text(
                        text = if (cartCount > 0) "ADD MORE" else "ADD TO ORDER",
                        fontWeight = FontWeight.Bold,
                        fontSize = 9.sp,
                        letterSpacing = 1.sp
                    )
                }
            }
        }
    }
}

// ── Item detail bottom sheet ──────────────────────────────────────────────────

@Composable
fun ItemDetailSheet(
    item: MenuItemResponse,
    onAdd: (qty: Int, note: String, variantId: String?, modifiers: List<ModifierResponse>) -> Unit,
    onDismiss: () -> Unit
) {
    var quantity by remember { mutableIntStateOf(1) }
    var note by remember { mutableStateOf("") }
    var selectedVariantId by remember { mutableStateOf(item.variants.firstOrNull()?.id) }
    val selectedModifiers = remember { mutableStateListOf<ModifierResponse>() }

    val basePrice = item.price.toDoubleOrNull() ?: 0.0
    val variantExtra = item.variants
        .firstOrNull { it.id == selectedVariantId }
        ?.priceOverride?.toDoubleOrNull() ?: 0.0
    val modExtra = selectedModifiers.sumOf { it.price.toDoubleOrNull() ?: 0.0 }
    val unitPrice = if (item.variants.isEmpty()) basePrice else variantExtra
    val lineTotal = (unitPrice + modExtra) * quantity

    Column(
        modifier = Modifier
            .fillMaxWidth()
            .verticalScroll(rememberScrollState())
            .padding(bottom = 32.dp)
    ) {
        // Item image + header
        if (!item.image.isNullOrBlank()) {
            AsyncImage(
                model = item.image,
                contentDescription = item.name,
                contentScale = ContentScale.Crop,
                modifier = Modifier
                    .fillMaxWidth()
                    .height(200.dp)
                    .background(OliveSurfaceContainer)
            )
        }

        Column(modifier = Modifier.padding(horizontal = 20.dp, vertical = 16.dp)) {
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top
            ) {
                Text(
                    text = item.name,
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp,
                    color = OliveSecondary,
                    modifier = Modifier.weight(1f)
                )
                Text(
                    text = "$${"%.2f".format(lineTotal)}",
                    fontWeight = FontWeight.Black,
                    fontSize = 20.sp,
                    color = OlivePrimary
                )
            }
            if (!item.description.isNullOrBlank()) {
                Spacer(Modifier.height(6.dp))
                Text(text = item.description, fontSize = 13.sp, color = OliveOnSurfaceVariant, lineHeight = 18.sp)
            }
        }

        HorizontalDivider(color = OliveOutline)

        // Variants
        if (item.variants.isNotEmpty()) {
            SectionHeader("SIZE / VARIANT")
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                item.variants.forEach { variant ->
                    val selected = variant.id == selectedVariantId
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .clickable { selectedVariantId = variant.id }
                            .background(if (selected) OlivePrimary.copy(0.08f) else Color.Transparent)
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            RadioButton(
                                selected = selected,
                                onClick = { selectedVariantId = variant.id },
                                colors = RadioButtonDefaults.colors(selectedColor = OlivePrimary)
                            )
                            Text(variant.name, fontWeight = if (selected) FontWeight.Bold else FontWeight.Normal, color = OliveOnSurface, fontSize = 14.sp)
                        }
                        val priceLabel = variant.priceOverride?.let {
                            "$${"%.2f".format(it.toDoubleOrNull() ?: 0.0)}"
                        } ?: "—"
                        Text(priceLabel, fontWeight = FontWeight.Bold, color = OlivePrimary, fontSize = 13.sp)
                    }
                }
            }
            HorizontalDivider(color = OliveOutline, modifier = Modifier.padding(top = 8.dp))
        }

        // Modifier groups
        item.modifierGroups.forEach { group ->
            SectionHeader(
                title = group.name.uppercase(),
                subtitle = if (group.allowMultiple) "Choose any" else "Choose one"
            )
            Column(modifier = Modifier.padding(horizontal = 20.dp)) {
                group.modifiers.forEach { modifier ->
                    val checked = selectedModifiers.contains(modifier)
                    Row(
                        modifier = Modifier
                            .fillMaxWidth()
                            .clip(RoundedCornerShape(8.dp))
                            .clickable {
                                if (checked) {
                                    selectedModifiers.remove(modifier)
                                } else {
                                    if (!group.allowMultiple) {
                                        selectedModifiers.removeAll { m ->
                                            group.modifiers.any { it.id == m.id }
                                        }
                                    }
                                    selectedModifiers.add(modifier)
                                }
                            }
                            .background(if (checked) OlivePrimary.copy(0.08f) else Color.Transparent)
                            .padding(horizontal = 12.dp, vertical = 10.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically
                    ) {
                        Row(
                            verticalAlignment = Alignment.CenterVertically,
                            horizontalArrangement = Arrangement.spacedBy(10.dp)
                        ) {
                            if (group.allowMultiple) {
                                Checkbox(
                                    checked = checked,
                                    onCheckedChange = null,
                                    colors = CheckboxDefaults.colors(checkedColor = OlivePrimary)
                                )
                            } else {
                                RadioButton(
                                    selected = checked,
                                    onClick = null,
                                    colors = RadioButtonDefaults.colors(selectedColor = OlivePrimary)
                                )
                            }
                            Text(
                                modifier.name,
                                fontWeight = if (checked) FontWeight.Bold else FontWeight.Normal,
                                color = OliveOnSurface,
                                fontSize = 14.sp
                            )
                        }
                        val p = modifier.price.toDoubleOrNull() ?: 0.0
                        if (p > 0) {
                            Text(
                                "+$${"%.2f".format(p)}",
                                fontWeight = FontWeight.Bold,
                                color = OlivePrimary,
                                fontSize = 13.sp
                            )
                        }
                    }
                }
            }
            HorizontalDivider(color = OliveOutline, modifier = Modifier.padding(top = 8.dp))
        }

        // Notes for this item
        SectionHeader("SPECIAL REQUESTS")
        OutlinedTextField(
            value = note,
            onValueChange = { note = it },
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            placeholder = { Text("e.g. no onions, well done…", fontSize = 13.sp) },
            shape = RoundedCornerShape(10.dp),
            colors = OutlinedTextFieldDefaults.colors(
                focusedBorderColor = OlivePrimary,
                cursorColor = OlivePrimary
            ),
            maxLines = 2
        )

        Spacer(Modifier.height(20.dp))

        // Quantity + Add button
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .padding(horizontal = 20.dp),
            horizontalArrangement = Arrangement.spacedBy(16.dp),
            verticalAlignment = Alignment.CenterVertically
        ) {
            // Quantity stepper
            Surface(
                shape = RoundedCornerShape(10.dp),
                color = OliveSurfaceContainerLow,
                modifier = Modifier.height(50.dp)
            ) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    IconButton(onClick = { if (quantity > 1) quantity-- }) {
                        Icon(Icons.Outlined.Remove, null, tint = if (quantity > 1) OliveSecondary else OliveOnSurfaceVariant.copy(0.4f))
                    }
                    Text(
                        text = "$quantity",
                        fontWeight = FontWeight.Black,
                        fontSize = 18.sp,
                        color = OliveSecondary,
                        modifier = Modifier.padding(horizontal = 4.dp)
                    )
                    IconButton(onClick = { quantity++ }) {
                        Icon(Icons.Outlined.Add, null, tint = OliveSecondary)
                    }
                }
            }
            // Add to order button
            Button(
                onClick = { onAdd(quantity, note, selectedVariantId, selectedModifiers.toList()) },
                modifier = Modifier.weight(1f).height(50.dp),
                colors = ButtonDefaults.buttonColors(containerColor = OlivePrimary),
                shape = RoundedCornerShape(10.dp)
            ) {
                Text(
                    text = "ADD  $${"%.2f".format(lineTotal)}",
                    fontWeight = FontWeight.Bold,
                    fontSize = 14.sp,
                    letterSpacing = 1.sp
                )
            }
        }
    }
}

@Composable
private fun SectionHeader(title: String, subtitle: String? = null) {
    Row(
        modifier = Modifier
            .fillMaxWidth()
            .padding(start = 20.dp, end = 20.dp, top = 16.dp, bottom = 8.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween
    ) {
        Text(title, fontWeight = FontWeight.Bold, fontSize = 11.sp, color = OliveOnSurfaceVariant, letterSpacing = 1.sp)
        if (subtitle != null) Text(subtitle, fontSize = 10.sp, color = OliveOnSurfaceVariant.copy(0.6f))
    }
}

// ── Order summary card ────────────────────────────────────────────────────────

@Composable
fun OrderSummaryCard(
    cartItems: List<CartItem>,
    selectedTable: TableResponse?,
    onIncrement: (CartItem) -> Unit,
    onDecrement: (CartItem) -> Unit,
    onRemove: (CartItem) -> Unit,
    onSendToKitchen: () -> Unit
) {
    val subtotal = cartItems.sumOf { it.lineTotal }
    val totalCount = cartItems.sumOf { it.quantity }

    Card(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 16.dp),
        shape = RoundedCornerShape(12.dp),
        colors = CardDefaults.cardColors(containerColor = OliveSurfaceContainerLowest),
        border = BorderStroke(1.dp, OliveOutline),
        elevation = CardDefaults.cardElevation(1.dp)
    ) {
        Column {
            // Header
            Column(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(OliveSurfaceContainerLow)
                    .padding(16.dp)
            ) {
                Row(
                    modifier = Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Column {
                        Text("ORDER SUMMARY", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = OliveSecondary, letterSpacing = 1.sp)
                        Text("$totalCount ${if (totalCount == 1) "ITEM" else "ITEMS"}", fontSize = 10.sp, color = OliveOnSurfaceVariant, letterSpacing = 1.sp)
                    }
                    if (selectedTable != null) {
                        Surface(color = OlivePrimary.copy(0.1f), shape = RoundedCornerShape(8.dp)) {
                            Text(
                                "TABLE ${selectedTable.number}",
                                modifier = Modifier.padding(horizontal = 10.dp, vertical = 5.dp),
                                fontWeight = FontWeight.Bold,
                                fontSize = 11.sp,
                                color = OlivePrimary,
                                letterSpacing = 1.sp
                            )
                        }
                    }
                }
            }

            HorizontalDivider(color = OliveOutline)

            // Cart lines
            Column(modifier = Modifier.padding(16.dp)) {
                cartItems.forEachIndexed { index, cartItem ->
                    CartLineRow(cartItem, onIncrement, onDecrement, onRemove)
                    if (index < cartItems.lastIndex) {
                        HorizontalDivider(color = OliveOutline.copy(0.5f), modifier = Modifier.padding(vertical = 10.dp))
                    }
                }
            }

            HorizontalDivider(color = OliveOutline)

            // Footer
            Column(
                modifier = Modifier.fillMaxWidth().background(OliveSurfaceContainerLow).padding(16.dp)
            ) {
                Row(modifier = Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                    Text("SUBTOTAL", fontSize = 10.sp, fontWeight = FontWeight.Bold, color = OliveOnSurfaceVariant, letterSpacing = 1.5.sp)
                    Text("$${"%.2f".format(subtotal)}", fontSize = 24.sp, fontWeight = FontWeight.Black, color = OliveSecondary)
                }
                Spacer(Modifier.height(12.dp))
                Button(
                    onClick = onSendToKitchen,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = OlivePrimary, contentColor = Color.White),
                    shape = RoundedCornerShape(12.dp),
                    contentPadding = PaddingValues(vertical = 16.dp),
                    elevation = ButtonDefaults.buttonElevation(4.dp)
                ) {
                    Icon(Icons.Outlined.Send, null, modifier = Modifier.size(18.dp))
                    Spacer(Modifier.width(8.dp))
                    Text("SEND TO KITCHEN", fontWeight = FontWeight.Bold, fontSize = 13.sp, letterSpacing = 2.sp)
                }
            }
        }
    }
}

@Composable
private fun CartLineRow(
    item: CartItem,
    onIncrement: (CartItem) -> Unit,
    onDecrement: (CartItem) -> Unit,
    onRemove: (CartItem) -> Unit
) {
    Column {
        Row(modifier = Modifier.fillMaxWidth(), verticalAlignment = Alignment.Top) {
            // Quantity stepper
            Row(
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier
                    .background(OliveSurfaceContainerLow, RoundedCornerShape(8.dp))
                    .padding(horizontal = 2.dp)
            ) {
                IconButton(onClick = { onDecrement(item) }, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Outlined.Remove, null, modifier = Modifier.size(14.dp), tint = OliveOnSurfaceVariant)
                }
                Text("${item.quantity}", fontWeight = FontWeight.Black, fontSize = 13.sp, color = OliveSecondary, modifier = Modifier.padding(horizontal = 2.dp))
                IconButton(onClick = { onIncrement(item) }, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Outlined.Add, null, modifier = Modifier.size(14.dp), tint = OliveSecondary)
                }
            }
            Spacer(Modifier.width(10.dp))
            Column(modifier = Modifier.weight(1f)) {
                Text(item.menuItem.name, fontWeight = FontWeight.Bold, fontSize = 13.sp, color = OliveSecondary)
                // Variant
                item.variantId?.let { vid ->
                    item.menuItem.variants.firstOrNull { it.id == vid }?.let {
                        Text("↳ ${it.name}", fontSize = 11.sp, color = OliveOnSurfaceVariant)
                    }
                }
                // Modifiers
                if (item.selectedModifiers.isNotEmpty()) {
                    Text(
                        text = item.selectedModifiers.joinToString(" · ") { it.name },
                        fontSize = 10.sp,
                        color = OlivePrimary,
                        fontStyle = FontStyle.Italic
                    )
                }
                // Note
                if (item.note.isNotBlank()) {
                    Text("\"${item.note}\"", fontSize = 10.sp, color = OliveOnSurfaceVariant, fontStyle = FontStyle.Italic)
                }
            }
            Column(horizontalAlignment = Alignment.End) {
                Text("$${"%.2f".format(item.lineTotal)}", fontWeight = FontWeight.Bold, fontSize = 13.sp, color = OliveOnSurface)
                IconButton(onClick = { onRemove(item) }, modifier = Modifier.size(28.dp)) {
                    Icon(Icons.Outlined.Delete, null, modifier = Modifier.size(16.dp), tint = OliveOnSurfaceVariant.copy(0.4f))
                }
            }
        }
    }
}

// ── Shared utilities ──────────────────────────────────────────────────────────

@Composable
fun FullScreenLoading() {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        CircularProgressIndicator(color = OlivePrimary)
    }
}

@Composable
fun FullScreenError(message: String, onRetry: (() -> Unit)? = null) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, modifier = Modifier.padding(32.dp)) {
            Icon(Icons.Outlined.WifiOff, null, tint = OliveOnSurfaceVariant.copy(0.4f), modifier = Modifier.size(48.dp))
            Spacer(Modifier.height(12.dp))
            Text(message, color = OliveOnSurfaceVariant, fontSize = 13.sp, lineHeight = 18.sp)
            if (onRetry != null) {
                Spacer(Modifier.height(12.dp))
                OutlinedButton(onClick = onRetry, colors = ButtonDefaults.outlinedButtonColors(contentColor = OlivePrimary)) {
                    Icon(Icons.Outlined.Refresh, null, modifier = Modifier.size(16.dp))
                    Spacer(Modifier.width(6.dp))
                    Text("Retry", fontWeight = FontWeight.Bold)
                }
            }
        }
    }
}

@Composable
fun FullScreenEmpty(message: String) {
    Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
        Text(text = message, color = OliveOnSurfaceVariant, fontSize = 13.sp)
    }
}
