package com.example.waiter

import android.app.Application
import com.example.waiter.data.SessionManager

class WaiterApplication : Application() {
    val sessionManager: SessionManager by lazy { SessionManager(this) }
}
