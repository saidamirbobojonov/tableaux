package com.example.waiter.network

import com.google.gson.annotations.SerializedName

// ── Auth ──────────────────────────────────────────────────────────────────────

data class LoginRequest(val email: String, val password: String)
data class TokenResponse(val access: String, val refresh: String)
data class BranchInfo(val id: String, val name: String)
data class MeResponse(
    val id: String,
    val email: String,
    @SerializedName("first_name") val firstName: String,
    @SerializedName("last_name") val lastName: String,
    val avatar: String?,
    val role: String?,
    val organization: String?,
    @SerializedName("organization_id") val organizationId: String?,
    val branches: List<BranchInfo> = emptyList()
)

// ── Catalog ───────────────────────────────────────────────────────────────────

data class VariantResponse(
    val id: String,
    val name: String,
    @SerializedName("price_override") val priceOverride: String?
)

data class ModifierResponse(
    val id: Int,
    val name: String,
    val price: String
)

data class ModifierGroupResponse(
    val id: Int,
    val name: String,
    @SerializedName("allow_multiple") val allowMultiple: Boolean,
    val modifiers: List<ModifierResponse> = emptyList()
)

data class MenuItemResponse(
    val id: String,
    val name: String,
    val description: String?,
    val image: String?,
    val price: String,
    @SerializedName("base_price") val basePrice: String,
    val slug: String?,
    val variants: List<VariantResponse> = emptyList(),
    @SerializedName("modifier_groups") val modifierGroups: List<ModifierGroupResponse> = emptyList()
)

data class CategoryResponse(
    val id: String,
    val name: String,
    val image: String?,
    val items: List<MenuItemResponse> = emptyList()
)

// ── Tables ────────────────────────────────────────────────────────────────────

data class TableResponse(
    val id: String,
    val number: String,
    val name: String,
    val capacity: Int,
    val status: String,          // AVAILABLE | OCCUPIED | RESERVED
    @SerializedName("is_active") val isActive: Boolean,
    @SerializedName("pos_x") val posX: Float = 10f,
    @SerializedName("pos_y") val posY: Float = 10f,
    val width: Float = 9f,
    val height: Float = 12f,
    val shape: String = "rect"   // rect | round | square
)

// ── Orders ────────────────────────────────────────────────────────────────────

data class OrderItemInput(
    @SerializedName("menu_item_id") val menuItemId: String,
    val quantity: Int,
    val notes: String = "",
    @SerializedName("variant_id") val variantId: String? = null,
    val modifiers: List<Int> = emptyList()
)

data class CreateOrderRequest(
    @SerializedName("branch_id") val branchId: String,
    @SerializedName("table_id") val tableId: String? = null,
    @SerializedName("table_number") val tableNumber: String? = null,
    @SerializedName("order_type") val orderType: String = "DINE_IN",
    val items: List<OrderItemInput>,
    val notes: String = ""
)

data class OrderItemDetail(
    val name: String,
    val variant: String?,
    val quantity: Int,
    val price: String,
    val total: String,
    val notes: String,
    val modifiers: List<Map<String, String>> = emptyList()
)

data class OrderResponse(
    val id: String,
    val status: String,
    @SerializedName("table_number") val tableNumber: String?,
    @SerializedName("table_id") val tableId: String?,
    @SerializedName("total_amount") val totalAmount: String,
    @SerializedName("created_at") val createdAt: String,
    @SerializedName("items_details") val itemsDetails: List<OrderItemDetail> = emptyList(),
    val notes: String?,
    @SerializedName("order_type") val orderType: String,
    val branch: String?
)

data class PaginatedResponse<T>(
    val count: Int,
    val next: String?,
    val previous: String?,
    val results: List<T>
)
