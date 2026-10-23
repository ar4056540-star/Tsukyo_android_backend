package com.vybe.social.data

import com.vybe.social.model.*
import com.vybe.social.BuildConfig
import com.google.gson.Gson
import com.google.gson.JsonObject
import com.google.gson.reflect.TypeToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.flow
import kotlinx.coroutines.flow.flowOn
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

class VybeRepository(private val auth: AuthManager) {
    private val client=OkHttpClient(); private val gson=Gson()
    private inline fun <reified T> type()=object:TypeToken<T>(){}.type
    private fun request(path:String,method:String="GET",json:String?=null):String{
        val builder=Request.Builder().url(BuildConfig.API_BASE_URL+path).header("Authorization","Bearer ${auth.token.orEmpty()}")
        if(json!=null)builder.method(method,json.toRequestBody("application/json".toMediaType())) else builder.method(method,null)
        client.newCall(builder.build()).execute().use{r->val text=r.body?.string().orEmpty();if(!r.isSuccessful)throw Exception(JsonObject::class.java.let{try{gson.fromJson(text,it).get("error")?.asString}catch(_:Exception){null}}?:("Request failed (${r.code})."));return text}
    }
    private fun <T> poll(fetch:()->List<T>):Flow<List<T>>=flow{while(true){try{emit(fetch())}catch(_:Exception){emit(emptyList())};delay(3000)}}.flowOn(Dispatchers.IO)
    fun getPostsFlow():Flow<List<Post>>=poll{val o=gson.fromJson(request("/api/feed?limit=50"),JsonObject::class.java);gson.fromJson(o.getAsJsonArray("posts"),type<List<Post>>())}
    fun getReelsFlow():Flow<List<Reel>>=poll{val o=gson.fromJson(request("/api/reels?limit=50"),JsonObject::class.java);gson.fromJson(o.getAsJsonArray("reels"),type<List<Reel>>() )}
    fun getStoriesFlow():Flow<List<Story>>=poll{val o=gson.fromJson(request("/api/stories"),JsonObject::class.java);gson.fromJson(o.getAsJsonArray("stories"),type<List<Story>>() )}
    suspend fun getUserProfile(userId:String):Result<UserProfile>=runCatching{val o=gson.fromJson(request("/api/users/$userId"),JsonObject::class.java);gson.fromJson(o.getAsJsonObject("user"),UserProfile::class.java)}
    suspend fun createReel(ownerId:String,username:String,displayName:String,photoURL:String,caption:String,mediaURL:String,audioTitle:String="Original Sound — VYBE"):Result<String>=runCatching{val body=gson.toJson(mapOf("caption" to caption,"mediaURL" to mediaURL,"audioTitle" to audioTitle));val o=gson.fromJson(request("/api/reels","POST",body),JsonObject::class.java);o.getAsJsonObject("reel").get("reelId").asString}
    suspend fun createPost(userId:String,username:String,displayName:String,photoURL:String,caption:String,mediaURL:String,mediaType:String="image"):Result<String>=runCatching{val body=gson.toJson(mapOf("caption" to caption,"mediaURL" to mediaURL,"mediaType" to mediaType));val o=gson.fromJson(request("/api/posts","POST",body),JsonObject::class.java);o.getAsJsonObject("post").get("postId").asString}
    suspend fun toggleLike(collection:String,docId:String,userId:String,isCurrentlyLiked:Boolean){request("/api/${if(collection=="reels")"reels" else "posts"}/$docId/like","POST")}
    fun getCommentsFlow(targetId:String,collection:String="comments"):Flow<List<Comment>>=poll{val targetCollection=if(collection=="reels")"reels" else "posts";val o=gson.fromJson(request("/api/$targetCollection/$targetId/comments"),JsonObject::class.java);gson.fromJson(o.getAsJsonArray("comments"),type<List<Comment>>())}
    suspend fun addComment(targetId:String,targetType:String,userId:String,username:String,displayName:String,photoURL:String,text:String):Result<String>=runCatching{val type=if(targetType=="reel"||targetType=="reels")"reels" else "posts";val o=gson.fromJson(request("/api/$type/$targetId/comments","POST",gson.toJson(mapOf("text" to text))),JsonObject::class.java);o.getAsJsonObject("comment").get("commentId").asString}
}
