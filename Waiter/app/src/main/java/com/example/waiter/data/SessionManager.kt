package com.example.waiter.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.*
import androidx.datastore.preferences.preferencesDataStore
import com.example.waiter.network.TokenProvider
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "waiter_session")

class SessionManager(private val context: Context) {

    companion object {
        val KEY_ACCESS_TOKEN = stringPreferencesKey("access_token")
        val KEY_REFRESH_TOKEN = stringPreferencesKey("refresh_token")
        val KEY_USER_EMAIL = stringPreferencesKey("user_email")
        val KEY_USER_NAME = stringPreferencesKey("user_full_name")
        val KEY_USER_ROLE = stringPreferencesKey("user_role")
        val KEY_USER_AVATAR = stringPreferencesKey("user_avatar")
        val KEY_BRANCH_ID = stringPreferencesKey("branch_id")
        val KEY_BRANCH_NAME = stringPreferencesKey("branch_name")
        val KEY_ORG_ID = stringPreferencesKey("organization_id")
    }

    val accessToken: Flow<String?> = context.dataStore.data.map { it[KEY_ACCESS_TOKEN] }
    val branchId: Flow<String?> = context.dataStore.data.map { it[KEY_BRANCH_ID] }
    val branchName: Flow<String?> = context.dataStore.data.map { it[KEY_BRANCH_NAME] }
    val userEmail: Flow<String?> = context.dataStore.data.map { it[KEY_USER_EMAIL] }
    val userName: Flow<String?> = context.dataStore.data.map { it[KEY_USER_NAME] }
    val userRole: Flow<String?> = context.dataStore.data.map { it[KEY_USER_ROLE] }
    val userAvatar: Flow<String?> = context.dataStore.data.map { it[KEY_USER_AVATAR] }

    suspend fun saveSession(
        accessToken: String,
        refreshToken: String,
        email: String,
        fullName: String,
        role: String,
        avatar: String?,
        organizationId: String
    ) {
        context.dataStore.edit { prefs ->
            prefs[KEY_ACCESS_TOKEN] = accessToken
            prefs[KEY_REFRESH_TOKEN] = refreshToken
            prefs[KEY_USER_EMAIL] = email
            prefs[KEY_USER_NAME] = fullName
            prefs[KEY_USER_ROLE] = role
            prefs[KEY_USER_AVATAR] = avatar ?: ""
            prefs[KEY_ORG_ID] = organizationId
        }
        TokenProvider.accessToken = accessToken
    }

    suspend fun saveBranch(branchId: String, branchName: String) {
        context.dataStore.edit { prefs ->
            prefs[KEY_BRANCH_ID] = branchId
            prefs[KEY_BRANCH_NAME] = branchName
        }
    }

    suspend fun getSnapshot(): Preferences = context.dataStore.data.first()

    suspend fun clearSession() {
        context.dataStore.edit { it.clear() }
        TokenProvider.accessToken = ""
    }
}
