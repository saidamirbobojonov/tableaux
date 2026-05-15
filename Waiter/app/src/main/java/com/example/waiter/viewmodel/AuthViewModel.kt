package com.example.waiter.viewmodel

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import com.example.waiter.data.SessionManager
import com.example.waiter.network.ApiClient
import com.example.waiter.network.BranchInfo
import com.example.waiter.network.LoginRequest
import com.example.waiter.network.TokenProvider
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import retrofit2.HttpException
import java.net.ConnectException
import java.net.SocketTimeoutException

sealed class AuthState {
    object Loading : AuthState()
    object Unauthenticated : AuthState()
    data class BranchSelection(val branches: List<BranchInfo>) : AuthState()
    data class Authenticated(val branchId: String, val branchName: String) : AuthState()
}

class AuthViewModel(private val sessionManager: SessionManager) : ViewModel() {

    private val _authState = MutableStateFlow<AuthState>(AuthState.Loading)
    val authState: StateFlow<AuthState> = _authState.asStateFlow()

    private val _loginError = MutableStateFlow<String?>(null)
    val loginError: StateFlow<String?> = _loginError.asStateFlow()

    private val _isLoggingIn = MutableStateFlow(false)
    val isLoggingIn: StateFlow<Boolean> = _isLoggingIn.asStateFlow()

    init {
        restoreSession()
    }

    private fun restoreSession() {
        viewModelScope.launch {
            val prefs = sessionManager.getSnapshot()
            val token = prefs[SessionManager.KEY_ACCESS_TOKEN]
            val branchId = prefs[SessionManager.KEY_BRANCH_ID]
            val branchName = prefs[SessionManager.KEY_BRANCH_NAME] ?: ""

            if (!token.isNullOrBlank() && !branchId.isNullOrBlank()) {
                TokenProvider.accessToken = token
                _authState.value = AuthState.Authenticated(branchId, branchName)
            } else {
                _authState.value = AuthState.Unauthenticated
            }
        }
    }

    fun login(email: String, password: String) {
        if (email.isBlank() || password.isBlank()) {
            _loginError.value = "Please enter your email and password"
            return
        }
        _isLoggingIn.value = true
        _loginError.value = null
        viewModelScope.launch {
            try {
                val tokenResp = ApiClient.api.login(LoginRequest(email.trim(), password))
                TokenProvider.accessToken = tokenResp.access

                val me = ApiClient.api.getMe()
                sessionManager.saveSession(
                    accessToken = tokenResp.access,
                    refreshToken = tokenResp.refresh,
                    email = me.email,
                    fullName = "${me.firstName} ${me.lastName}".trim(),
                    role = me.role ?: "",
                    avatar = me.avatar,
                    organizationId = me.organizationId ?: ""
                )

                when {
                    me.branches.isEmpty() -> {
                        _loginError.value = "No branch assigned. Contact your manager."
                        sessionManager.clearSession()
                    }
                    me.branches.size == 1 -> {
                        val branch = me.branches.first()
                        sessionManager.saveBranch(branch.id, branch.name)
                        _authState.value = AuthState.Authenticated(branch.id, branch.name)
                    }
                    else -> {
                        _authState.value = AuthState.BranchSelection(me.branches)
                    }
                }
            } catch (e: HttpException) {
                _loginError.value = when (e.code()) {
                    401 -> "Invalid email or password"
                    else -> "Server error (${e.code()})"
                }
            } catch (e: ConnectException) {
                _loginError.value = "Cannot connect to server. Check your network or server address."
            } catch (e: SocketTimeoutException) {
                _loginError.value = "Connection timed out. Is the server running?"
            } catch (e: Exception) {
                _loginError.value = e.message ?: "Login failed"
            } finally {
                _isLoggingIn.value = false
            }
        }
    }

    fun selectBranch(branch: BranchInfo) {
        viewModelScope.launch {
            sessionManager.saveBranch(branch.id, branch.name)
            _authState.value = AuthState.Authenticated(branch.id, branch.name)
        }
    }

    fun clearLoginError() {
        _loginError.value = null
    }

    fun logout() {
        viewModelScope.launch {
            sessionManager.clearSession()
            _authState.value = AuthState.Unauthenticated
        }
    }
}

class AuthViewModelFactory(private val sessionManager: SessionManager) : ViewModelProvider.Factory {
    override fun <T : ViewModel> create(modelClass: Class<T>): T {
        @Suppress("UNCHECKED_CAST")
        return AuthViewModel(sessionManager) as T
    }
}
