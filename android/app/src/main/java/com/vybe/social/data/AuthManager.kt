package com.vybe.social.data

import android.content.Context
import com.vybe.social.BuildConfig
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject

private const val PREFS = "vybe_session"
private const val TOKEN = "token"

data class AuthUser(val uid: String, val email: String?, val displayName: String?, val photoURL: String?)

class AuthManager(context: Context) {
    private val prefs = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)
    private val client = OkHttpClient()
    private val _currentUser = MutableStateFlow(loadUser())
    val currentUser: AuthUser? get() = _currentUser.value
    val authStateFlow: Flow<AuthUser?> = _currentUser
    val token: String? get() = prefs.getString(TOKEN, null)

    private fun loadUser(): AuthUser? = try {
        val json = prefs.getString("user", null) ?: return null
        val o = JSONObject(json)
        AuthUser(o.getString("userId"), o.optString("email").ifEmpty { null }, o.optString("displayName").ifEmpty { null }, o.optString("photoURL").ifEmpty { null })
    } catch (_: Exception) { null }

    private suspend fun auth(path: String, body: JSONObject): Result<AuthUser> = withContext(Dispatchers.IO) {
        try {
            val request = Request.Builder().url(BuildConfig.API_BASE_URL + path).post(body.toString().toRequestBody("application/json".toMediaType())).build()
            client.newCall(request).execute().use { response ->
                val text = response.body?.string().orEmpty(); val json = JSONObject(text)
                if (!response.isSuccessful) return@withContext Result.failure(Exception(json.optString("error", "Authentication failed.")))
                val user = json.getJSONObject("user")
                val authUser = AuthUser(user.getString("userId"), user.optString("email").ifEmpty { null }, user.optString("displayName").ifEmpty { null }, user.optString("photoURL").ifEmpty { null })
                prefs.edit().putString(TOKEN, json.getString("token")).putString("user", user.toString()).apply(); _currentUser.value = authUser
                Result.success(authUser)
            }
        } catch (e: Exception) { Result.failure(e) }
    }

    suspend fun signIn(email: String, pass: String): Result<AuthUser> = auth("/api/auth/login", JSONObject().put("email", email).put("password", pass))
    suspend fun signUp(email: String, pass: String, username: String = email.substringBefore('@'), displayName: String = username): Result<AuthUser> = auth("/api/auth/register", JSONObject().put("email", email).put("password", pass).put("username", username).put("displayName", displayName))
    suspend fun signInAnonymously(): Result<AuthUser> = Result.failure(Exception("Guest accounts are not available on the custom backend."))
    fun signOut() { prefs.edit().clear().apply(); _currentUser.value = null }
}
