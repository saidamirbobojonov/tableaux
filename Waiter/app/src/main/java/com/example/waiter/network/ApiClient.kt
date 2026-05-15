package com.example.waiter.network

import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Response
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

/**
 * Holds the current JWT access token.
 * Updated by SessionManager on login/logout.
 */
object TokenProvider {
    @Volatile var accessToken: String = ""
}

private class AuthInterceptor : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = if (TokenProvider.accessToken.isNotEmpty()) {
            chain.request().newBuilder()
                .addHeader("Authorization", "Bearer ${TokenProvider.accessToken}")
                .build()
        } else {
            chain.request()
        }
        return chain.proceed(request)
    }
}

object ApiClient {
    /**
     * Change to your server address:
     *  - Android Emulator  → http://10.0.2.2:8000/
     *  - Physical device   → http://192.168.88.209:8000/  (your PC's LAN IP)
     */
    const val BASE_URL = "http://10.0.2.2:8000/"

    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(AuthInterceptor())
        .addInterceptor(
            HttpLoggingInterceptor().apply {
                level = HttpLoggingInterceptor.Level.BASIC
            }
        )
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()

    val api: ApiService = Retrofit.Builder()
        .baseUrl(BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(ApiService::class.java)
}
