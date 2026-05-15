package com.example.waiter.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.waiter.network.*
import kotlinx.coroutines.flow.*
import kotlinx.coroutines.launch

sealed class UiState<out T> {
    object Loading : UiState<Nothing>()
    object Empty : UiState<Nothing>()
    data class Success<T>(val data: T) : UiState<T>()
    data class Error(val message: String) : UiState<Nothing>()
}

data class CartItem(
    val menuItem: MenuItemResponse,
    val quantity: Int = 1,
    val note: String = "",
    val variantId: String? = null,
    val selectedModifiers: List<ModifierResponse> = emptyList()
) {
    val lineTotal: Double
        get() {
            val base = menuItem.price.toDoubleOrNull() ?: 0.0
            val modTotal = selectedModifiers.sumOf { it.price.toDoubleOrNull() ?: 0.0 }
            return (base + modTotal) * quantity
        }
}

class WaiterViewModel(
    val branchId: String,
    val branchName: String
) : ViewModel() {

    private val _selectedTable = MutableStateFlow<TableResponse?>(null)
    val selectedTable: StateFlow<TableResponse?> = _selectedTable.asStateFlow()

    private val _categories = MutableStateFlow<UiState<List<CategoryResponse>>>(UiState.Loading)
    val categories: StateFlow<UiState<List<CategoryResponse>>> = _categories.asStateFlow()

    private val _tables = MutableStateFlow<UiState<List<TableResponse>>>(UiState.Loading)
    val tables: StateFlow<UiState<List<TableResponse>>> = _tables.asStateFlow()

    private val _orders = MutableStateFlow<UiState<List<OrderResponse>>>(UiState.Loading)
    val orders: StateFlow<UiState<List<OrderResponse>>> = _orders.asStateFlow()

    private val _cart = MutableStateFlow<List<CartItem>>(emptyList())
    val cart: StateFlow<List<CartItem>> = _cart.asStateFlow()

    private val _event = MutableSharedFlow<WaiterEvent>()
    val event: SharedFlow<WaiterEvent> = _event.asSharedFlow()

    init {
        loadMenu()
        loadTables()
        loadOrders()
    }

    // ── Loading ───────────────────────────────────────────────────────────────

    fun loadMenu() {
        viewModelScope.launch {
            _categories.value = UiState.Loading
            try {
                val result = ApiClient.api.getMenu(branchId).results
                _categories.value = if (result.isEmpty()) UiState.Empty else UiState.Success(result)
            } catch (e: Exception) {
                _categories.value = UiState.Error(e.message ?: "Failed to load menu")
            }
        }
    }

    fun loadTables() {
        viewModelScope.launch {
            _tables.value = UiState.Loading
            try {
                val result = ApiClient.api.getTables(branchId)
                _tables.value = if (result.isEmpty()) UiState.Empty else UiState.Success(result)
            } catch (e: Exception) {
                _tables.value = UiState.Error(e.message ?: "Failed to load tables")
            }
        }
    }

    fun loadOrders() {
        viewModelScope.launch {
            _orders.value = UiState.Loading
            try {
                val result = ApiClient.api.getOrders(branchId, "PENDING,PREPARING,READY").results
                _orders.value = if (result.isEmpty()) UiState.Empty else UiState.Success(result)
            } catch (e: Exception) {
                _orders.value = UiState.Error(e.message ?: "Failed to load orders")
            }
        }
    }

    // ── Table ─────────────────────────────────────────────────────────────────

    fun selectTable(table: TableResponse) {
        _selectedTable.value = table
    }

    fun clearTable() {
        _selectedTable.value = null
    }

    // ── Cart ──────────────────────────────────────────────────────────────────

    /** Add item with full configuration from the detail sheet. */
    fun addToCart(
        item: MenuItemResponse,
        quantity: Int = 1,
        note: String = "",
        variantId: String? = null,
        modifiers: List<ModifierResponse> = emptyList()
    ) {
        val modifierIds = modifiers.map { it.id }.sorted()
        val current = _cart.value.toMutableList()
        val idx = current.indexOfFirst {
            it.menuItem.id == item.id &&
            it.variantId == variantId &&
            it.selectedModifiers.map { m -> m.id }.sorted() == modifierIds &&
            it.note == note
        }
        if (idx >= 0) {
            current[idx] = current[idx].copy(quantity = current[idx].quantity + quantity)
        } else {
            current.add(CartItem(item, quantity, note, variantId, modifiers))
        }
        _cart.value = current
    }

    fun removeCartLine(cartItem: CartItem) {
        _cart.value = _cart.value - cartItem
    }

    fun decrementCartLine(cartItem: CartItem) {
        val current = _cart.value.toMutableList()
        val idx = current.indexOf(cartItem)
        if (idx >= 0) {
            if (current[idx].quantity > 1) {
                current[idx] = current[idx].copy(quantity = current[idx].quantity - 1)
            } else {
                current.removeAt(idx)
            }
        }
        _cart.value = current
    }

    fun incrementCartLine(cartItem: CartItem) {
        val current = _cart.value.toMutableList()
        val idx = current.indexOf(cartItem)
        if (idx >= 0) current[idx] = current[idx].copy(quantity = current[idx].quantity + 1)
        _cart.value = current
    }

    fun clearCart() {
        _cart.value = emptyList()
    }

    // ── Send order ────────────────────────────────────────────────────────────

    fun sendToKitchen(orderNotes: String = "") {
        val cartItems = _cart.value
        if (cartItems.isEmpty()) return
        val table = _selectedTable.value

        viewModelScope.launch {
            val request = CreateOrderRequest(
                branchId = branchId,
                tableId = table?.id,
                tableNumber = table?.number,
                notes = orderNotes,
                items = cartItems.map {
                    OrderItemInput(
                        menuItemId = it.menuItem.id,
                        quantity = it.quantity,
                        notes = it.note,
                        variantId = it.variantId,
                        modifiers = it.selectedModifiers.map { m -> m.id }
                    )
                }
            )
            try {
                val order = ApiClient.api.createOrder(request)
                _cart.value = emptyList()
                loadOrders()
                loadTables()
                _event.emit(WaiterEvent.OrderSent(order))
            } catch (e: retrofit2.HttpException) {
                val body = e.response()?.errorBody()?.string() ?: e.message()
                val msg = when {
                    body?.contains("shift") == true -> "No active shift. Ask your manager to open a shift first."
                    body?.contains("unavailable") == true -> "One or more items are unavailable."
                    else -> "Failed to send order:\n$body"
                }
                _event.emit(WaiterEvent.Error(msg))
            } catch (e: Exception) {
                _event.emit(WaiterEvent.Error(e.message ?: "Failed to send order"))
            }
        }
    }

    // ── Mark order as served ──────────────────────────────────────────────────

    fun markAsServed(orderId: String) {
        viewModelScope.launch {
            try {
                ApiClient.api.updateOrderStatus(orderId, mapOf("status" to "DELIVERED"))
                loadOrders()
                loadTables()
            } catch (e: Exception) {
                _event.emit(WaiterEvent.Error("Could not update order: ${e.message}"))
            }
        }
    }
}

sealed class WaiterEvent {
    data class OrderSent(val order: OrderResponse) : WaiterEvent()
    data class Error(val message: String) : WaiterEvent()
}

class WaiterViewModelFactory(
    private val branchId: String,
    private val branchName: String
) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return WaiterViewModel(branchId, branchName) as T
    }
}
