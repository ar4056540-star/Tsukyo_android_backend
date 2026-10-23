package com.vybe.social.data

import android.content.Context
import com.vybe.social.BuildConfig
import android.net.Uri
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody
import okio.BufferedSink
import org.json.JSONObject
import java.io.File
import java.io.InputStream
import java.util.UUID

class ReelUploadEngine(private val context: Context, private val backendBaseUrl:String=BuildConfig.API_BASE_URL){
    private val client=OkHttpClient()
    data class UploadResult(val mediaUrl:String,val filename:String,val mimeType:String,val sizeBytes:Long)
    suspend fun uploadVideo(videoUri:Uri,onProgress:(Float,Long,Long)->Unit):Result<UploadResult>=withContext(Dispatchers.IO){
        runCatching{
            val resolver=context.contentResolver; val mime=resolver.getType(videoUri)? :"video/mp4"; val input:InputStream=resolver.openInputStream(videoUri)?:error("Cannot open selected video.")
            val temp=File(context.cacheDir,"upload_${UUID.randomUUID()}.bin"); input.use{it.copyTo(temp.outputStream())}; val total=temp.length(); if(total<=0)error("Video file is empty.");
            val name="${temp.name}.mp4"; val body=object:RequestBody(){override fun contentType()=mime.toMediaTypeOrNull();override fun contentLength()=total;override fun writeTo(sink:BufferedSink){temp.source().use{source->val buffer=okio.Buffer();var written=0L;while(true){val read=source.read(buffer,8192);if(read==-1L)break;sink.write(buffer,read);written+=read;onProgress((written.toFloat()/total).coerceIn(0f,.99f),written,total)}}}}
            val url="$backendBaseUrl/api/media/upload?folder=reels&filename=${java.net.URLEncoder.encode(name,"UTF-8")}&contentType=${java.net.URLEncoder.encode(mime,"UTF-8")}"
            val request=Request.Builder().url(url).post(body).build(); client.newCall(request).execute().use{response->val text=response.body?.string().orEmpty();if(!response.isSuccessful)error(JSONObject(text).optString("error","Upload failed."));val json=JSONObject(text);val mediaUrl=json.optString("url");if(mediaUrl.isEmpty())error("Upload server returned no media URL.");onProgress(1f,total,total);UploadResult(mediaUrl,name,mime,total)}.also{temp.delete()}
        }
    }
}
