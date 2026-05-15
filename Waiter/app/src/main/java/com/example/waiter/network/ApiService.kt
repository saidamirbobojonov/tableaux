package com.example.waiter.network

import retrofit2.http.*

interface ApiService {

    // ── Auth ──────────────────────────────────────────────────────────────────

    @POST("api/v1/auth/token/")
    suspend fun login(@Body request: LoginRequest): TokenResponse

    @GET("api/v1/auth/me/")
    suspend fun getMe(): MeResponse

    // ── Catalog ───────────────────────────────────────────────────────────────

    /** Public endpoint — no auth required, but auth interceptor won't hurt. */
    @GET("api/v1/catalog/branches/{branchId}/menu/")
    suspend fun getMenu(@Path("branchId") branchId: String): PaginatedResponse<CategoryResponse>

    // ── Tables ────────────────────────────────────────────────────────────────

    @GET("api/v1/auth/branches/{branchId}/tables/")
    suspend fun getTables(@Path("branchId") branchId: String): List<TableResponse>

    // ── Orders ────────────────────────────────────────────────────────────────

    @GET("api/v1/orders/")
    suspend fun getOrders(
        @Query("branch_id") branchId: String,
        @Query("status") status: String? = null
    ): PaginatedResponse<OrderResponse>

    @POST("api/v1/orders/")
    suspend fun createOrder(@Body request: CreateOrderRequest): OrderResponse

    @PATCH("api/v1/orders/{orderId}/")
    suspend fun updateOrderStatus(
        @Path("orderId") orderId: String,
        @Body body: Map<String, String>
    ): OrderResponse
}
